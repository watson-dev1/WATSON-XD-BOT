let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text) {
            return m.reply(`*Example: ${usedPrefix + command} Bandung*`);
        }

        await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

        const url = `https://api.ootaizumi.web.id/lokasi/cuaca?lokasi=${encodeURIComponent(text)}`;
        const r = await fetch(url);
        const j = await r.json();

        if (!j?.status) {
            return m.reply(`*🍂 Failed to fetch weather data, please try again.*`);
        }

        const d = j.result;
        const lo = d.lokasi;
        const cu = d.cuaca;
        const ang = cu.angin;
        const link = d.url;

        let caption = `*🌤️ Weather Information — ${d.namaTempat}*\n\n`;

        caption += `*📍 Location:*\n`;
        caption += `• *Province:* ${lo.provinsi}\n`;
        caption += `• *City/Regency:* ${lo.kotkab}\n`;
        caption += `• *District:* ${lo.kecamatan}\n`;
        caption += `• *Village:* ${lo.desa}\n\n`;

        caption += `*⛅ Current Weather:*\n`;
        caption += `• *Time:* ${cu.waktu}\n`;
        caption += `• *Description:* ${cu.deskripsi}\n`;
        caption += `• *Temperature:* ${cu.suhu}\n`;
        caption += `• *Humidity:* ${cu.kelembapan}\n`;
        caption += `• *Cloud Cover:* ${cu.tutupanAwan}\n`;
        caption += `• *Visibility:* ${cu.jarakPandang.teks}\n\n`;

        caption += `*🍃 Wind:*\n`;
        caption += `• *From:* ${ang.dari}\n`;
        caption += `• *To:* ${ang.ke}\n`;
        caption += `• *Speed:* ${ang.kecepatan}\n`;
        caption += `• *Direction:* ${ang.derajat}°\n\n`;

        caption += `*🔗 Links:*\n`;
        caption += `• *BMKG:* ${link.bmkg}\n`;

        await conn.sendMessage(
            m.chat,
            {
                text: caption,
                contextInfo: {
                    externalAdReply: {
                        title: `Weather — ${d.namaTempat}`,
                        body: `${cu.deskripsi} • ${cu.suhu}`,
                        thumbnailUrl: 'https://files.cloudkuimages.guru/images/5bc85d9d0eab.jpg',
                        sourceUrl: link.bmkg,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        showAdAttribution: false
                    }
                }
            },
            { quoted: m.quoted ? m.quoted : m }
        );

    } catch (e) {
        console.error(e);
        await m.reply(`*🍂 An error occurred while fetching weather data.*`);
    } finally {
        await conn.sendMessage(m.chat, { react: { text: '', key: m.key } });
    }
};

handler.help = ['weather <location>'];
handler.tags = ['tools'];
handler.command = /^(weather|cekcuaca|prakiraan)$/i;
handler.register = true;

export default handler;