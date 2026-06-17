import { makeCaption } from '../lib/watsonBrand.js'

let handler = async (m, { conn, args }) => {
    if (args.length < 2) return m.reply('Example:\n.pornhub Watson XD')

    const text1 = encodeURIComponent(args[0])
    const text2 = encodeURIComponent(args[1])
    const url = `https://api.nexray.eu.cc/textpro/pornhub?text1=${text1}&text2=${text2}`

    // react to command
    if (m.key) {
        await conn.sendMessage(m.chat, {
            react: { text: '🟧', key: m.key }
        })
    }

    // send generated image
    await conn.sendMessage(
        m.chat,
        {
            image: { url },
            caption: makeCaption('🟧 Pornhub Logo', `${args[0]} | ${args[1]}`)
        },
        { quoted: m }
    )
}

handler.help = ['pornhub <text1> <text2>']
handler.tags = ['maker']
handler.command = /^(pornhub)$/i

export default handler