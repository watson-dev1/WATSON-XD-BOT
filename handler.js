import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import chalk from 'chalk';
import { getUser } from './lib/userdb.js';
import { getUser as getRpgUser } from './lib/rpg.js';
import { sendFakeQuoted } from './lib/fakequoted.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const plugins = new Map();
global.plugins = plugins;

if (!(global.passiveListeners instanceof Map)) {
    global.passiveListeners = new Map();
}

export const loadPlugins = async (dir) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            await loadPlugins(fullPath);
        } else if (file.name.endsWith('.js') && !file.name.startsWith('_')) {
            try {
                const pluginUrl = pathToFileURL(fullPath).href + `?update=${Date.now()}`;
                const module = await import(pluginUrl);
                const plugin = module.default;
                if (plugin && plugin.command) {
                    const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
                    cmds.forEach(cmd => {
                        if (typeof cmd === 'string' && cmd.trim()) {
                            plugins.set(cmd.toLowerCase().trim(), plugin);
                        }
                    });
                }
            } catch (err) {
                console.error(chalk.red(`⚠️ Failed to load plugin: ${file.name}`), err.message);
            }
        }
    }
};

const loadSpecialPlugins = async (dir) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            await loadSpecialPlugins(fullPath);
        } else if (file.name.endsWith('.js') && file.name.startsWith('_')) {
            try {
                const pluginUrl = pathToFileURL(fullPath).href + `?update=${Date.now()}`;
                await import(pluginUrl);
            } catch (err) {
                console.error(chalk.red(`⚠️ Failed to load listener: ${file.name}`), err.message);
            }
        }
    }
};

const initPlugins = async () => {
    await loadPlugins(path.join(__dirname, 'plugins'));
    await loadSpecialPlugins(path.join(__dirname, 'plugins'));
    console.log(chalk.yellow(`✅ Loaded ${plugins.size} plugin features (ESM Split).`));
};
export const pluginsReady = initPlugins();

global.reloadPlugins = async () => {
    plugins.clear();
    await loadPlugins(path.join(__dirname, 'plugins'));
    await loadSpecialPlugins(path.join(__dirname, 'plugins'));
    return plugins.size;
};

