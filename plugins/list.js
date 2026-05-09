import config from '../config.js';
import commandHandler from '../lib/commandHandler.js';
import path from 'path';
import fs from 'fs';

/**
 * Format current time according to bot timezone
 */
function formatTime() {
    const now = new Date();
    const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: config.timeZone || 'UTC'
    };
    return now.toLocaleTimeString('en-US', options);
}

/**
 * Menu styles with stunning formatting
 */
const menuStyles = [
    {
        render({ info, categories, prefix }) {
            let t = `╭━━『 *WATSON-XD-BOT MENU* 』━⬣\n`;
            t += `┃ ✨ *Bot: ${info.bot}*\n`;
            t += `┃ ⚡ *Prefix: ${info.prefix}*\n`;
            t += `┃ 📦 *Plugins: ${info.total}*\n`;
            t += `┃ 💎 *Version: ${info.version}*\n`;
            t += `┃ ⏰ *Time: ${info.time}*\n`;
            for (const [cat, cmds] of categories) {
                const emoji = {
                    admin: '🛡',
                    fun: '🎉',
                    download: '📥',
                    group: '👥',
                    general: '📌'
                }[cat.toLowerCase()] || '📂';
                t += `┃━━━ ${emoji} *${cat.toUpperCase()}* ━✦\n`;
                for (const c of cmds)
                    t += `┃ ➤ ${prefix}${c}\n`;
            }
            t += `╰━━━━━━━━━━━━━━━⬣`;
            return t;
        }
    },
    {
        render({ info, categories, prefix }) {
            let t = `◈╭─❍「 *WATSON-XD-BOT MENU* 」❍\n`;
            t += `◈├• 🌟 *Bot: ${info.bot}*\n`;
            t += `◈├• ⚙️ *Prefix: ${info.prefix}*\n`;
            t += `◈├• 🍫 *Plugins: ${info.total}*\n`;
            t += `◈├• 💎 *Version: ${info.version}*\n`;
            t += `◈├• ⏰ *Time: ${info.time}*\n`;
            for (const [cat, cmds] of categories) {
                const emoji = {
                    admin: '🛡',
                    fun: '🎉',
                    download: '📥',
                    group: '👥',
                    general: '📌'
                }[cat.toLowerCase()] || '📂';
                t += `◈├─❍「 ${emoji} *${cat.toUpperCase()}* 」❍\n`;
                for (const c of cmds)
                    t += `◈├• ${prefix}${c}\n`;
            }
            t += `◈╰──★─☆──♪♪─❍`;
            return t;
        }
    }
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const imagePath = path.join(process.cwd(), 'assets/thumb.png');

export default {
    command: 'menu',
    aliases: ['help', 'commands', 'h', 'list'],
    category: 'general',
    description: 'Show all commands or details of a specific command',
    usage: '.menu [command]',
    async handler(sock, message, args, context) {
        const { chatId, channelInfo } = context;
        const prefix = config.prefixes?.[0] || '.';

        // Individual command info
        if (args.length) {
            const searchTerm = args[0].toLowerCase();
            let cmd = commandHandler.commands.get(searchTerm) 
                   || commandHandler.commands.get(commandHandler.aliases.get(searchTerm));

            if (!cmd) {
                return sock.sendMessage(chatId, {
                    text: `❌ Command "${args[0]}" not found.\n\nUse ${prefix}menu to see all commands.`,
                    ...channelInfo
                }, { quoted: message });
            }

            const text = `╭━━━━━━━━━━━━━━⬣
┃ 📌 *COMMAND INFO*
┃
┃ ⚡ *Command:* ${prefix}${cmd.command}
┃ 📝 *Desc:* ${cmd.description || 'No description'}
┃ 📖 *Usage:* ${cmd.usage || `${prefix}${cmd.command}`}
┃ 💡 *Example:* ${cmd.example || 'Not provided'}
┃ 🏷️ *Category:* ${cmd.category || 'misc'}
┃ 🔖 *Aliases:* ${cmd.aliases?.length ? cmd.aliases.map(a => prefix + a).join(', ') : 'None'}
╰━━━━━━━━━━━━━━⬣`;

            if (fs.existsSync(imagePath)) {
                return sock.sendMessage(chatId, {
                    image: { url: imagePath },
                    caption: text,
                    ...channelInfo
                }, { quoted: message });
            }

            return sock.sendMessage(chatId, { text, ...channelInfo }, { quoted: message });
        }

        // Full menu
        const style = pick(menuStyles);
        const text = style.render({
            info: {
                bot: config.botName,
                prefix: prefix,
                total: commandHandler.commands.size,
                version: config.version || "6.0.0",
                time: formatTime()
            },
            categories: commandHandler.categories,
            prefix
        });

        if (fs.existsSync(imagePath)) {
            await sock.sendMessage(chatId, {
                image: { url: imagePath },
                caption: text,
                ...channelInfo
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text, ...channelInfo }, { quoted: message });
        }
    }
};