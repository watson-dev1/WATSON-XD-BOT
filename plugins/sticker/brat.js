import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const T_API = 30000;
const MAX_TEXT_LENGTH = 150;

function convertToWebp(inputBuffer) {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tmpIn = path.join(tempDir, `brat_in_${Date.now()}.png`);
        const tmpOut = path.join(tempDir, `brat_out_${Date.now()}.webp`);

        try { fs.writeFileSync(tmpIn, inputBuffer); } catch (e) { return reject(e); }

        const ff = spawn('ffmpeg', [
            '-y', '-i', tmpIn,
            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
            '-vcodec', 'libwebp',
            '-lossless', '0',
            '-qscale', '75',
            '-preset', 'default',
            '-an', '-vsync', '0',
            '-s', '512:512',
            tmpOut
        ]);

        ff.on('close', (code) => {
            try { fs.unlinkSync(tmpIn); } catch {}
            if (code !== 0) {
                try { fs.unlinkSync(tmpOut); } catch {}
                return reject(new Error('FFmpeg gagal convert ke WebP'));
            }
            try {
                const buf = fs.readFileSync(tmpOut);
                fs.unlinkSync(tmpOut);

                if (!buf || buf.length < 500) {
                    return reject(new Error('WebP terlalu kecil'));
                }
                if (buf.slice(0, 4).toString('ascii') !== 'RIFF') {
                    return reject(new Error('WebP tidak valid (bukan RIFF)'));
                }
                if (buf.slice(8, 12).toString('ascii') !== 'WEBP') {
                    return reject(new Error('WebP tidak valid (bukan WEBP)'));
                }

                resolve(buf);
            } catch (e) { reject(e); }
        });
        ff.on('error', reject);
    });
}

export default {
    command: ['brat', 'bratfoto'],
    category: 'sticker',
    execute: async (denn, m, { prefix, command, text }) => {
        const query = (text || '').trim();

        if (!query) {
            return sendFakeQuoted(denn, m, 
                `🎨 *BRAT STICKER MAKER*\n\n*Format:* ${prefix}${command} <teks>\n*Contoh:* ${prefix}${command} halo dunia`,
                { title: 'Brat Sticker', body: 'Masukkan teks untuk dijadikan stiker' }
            );
        }

        if (query.length > MAX_TEXT_LENGTH) {
            return sendFakeQuoted(denn, m, 
                `❌ Teks terlalu panjang! Maksimal ${MAX_TEXT_LENGTH} karakter.\n\nTeks kamu: ${query.length} karakter.`, 
                { title: 'Brat Sticker', body: 'Kurangi teksnya' }
            );
        }

        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Membuat stiker...', {
            title: 'Brat Sticker', body: 'Memproses...'
        }).catch(() => null);

        try {
            const apiUrl = `https://aqul-brat.hf.space/api/brat?text=${encodeURIComponent(query)}`;

            const res = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                timeout: T_API,
                maxContentLength: 15 * 1024 * 1024,
                headers: { 'User-Agent': UA },
                validateStatus: () => true
            });

            const outBuf = Buffer.from(res.data || []);
            const ct = String(res.headers['content-type'] || '').toLowerCase();

            if (ct.includes('application/json')) {
                throw new Error('API mengembalikan error');
            }
            if (res.status >= 400) {
                throw new Error(`Server error (HTTP ${res.status})`);
            }
            if (outBuf.length < 1024) {
                throw new Error('Hasil dari server kosong/rusak');
            }

            const stickerBuffer = await convertToWebp(outBuf);

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            await denn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            console.error('[Brat]', e.message);
            sendFakeQuoted(denn, m, `❌ Gagal membuat stiker Brat:\n${e.message}`, {
                title: 'Brat Gagal', body: 'Server API sedang sibuk'
            });
        }
    }
};