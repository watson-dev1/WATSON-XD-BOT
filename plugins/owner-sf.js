import fs from 'fs'

let handler = async (m, { text, usedPrefix, command }) => {
    // Check if the user provided a file path
    if (!text) throw `Uhm... where is the path?\n\nUsage:\n${usedPrefix + command} <path>\n\nExample:\n${usedPrefix + command} plugins/test.js`
    
    // Check if the user is replying to a message containing the code
    if (!m.quoted || !m.quoted.text) throw `Reply to the message (code) you want to save!`
    
    let path = `${text}`
    
    try {
        // Write the quoted text to the specified path
        await fs.writeFileSync(path, m.quoted.text)
        m.reply(`Successfully saved to *${path}*`)
    } catch (e) {
        // Handle errors (e.g., directory doesn't exist)
        m.reply(`Error saving file: ${e.message}`)
    }
}

handler.help = ['sf'].map(v => v + ' <path>')
handler.tags = ['owner']
handler.command = /^sf$/i

handler.rowner = true // Only the real owner can use this

export default handler
