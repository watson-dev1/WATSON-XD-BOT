/*
 Feature: BartV2 Sticker
 API: https://api-faa.my.id/faa/brathd
 Creator: Z7
*/

let handler = async (m, { text, usedPrefix, command, conn }) => {
    if (!text) return m.reply(`💬 Example usage:\n${usedPrefix + command} Hello world`);

    try {
        await m.reply("⏳ Creating sticker, please wait...");

        // Call Brat HD API
        const apiUrl = `https://api-faa.my.id/faa/brathd?text=${encodeURIComponent(text)}`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error('❌ Failed to fetch sticker from API');

        const buffer = Buffer.from(await res.arrayBuffer());

        // Optional metadata for sticker
        let exif = {};
        if (text.includes(",")) {
            const [packname, author] = text.split(",");
            exif = { packName: packname.trim(), packPublish: author.trim() };
        }

        // Send sticker
        await conn.sendSticker(m.chat, buffer, m, exif);

    } catch (e) {
        console.error('BartV2 Sticker Error:', e);
        m.reply('❌ Failed to create sticker, please try again later.');
    }
};

handler.help = ['bartv2 <text>'];
handler.tags = ['sticker'];
handler.command = /^(bartv2)$/i;
handler.register = true;
handler.limit = true;

export default handler;