export const handler = async (denn, m) => {
    try {
        let messageKeys = Object.keys(m.message || {}).filter(key => 
            key !== 'senderKeyDistributionMessage' && key !== 'messageContextInfo'
        );
        if (messageKeys.length === 0) return;
        
        let type = messageKeys[0];
        if (type === 'ephemeralMessage' || type === 'viewOnceMessage' || type === 'viewOnceMessageV2' || type === 'viewOnceMessageV2Extension') {
            m.message = m.message[type].message;
            type = Object.keys(m.message)[0];
        }
        
        let rawJid = m.key.remoteJid || '';
        let chatJid = rawJid;
        let senderJid = m.key.participant || m.key.remoteJidAlt || rawJid;

        if (chatJid.endsWith('@newsletter')) return;

        m.chat = chatJid;
        m.sender = senderJid;
        m.isGroup = m.chat.endsWith('@g.us');
        m.mtype = type;

        const content = m.message[type];
        m.msg = content;

        const contextInfo = content?.contextInfo || {};
        m.mentionedJid = contextInfo.mentionedJid || [];
        if (Array.isArray(m.mentionedJid) === false) m.mentionedJid = [];

        if (contextInfo?.quotedMessage) {
            const quotedMsg = contextInfo.quotedMessage;
            const quotedType = Object.keys(quotedMsg)[0];
            m.quoted = {
                key: { 
                    remoteJid: m.chat, 
                    fromMe: false, 
                    id: contextInfo.stanzaId, 
                    participant: contextInfo.participant 
                },
                message: quotedMsg,
                mtype: quotedType,
                msg: quotedMsg[quotedType],
                sender: contextInfo.participant
            };
            m.quoted.text = typeof m.quoted.msg === 'string' 
                ? m.quoted.msg 
                : (m.quoted.msg?.text || m.quoted.msg?.caption || '');
        }

        m.reply = async (text, options = {}) => {
            const textStr = String(text || '').trim();
            if (!textStr && !options.image && !options.video && !options.document && !options.audio && !options.sticker) {
                return;
            }
            if (global.autotyping) {
                try {
                    await denn.sendPresenceUpdate('composing', m.chat);
                    const delay = Math.min(textStr.length * 25, 2500);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } catch (_) {}
            }
            return await denn.sendMessage(m.chat, { text: textStr, ...options }, { quoted: m });
        };

        const body = m.mtype === 'conversation' ? m.message.conversation
            : m.mtype === 'imageMessage' ? (m.message.imageMessage?.caption || '')
            : m.mtype === 'videoMessage' ? (m.message.videoMessage?.caption || '')
            : m.mtype === 'extendedTextMessage' ? (m.message.extendedTextMessage?.text || '')
            : m.mtype === 'stickerMessage' ? (m.message.stickerMessage?.caption || '')
            : m.mtype === 'documentMessage' ? (m.message.documentMessage?.caption || '')
            : m.mtype === 'audioMessage' ? ''
            : m.mtype === 'buttonsResponseMessage' ? (m.message.buttonsResponseMessage?.selectedButtonId || '')
            : m.mtype === 'listResponseMessage' ? (m.message.listResponseMessage?.singleSelectReply?.selectedRowId || '')
            : m.mtype === 'templateButtonReplyMessage' ? (m.message.templateButtonReplyMessage?.selectedId || '')
            : m.mtype === 'interactiveResponseMessage' ? (m.message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || '')
            : '';

        if (Array.isArray(global.db?.banned) && global.db.banned.includes(m.sender)) return;

        let botNumber = '';
        try {
            botNumber = await denn.decodeJid(denn.user.id);
        } catch (_) {
            botNumber = denn.user?.id || '';
        }

        const cleanJid = (jid) => jid ? String(jid).split(':')[0].split('@')[0] : '';

        const checkAdmin = async () => {
            if (!m.isGroup) return { isAdmin: false, isBotAdmin: false };
            try {
                const metadata = await denn.groupMetadata(m.chat);
                const participants = metadata.participants || [];
                const botIdentities = new Set();
                if (denn.user?.id) botIdentities.add(cleanJid(denn.user.id));
                if (denn.user?.lid) botIdentities.add(cleanJid(denn.user.lid));
                if (denn.user?.phoneNumber) botIdentities.add(cleanJid(denn.user.phoneNumber));
                if (botNumber) botIdentities.add(cleanJid(botNumber));
                const senderIdentities = new Set();
                senderIdentities.add(cleanJid(m.sender));
                if (m.key?.participant) senderIdentities.add(cleanJid(m.key.participant));
                if (m.key?.participantAlt) senderIdentities.add(cleanJid(m.key.participantAlt));
                if (m.key?.participantPn) senderIdentities.add(cleanJid(m.key.participantPn));
                if (m.key?.remoteJidAlt) senderIdentities.add(cleanJid(m.key.remoteJidAlt));
                const matchIdentity = (p, identitySet) => {
                    const pIds = [
                        cleanJid(p.id),
                        p.lid ? cleanJid(p.lid) : null,
                        p.jid ? cleanJid(p.jid) : null,
                        p.phoneNumber ? cleanJid(p.phoneNumber) : null,
                    ].filter(Boolean);
                    return pIds.some(id => identitySet.has(id));
                };
                const senderPart = participants.find(p => matchIdentity(p, senderIdentities));
                const botPart = participants.find(p => matchIdentity(p, botIdentities));
                return { 
                    isAdmin: senderPart?.admin === 'admin' || senderPart?.admin === 'superadmin', 
                    isBotAdmin: botPart?.admin === 'admin' || botPart?.admin === 'superadmin' 
                };
            } catch (e) {
                return { isAdmin: false, isBotAdmin: false };
            }
        };

        const senderNum = m.sender.split('@')[0];
        const botOwnerNum = String(global.owner);
        const dynamicOwners = global.db?.owners || [];
        const isOwner = (senderNum === botOwnerNum) || dynamicOwners.includes(senderNum) || m.key.fromMe;

        if (m.isGroup && body && !isOwner) {
            const chatDb = global.db.chats?.[m.chat];
            if (chatDb && chatDb.antilink) {
                const linkRegex = /(https?:\/\/[^\s]+)|(wa\.me\/[^\s]+)|(chat\.whatsapp\.com\/[^\s]+)/gi;
                if (linkRegex.test(body)) {
                    const { isAdmin, isBotAdmin } = await checkAdmin();
                    if (!isAdmin && isBotAdmin) {
                        try {
                            await denn.sendMessage(m.chat, { delete: m.key });
                            await denn.sendMessage(m.chat, { 
                                text: `⚠️ *ANTILINK DETECTED*\n\n@${m.sender.split('@')[0]} your message was deleted because it contained a link.`, 
                                mentions: [m.sender] 
                            });
                        } catch (e) {
                            console.error('[Antilink] Failed to delete:', e.message);
                        }
                        return;
                    }
                }
            }
        }

        const prefixMatch = body ? body.match(/^[^a-zA-Z0-9\s]/) : null;
        const isCommand = !!prefixMatch;

        if (!isCommand && global.passiveListeners instanceof Map) {
            const listeners = [];
            if (global.passiveListeners.has(m.chat)) {
                listeners.push(global.passiveListeners.get(m.chat));
            }
            for (const [key, fn] of global.passiveListeners) {
                if (key.startsWith('*') && key !== m.chat) {
                    listeners.push(fn);
                }
            }
            for (const passive of listeners) {
                if (typeof passive === 'function') {
                    try {
                        const consumed = await passive(denn, m, body || '');
                        if (consumed === true) return;
                    } catch (err) {
                        console.error(chalk.red('[passiveListener]'), err.message);
                    }
                }
            }
        }

        if (!body || typeof body !== 'string') return;
        if (!isCommand) return;

        const prefix = prefixMatch[0];
        const args = body.slice(prefix.length).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();
        if (!command) return;
        const text = args.join(' ');

        if (global.db && global.db.public === false && !isOwner) return;

        if (global.randomreact && command) {
            try {
                const emojis = ['🔥', '⚡', '👍', '😂', '✨', '💀', '🤖', '👐', '❤️', '😎'];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                if (Math.random() < 0.35) {
                    await denn.sendMessage(m.chat, { react: { text: randomEmoji, key: m.key } });
                }
            } catch (_) {}
        }

        const getTarget = () => {
            let target = m.mentionedJid?.[0] || 
                (m.quoted ? m.quoted.sender : null) || 
                (text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
            return target || null;
        };

        const mime = (m.quoted?.msg || m.quoted)?.mimetype || '';
        const qmsg = (m.quoted?.msg || m.quoted);

        const plugin = plugins.get(command);
        if (plugin) {
            if (plugin.groupOnly && !m.isGroup) {
                return sendFakeQuoted(denn, m, '❌ This feature can only be used in groups!', { title: 'Access Denied', body: 'Group Only Feature' });
            }

            if (plugin.category === 'rpg' && !isOwner) {
                const rpgUser = getRpgUser(m.sender);
                if (rpgUser.jailUntil && rpgUser.jailUntil > Date.now()) {
                    const bypassJail = ['tebus', 'bail', 'keluarpenjara'];
                    if (!bypassJail.includes(command)) {
                        const remaining = Math.ceil((rpgUser.jailUntil - Date.now()) / 60000);
                        return sendFakeQuoted(denn, m, `🚔 *You are in jail!*\n\nWait *${remaining} minutes* more or type \`${prefix}tebus\` to bribe the police (Rp 50,000).`);
                    }
                }
            }

            const isRegistered = getUser(m.sender);
            const bypassCommands = ['daftar', 'register'];

            if (!isRegistered && !bypassCommands.includes(command) && !isOwner) {
                return sendFakeQuoted(denn, m, 
                    `⚠️ *ACCESS DENIED*\n\n` +
                    `You are not registered as a user of this bot.\n` +
                    `Please register first with the format:\n\n` +
                    `\`${prefix}daftar <name> <age>\`\n\n` +
                    `_Example:_\n\`${prefix}daftar Budi 20\``
                );
            }

            console.log(
                chalk.white.bgCyan.bold(` ${global.namabot || 'Bot'} `), 
                chalk.blue.bold(`Message from:`), 
                chalk.yellow(`${m.sender.split('@')[0]}`), 
                chalk.blue.bold(`| Command:`), 
                chalk.green(`${prefix}${command}`)
            );
            
            try {
                const execFn = plugin.execute || plugin.run || plugin.handler;
                if (typeof execFn === 'function') {
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Plugin timeout (max 60 seconds)')), 60000)
                    );
                    await Promise.race([
                        execFn(denn, m, { args, text, prefix, command, isOwner, mime, qmsg, checkAdmin, getTarget, botNumber }),
                        timeoutPromise
                    ]);
                }
            } catch (err) {
                console.error(chalk.red(`Error in plugin ${command}:`), err.message);
                try {
                    await m.reply(`❌ An error occurred while running the *${command}* feature.\n\n_Error Log:_\n${err.message}`);
                } catch (_) {}
            }
        }
    } catch (e) {
        if (e?.message && !e.message.includes('Bad MAC')) {
            console.log(chalk.red('❌ [handler.js] Error:'), e.message);
        }
    }
};