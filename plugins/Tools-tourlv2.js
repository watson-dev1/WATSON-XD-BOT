import axios from "axios"
import FormData from "form-data"

let handler = async (m, { conn }) => {
    let loadingMsg

    try {
        const q = m.quoted ? m.quoted : m
        const mime = (q.msg || q).mimetype || ""

        if (!mime) {
            return m.reply("❌ Please reply to media (image/video/audio/document).")
        }

        loadingMsg = await conn.sendMessage(
            m.chat,
            { text: "_Uploading to Nekohime CDN..._" },
            { quoted: m }
        )

        let buffer = await q.download?.()

        if (!Buffer.isBuffer(buffer)) {
            return editLoading(conn, loadingMsg, "❌ Failed to get media buffer.")
        }

        const ext = mime.split("/")[1] || "bin"
        const filename = `media_${Date.now()}.${ext}`

        const sizeKB = (buffer.length / 1024).toFixed(2)
        const sizeMB = (buffer.length / 1024 / 1024).toFixed(2)
        const size = buffer.length > 1048576 ? `${sizeMB} MB` : `${sizeKB} KB`

        const form = new FormData()
        form.append("file", buffer, {
            filename,
            contentType: mime
        })

        const res = await axios.post(
            "https://cdn.nekohime.site/upload",
            form,
            { headers: form.getHeaders() }
        )

        const file = res?.data?.files?.[0]
        const url = file?.url || file

        if (!url) {
            return editLoading(conn, loadingMsg, `❌ Upload failed.\nSize: ${size}`)
        }

        return editLoading(
            conn,
            loadingMsg,
`✔ *Uploaded to Nekohime CDN*

📁 File: ${filename}
📦 Size: ${size}
📎 Mime: ${mime}

🔗 URL:
${url}`
        )

    } catch (e) {
        console.error(e)

        if (loadingMsg) {
            return editLoading(conn, loadingMsg, `❌ Error: ${e.message}`)
        }

        m.reply(`❌ Error: ${e.message}`)
    }
}

// ===== MESSAGE EDIT HELPER =====
async function editLoading(conn, msg, text) {
    try {
        return await conn.sendMessage(
            msg.key.remoteJid,
            {
                text,
                edit: msg.key
            }
        )
    } catch {
        return conn.sendMessage(msg.key.remoteJid, { text })
    }
}

handler.help = ["tourlv2", "nkh", "uploadnkh"]
handler.tags = ["tools"]
handler.command = /^(tourlv2|nkh|uploadnkh)$/i
handler.register = true

export default handler