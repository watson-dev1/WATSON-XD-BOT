import fetch from 'node-fetch'
import { sticker } from '../lib/sticker.js'

let handler = async (m, { text, conn, usedPrefix, command }) => {
  if (!text) return m.reply(
    `Send command *${usedPrefix + command} text*\n\nExample: *${usedPrefix + command} hello Watson*`
  )

  // Send loading reaction
  await conn.sendMessage(m.chat, {
    react: { text: '🕐', key: m.key }
  })

  try {
    // Hugging Face API Endpoint
    const api = `https://alfixd-brat.hf.space/maker/brat?text=${encodeURIComponent(text)}&background=%23FFFFFF&color=%23000000`
    const res = await fetch(api)
    if (!res.ok) throw 'API Error or Service Unavailable'

    const json = await res.json()
    if (json.status !== 'success') throw 'API failed to return an image'

    // Fetch the resulting image URL
    const imgRes = await fetch(json.image_url)
    if (!imgRes.ok) throw 'Failed to download generated image'

    const buffer = await imgRes.buffer()

    // Convert to sticker using global metadata
    const stiker = await sticker(buffer, false, `${global.stickpack}`, `${global.stickauth}`)
    
    if (stiker) {
      await conn.sendMessage(m.chat, { sticker: stiker }, { quoted: m })
      
      // Success reaction
      await conn.sendMessage(m.chat, {
        react: { text: '✅', key: m.key }
      })
    } else {
      throw 'Sticker conversion failed'
    }

  } catch (e) {
    console.error(e)
    m.reply('🚫 Failed to create the sticker!')

    // Error reaction
    await conn.sendMessage(m.chat, {
      react: { text: '❌', key: m.key }
    })
  }
}

handler.help = ['brat']
handler.tags = ['sticker']
handler.command = /^(brat)$/i
handler.limit = true
handler.premium = false
handler.group = false

export default handler
