/**
 * type   : Plugins ESM
 * creator : Hilman
 * Channel : https://whatsapp.com/channel/0029VbAYjQgKrWQulDTYcg2K
 * Remake : DennCode
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';
import FormData from 'form-data';
import { downloadContentFromMessage } from '@rexxhayanasi/elaina-baileys';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const TMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const BACKGROUND_URL = 'https://raw.githubusercontent.com/himanackerman/Image/refs/heads/main/anu/10a1fe0d21270e01da6efa113c26203b.jpg';

async function downloadBuffer(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 25000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return Buffer.from(res.data);
}

async function removeBgNet(buffer) {
    const form = new FormData();
    form.append('image', buffer, { filename: 'image.png', contentType: 'image/png' });
    form.append('format', 'png');
    form.append('model', 'v1');

    const res = await axios.post('https://api2.pixelcut.app/image/matte/v1', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'x-client-version': 'web:pixa.com:4a5b0af2'
        },
        responseType: 'arraybuffer',
        timeout: 25000,
        maxBodyLength: Infinity
    });
    return Buffer.from(res.data);
}

function getDimensions(filePath) {
    return new Promise((resolve) => {
        const ff = spawn('ffprobe', [
            '-v', 'error', '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height',
            '-of', 'csv=p=0', filePath
        ]);
        let out = '';
        ff.stdout.on('data', d => out += d.toString());
        ff.on('close', (code) => {
            if (code !== 0) return resolve(null);
            const [w, h] = out.trim().split(',').map(Number);
            if (!w || !h) return resolve(null);
            resolve({ width: w, height: h });
        });
        ff.on('error', () => resolve(null));
    });
}

function compositeExplosion(bgPath, userPath, outputPath, isPortrait) {
    return new Promise((resolve, reject) => {
        getDimensions(bgPath).then((bg) => {
            getDimensions(userPath).then((user) => {
                if (!bg || !user) return reject(new Error('Gagal membaca dimensi gambar'));

                let scale;
                if (isPortrait) {
                    scale = bg.height / user.height;
                } else {
                    scale = (bg.width * 0.75) / user.width;
                }

                let fgW = Math.round(user.width * scale);
                let fgH = Math.round(user.height * scale);

                if (fgW > bg.width * 0.85) {
                    scale = (bg.width * 0.85) / user.width;
                    fgW = Math.round(user.width * scale);
                    fgH = Math.round(user.height * scale);
                }

                const fgX = bg.width - fgW;
                const fgY = bg.height - fgH;

                const ff = spawn('ffmpeg', [
                    '-y',
                    '-i', bgPath,
                    '-i', userPath,
                    '-filter_complex',
                    `[1:v]scale=${fgW}:${fgH}[fg];[0:v][fg]overlay=${fgX}:${fgY}:format=auto`,
                    '-frames:v', '1',
                    outputPath
                ]);

                const timer = setTimeout(() => {
                    ff.kill('SIGKILL');
                    reject(new Error('FFmpeg composite timeout'));
                }, 25000);

                let errLog = '';
                ff.stderr.on('data', d => errLog += d.toString());
                ff.on('close', (code) => {
                    clearTimeout(timer);
                    if (code !== 0) {
                        console.error('[Meledak FFmpeg]', errLog);
                        return reject(new Error('FFmpeg composite gagal'));
                    }
                    resolve();
                });
                ff.on('error', (e) => { clearTimeout(timer); reject(e); });
            });
        });
    });
}

export default {
    command: ['meledak'],
    category: 'maker',
    execute: async (denn, m, { prefix, command }) => {
        const isQuoted = !!m.quoted;
        const msg = isQuoted ? (m.quoted.msg || m.quoted) : m.msg;
        const mtype = isQuoted ? m.quoted.mtype : m.mtype;
        let mediaMime = msg?.mimetype || '';
        if (!mediaMime && mtype === 'imageMessage') mediaMime = 'image/jpeg';
        if (!mediaMime && mtype === 'stickerMessage') mediaMime = 'image/webp';

        if (!/image|sticker/.test(mediaMime)) {
            return sendFakeQuoted(denn, m,
                `💥 *MELEDAK MAKER*\n\n` +
                `*Cara Pakai:* Kirim/reply gambar atau stiker dengan caption *${prefix + command}*`,
                { title: 'Meledak Maker', body: 'Kirim gambar/stiker dulu' }
            );
        }

        const wait = await sendFakeQuoted(denn, m, '⏳ Membuat efek meledak...', {
            title: 'Meledak Maker', body: 'Memproses via FFmpeg...'
        }).catch(() => null);

        const tmpUser = path.join(TMP_DIR, `meledak_in_${Date.now()}.png`);
        const tmpBg = path.join(TMP_DIR, `meledak_bg_${Date.now()}.jpg`);
        const tmpOut = path.join(TMP_DIR, `meledak_out_${Date.now()}.png`);

        try {
            const mediaType = /sticker/.test(mediaMime) ? 'sticker' : 'image';
            const stream = await downloadContentFromMessage(msg, mediaType);
            let userBuffer = Buffer.from([]);
            for await (const chunk of stream) userBuffer = Buffer.concat([userBuffer, chunk]);
            if (!userBuffer || userBuffer.length < 100) throw new Error('Gagal mengunduh gambar');
            let finalUserBuffer = userBuffer;
            try {
                console.log('[Meledak] Mencoba remove background...');
                finalUserBuffer = await removeBgNet(userBuffer);
                console.log('[Meledak] Remove BG sukses');
            } catch (err) {
                console.log('[Meledak] Remove BG gagal, pakai gambar asli:', err.message);
            }

            fs.writeFileSync(tmpUser, finalUserBuffer);
           
            console.log('[Meledak] Downloading background...');
            const bgBuffer = await downloadBuffer(BACKGROUND_URL);
            fs.writeFileSync(tmpBg, bgBuffer);
        
            const userDims = await getDimensions(tmpUser);
            const isPortrait = userDims && userDims.height > userDims.width;
            
            console.log('[Meledak] Compositing...');
            await compositeExplosion(tmpBg, tmpUser, tmpOut, isPortrait);

            const imageBuffer = fs.readFileSync(tmpOut);
            if (imageBuffer.length < 1000) throw new Error('Hasil gambar kosong');

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            await denn.sendMessage(m.chat, {
                image: imageBuffer,
                caption: `💥 *MELEDAK BERHASIL*\n\n_Request by: ${m.pushName || 'User'}_`
            }, { quoted: m });

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            console.error('[Meledak Error]', e.message);
            sendFakeQuoted(denn, m, `❌ Gagal membuat efek meledak:\n${e.message}`, {
                title: 'Meledak Gagal', body: 'Coba lagi nanti'
            });
        } finally {            
            for (const f of [tmpUser, tmpBg, tmpOut]) {
                try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
            }
        }
    }
};