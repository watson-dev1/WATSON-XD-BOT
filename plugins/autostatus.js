import fs from 'fs';
import path from 'path';
import { dataFile } from '../lib/paths.js';
import store from '../lib/lightweight_store.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);

const configPath = dataFile('autoStatus.json');

// Ensure config exists
if (!HAS_DB && !fs.existsSync(configPath)) {
    if (!fs.existsSync(path.dirname(configPath))) fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({ enabled: false, reactOn: false }, null, 2));
}

// Floral emoji set
const floralEmojis = ['🌹', '💜', '🥳', '🇿🇼'];

// Random picker
function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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

// Read/write config
async function readConfig() {
    try {
        if (HAS_DB) {
            const config = await store.getSetting('global', 'autoStatus');
            return config || { enabled: false, reactOn: false };
        } else {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return { enabled: !!config.enabled, reactOn: !!config.reactOn };
        }
    } catch (error) {
        console.error('Error reading auto status config:', error);
        return { enabled: false, reactOn: false };
    }
}

async function writeConfig(config) {
    try {
        if (HAS_DB) await store.saveSetting('global', 'autoStatus', config);
        else fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Error writing auto status config:', error);
    }
}

async function isAutoStatusEnabled() { return (await readConfig()).enabled; }
async function isStatusReactionEnabled() { return (await readConfig()).reactOn; }

// Keep track of statuses already reacted to
const reactedStatus = new Set();

// React to a status with a random floral emoji
async function reactToStatus(sock, statusKey) {
    try {
        const enabled = await isStatusReactionEnabled();
        if (!enabled || reactedStatus.has(statusKey.id)) return;

        const emoji = random(floralEmojis);

        await sock.relayMessage('status@broadcast', {
            reactionMessage: {
                key: {
                    remoteJid: 'status@broadcast',
                    id: statusKey.id,
                    participant: statusKey.participant || statusKey.remoteJid,
                    fromMe: false
                },
                text: emoji
            }
        }, {
            messageId: statusKey.id,
            statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
        });

        reactedStatus.add(statusKey.id);
        console.log(`✅ Reacted to status with ${emoji}`);
    } catch (error) {
        console.error('❌ Error reacting to status:', error.message);
    }
}

// Handle new status updates
async function handleStatusUpdate(sock, status) {
    try {
        if (!(await isAutoStatusEnabled())) return;

        await new Promise(resolve => setTimeout(resolve, 1000)); // slight delay

        // Extract the key from any of the possible fields
        const key = status.messages?.[0]?.key || status.key || status.reaction?.key;
        if (!key || key.remoteJid !== 'status@broadcast') return;

        await sock.readMessages([key]);
        console.log('✅ Viewed status');

        await reactToStatus(sock, key);

    } catch (error) {
        console.error('❌ Error in auto status view:', error.message);
    }
}

export default {
    command: 'autostatus1',
    aliases: ['autoview1', 'statusview1'],
    category: 'owner',
    description: 'Automatically view and react to WhatsApp statuses',
    usage: '.autostatus1 <on|off|react on|react off>',
    ownerOnly: true,
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        try {
            const config = await readConfig();

            if (!args || args.length === 0) {
                await sock.sendMessage(chatId, {
                    text: `🔄 *Auto Status Settings*\n\n` +
                        `📱 *Auto Status View:* ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                        `💫 *Status Reactions:* ${config.reactOn ? '✅ Enabled' : '❌ Disabled'}\n` +
                        `🗄️ *Storage:* ${HAS_DB ? 'Database' : 'File System'}\n\n` +
                        `*Commands:*\n` +
                        `• \`.autostatus1 on\` - Enable auto view\n` +
                        `• \`.autostatus1 off\` - Disable auto view\n` +
                        `• \`.autostatus1 react on\` - Enable reaction\n` +
                        `• \`.autostatus1 react off\` - Disable reaction`,
                    ...channelInfo
                }, { quoted: message });
                return;
            }

            const command = args[0].toLowerCase();
            if (command === 'on') { config.enabled = true; await writeConfig(config); await sock.sendMessage(chatId, { text: '✅ *Auto status view enabled!*', ...channelInfo }, { quoted: message }); }
            else if (command === 'off') { config.enabled = false; await writeConfig(config); await sock.sendMessage(chatId, { text: '❌ *Auto status view disabled!*', ...channelInfo }, { quoted: message }); }
            else if (command === 'react') {
                if (!args[1] || !['on','off'].includes(args[1].toLowerCase())) return await sock.sendMessage(chatId, { text: '❌ *Specify on/off for reactions!*', ...channelInfo }, { quoted: message });
                config.reactOn = args[1].toLowerCase() === 'on';
                await writeConfig(config);
                await sock.sendMessage(chatId, { text: config.reactOn ? '💫 *Status reactions enabled!*' : '❌ *Status reactions disabled!*', ...channelInfo }, { quoted: message });
            }
            else {
                await sock.sendMessage(chatId, { text: '❌ *Invalid command!*', ...channelInfo }, { quoted: message });
            }
        } catch (error) {
            console.error('Error in autostatus command:', error);
            await sock.sendMessage(chatId, { text: `❌ *Error occurred!* ${error.message}`, ...channelInfo }, { quoted: message });
        }
    },
    handleStatusUpdate,
    isAutoStatusEnabled,
    isStatusReactionEnabled,
    reactToStatus,
    readConfig,
    writeConfig
};