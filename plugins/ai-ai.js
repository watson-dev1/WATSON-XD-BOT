import uploadImage from '../lib/uploadImage.js'
import fetch from 'node-fetch'

let chatHistory = {}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (text?.toLowerCase().includes('resetchat')) {
        delete chatHistory[m.chat]
        return m.reply('✅ Chat history has been reset by **watson-xd-bot**!')
    }

    const quoted = m && (m.quoted || m)
    let imageUrl = ''
    let mime = (quoted?.msg || quoted)?.mimetype || quoted?.mediaType || ''

    if (quoted && /image/.test(mime) && !/webp/.test(mime)) {
        await conn.reply(m.chat, '⏳ Please wait, **watson-xd-bot** is uploading the image...', m)
        try {
            const img = await quoted.download?.()
            if (!img) throw new Error('Failed to download image.')
            imageUrl = await uploadImage(img)
        } catch (err) {
            console.error('❌ Error uploading image:', err)
            return m.reply('🚩 **watson-xd-bot** failed to upload the image. Please try again.')
        }
    }

    if (!text) throw `Example:\n${usedPrefix + command} who is elon musk?\nOr type: ${usedPrefix + command} send/reply image + prompt`

    try {
        if (/^(create|generate|image)\b/i.test(text)) {
            const resultImage = await (await fetch(`https://api.nekolabs.my.id/ai/imagen/4-fast?prompt=${encodeURIComponent(text)}&ratio=1%3A1`)).json()
            if (!resultImage.result) throw new Error('Failed to generate image.')
            await conn.sendMessage(
                m.chat,
                { image: { url: resultImage.result }, caption: `✨ ***watson-xd-bot** AI Image Generated*\nPrompt: ${text}` },
                { quoted: m }
            )
            return
        }

        if (imageUrl) {
            const apiUrl = `https://api.nekolabs.my.id/ai/gemini/nano-banana?prompt=${encodeURIComponent(text)}&imageUrl=${encodeURIComponent(imageUrl)}`
            const res = await fetch(apiUrl)
            const json = await res.json()
            if (!json || !json.result) {
                throw new Error(json?.message || "API did not return an image result.")
            }
            const imgRes = await fetch(json.result)
            const resultBuffer = await imgRes.buffer()
            await conn.sendMessage(
                m.chat,
                { image: resultBuffer, caption: `✨ ***watson-xd-bot** AI Image Result*\nPrompt: ${text}` },
                { quoted: m }
            )
            return
        }

        let chatId = m.chat
        if (!chatHistory[chatId]) chatHistory[chatId] = []
        chatHistory[chatId].push(`User: ${text}`)

        let conversation = chatHistory[chatId].join("\n")
        let apiURL = `https://api.nekolabs.my.id/ai/claude/sonnet-4?text=${encodeURIComponent(conversation)}`
        if (imageUrl) apiURL += `&imageUrl=${encodeURIComponent(imageUrl)}`

        let res = await fetch(apiURL)
        if (!res.ok) throw new Error('API did not respond.')
        let json = await res.json()

        const replyMessage = json.result || "⚠️ **watson-xd-bot** received no response from the AI."
        chatHistory[chatId].push(`**watson-xd-bot**: ${replyMessage}`)

        if (chatHistory[chatId].length > 200) {
            chatHistory[chatId] = chatHistory[chatId].slice(-200)
        }

        await conn.sendMessage(m.chat, { text: replyMessage }, { quoted: m })

    } catch (err) {
        console.error('❌ **watson-xd-bot** Error:', err)
        m.reply(`You have exceeded the limit, please type .ai resetchat to reset the chat with **watson-xd-bot**.`)
    }
}

handler.help = ['ai <text>', 'ai resetchat']
handler.tags = ['ai']
handler.command = /^ai$/i
handler.limit = true

export default handler