import { PDFDocument } from 'pdf-lib';
import { downloadContentFromMessage } from '@rexxhayanasi/elaina-baileys';
import { sendFakeQuoted } from '../../lib/fakequoted.js';
import { spawn } from 'child_process';

const convertToJpeg = (buffer) => {
    return new Promise((resolve, reject) => {
        if (!buffer || !buffer.length) return reject(new Error('Buffer kosong'));
        
        const ff = spawn('ffmpeg', [
            '-y', '-i', 'pipe:0',
            '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1'
        ]);
        
        const chunks = [];
        ff.stdout.on('data', c => chunks.push(c));
        ff.stderr.on('data', () => {});
        ff.on('close', code => {
            if (code !== 0 || !chunks.length) return reject(new Error('FFmpeg gagal konversi gambar'));
            resolve(Buffer.concat(chunks));
        });
        ff.on('error', reject);
        ff.stdin.end(buffer);
    });
};

export default {
    command: ['topdf', 'img2pdf', 'pdf'],
    category: 'tools',
    execute: async (denn, m, { prefix, command }) => {
        const isQuoted = !!m.quoted;
        const msg = isQuoted ? (m.quoted.msg || m.quoted) : m.msg;
        const mtype = isQuoted ? m.quoted.mtype : m.mtype;

        let mediaMime = msg?.mimetype || '';
        if (!mediaMime && mtype === 'imageMessage') mediaMime = 'image/jpeg';

        if (!/image/.test(mediaMime)) {
            return sendFakeQuoted(denn, m, 
                `📄 *IMAGE TO PDF*\n\n` +
                `*Format:* Kirim/reply gambar dengan caption *${prefix + command}*\n` +
                `*Contoh:* Reply gambar, lalu ketik \`${prefix}${command}\``,
                { title: 'Image to PDF', body: 'Kirim atau reply gambar yang ingin dijadikan PDF' }
            );
        }

        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Mengonversi gambar ke PDF...', {
            title: 'Image to PDF', body: 'Memproses...'
        }).catch(() => null);

        try {
            const stream = await downloadContentFromMessage(msg, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (!buffer || buffer.length < 100) {
                throw new Error('Gagal mengunduh gambar atau buffer kosong.');
            }

            const jpegBuffer = await convertToJpeg(buffer);

            const pdfDoc = await PDFDocument.create();
            const image = await pdfDoc.embedJpg(jpegBuffer);

            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
            });

            const pdfBytes = await pdfDoc.save();
            const pdfBuffer = Buffer.from(pdfBytes);

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            await denn.sendMessage(m.chat, {
                document: pdfBuffer,
                fileName: `patrickmd_${Date.now()}.pdf`,
                mimetype: 'application/pdf',
                caption: `✅ *BERHASIL DIKONVERSI*\n\n📄 File PDF siap diunduh.`
            }, { quoted: m });

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            sendFakeQuoted(denn, m, `❌ Gagal mengonversi ke PDF:\n${e.message}`, {
                title: 'Topdf Gagal', body: 'Terjadi kesalahan saat memproses gambar'
            });
        }
    }
};