import { createHash } from 'crypto'
import fetch from 'node-fetch'

let Reg = /\|?(.*)([.|] *?)([0-9]*)$/i
let handler = async function (m, { conn, text, usedPrefix, command }) {
    let user = global.db.data.users[m.sender]
    let channelJid = '120363424621387196@newsletter'

    // Profile picture fallback
    const pp = await conn.profilePictureUrl(m.sender, "image").catch((_) => "https://cdn.phototourl.com/free/2026-04-30-ae19f7d1-2015-4d8b-8651-fb9de299f257.png")

    // Check if the user is already registered
    if (user.registered === true) {
        throw `You have already registered in the database.\nTo re-register, use /unreg <SERIAL NUMBER>`
    }

    // Generate random age between 10 and 100
    let age = Math.floor(Math.random() * 91) + 10
    user.name = m.name
    user.age = age
    user.regTime = +new Date
    user.registered = true

    // Generate Serial Number (SN)
    let sn = createHash('md5').update(m.sender).digest('hex')

    // Send registration confirmation message
    let cap = `
╭━━「 *Registration Successful* 」
│• *Name:* ${m.name}
│• *Age:* ${age} Years
│• *Status:* _Success_
│• *Serial Number:* ${sn}
╰╾•••
    `

    await conn.sendMessage(m.chat, { 
        text: cap,
        contextInfo: {
            "externalAdReply": {
                "title": " ✔️ Registration Successful",
                "body": "Welcome to the system!",
                "showAdAttribution": false,
                "mediaType": 1,
                "sourceUrl": '',
                "thumbnailUrl": pp,
                "renderLargerThumbnail": true
            }
        }
    }, m)

    // Optionally, send a voice note or any media (if needed)
    /* await conn.sendFile(m.chat, './vn/alfixddaftar.mp3', '', null, m, true) */

    // You can notify the channel (Optional)
    /* await conn.sendMessage(channelJid, {
        text: cap.trim(),
        contextInfo: {
            mentionedJid: [m.sender],
            externalAdReply: {
                title: 'System Notification',
                body: 'User Registration',
                thumbnailUrl: 'https://raw.githubusercontent.com/Fiisya/uploads/main/uploads/1747842342295.jpeg',
                sourceUrl: 'https://whatsapp.com/channel/0029Vb4fjWE1yT25R7epR110',
                mediaType: 1,
                renderLargerThumbnail: false
            }
        }
    }) */
}

handler.help = ['@verify']
handler.tags = ['info']
handler.customPrefix = /^(@verify)/i;
handler.command = new RegExp()

export default handler

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)]
}