import fetch from 'node-fetch';
import uploadImage from '../lib/uploadImage.js';

async function handler(m, { conn, usedPrefix, command }) {
  try {
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || q.mediaType || '';

    if (/^image/.test(mime) && !/webp/.test(mime)) {
      m.reply('⏳ Processing image, please wait...');

      const img = await q.download();
      const out = await uploadImage(img);
      if (!out) throw new Error('Failed to upload image!');

      let enhancedImageUrl;
      let caption = '';

      // --- Try Remini first ---
      try {
        const api = await fetch(`https://api.platform.web.id/remini?imageUrl=${encodeURIComponent(out)}&scale=2&faceEnhance=true`);
        const res = await api.json();

        if (res.status === "success" && res.result) {
          enhancedImageUrl = res.result;
          caption = `✅ Successfully processed\n📌 Watermark: ${res.wm || 'N/A'}`;
        } else {
          throw new Error('Remini failed');
        }
      } catch (err) {
        console.log('❌ Remini failed, falling back to upscale2:', err.message);

        const apiUrl = `https://api.platform.web.id/upscale2?imageUrl=${encodeURIComponent(out)}&denoice_strength=1&resolution=6`;
        const response = await fetch(apiUrl);
        const json = await response.json();

        if (!json.result) throw new Error('Upscale2 failed');

        enhancedImageUrl = json.result;
        caption = '✅ Successfully enhanced image quality';
      }

      // --- Send the result ---
      const imageResponse = await fetch(enhancedImageUrl);
      const imageBuffer = await imageResponse.buffer();

      await conn.sendMessage(m.chat, {
        image: imageBuffer,
        caption,
        mimetype: 'image/png'
      }, { quoted: m });

    } else {
      m.reply(`📷 Send an image with the caption *${usedPrefix + command}* or tag an image that has already been sent.`);
    }
  } catch (e) {
    console.error(e);
    m.reply(`❌ Identification failed: ${e.message}`);
  }
}

handler.help = ['remini'];
handler.tags = ['ai'];
handler.command = ['upscale', 'hd', 'remini'];
handler.premium = false;
handler.limit = true;

export default handler;