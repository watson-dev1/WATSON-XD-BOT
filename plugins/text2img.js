import axios from "axios"

const getImageUrl = (prompt) => {
    const seed =
        Date.now().toString() +
        Math.floor(Math.random() * 1e6).toString()

    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&enhance=true&nologo=true&model=flux`
}

let handler = async (m, { text, conn, usedPrefix, command }) => {

    if (!text) {
        return conn.sendMessage(
            m.chat,
            {
                text:
`🖼️ *Text to Image Generator*

Usage:
${usedPrefix + command} futuristic city at night`
            },
            { quoted: m }
        )
    }

    try {

        const urlImage = getImageUrl(text)

        await conn.sendMessage(
            m.chat,
            {
                image: { url: urlImage },
                caption:
`🎨 *Text to Image Result*

📝 Prompt: ${text}`
            },
            { quoted: m }
        )

    } catch (e) {

        conn.reply(
            m.chat,
            `❌ Failed to generate image\n\n${e.message}`,
            m
        )
    }
}

handler.help = ['text2img <prompt>']
handler.tags = ['ai']
handler.command = /^text2img$/i
handler.limit = true
handler.register = true

export default handler