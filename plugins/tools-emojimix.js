import axios from 'axios'

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (args.length < 2) {
        return m.reply(
            `Type two emojis in this format ♡\n\nExample:\n${usedPrefix + command} 😂 | 🥰`
        )
    }

    const [emoji1, emoji2] = args.join(' ').split('|').map(s => s.trim())

    if (!emoji1 || !emoji2) {
        return m.reply('Please use "|" as a separator between two emojis ♡')
    }

    // Basic emoji validation
    if (!/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(emoji1 + emoji2)) {
        return m.reply('Please use valid emojis, not text!')
    }

    await m.reply('Mixing emojis... ♡')

    try {
        const url = `https://www.restwave.my.id/tools/emojimix?emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}`
        const { data } = await axios.get(url, { responseType: 'arraybuffer' })

        const caption = `
EmojiMix created successfully ♡

(${emoji1}) | (${emoji2})
        `.trim()

        await conn.sendFile(m.chat, Buffer.from(data), 'emojimix.png', caption, m)

    } catch (e) {
        console.log(e)
        m.reply(
            '❌ Cannot mix these emojis or not supported.\nTry another combination!'
        )
    }
}

handler.help = ['emojimix']
handler.tags = ['tools']
handler.command = /^(emojimix|mixemoji|emojicampur)$/i

export default handler