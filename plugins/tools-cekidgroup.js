import { proto } from '@whiskeysockets/baileys'

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) return m.reply(
        `❌ Please provide a WhatsApp group link!\nExample: ${usedPrefix}${command} https://chat.whatsapp.com/xxxx`
    );

    try {
        // ===== Extract invite code from link =====
        const regex = /chat\.whatsapp\.com\/([0-9A-Za-z]+)/i;
        const match = args[0].match(regex);
        if (!match || !match[1]) throw new Error('Invalid group link!');

        const code = match[1];

        // ===== Get group info without joining =====
        const info = await conn.groupInviteInfo(code);

        // Determine group type
        let groupType = 'Standard';
        if (info.announcement) groupType = 'Announcement Only';
        if (info.groupType === 'business') groupType = 'Business';
        if (info.groupType === 'community') groupType = 'Community';

        // Format expiration date
        const expiration = info.expiration
            ? new Date(info.expiration * 1000).toLocaleString()
            : 'Unknown';

        // Compose the info message
        const text = `
📌 *WhatsApp Group Info*
• Group Name: ${info.subject || 'Not available'}
• Group Type: ${groupType}
• Approx. Members: ${info.size || 'Unknown'}
• Admin Count: ${info.participants ? info.participants.filter(p => p.admin).length : 'Unknown'}
• Group Description: ${info.desc || 'No description'}
• Group ID: ${info.id || 'Unknown'}
• Invite Link: https://chat.whatsapp.com/${code}
• Expiration: ${expiration}
• Owner: ${info.owner || 'Not available'}
        `;

        m.reply(text);

    } catch (e) {
        console.error(e);
        m.reply(`❌ Failed to fetch group info: ${e.message}`);
    }
};

handler.help = ['checkgroup <link>'];
handler.tags = ['info'];
handler.command = /^checkgroup$/i;

export default handler;