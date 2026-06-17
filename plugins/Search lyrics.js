import fetch from 'node-fetch'

let handler = async (m, { conn, args }) => {
    if (!args[0]) return m.reply('Example:\n.lyrics Shape of You')

    const query = encodeURIComponent(args.join(' '))
    const url = `https://api.nexray.eu.cc/search/lyrics?q=${query}`

    try {
        const res = await fetch(url)
        const json = await res.json()

        if (!json.status || !json.result) {
            return m.reply('❌ Lyrics not found.')
        }

        const data = json.result

        const title = data.title || 'Unknown'
        const artist = data.artist || 'Unknown'

        // 🔥 FIX: handle object or string
        let lyrics =
            typeof data.lyrics === 'string'
                ? data.lyrics
                : data.lyrics?.text ||
                  data.lyrics?.content ||
                  JSON.stringify(data.lyrics, null, 2)

        const text = `🎵 *${title}* - ${artist}\n\n${lyrics}`

        m.reply(text)

    } catch (e) {
        console.error(e)
        m.reply('❌ Error fetching lyrics.')
    }
}

handler.help = ['lyrics <song name>']
handler.tags = ['search']
handler.command = /^(lyrics|lyric)$/i

export default handler