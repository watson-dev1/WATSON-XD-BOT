let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return m.reply(
      `💬 Enter a keyword to search images on Pinterest.\nExample:\n${usedPrefix + command} scenery`
    )
  }

  try {
    await conn.sendMessage(m.chat, { react: { text: "🕒", key: m.key } })

    // Pinterest API request
    const apiUrl = `https://api.baguss.xyz/api/search/pinterest?q=${encodeURIComponent(text)}`
    const res = await fetch(apiUrl)

    if (!res.ok) {
      throw new Error(`API request failed with status ${res.status}`)
    }

    const json = await res.json()

    if (!json.results || json.results.length === 0) {
      throw new Error("❌ No images found.")
    }

    // Send up to 5 images
    for (let i = 0; i < Math.min(5, json.results.length); i++) {
      const pin = json.results[i]

      const caption =
`📌 Title: ${pin.title || 'Not available'}
👤 Author: ${pin.author?.fullname || pin.author?.username || 'Unknown'}
🔗 Pin URL: ${pin.pin_url}`

      await conn.sendMessage(
        m.chat,
        { image: { url: pin.image_url }, caption },
        { quoted: m }
      )
    }

    await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } })

  } catch (err) {
    console.error(err)
    m.reply(`⚠️ Error occurred: ${err.message}`)
  }
}

handler.help = ['pinterest <query>']
handler.tags = ['internet', 'search']
handler.command = /^pinterest$/i

export default handler