let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        // Use quoted message if available, otherwise the current message
        let q = m.quoted ? m.quoted : m;
        let mime = (q.msg || q).mimetype || '';

        // Check if media is image, video, or webp
        if (/image|video|webp/.test(mime)) {

            // Limit video duration to 10 seconds
            if ((q.msg?.seconds || q.seconds) > 10) {
                return m.reply('❌ Video must be shorter than 10 seconds.');
            }

            // Download media
            let media = await q.download();

            // Optional EXIF metadata for sticker pack
            let exif;
            if (text) {
                const [packname, author] = text.split(/[,|\-+&]/);
                exif = { packName: packname?.trim() || '', packPublish: author?.trim() || '' };
            }

            // Send sticker
            await conn.sendSticker(m.chat, media, m, exif);

        } else {
            m.reply('❌ Please send or reply to an image/video/webp to create a sticker.');
        }

    } catch (err) {
        console.error('Sticker handler error:', err);
        m.reply('❌ Failed to create sticker. Please try again.');
    }
}

handler.help = ['sticker'];
handler.tags = ['sticker'];
handler.command = /^s(tic?ker)?(gif)?$/i;
handler.register = true;

export default handler;