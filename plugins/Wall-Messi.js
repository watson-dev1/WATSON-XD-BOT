import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command }) => {
  try {
    let res = (
      await axios.get(
        'https://raw.githubusercontent.com/Guru322/api/Guru/BOT-JSON/Messi.json'
      )
    ).data

    let url =
      res[Math.floor(Math.random() * res.length)]

    await conn.sendButton(
      m.chat,
      '*Messi*',
      'WATSON-XD-BOT',
      url,
      [['⚽ NEXT ⚽', `${usedPrefix + command}`]],
      m
    )

  } catch (e) {
    console.log(e)
    m.reply('Error fetching Messi image.')
  }
}

handler.help = ['messi']
handler.tags = ['fun']
handler.command = /^(messi)$/i

export default handler