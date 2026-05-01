import { createHash } from 'crypto'

let Reg = /\|?(.*)([.|] *?)([0-9]*)$/i
let handler = async function (m, { text, usedPrefix }) {
  let user = global.db.data.users[m.sender]

  // Check if the user is already registered
  if (user.registered === true) {
    throw `You are already registered.\nWant to re-register? Use ${usedPrefix}unreg <SERIAL NUMBER>`
  }

  // Validate the format (name.age)
  if (!Reg.test(text)) {
    throw `Invalid format. Example: *${usedPrefix}register name.age*\n\nExample: ${usedPrefix}register watson.22`
  }

  let [_, name, splitter, age] = text.match(Reg)

  // Validate that name and age are provided
  if (!name) throw 'Name cannot be empty (Alphanumeric only).'
  if (!age) throw 'Age cannot be empty (Numeric only).'
  
  age = parseInt(age)

  // Validate age range
  if (age > 60) throw 'You are too old to use this bot, please understand technology first 😂'
  if (age < 8) throw 'Sorry, under age users are not allowed 😂'

  // Register user data
  user.name = name.trim()
  user.age = age
  user.regTime = Date.now()
  user.registered = true

  // Generate a unique serial number based on WhatsApp sender
  let sn = createHash('md5').update(m.sender).digest('hex')

  // Add the option for the user to set a profile picture (optional)
  if (m.hasMedia) {
    let profilePic = await m.downloadMedia()
    user.profilePic = profilePic
  }

  // Send registration confirmation message with buttons
  await conn.sendMessage(
    m.chat, 
    {
      text: `Registration successful! \nWelcome, ${name}!`,
      title: 'Registration Confirmation',
      footer: 'WATSON-XD-BOT',
      interactiveButtons: [
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: 'View Profile',
            id: `.profile ${sn}`
          })
        },
        {
          name: 'cta_copy',
          buttonParamsJson: JSON.stringify({
            display_text: 'Copy Serial Number',
            copy_code: `${sn}`
          })
        }
      ]
    }, 
    { quoted: m }
  )

  m.reply(`
Registration successful!

╭─「 Info 」
│ Name: ${name}
│ Age: ${age} years 
╰────
Serial Number: 
${sn}

**Terms of Service (TOS) - ${global.namebot}**
By using ${global.namebot}, you agree to the following terms:

1. *DO NOT MODIFY TEMPORARY TIMER/MESSAGES*
2. *NO NSFW MEDIA ALLOWED*
3. *NO SPAMMING BOT NUMBERS*
4. *CONTACT THE OWNER IF NECESSARY*

By using ${global.namebot}, you agree to the above terms.

*These terms were last updated on 28 April 2026.*

Registering means you agree with the terms.
`.trim())
}

handler.help = ['register'].map(v => v + ' <name>.<age>')
handler.command = /^(register|reg(ister)?)$/i

export default handler