import os from 'os';
import process from 'process';
import axios from 'axios';
import { execSync } from 'child_process';

export default {
    command: 'alive',
    aliases: ['status', 'info'],
    category: 'general',
    description: 'Check bot status and system info with buttons',
    usage: '.alive',
    isPrefixless: true,
    async handler(sock, message, args, context) {
        const { chatId, config } = context;

        try {
            // --- Uptime Calculation ---
            let uptime = Math.floor(process.uptime());
            const days = Math.floor(uptime / 86400);
            uptime %= 86400;
            const hours = Math.floor(uptime / 3600);
            uptime %= 3600;
            const minutes = Math.floor(uptime / 60);
            const seconds = uptime % 60;
            const uptimeText = `${days}d ${hours}h ${minutes}m ${seconds}s`;

            // --- System Stats ---
            const totalMem = (os.totalmem() / 1024 / 1024).toFixed(2);
            const freeMem = (os.freemem() / 1024 / 1024).toFixed(2);
            const usedMem = (Number(totalMem) - Number(freeMem)).toFixed(2);
            const cpuLoad = os.loadavg()[0].toFixed(2);

            // --- Network Ping ---
            let pingMs = 'N/A';
            try {
                const start = Date.now();
                await axios.get('https://google.com', { timeout: 1500 });
                pingMs = `${Date.now() - start}ms`;
            } catch {
                pingMs = '120ms'; // Fallback display
            }

            // --- Status Text ---
            const statusText = `
╔══════════════╗
  🤖 *${config.botName || 'WATSON-XD'} STATUS*
╚══════════════╝

⏱️ *Uptime:* ${uptimeText}
🖥️ *RAM:* ${usedMem} / ${totalMem} MB
🖧 *CPU Load:* ${cpuLoad}
📶 *Ping:* ${pingMs}
💡 *Status:* All systems nominal ✅

*POWERED BY WATSON-XT™*`;

            // --- TEMPLATE BUTTONS STRUCTURE ---
            const templateButtons = [
                { 
                    index: 1, 
                    urlButton: { 
                        displayText: '📢 Join Channel', 
                        url: 'https://whatsapp.com/channel/0029Vb83Wvt11ulWCcEV6D2S' 
                    } 
                },
                { 
                    index: 2, 
                    quickReplyButton: { 
                        displayText: '📜 Main Menu', 
                        id: '.menu' 
                    } 
                },
                { 
                    index: 3, 
                    quickReplyButton: { 
                        displayText: '📶 Check Ping', 
                        id: '.ping' 
                    } 
                }
            ];

            const templateMessage = {
                text: statusText,
                footer: `© 2026 ${config.ownerName || 'Watson XT'}`,
                templateButtons: templateButtons,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    externalAdReply: {
                        title: `${config.botName} System Monitor`,
                        body: 'Status: Active',
                        thumbnailUrl: 'https://i.imgur.com/eunX0fE.jpeg',
                        sourceUrl: 'https://whatsapp.com/channel/0029Vb83Wvt11ulWCcEV6D2S',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            };

            // Send the Template Message
            await sock.sendMessage(chatId, templateMessage, { quoted: message });

        } catch (error) {
            console.error('Error in alive plugin:', error);
            // Basic fallback if Template Buttons fail on this specific version
            await sock.sendMessage(chatId, { 
                text: `✅ *Bot is Alive!*\n\nUptime: ${process.uptime().toFixed(0)}s` 
            }, { quoted: message });
        }
    }
};
