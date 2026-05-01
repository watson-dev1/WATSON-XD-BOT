import { createHash } from 'crypto'

let handler = async function (m, { conn, text, usedPrefix }) {
  // Generate a unique serial number using MD5 hash
  let sn = createHash('md5').update(m.sender).digest('hex')

  // Send the message with the serial number and interactive buttons
  await conn.sendMessage(
    m.chat,
    {
      text: `Your Serial Number: ${sn}`,
      footer: 'WATSON-XD-BOT',
      buttons: [
        {
          buttonText: { displayText: 'Unregister' },
          buttonId: `.unreg ${sn}`, // Command for unregistering
        },
        {
          buttonText: { displayText: 'Copy Serial Number' },
          buttonId: `.copy ${sn}`, // Command for copying serial number
        }
      ],
      headerType: 1
    }
  )
}

handler.help = ['checksn']
handler.tags = ['xp']
handler.command = /^(checksn)$/i
handler.register = true

export default handler