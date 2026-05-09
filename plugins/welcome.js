import { isWelcomeOn, getWelcome } from '../lib/index.js';

export default {
    command: 'welcome',
    aliases: ['setwelcome'],
    category: 'admin',
    description: 'Configure welcome message for the group',
    usage: '.welcome [on/off/message]',
    groupOnly: true,
    adminOnly: true,
    async handler(sock, message, args, context) {
        const { chatId } = context;
        const matchText = args.join(' ');
        await handleWelcome(sock, chatId, message, matchText);
    }
};

async function handleJoinEvent(sock, chatId, participants) {
    if (!await isWelcomeOn(chatId)) return;

    const customMessage = await getWelcome(chatId);
    const groupMetadata = await sock.groupMetadata(chatId);
    const groupName = groupMetadata.subject;
    const groupDesc = groupMetadata.desc || 'No description available';

    const channelInfo = {
        contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363424621387196@newsletter',
                newsletterName: 'WATSON-XD-BOT',
                serverMessageId: -1
            }
        }
    };

    for (const participant of participants) {
        const participantId = typeof participant === 'string' ? participant : (participant.id || participant.toString());
        let displayName = participantId.split('@')[0];

        // Fetch display name from profile or group metadata
        try {
            const contact = await sock.getBusinessProfile(participantId);
            if (contact?.name) displayName = contact.name;
            else {
                const userParticipant = groupMetadata.participants.find(p => p.id === participantId);
                if (userParticipant?.name) displayName = userParticipant.name;
            }
        } catch {}

        // Prepare welcome message text
        const welcomeText = customMessage
            ? customMessage
                .replace(/{user}/g, `@${displayName}`)
                .replace(/{group}/g, groupName)
                .replace(/{description}/g, groupDesc)
            : generateFallbackText(displayName, groupName, groupDesc, groupMetadata.participants.length);

        // Try to send image card
        try {
            let profilePicUrl = 'https://img.pyrocdn.com/dbKUgahg.png';
            try {
                const pic = await sock.profilePictureUrl(participantId, 'image');
                if (pic) profilePicUrl = pic;
            } catch {}

            const apiUrl = `https://api.some-random-api.com/welcome/img/2/gaming3?type=join&textcolor=green&username=${encodeURIComponent(displayName)}&guildName=${encodeURIComponent(groupName)}&memberCount=${groupMetadata.participants.length}&avatar=${encodeURIComponent(profilePicUrl)}`;

            const response = await fetch(apiUrl);
            if (response.ok) {
                const imageBuffer = Buffer.from(await response.arrayBuffer());
                await sock.sendMessage(chatId, {
                    image: imageBuffer,
                    caption: welcomeText,
                    mentions: [participantId],
                    ...channelInfo
                });
                continue;
            }
        } catch (imageError) {
            console.log('Image generation failed, falling back to text.');
        }

        // Fallback: text message
        await sock.sendMessage(chatId, {
            text: welcomeText,
            mentions: [participantId],
            ...channelInfo
        });
    }
}

// Stylish fallback text generator
function generateFallbackText(displayName, groupName, groupDesc, memberCount) {
    const now = new Date();
    const timeString = now.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    return `
╭━━━━━━━━━━━━━━━╮
┃ 👋 WELCOME @${displayName}
┃ 🏠 Group: ${groupName}
┃ 👥 Members: ${memberCount}
┃ ⏰ Joined: ${timeString}
╰━━━━━━━━━━━━━━━╯

🎉 Hey @${displayName}, welcome to *${groupName}*!
📖 *Group Description:*
${groupDesc}

💡 Powered by WATSON-XD-BOT
`;
}

export { handleJoinEvent };