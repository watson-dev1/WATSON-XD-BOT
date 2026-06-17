let handler = async (m, { conn, command }) => {

    // =========================
    // CREATE SETTINGS
    // =========================
    if (!global.db.data.settings)
        global.db.data.settings = {}

    if (!global.db.data.settings[conn.user.jid]) {
        global.db.data.settings[conn.user.jid] = {
            public: true
        }
    }

    let settings =
        global.db.data.settings[conn.user.jid]

    // =========================
    // SELF MODE
    // =========================
    if (command === 'self') {

        if (settings.public === false)
            return m.reply('⚠️ Already in SELF mode')

        settings.public = false

        return m.reply(
`✅ SELF MODE ENABLED

🔒 Only owner can use commands now.`
        )
    }

    // =========================
    // PUBLIC MODE
    // =========================
    if (command === 'public') {

        if (settings.public === true)
            return m.reply('⚠️ Already in PUBLIC mode')

        settings.public = true

        return m.reply(
`✅ PUBLIC MODE ENABLED

🌍 Everyone can now use commands.`
        )
    }
}

handler.help = ['self', 'public']
handler.tags = ['owner']
handler.command = /^(self|public)$/i
handler.owner = true

export default handler