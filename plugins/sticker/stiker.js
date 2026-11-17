import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { downloadContentFromMessage } from '@rexxhayanasi/elaina-baileys';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

function buildSticker(inputPath, isVideo, outputPath) {
    return new Promise((resolve, reject) => {
        const args = ['-y', '-i', inputPath];

        if (isVideo) {
            args.push(
                '-vcodec', 'libwebp',
                '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
                '-loop', '0',
                '-ss', '00:00:00.0',
                '-t', '00:00:10.0',
                '-preset', 'default',
                '-an', '-vsync', '0',
                '-s', '512:512',
                outputPath
            );
        } else {
            args.push(
                '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
                '-vcodec', 'libwebp',
                '-lossless', '0',
                '-qscale', '75',
                '-preset', 'default',
                '-an', '-vsync', '0',
                '-s', '512:512',
                outputPath
            );
        }

        const ff = spawn('ffmpeg', args);
        ff.on('close', (code) => code === 0 ? resolve() : reject(new Error('FFmpeg gagal convert media')));
        ff.on('error', reject);
    });
}

function isValidWebp(buf) {
    if (!buf || buf.length < 500) return false;
    if (buf.slice(0, 4).toString('ascii') !== 'RIFF') return false;
    if (buf.slice(8, 12).toString('ascii') !== 'WEBP') return false;
    return true;
}

export default {
    command: ['stiker', 's'],
    category: 'sticker',
    execute: async (denn, m, { prefix, command }) => {
        const isQuoted = !!m.quoted;
        const msg = isQuoted ? (m.quoted.msg || m.quoted) : m.msg;
        const mtype = isQuoted ? m.quoted.mtype : m.mtype;

        let mediaMime = msg?.mimetype || '';
        if (!mediaMime) {
            if (mtype === 'imageMessage') mediaMime = 'image/jpeg';
            else if (mtype === 'videoMessage') mediaMime = 'video/mp4';
        }

        if (!/image|video/.test(mediaMime)) {
            return m.reply(`Kirim/reply gambar atau video dengan caption *${prefix + command}*`);
        }

        const isVideo = /video/.test(mediaMime);
        if (isVideo && msg?.seconds > 10) {
            return m.reply('Durasi video maksimal 10 detik!');
        }

        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Membuat stiker...', { 
            title: 'Stiker', body: 'Memproses media...' 
        }).catch(() => null);

        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tmpIn = path.join(tempDir, `in_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`);
        const tmpOut = path.join(tempDir, `out_${Date.now()}.webp`);

        try {
            const type = isVideo ? 'video' : 'image';

            const stream = await downloadContentFromMessage(msg, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (!buffer || buffer.length < 100) throw new Error('Gagal mengunduh media');
            fs.writeFileSync(tmpIn, buffer);

            await buildSticker(tmpIn, isVideo, tmpOut);

            const stickerBuffer = fs.readFileSync(tmpOut);

            if (!isValidWebp(stickerBuffer)) {
                throw new Error('Hasil WebP dari FFmpeg tidak valid');
            }

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            await denn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            m.reply(`❌ Gagal membuat stiker: ${e.message}`);
        } finally {
            if (fs.existsSync(tmpIn)) try { fs.unlinkSync(tmpIn); } catch {}
            if (fs.existsSync(tmpOut)) try { fs.unlinkSync(tmpOut); } catch {}
        }
    }
};