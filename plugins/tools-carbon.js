/*
Plugin: ESM
Feature: Carbon-style code image generator
Creator: v.d
Description: Just for fun 😎
Channel: https://whatsapp.com/channel/0029VbC7FMCBadmh6lTdmI21
*/

import axios from 'axios'

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let code = ''

    // Take code from args or quoted message
    if (args.length > 0) {
        code = args.join(' ')
    } else if (m.quoted && m.quoted.text) {
        code = m.quoted.text
    } else {
        return m.reply(`❌ Please provide the code to convert into a Carbon image!\n\nExample:\n${usedPrefix + command} console.log('Hello world')\nOr reply to a message containing code with ${usedPrefix + command}`)
    }

    if (code.trim().length < 3) return m.reply('❌ The code is too short!')

    await m.reply('⏳ Generating Carbon image...')

    try {
        const url = `https://www.restwave.my.id/maker/carbon?code=${encodeURIComponent(code)}`
        const { data } = await axios.get(url, { responseType: 'arraybuffer' })

        const caption = `
✅ Carbon image successfully created!

\`\`\`Check out your stylish code snippet 🤩\`\`\`
        `.trim()

        await conn.sendFile(m.chat, Buffer.from(data), 'carbon.png', caption, m)
    } catch (e) {
        console.error('Carbon error:', e)
        m.reply('❌ Failed to generate Carbon image. Please try again later.')
    }
}

handler.help = ['carbon']
handler.tags = ['maker']
handler.command = /^(carbon|carb)$/i

export default handler