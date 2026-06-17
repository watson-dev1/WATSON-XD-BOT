import FormData from "form-data"
import fetch from "node-fetch"

let handler = async (m, { conn }) => {
    try {
        let q = m.quoted ? m.quoted : m
        let mime = (q.msg || q).mimetype || ''

        if (!mime.startsWith('image/')) {
            return m.reply('❌ Please reply to an image.')
        }

        await m.reply('⏳ Uploading to Catbox...')

        let buffer = await q.download()

        let form = new FormData()
        form.append("reqtype", "fileupload")
        form.append("userhash", "")
        form.append("fileToUpload", buffer, {
            filename: "upload.jpg",
            contentType: mime
        })

        let res = await fetch("https://catbox.moe/user/api.php", {
            method: "POST",
            body: form
        })

        let url = await res.text()

        if (!url || !url.startsWith("http")) {
            throw new Error("Upload failed")
        }

        await conn.sendMessage(m.chat, {
            text: `✔ *Upload Successful!*\n\n🔗 URL:\n${url}`
        }, { quoted: m })

    } catch (e) {
        console.error(e)
        m.reply(`❌ Error: ${e.message}`)
    }
}

handler.help = ['url']
handler.tags = ['tools']
handler.command = /^url$/i
handler.register = true

export default handler