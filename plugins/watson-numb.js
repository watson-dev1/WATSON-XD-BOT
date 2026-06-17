/**
 * 📱 WATSON-XD-BOT LUBAN SMS 📱
 * --------------------------------
 * ✨ Type    : Plugins ESM
 * 👑 Creator : WATSON-XD-BOT
 * 💎 Base By : Hilman
 * 🌐 Source  : https://lubansms.com
 */

import axios from 'axios'

// 🔢 Convert time to minutes
function atom(text) {
  const map = {
    minute: 1, minutes: 1,
    hour: 60, hours: 60,
    day: 1440, days: 1440,
    week: 10080, weeks: 10080
  }

  const [val, unit] = text.split(' ')
  return parseInt(val) * (map[unit] || 999999)
}

// 🎮 Handler
let handler = async (
  m,
  { conn, text, usedPrefix, command }
) => {

  // 📡 React loading
  await conn.sendMessage(m.chat, {
    react: {
      text: '🕒',
      key: m.key
    }
  })

  if (!text) {
    throw `
╭━━━〔 📱 WATSON-XD-BOT 📱 〕━━━⬣
┃ 📌 Example:
┃ ${usedPrefix + command} russia
┃ ${usedPrefix + command} russia|79654138229
╰━━━━━━━━━━━━━━━━━━⬣
`.trim()
  }

  const [negara, nomor] = text.split('|').map(v => v?.trim())

  const headers = {
    'user-agent': 'NB Android/1.0.0',
    'accept-encoding': 'gzip',
    system: 'Android',
    time: `${Date.now()}`,
    type: '2'
  }

  try {

    // 🌍 GET COUNTRIES + NUMBERS
    if (negara && !nomor) {

      // ⏳ React processing
      await conn.sendMessage(m.chat, {
        react: {
          text: '🌍',
          key: m.key
        }
      })

      const countryRes = await axios.get(
        `https://lubansms.com/v2/api/freeCountries?language=en`,
        { headers, timeout: 15000 }
      )

      const country = countryRes.data?.msg
        ?.find(c => c.name.toLowerCase() === negara.toLowerCase())

      if (!country) throw `❌ Country ${negara} not found`
      if (!country.online) throw `❌ Country is offline`

      const numberRes = await axios.get(
        `https://lubansms.com/v2/api/freeNumbers?countries=${negara}`,
        { headers, timeout: 15000 }
      )

      const list = numberRes.data?.msg?.filter(n => !n.is_archive) || []

      if (!list.length) throw `❌ No numbers found`

      const sorted = list.sort(
        (a, b) => atom(a.data_humans) - atom(b.data_humans)
      )

      let caption = `
╭━━━〔 📱 LUBAN SMS 📱 〕━━━⬣
┃ 🌍 Country: ${negara.toUpperCase()}
┃ 📊 Total: ${list.length}
╰━━━━━━━━━━━━━━━━━━⬣

`.trim()

      const buttons = sorted.slice(0, 5).map(n => ({
        buttonId: `${usedPrefix + command} ${negara}|${n.full_number}`,
        buttonText: { displayText: `📩 ${n.full_number}` },
        type: 1
      }))

      await conn.sendMessage(m.chat, {
        text: caption,
        buttons,
        footer: '📱 Choose number to check SMS inbox',
        headerType: 1
      }, { quoted: m })

    }

    // 📩 CHECK MESSAGES
    else if (negara && nomor) {

      await conn.sendMessage(m.chat, {
        react: {
          text: '📩',
          key: m.key
        }
      })

      const cleanNumber = nomor.replace(/\D/g, '')

      const url =
        `https://lubansms.com/v2/api/freeMessage?countries=${negara}&number=${cleanNumber}`

      const { data } = await axios.get(url, { headers, timeout: 15000 })

      if (data.code !== 0 || !Array.isArray(data.msg)) {
        throw '❌ No messages found'
      }

      let pesan = data.msg.map(m => `
╭━━━〔 📩 MESSAGE 📩 〕━━━⬣
┃ 📤 From: ${m.in_number || '-'}
┃ 📝 Text: ${m.text}
┃ ⏰ Time: ${m.data_humans}
╰━━━━━━━━━━━━━━━━━━⬣
`).join('\n')

      await conn.sendMessage(m.chat, {
        text: `
╭━━━〔 📱 INBOX ${nomor} 〕━━━⬣
┃ 🌍 Country: ${negara.toUpperCase()}
╰━━━━━━━━━━━━━━━━━━⬣

${pesan}
        `.trim()
      }, { quoted: m })

    }

  } catch (e) {

    console.error(e)

    await conn.sendMessage(m.chat, {
      react: {
        text: '❌',
        key: m.key
      }
    })

    throw `
╭━━━〔 ❌ ERROR ❌ 〕━━━⬣
┃ ⚠️ ${e.message || 'Failed to process request'}
╰━━━━━━━━━━━━━━━━━━⬣
`.trim()
  }
}

handler.help = ['numbgen']
handler.tags = ['tools']
handler.command = /^numbgen$/i
handler.limit = false
handler.register = true

export default handler