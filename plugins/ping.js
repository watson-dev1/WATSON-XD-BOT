export default {
    command: 'ping',
    aliases: ['p', 'pong'],
    category: 'general',
    description: 'Check bot response time with animated server ping map',
    usage: '.ping',
    isPrefixless: true,
    async handler(sock, message, _args) {
        const chatId = message.key.remoteJid;
        const start = Date.now();

        // Step 1: Initial ping message
        const sent = await sock.sendMessage(chatId, { text: '🏓 Pinging server...' });

        // Step 2: Simulate ping across servers with emojis
        const servers = ['🌐', '🛰️', '💻', '📡', '⚡'];
        let mapMessage = 'Ping route:\n';
        for (let i = 0; i < servers.length; i++) {
            mapMessage += servers[i] + ' → ';
            await sock.sendMessage(chatId, { text: mapMessage, edit: sent.key });
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Step 3: Calculate latency
        const latency = Date.now() - start;

        // Step 4: Visual latency bar
        const barLength = 20;
        const progress = Math.min(Math.floor(latency / 50), barLength);
        const bar = '🟩'.repeat(progress) + '⬜'.repeat(barLength - progress);

        // Step 5: Uptime info
        const uptimeSeconds = process.uptime();
        const uptime = `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${Math.floor(uptimeSeconds % 60)}s`;

        // Step 6: Final ping report
        await sock.sendMessage(chatId, {
            text: `🏓 *Pong!*\nLatency: *${latency}ms*\nUptime: *${uptime}*\n${bar}\n✅ Server reached successfully!`,
            edit: sent.key
        });
    }
};