// upscale.js — Fixed Version

import FormData from "form-data"
import fetch from "node-fetch"

let handler = async (m, { conn, usedPrefix, command }) => {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ""

    if (!/image\/(jpe?g|png|webp)/.test(mime)) {
        return m.reply(
`📸 Reply an image first
Example:
${usedPrefix + command} (reply image)`
        )
    }

    await m.reply("⏳ Uploading image...")

    // DOWNLOAD IMAGE
    let buffer = await q.download()

    // === UPLOAD TO UGUU ===
    let form = new FormData()
    form.append("files[]", buffer, {
        filename: "image.jpg",
        contentType: mime
    })

    let up
    try {
        let res = await fetch("https://uguu.se/upload.php", {
            method: "POST",
            body: form
        })

        up = await res.json()
    } catch (e) {
        console.log(e)
        return m.reply("❌ Failed to upload image")
    }

    let imageUrl = up?.files?.[0]?.url
    if (!imageUrl) return m.reply("❌ Upload failed")

    await m.reply("🔍 Upscaling image...")

    // === UPSCALE API ===
    let api
    try {
        let res = await fetch(
            `https://api.ootaizumi.web.id/tools/upscale?imageUrl=${encodeURIComponent(imageUrl)}`
        )
        api = await res.json()
    } catch (e) {
        console.log(e)
        return m.reply("❌ Upscale API error")
    }

    let finalImageUrl = api?.result?.imageUrl
    if (!api?.status || !finalImageUrl) {
        return m.reply("❌ Upscale failed")
    }

    // === SEND RESULT ===
    try {
        let img = await fetch(finalImageUrl)
        let buf = Buffer.from(await img.arrayBuffer())

        await conn.sendMessage(m.chat, {
            image: buf,
            caption: `✅ *Upscale Complete!*\n\n📏 Size: ${api.result.size || "-"}`
        }, { quoted: m })

    } catch (e) {
        console.log(e)
        m.reply("❌ Failed to send image")
    }
}

handler.help = ["upscale"]
handler.tags = ["tools"]
handler.command = /^upscale$/i
handler.register = false

export default handler