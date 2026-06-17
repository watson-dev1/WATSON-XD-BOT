import axios from "axios"

let handler = async (m, { text, usedPrefix, command, conn }) => {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''

    // Brat does not require image input, so mime check is ignored
    if (!text) {
        return m.reply(`Example: *${usedPrefix + command} hello world*`)
    }

    try {
        m.reply("Please wait...")

        // Brat API
        const url = `https://api-faa.my.id/faa/brathd?text=${encodeURIComponent(text)}`

        // Download image
        const res = await fetch(url)
        const buffer = Buffer.from(await res.arrayBuffer())

        // Sticker metadata (exif)
        let exif = {}

        if (text) {
            const [packname, author] = text.split(/[,|\-+&]/)
            exif = {
                packName: packname || '',
                packPublish: author || ''
            }
        }

        // Send as sticker
        await conn.sendSticker(m.chat, buffer, m, exif)

    } catch (e) {
        console.error(e)
        m.reply(e.message || "Error occurred")
    }
}

handler.help = ['brat <text>']
handler.tags = ['sticker']
handler.command = /^brat$/i
handler.register = true

export default handler