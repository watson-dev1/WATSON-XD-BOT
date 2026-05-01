import axios from 'axios'

const handler = async (m, { conn, args, usedPrefix, command }) => {
    let text
    if (args.length >= 1) {
        text = args.slice(0).join(" ");
    } else if (m.quoted && m.quoted.text) {
        text = m.quoted.text
    } else throw "Please provide the text you want to quote!"
    
    if (!text) return m.reply('What text should I quote?')

    // Send a reaction to indicate processing
    await conn.sendMessage(m.chat, { react: { text: '💬', key: m.key } })

    const who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender;
    
    // Logic to remove the mention tag from the quote text itself
    const mentionRegex = new RegExp(`@${who.split('@')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g');
    const cleanText = text.replace(mentionRegex, '');
    
    const pp = await conn.profilePictureUrl(who, 'image').catch(e => 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png')
    const name = await conn.getName(who)
    
    const obj = { 
        "type": "quote", 
        "format": "png", 
        "backgroundColor": "#000000", 
        "width": 1024, 
        "height": 1024, 
        "scale": 2, 
        "messages": [{ 
            "entities": [], 
            "avatar": true, 
            "from": { 
                "id": 1, 
                "name": `${name}`, 
                "photo": { url: `${pp}` } 
            }, 
            "text": cleanText, 
            "replyMessage": {} 
        }] 
    };

    try {
        const json = await axios.post('https://bot.lyo.su/quote/generate', obj, { 
            headers: { 'Content-Type': 'application/json' } 
        });
        
        const buffer = Buffer.from(json.data.result.image, 'base64');
        
        // Use global variables for pack/author if they exist
        let exif = { 
            packName: global.stickpack || 'watsonxd', 
            packPublish: global.stickauth || 'WATSON-XD-BOT',
        }
        
        await conn.sendSticker(m.chat, buffer, m, exif)
        
        // Success reaction
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        
    } catch (e) {
        console.error(e)
        m.reply("❌ Failed to generate the quote sticker. The API might be down.")
    }
}

handler.help = ['qc']
handler.tags = ['sticker']
handler.command = /^(qc)$/i

handler.register = true

export default handler
