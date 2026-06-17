import fetch from "node-fetch"

/** Tiktok V2 Downloader **/

const handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        throw `*[❗] Example:*\n${usedPrefix + command} https://vt.tiktok.com/xxxxxx`
    }

    try {
        await conn.sendMessage(m.chat, {
            react: { text: "⏳", key: m.key }
        })

        const tiktokData = await tiktokdl(args[0])

        if (!tiktokData || !tiktokData.result) {
            throw "Failed to fetch TikTok data!"
        }

        const data = tiktokData.result
        const videoURL = data.download

        if (!videoURL) throw "Video not available!"

        const info = `
🎵 *TIKTOK DOWNLOADER*
━━━━━━━━━━━━━━
📌 Title   : ${data.title || "-"}
👤 Author  : ${data.author?.nickname || "-"}
🔗 Username: @${data.author?.unique_id || "-"}
🌍 Region  : ${data.region || "-"}
🆔 ID      : ${data.id || "-"}
━━━━━━━━━━━━━━
        `.trim()

        await conn.sendFile(m.chat, videoURL, "tiktok.mp4", info, m)

    } catch (error) {
        console.error(error)

        await conn.sendMessage(m.chat, {
            react: { text: "❌", key: m.key }
        })

        conn.reply(m.chat, `❌ Error: ${error.message || error}`, m)
    }
}

handler.help = ['tiktok2 <url>']
handler.tags = ['downloader']
handler.command = /^(tt2|tiktok2)$/i
handler.register = true

export default handler

// ===== API FUNCTION =====
async function tiktokdl(url) {
    try {
        const api = `https://api.deline.web.id/downloader/tiktok?url=${encodeURIComponent(url)}`
        const res = await fetch(api)
        return await res.json()
    } catch (e) {
        console.error(e)
        return null
    }
}