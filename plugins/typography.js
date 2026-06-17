import { makeCaption } from '../lib/watsonBrand.js'

let handler = async (m, { conn, args }) => {
    if (!args[0]) return m.reply('Example:\n.typography Watson')

    const text = encodeURIComponent(args.join(' '))
    const url = `https://api.nexray.eu.cc/textpro/typography?text=${text}`

    // react
    if (m.key) {
        await conn.sendMessage(m.chat, {
            react: { text: '✍️', key: m.key }
        })
    }

    // send image
    await conn.sendMessage(
        m.chat,
        {
            image: { url },
            caption: makeCaption('✍️ Typography Logo', args.join(' '))
        },
        { quoted: m }
    )
}

handler.help = ['typography <text>']
handler.tags = ['maker']
handler.command = /^(typography)$/i

export default handler