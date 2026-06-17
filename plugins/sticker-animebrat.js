let handler = async (m, { conn, text, command, isBan }) => {
  if (isBan) return m.reply('🚫 You are banned!')
  if (!text) {
    return m.reply(
      `📌 Usage:\n.${command} text\nExample:\n.${command} I love anime`
    )
  }

  const api = `https://api.elrayyxml.web.id/api/maker/bratanime?text=${encodeURIComponent(text)}`

  try {
    const res = await fetch(api)
    if (!res.ok) throw new Error(`API Error: ${res.status}`)

    const contentType = (res.headers.get?.('content-type') || '').toLowerCase()

    // If API returns JSON (image URL)
    let imageURL = null

    if (contentType.includes('application/json')) {
      const json = await res.json()
      imageURL = json.result || json.url || json.image || null

      if (!imageURL) throw new Error('API did not return an image URL')

    } else {
      // API returns raw image buffer
      const arr = await res.arrayBuffer()
      const buffer = Buffer.from(arr)

      // Try sending as sticker
      if (typeof conn.sendImageAsSticker === 'function') {
        try {
          await conn.sendImageAsSticker(m.chat, buffer, m, {
            packname: 'Yareu-MD',
            author: 'AnimeBrat'
          })
          return
        } catch (e) {
          console.log('sendImageAsSticker error ->', e.message)
        }
      }

      if (typeof conn.sendSticker === 'function') {
        try {
          await conn.sendSticker(m.chat, buffer, m, {
            packname: 'Yareu-MD',
            author: 'AnimeBrat'
          })
          return
        } catch (e) {
          console.log('sendSticker error ->', e.message)
        }
      }

      try {
        await conn.sendMessage(m.chat, { sticker: buffer }, { quoted: m })
        return
      } catch (e) {
        console.log('sendMessage sticker error ->', e.message)
      }

      // fallback: image
      await conn.sendMessage(
        m.chat,
        {
          image: buffer,
          caption: `✨ Result (fallback image). Sticker support is not available on this instance.`
        },
        { quoted: m }
      )

      return
    }

    // If we got an image URL
    try {
      const imgRes = await fetch(imageURL)
      if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`)

      const arr = await imgRes.arrayBuffer()
      const buffer = Buffer.from(arr)

      if (typeof conn.sendImageAsSticker === 'function') {
        try {
          await conn.sendImageAsSticker(m.chat, buffer, m, {
            packname: 'Yareu-MD',
            author: 'AnimeBrat'
          })
          return
        } catch (e) {
          console.log('sendImageAsSticker error ->', e.message)
        }
      }

      if (typeof conn.sendSticker === 'function') {
        try {
          await conn.sendSticker(m.chat, buffer, m, {
            packname: 'Yareu-MD',
            author: 'AnimeBrat'
          })
          return
        } catch (e) {
          console.log('sendSticker error ->', e.message)
        }
      }

      try {
        await conn.sendMessage(m.chat, { sticker: buffer }, { quoted: m })
        return
      } catch (e) {
        console.log('sendMessage sticker error ->', e.message)
      }

      await conn.sendMessage(
        m.chat,
        {
          image: buffer,
          caption: '✨ Result (fallback image). Sticker not supported on this instance.'
        },
        { quoted: m }
      )

      return

    } catch (e) {
      throw new Error('Failed to download image: ' + e.message)
    }

  } catch (err) {
    console.error(err)
    return m.reply('❌ Error: ' + (err.message || String(err)))
  }
}

handler.help = ['animebrat <text>']
handler.tags = ['maker', 'sticker']
handler.command = ['animebrat', 'bratanim', 'bratanime']

export default handler