import fs from 'fs'
import path from 'path'

const sessionPath = './sessions'

// === AUTO CLEAR EVERY 5 MINUTES ===
setInterval(() => {
    try {
        const files = fs.readdirSync(sessionPath)

        for (const file of files) {
            const filePath = path.join(sessionPath, file)

            // Keep creds.json
            if (
                file !== 'creds.json' &&
                fs.existsSync(filePath)
            ) {
                fs.unlinkSync(filePath)
            }
        }

        console.log('✅ Sessions auto cleared')

    } catch (e) {
        console.log('❌ Auto clear session error:', e)
    }
}, 300000) // 5 minutes


let handler = async (m, { conn, isOwner }) => {
    if (!isOwner) return global.dfail('owner', m, conn)

    try {
        const files = fs.readdirSync(sessionPath)

        for (const file of files) {
            const filePath = path.join(sessionPath, file)

            if (
                file !== 'creds.json' &&
                fs.existsSync(filePath)
            ) {
                fs.unlinkSync(filePath)
            }
        }

        m.reply(
`╭━━〔 ✅ SESSION CLEARED ✅ 〕━━⬣
┃ 🧹 sᴇssɪᴏɴ ғɪʟᴇs ᴄʟᴇᴀʀᴇᴅ
┃ 🔄 ᴀᴜᴛᴏ ᴄʟᴇᴀʀ ᴇᴠᴇʀʏ 5 ᴍɪɴs
╰━━━━━━━━━━━━━━━━━━⬣`
        )

    } catch (e) {
        console.error(e)

        m.reply(
`╭━━〔 ❌ CLEAR FAILED ❌ 〕━━⬣
┃ ${e.message}
╰━━━━━━━━━━━━━━━━━━⬣`
        )
    }
}

handler.help = ['clearsession1']
handler.tags = ['owner']
handler.command = ['clearsession1', 'cs']
handler.owner = true

export default handler