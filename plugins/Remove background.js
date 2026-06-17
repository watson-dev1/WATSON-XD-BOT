/*
╔════════════════════════════════╗
║ 🧠 WATSON-XD-BOT REMOVE BG 🧠 ║
╚════════════════════════════════╝

✨ Type    : Plugins ESM
👑 Creator : WATSON-XD-BOT
🧩 Feature : AI Background Remover
🌐 Upload  : uguu.se
⚡ API     : anabot.my.id
*/

import fetch from 'node-fetch'
import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import path from 'path'

// ☁️ Upload to Uguu
async function uguu(filePath) {
  const form = new FormData()

  form.append(
    'files[]',
    fs.createReadStream(filePath)
  )

  const { data } = await axios.post(
    'https://uguu.se/upload',
    form,
    {
      headers: {
        ...form.getHeaders()
      }
    }
  )

  return data.files[0].url
}

// 🎨 Handler
let handler = async (
  m,
  { conn, usedPrefix, command, text }
) => {

  try {

    let url
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''

    // 🔗 If user sends image URL
    if (/^https?:\/\//i.test(text)) {

      url = text

    }

    // 🖼️ If user sends image
    else if (mime && mime.startsWith('image/')) {

      await conn.sendMessage(m.chat, {
        react: {
          text: '✨',
          key: m.key
        }
      })

      m.reply('🧠 Removing background... please wait')

      let buffer = await q.download?.()

      if (!buffer) {
        throw '❌ Failed to download image.'
      }

      let ext = mime.split('/')[1] || 'png'

      let tempFile = path.join(
        process.cwd(),
        `removebg_${Date.now()}.${ext}`
      )

      fs.writeFileSync(tempFile, buffer)

      // ☁️ Upload image
      url = await uguu(tempFile)

      // 🧹 Cleanup
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile)
      }

    } else {

      return m.reply(
        `
╭━━━〔 *🧠 WATSON-XD-BOT 🧠* 〕━━━⬣
┃ 📌 Usage:
┃ Reply/send image or image URL
┃
┃ ✨ Example:
┃ ${usedPrefix + command}
╰━━━━━━━━━━━━━━━━━━⬣
`.trim()
      )
    }

    // ⏳ React Processing
    await conn.sendMessage(m.chat, {
      react: {
        text: '⏳',
        key: m.key
      }
    })

    // 🌐 API Request
    const apiUrl =
      `https://anabot.my.id/api/ai/removebg?imageUrl=${encodeURIComponent(url)}&apikey=freeApikey`

    const resApi = await fetch(apiUrl)

    if (!resApi.ok) {
      throw '❌ Server error while processing image.'
    }

    const json = await resApi.json()

    if (!json.success) {
      throw '❌ Failed to remove background.'
    }

    const hasil = json.data.result

    // 🎉 Send Result
    await conn.sendMessage(
      m.chat,
      {
        image: { url: hasil },
        caption: `
╭━━━〔 ✨ SUCCESS ✨ 〕━━━⬣
┃ 🧠 Background removed!
┃ 🌿 Powered by WATSON-XD-BOT
╰━━━━━━━━━━━━━━━━━━⬣
`.trim()
      },
      { quoted: m }
    )

    // ✅ Success React
    await conn.sendMessage(m.chat, {
      react: {
        text: '✅',
        key: m.key
      }
    })

  } catch (e) {

    console.error(e)

    // ❌ Error React
    await conn.sendMessage(m.chat, {
      react: {
        text: '❌',
        key: m.key
      }
    })

    m.reply(
      `
╭━━━〔 ❌ ERROR ❌ 〕━━━⬣
┃ ⚠️ ${e.message || 'Processing failed'}
╰━━━━━━━━━━━━━━━━━━⬣
`.trim()
    )
  }
}

handler.help = ['removebg']
handler.tags = ['tools', 'ai']
handler.command = /^removebg$/i
handler.limit = true

export default handler