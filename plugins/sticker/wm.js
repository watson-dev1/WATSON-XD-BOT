import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { downloadContentFromMessage } from '@rexxhayanasi/elaina-baileys';
import { addStickerMetadata } from '../../lib/stickerExif.js';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

export default {
    command: ['wm', 'stikerwm'],
    category: 'sticker',
    execute: async (denn, m, { prefix, command, text }) => {
        if (!text) {
            return sendFakeQuoted(denn, m, `Format: *${prefix + command} pack|author*`, { title: 'Sticker WM', body: 'Masukkan nama pack dan author' });
        }

        const isQuoted = !!m.quoted;
        const msg = isQuoted ? (m.quoted.msg || m.quoted) : m.msg;
        const mtype = isQuoted ? m.quoted.mtype : m.mtype;

        let mediaMime = msg?.mimetype || '';
        if (!mediaMime && mtype === 'imageMessage') mediaMime = 'image/jpeg';

        if (!/image/.test(mediaMime)) {
            return m.reply(`Kirim/reply gambar dengan caption *${prefix + command} pack|author*`);
        }

        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Membuat stiker WM...', { title: 'Sticker WM', body: 'Memproses...' }).catch(() => null);
        
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tmpIn = path.join(tempDir, `wm_in_${Date.now()}.jpg`);
        const tmpOut = path.join(tempDir, `wm_out_${Date.now()}.webp`);

        try {
            const [pack, author] = text.split('|').map(v => v?.trim());
            // Sanitasi teks agar FFmpeg tidak error
            let wmText = `${pack || global.stickerPackname || 'Patrick MD'} | ${author || global.stickerAuthor || 'DennCode'}`.replace(/['":\\]/g, "");

            const stream = await downloadContentFromMessage(msg, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (!buffer || buffer.length < 100) throw new Error('Gagal mengunduh media');
            fs.writeFileSync(tmpIn, buffer);

            await new Promise((resolve, reject) => {
                const ffArgs = [
                    '-y', '-i', tmpIn,
                    '-vf', `scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,drawtext=text='${wmText}':fontcolor=white:fontsize=20:x=(w-text_w)/2:y=h-text_h-10:box=1:boxcolor=black@0.5`,
                    '-vcodec', 'libwebp',
                    '-lossless', '0',
                    '-qscale', '75',
                    '-preset', 'default',
                    '-an', '-vsync', '0',
                    '-s', '512:512',
                    tmpOut
                ];
                const ff = spawn('ffmpeg', ffArgs);
                ff.on('close', (code) => code === 0 ? resolve() : reject(new Error('FFmpeg gagal convert')));
                ff.on('error', reject);
            });

            const rawSticker = fs.readFileSync(tmpOut);
            const stickerBuffer = addStickerMetadata(
                rawSticker,
                pack || global.stickerPackname || 'Patrick MD',
                author || global.stickerAuthor || 'DennCode',
                ['🖌️', '🤖']
            );

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            await denn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            console.error('[WM Error]', e.message);
            sendFakeQuoted(denn, m, `❌ Gagal membuat stiker WM:\n${e.message}`, { title: 'Sticker WM', body: 'Terjadi kesalahan' });
        } finally {
            if (fs.existsSync(tmpIn)) try { fs.unlinkSync(tmpIn); } catch {}
            if (fs.existsSync(tmpOut)) try { fs.unlinkSync(tmpOut); } catch {}
        }
    }
};