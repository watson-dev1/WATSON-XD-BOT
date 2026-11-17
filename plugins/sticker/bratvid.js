import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { sendFakeQuoted } from '../../lib/fakequoted.js';
import { addStickerMetadata } from '../../lib/stickerExif.js';

export default {
    command: ['bratvid'],
    category: 'sticker',
    execute: async (denn, m, { prefix, text }) => {
        if (!text) {
            return sendFakeQuoted(denn, m, 
                `🎬 *BRAT VIDEO MAKER*\n\n*Format:* ${prefix}bratvid <teks>\n*Contoh:* ${prefix}bratvid halo dunia`,
                { title: 'Brat Video', body: 'Masukkan teks untuk dijadikan stiker video' }
            );
        }

        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Membuat stiker video...', {
            title: 'Brat Video', body: 'Memproses...'
        }).catch(() => null);

        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tmpIn = path.join(tempDir, `bratvid_in_${Date.now()}.mp4`);
        const tmpOut = path.join(tempDir, `bratvid_out_${Date.now()}.webp`);

        try {
            const res = await axios.get(`${global.jereBaseUrl}/api/maker/brat`, {
                params: {
                    apikey: global.jereApiKey,
                    text: text,
                    type: 'video'
                },
                responseType: 'arraybuffer',
                timeout: 30000
            });

            const buffer = Buffer.from(res.data || []);
            if (buffer.length < 100) throw new Error('Gagal mendownload video dari server');
            fs.writeFileSync(tmpIn, buffer);

            await new Promise((resolve, reject) => {
                const ff = spawn('ffmpeg', [
                    '-y', '-i', tmpIn,
                    '-vcodec', 'libwebp',
                    '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
                    '-loop', '0',
                    '-ss', '00:00:00.0',
                    '-t', '00:00:10.0',
                    '-preset', 'default',
                    '-an', '-vsync', '0',
                    '-s', '512:512',
                    tmpOut
                ]);

                ff.on('close', (code) => {
                    if (code === 0) resolve();
                    else reject(new Error('FFmpeg gagal convert video ke stiker'));
                });
                ff.on('error', reject);
            });

            const rawSticker = fs.readFileSync(tmpOut);
            
            const stickerBuffer = addStickerMetadata(
                rawSticker,
                global.stickerPackname || 'Patrick MD',
                global.stickerAuthor || 'DennCode',
                ['🎬', '🤖']
            );

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            await denn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            console.error('[BratVid Error]', e.message);
            sendFakeQuoted(denn, m, `❌ Gagal generate bratvid:\n${e.message}`, {
                title: 'Brat Video Gagal', body: 'Server API sedang sibuk'
            });
        } finally {
            if (fs.existsSync(tmpIn)) try { fs.unlinkSync(tmpIn); } catch {}
            if (fs.existsSync(tmpOut)) try { fs.unlinkSync(tmpOut); } catch {}
        }
    }
};