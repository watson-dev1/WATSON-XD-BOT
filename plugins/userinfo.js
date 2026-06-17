let handler = async (m, { conn }) => {
    let user = m.sender
    let number = user.split('@')[0]
    let name = m.pushName || 'Unknown'

    let txt = `
╭━━〔 👤 USER INFO 〕━━⬣
┃ 📛 Name: ${name}
┃ 📱 Number: ${number}
┃ 🆔 JID: ${user}
┃ 🏷️ Mention: @${number}
┃ 🤖 Bot: ${user === conn.user.id ? 'Yes' : 'No'}
╰━━━━━━━━━━━━━━⬣
`.trim()

    await conn.sendMessage(
        m.chat,
        {
            text: txt,
            mentions: [user]
        },
        { quoted: m }
    )
}

handler.help = ['userinfo']
handler.tags = ['tools']
handler.command = /^(userinfo|whoami|myself)$/i

export default handler