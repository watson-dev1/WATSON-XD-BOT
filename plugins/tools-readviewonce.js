let handler = async (m, { conn }) => {
    if (!m.quoted) {
        return m.reply("Reply to an image/video you want to view")
    }

    const quoted = m.quoted

    // Check if it's view-once media
    if (quoted.mediaMessage?.[quoted?.mediaType]?.viewOnce) {
        let msg = await m.getQuotedObj()?.message
        let type = Object.keys(msg)[0]

        let media =
            await quoted?.download() ||
            await m.getQuotedObj().download()

        if (!media) {
            return m.reply("❌ Failed to extract media!")
        }

        await conn.sendFile(
            m.chat,
            media,
            'viewonce.mp4',
            msg[type]?.caption || '',
            m
        )

    } else {
        m.reply("❌ This is not a view-once message.")
    }
}

handler.help = ['vv']
handler.tags = ['tools']
handler.command = /^rvo|vv/i
handler.register = true

export default handler