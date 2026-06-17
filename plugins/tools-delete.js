let handler = async (m, { conn, isAdmin, isBotAdmin, usedPrefix, command }) => {
    if (!m.quoted) {
        return m.reply(
            `Reply to the message you want to delete using:\n${usedPrefix + command}`
        )
    }

    // If the quoted message is from the bot itself
    if (m.quoted.fromMe) {
        await m.quoted.delete()
    } else {
        // Check admin permissions
        if (!isBotAdmin) return global.dfail('botAdmin', m, conn)
        if (!isAdmin) return global.dfail('admin', m, conn)

        let participant = m.message.extendedTextMessage.contextInfo.participant
        let stanzaId = m.message.extendedTextMessage.contextInfo.stanzaId

        await conn.sendMessage(m.chat, {
            delete: {
                remoteJid: m.chat,
                fromMe: false,
                id: stanzaId,
                participant: participant
            }
        })
    }
}

handler.help = ['del']
handler.tags = ['tools']
handler.command = /^(del|delete|hapus?)$/i
handler.register = true

export default handler