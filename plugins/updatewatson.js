import { exec } from 'child_process'

let handler = async (m, { conn, isOwner }) => {
    if (!isOwner) throw '❌ Only the main owner can run this command!'

    await m.reply('🔄 Checking for updates from GitHub...')

    // Replace with your repo URL
    const repoUrl = 'https://github.com/watson-dev1/WATSON-XD-BOT.git'

    exec('git fetch --all && git reset --hard origin/main', (error, stdout, stderr) => {
        if (error) {
            console.error(error)
            return m.reply(`❌ Update failed!\n${error.message}`)
        }
        if (stderr) {
            console.error(stderr)
            return m.reply(`⚠️ Some errors occurred:\n${stderr}`)
        }
        m.reply('✅ Bot successfully updated from GitHub!\nRestarting...')
        
        // Restart bot after update
        if (process.send) process.send('reset') // For PM2 / cluster
        else process.exit(0)
    })
}

handler.help = ['updatebot']
handler.tags = ['owner']
handler.command = /^update(bot)?$/i
handler.owner = true

export default handler
