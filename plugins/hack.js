export default {
    command: 'hack',
    aliases: ['fakehack', 'prankhack'],
    category: 'fun',
    description: 'Simulate a hack sequence (fun prank)',
    usage: '.hack <target>',
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const target = args?.[0] || 'target';
        try {
            await sendWithDelay(sock, chatId, '*💻 Initializing hack sequence...*', message, 1500);
            await sendWithDelay(sock, chatId, '*🔌 Establishing secure connection to the server...*', message, 1500);
            await sendWithDelay(sock, chatId, '*🛡 Bypassing firewalls and security protocols...*', message, 1500);
            await updateProgress(sock, message, 'Bypassing firewalls', 4, chatId);

            await sendWithDelay(sock, chatId, '*🔐 Gaining access to encrypted database...*', message, 2000);
            await sendWithDelay(sock, chatId, '*🔑 Cracking encryption keys...*', message, 1500);
            await updateProgress(sock, message, 'Cracking encryption', 6, chatId);

            await sendWithDelay(sock, chatId, '*📥 Downloading sensitive data from server...*', message, 1000);
            await updateProgress(sock, message, 'Downloading files', 5, chatId);

            await sendWithDelay(sock, chatId, '*🔒 Planting a backdoor for future access...*', message, 2500);
            
            // Random fake data
            const fakeData = [
                `User credentials found: ${randomString(8)}:${randomString(12)}`,
                `Admin password decrypted: ${randomString(10)}`,
                `Confidential files downloaded: ${Math.floor(Math.random() * 100 + 1)} files`,
                `IP addresses captured: ${Math.floor(Math.random() * 50 + 1)}`,
            ];
            for (let data of fakeData) {
                await sendWithDelay(sock, chatId, `📂 ${data}`, message, 1000);
            }

            await sendWithDelay(sock, chatId, `*💥 Hack complete! 🎯 Target "${target}" successfully compromised.*`, message, 1000);
            await sendWithDelay(sock, chatId, '*🤖 Mission accomplished. Logging off...*', message, 1000);
        } catch (error) {
            console.error('Error in hack sequence:', error);
            await sock.sendMessage(chatId, { text: '*⚠️ An error occurred during the hack sequence. Please try again later.*' }, { quoted: message });
        }
    }
};

// Helper: send message after a delay
async function sendWithDelay(sock, chatId, text, message, delayMs) {
    await sock.sendMessage(chatId, { text }, { quoted: message });
    await delay(delayMs);
}

// Helper: delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Update progress bar in the same message
async function updateProgress(sock, message, taskName, steps, chatId) {
    const progressBarLength = 20;
    let msgObj = await sock.sendMessage(chatId, { text: `*${taskName}:* [${'░'.repeat(progressBarLength)}]` }, { quoted: message });
    for (let i = 1; i <= steps; i++) {
        const progress = Math.round((i / steps) * progressBarLength);
        const bar = '█'.repeat(progress) + '░'.repeat(progressBarLength - progress);
        await sock.sendMessage(chatId, { text: `*${taskName}:* [${bar}]` }, { quoted: message });
        await delay(1000);
    }
}

// Generate random string
function randomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}