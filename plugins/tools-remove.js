let handler = async (m, { conn, usedPrefix, command }) => {
  try {
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || ''

    if (!mime.startsWith('image/')) {
      return m.reply('❌ Please send or reply to an image')
    }

    m.reply('⏳ Processing...')

    const img = await q.download()

    const form = new FormData()
    form.append('format', 'png')
    form.append('model', 'v1')
    form.append('image', new Blob([img]))

    const res = await fetch('https://api2.pixelcut.app/image/matte/v1', {
      method: 'POST',
      headers: {
        'x-client-version': 'web'
      },
      body: form
    })

    const buffer = Buffer.from(await res.arrayBuffer())

    await conn.sendMessage(
      m.chat,
      { image: buffer },
      { quoted: m }
    )

  } catch (e) {
    console.error(e)
    m.reply(e.message || '❌ Failed to remove background')
  }
}

handler.help = ['rbg', 'removebg']
handler.command = ['rbg', 'removebg']
handler.tags = ['tools']
handler.register = true

export default handler