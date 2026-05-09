
import os from 'os';
import process from 'process';

export default {
    command: 'uptime',
    aliases: ['runtime', 'status'],
    category: 'general',
    description: 'Show bot status with full system info',
    usage: '.uptime',
    isPrefixless: true,
    async handler(sock, message) {
        const chatId = message.key.remoteJid;
        const commandHandler = (await import('../lib/commandHandler.js')).default;

        const uptimeMs = process.uptime() * 1000;

        const formatUptime = (ms) => {
            const sec = Math.floor(ms / 1000) % 60;
            const min = Math.floor(ms / (1000 * 60)) % 60;
            const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
            const day = Math.floor(ms / (1000 * 60 * 60 * 24));
            const parts = [];
            if (day) parts.push(`🌞 ${day}d`);
            if (hr) parts.push(`⏰ ${hr}h`);
            if (min) parts.push(`🕒 ${min}m`);
            parts.push(`⏳ ${sec}s`);
            return parts.join(' ');
        };

        const startedAt = new Date(Date.now() - uptimeMs).toLocaleString();
        const ramMb = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        const cpuUsage = (process.cpuUsage().user / 1024 / 1024).toFixed(2);
        const nodeVersion = process.version;
        const platform = `${os.type()} ${os.arch()} (${os.platform()})`;
        const totalCommands = commandHandler.commands.size;
        const totalChats = sock.chats?.size || 0; // Optional if your sock object tracks chats

        const text = `
╔═════════════════════
║ 🤖 *WATSON-XD-BOT STATUS*
╠═════════════════════
║ ⏱ Uptime        : ${formatUptime(uptimeMs)}
║ 🚀 Started At    : ${startedAt}
║ 📦 Plugins       : ${totalCommands} commands
║ 💾 RAM Usage     : ${ramMb} MB
║ ⚡ CPU Usage     : ${cpuUsage} MB
║ 🖥 Node.js       : ${nodeVersion}
║ 🌐 Platform      : ${platform}
║ 💬 Active Chats  : ${totalChats}
╚═════════════════════
💡 Tip: Use .help to see all commands
`;

        await sock.sendMessage(chatId, { text });
    }
};
