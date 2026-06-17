import axios from 'axios';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import sharp from 'sharp'; // npm install sharp

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        // Split text into top and bottom
        let texts = text ? text.split('|').map(t => t.trim()) : [];
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || '';

        if (!mime || !/image\/(jpe?g|png|webp)/.test(mime))
            return m.reply(`❌ Please reply to an image and use the command like:\n\n${usedPrefix + command} top text | bottom text`);

        await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

        // Download image
        let imgBuffer = await q.download();
        let imgUrl = await uploadTempFile(imgBuffer);

        // Prepare meme URL
        let topText = encodeURIComponent(texts[0] || ' ');
        let bottomText = encodeURIComponent(texts[1] || ' ');
        let memeUrl = `https://api.memegen.link/images/custom/${topText}/${bottomText}.png?background=${imgUrl}`;

        // Download meme image
        const memeRes = await axios.get(memeUrl, { responseType: 'arraybuffer' });

        // Ensure temporary folder exists
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!existsSync(tmpDir)) mkdirSync(tmpDir);

        const tempFilePng = path.join(tmpDir, `meme_${Date.now()}.png`);
        writeFileSync(tempFilePng, memeRes.data);

        // Convert to WebP sticker
        const tempFileWebp = path.join(tmpDir, `meme_${Date.now()}.webp`);
        await sharp(tempFilePng)
            .resize(512, 512, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
            .webp()
            .toFile(tempFileWebp);

        // Send sticker
        await conn.sendMessage(m.chat, { sticker: { url: tempFileWebp } }, { quoted: m });

        // Cleanup temp files
        unlinkSync(tempFilePng);
        unlinkSync(tempFileWebp);

        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error('SMeme Error:', err);
        m.reply('❌ Failed to create meme sticker. Please try again later.');
    }
};

handler.help = ['smeme <top text> | <bottom text>'];
handler.tags = ['tools'];
handler.command = /^(smeme)$/i;

export default handler;

// ===== Helper function =====
async function uploadTempFile(buffer) {
    const { ext, mime } = await fileTypeFromBuffer(buffer);
    const form = new FormData();
    form.append('file', buffer, { filename: `${Date.now()}.${ext}`, contentType: mime });

    const { data } = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
        headers: { ...form.getHeaders() },
    });

    const result = data.data.url.split('org')[1];
    return `https://tmpfiles.org/dl${result}`;
}