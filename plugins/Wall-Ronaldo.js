import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command }) => {
  try {
    let cristiano = (
      await axios.get(
        'https://raw.githubusercontent.com/Guru322/api/Guru/BOT-JSON/CristianoRonaldo.json'
      )
    ).data

    let ronaldo =
      cristiano[Math.floor(Math.random() * cristiano.length)]

    await conn.sendButton(
      m.chat,
      '*Siiiuuuuuu*',
      '*WATSON-XD-BOT*',
      ronaldo,
      [['⚽ NEXT ⚽', `${usedPrefix + command}`]],
      m
    )

  } catch (e) {
    console.log(e)
    m.reply('Error fetching Ronaldo image.')
  }
}

handler.help = ['cr7', 'ronaldo']
handler.tags = ['fun']
handler.command = /^(ronaldo|cr7)$/i

export default handler