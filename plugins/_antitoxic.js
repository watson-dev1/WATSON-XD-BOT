let badwordRegex = /anj(k|g)|ajn?(g|k)|a?njin(g|k)|bajingan|b(a?n)?gsa?t|ko?nto?l|me?me?(k|q)|pe?pe?(k|q)|meki|titi(t|d)|pe?ler|tetek|toket|ngewe|go?blo?k|to?lo?l|idiot|(k|ng)e?nto?(t|d)|jembut|bego|dajj?al|janc(u|o)k|pantek|puki ?(mak)?|kimak|kampang|lonte|col(i|mek?)|pelacur|henceu?t|nigga|fuck|dick|bitch|tits|bastard|asshole|dontol|kontoi|ontol/i // add more yourself

export function before(m, { isBotAdmin }) {
    if (m.isBaileys && m.fromMe) return true;

    // Safety check: Ensure database and chat/user entries exist before checking properties
    if (!global.db.data || !global.db.data.chats || !global.db.data.chats[m.chat]) return true;
    if (!global.db.data.users || !global.db.data.users[m.sender]) return true;

    let chat = global.db.data.chats[m.chat];
    let user = global.db.data.users[m.sender];
    
    // Ensure m.text exists before running regex to avoid crashes on media messages
    let isBadword = m.text ? badwordRegex.exec(m.text) : null;

    if (chat.antiBadword && isBadword) {
        // Initialize warning count if it doesn't exist
        user.warning = (user.warning || 0) + 1;
        
        m.reply(`⚠️ Watch your language! Warning ${user.warning}/5`);

        if (user.warning >= 5) {
            user.warning = 0; // reset warnings
            if (m.isGroup && isBotAdmin) {
                this.groupParticipantsUpdate(m.chat, [m.sender], "remove");
                m.reply(`🚫 ${m.pushName} has been removed for repeated bad language.`);
            }
        }
    }

    return true;
}