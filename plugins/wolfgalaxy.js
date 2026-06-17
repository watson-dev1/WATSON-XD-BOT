import { makeCaption } from '../lib/watsonBrand.js'

let handler = async (m, { conn, args }) => {
    if (!args[0]) return m.reply('Example:\n.wolfgalaxy Watson')

    const text = encodeURIComponent(args.join(' '))
    const url = `https://api.nexray.eu.cc/textpro/wolf-galaxy?text=${text}`

    // react to command
    if (m.key) {
        await conn.sendMessage(m.chat, {
            react: { text: '🐺', key: m.key }
        })
    }

    // send generated image
    await conn.sendMessage(
        m.chat,
        {
            image: { url },
            caption: makeCaption('🐺 Wolf Galaxy Logo', args.join(' '))
        },
        { quoted: m }
    )
}

handler.help = ['wolfgalaxy <text>']
handler.tags = ['maker']
handler.command = /^(wolfgalaxy|wolf-galaxy)$/i

export default handler