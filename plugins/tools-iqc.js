let handler = async (m, { conn, args }) => {
  try {

    // No text provided
    if (!args[0]) {
      return m.reply('*Example:* .iqc Sold for 500p per image 😋')
    }

    // Loading reaction
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    // Processing message
    await m.reply(' *P R O C E S S I N G...*')

    // Local time (WIB UTC+7)
    let d = new Date()
    let time = new Date(d.getTime() + 7 * 3600000).toLocaleTimeString(
      'id-ID',
      { hour: '2-digit', minute: '2-digit', hour12: false }
    )

    // API URL
    const apiUrl = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(
      time
    )}&messageText=${encodeURIComponent(args.join(' '))}&carrierName=INDOSAT%20OORE...&batteryPercentage=${
      Math.floor(Math.random() * 100) + 1
    }&signalStrength=4&emojiStyle=apple`

    // Send result
    await conn.sendMessage(
      m.chat,
      {
        image: { url: apiUrl },
        caption: `✨ *IQC Created Successfully!*\n🕒 ${time}`
      },
      { quoted: m }
    )

  } catch (e) {
    console.error(e)
    await m.reply(`🍂 *Error:* ${e.message || e}`)
  } finally {
    // Remove loading reaction
    await conn.sendMessage(m.chat, { react: { text: '', key: m.key } })
  }
}

handler.help = ['iqc <text>']
handler.tags = ['downloader']
handler.command = /^iqc$/i
handler.register = true

export default handler