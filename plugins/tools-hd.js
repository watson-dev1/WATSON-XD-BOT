let handler = async (m, { conn }) => {
  try {
    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || ''

    if (!mime.startsWith('image/')) {
      return m.reply('❌ Please reply to an image')
    }

    m.reply('⏳ Processing...')

    const img = await q.download()

    const form = new FormData()
    form.append('scale', '2')
    form.append('image', new Blob([img], { type: mime }))

    const res = await fetch('https://api2.pixelcut.app/image/upscale/v1', {
      method: 'POST',
      headers: { 'x-client-version': 'web' },
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
    m.reply(e.message || '❌ Failed to process image')
  }
}

handler.help = ['remini', 'hd']
handler.command = ['remini', 'hd']
handler.tags = ['tools']
handler.register = true

export default handler