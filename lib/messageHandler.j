import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import fs from 'fs';
import { dataFile } from './paths.js';
import config from '../config.js';
import store from './lightweight_store.js';
import commandHandler from './commandHandler.js';
import { printMessage, printLog } from './print.js';
import { isBanned } from './isBanned.js';
import { isSudo } from './index.js';
import isOwnerOrSudo from './isOwner.js';
import isAdmin from './isAdmin.js';
import { handleAutoread } from '../plugins/autoread.js';
import { handleAutotypingForMessage, showTypingAfterCommand } from '../plugins/autotyping.js';
import { storeMessage, handleMessageRevocation } from '../plugins/antidelete.js';
import { handleBadwordDetection } from './antibadword.js';
import { handleLinkDetection } from '../plugins/antilink.js';
import { handleTagDetection } from '../plugins/antitag.js';
import { handleMentionDetection } from '../plugins/mention.js';
import { handleChatbotResponse } from '../plugins/chatbot.js';
import { handleTicTacToeMove } from '../plugins/tictactoe.js';
import { handleAutoReply } from '../plugins/autoreply.js';
import { handleAntiSpam, invalidateGroupCache } from '../plugins/antispam.js';
import { startSchedulerEngine } from '../plugins/schedule.js';
import { addCommandReaction } from './reactions.js';
import { writeErrorLog } from './logger.js';
import { channelInfo } from './messageConfig.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);
const STICKER_FILE = dataFile('sticker_commands.json');

async function getStickerCommands() {
    if (HAS_DB) {
        const data = await store.getSetting('global', 'stickerCommands');
        return data || {};
    } else {
        try {
            if (!fs.existsSync(STICKER_FILE)) return {};
            return JSON.parse(fs.readFileSync(STICKER_FILE, 'utf8'));
        } catch {
            return {};
        }
    }
}

async function handleMessages(sock, messageUpdate) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;
        const message = messages[0];
        if (!message?.message) return;

        await printMessage(message, sock);

        try {
            const ghostMode = await store.getSetting('global', 'stealthMode');
            if (!ghostMode || !ghostMode.enabled) {
                await handleAutoread(sock, message);
            } else {
                printLog('info', '👻 Stealth mode active');
            }
        } catch (err) {
            await handleAutoread(sock, message);
        }

        const chatId = message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');

        if (message.message?.protocolMessage?.type === 0) {
            printLog('info', 'Message deletion detected');
            await handleMessageRevocation(sock, message);
            return;
        }

        await storeMessage(sock, message);

        if (message.pushName && sock.store?.contacts) {
            const pid = message.key.participant || message.key.remoteJid;
            if (pid) {
                sock.store.contacts[pid] = { ...sock.store.contacts[pid], id: pid, notify: message.pushName, name: message.pushName };
                const decoded = sock.decodeJid?.(pid);
                if (decoded && decoded !== pid) {
                    sock.store.contacts[decoded] = { ...sock.store.contacts[decoded], id: decoded, notify: message.pushName, name: message.pushName };
                }
            }
        }

        const rawSenderId = message.key.participant || message.key.remoteJid;
        let senderId = rawSenderId;
        if (rawSenderId?.includes('@lid') && sock.store?.contacts) {
            const contacts = sock.store.contacts;
            const resolved = Object.keys(contacts).find(k => contacts[k]?.lid === rawSenderId || contacts[k]?.lid?.split(':')[0] === rawSenderId.split('@')[0]);
            if (resolved?.includes('@s.whatsapp.net')) senderId = resolved;
        }

        // --- STICKER COMMAND HANDLER ---
        if (message.message?.stickerMessage) {
            const fileSha256 = message.message.stickerMessage.fileSha256;
            if (fileSha256) {
                const hash = Buffer.from(fileSha256).toString('base64');
                const stickers = await getStickerCommands();
                if (stickers[hash]) {
                    const commandText = stickers[hash].text;
                    const [cmdName, ...cmdArgs] = commandText.split(' ');
                    let foundCommand = null;
                    let usedPrefix = '';
                    for (const prefix of config.prefixes) {
                        const testCmd = (prefix + cmdName).toLowerCase();
                        foundCommand = commandHandler.getCommand(testCmd, config.prefixes);
                        if (foundCommand) {
                            usedPrefix = prefix;
                            break;
                        }
                    }
                    if (foundCommand) {
                        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);
                        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;
                        const botMode = await store.getBotMode();
                        const isAllowed = isOwnerOrSudoCheck || (botMode === 'public') || (botMode === 'groups' && isGroup) || (botMode === 'inbox' && !isGroup);
                        if (!isAllowed) return;
                        if (await isBanned(senderId)) return;

                        const syntheticMessage = {
                            key: message.key,
                            message: { extendedTextMessage: { text: usedPrefix + commandText } },
                            messageTimestamp: message.messageTimestamp,
                            pushName: message.pushName
                        };
                        const context = { chatId, senderId, isGroup, senderIsOwnerOrSudo, isOwnerOrSudoCheck, channelInfo, config };
                        try {
                            await foundCommand.handler(sock, syntheticMessage, cmdArgs, context);
                            await addCommandReaction(sock, message);
                            printLog('success', `✅ Sticker command executed: ${commandText}`);
                        } catch (error) {
                            printLog('error', `❌ Sticker error: ${error.message}`);
                        }
                    }
                    return;
                }
            }
        }

        // --- DYNAMIC TEXT & BUTTON EXTRACTION ---
        const rawText = 
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            message.message?.buttonsResponseMessage?.selectedButtonId ||
            message.message?.templateButtonReplyMessage?.selectedId ||
            message.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
            '';

        const messageText = rawText.trim();
        const userMessage = messageText.toLowerCase();
        const senderIsSudo = await isSudo(senderId);
        startSchedulerEngine(sock);

        if (!message.key.fromMe) {
            const replied = await handleAutoReply(sock, chatId, message, userMessage);
            if (replied) return;
        }

        const senderIsOwnerOrSudo = await isOwnerOrSudo(senderId, sock, chatId);
        const isOwnerOrSudoCheck = message.key.fromMe || senderIsOwnerOrSudo;

        // --- BUTTON ROUTING LOGIC ---
        if (message.message?.buttonsResponseMessage || message.message?.templateButtonReplyMessage || message.message?.listResponseMessage) {
            printLog('info', `Button click detected: ${messageText}`);
            
            // Hardcoded Core Buttons
            if (messageText === 'channel') {
                return await sock.sendMessage(chatId, { text: '*Join our Channel:*\nhttps://whatsapp.com/channel/0029Vb83Wvt11ulWCcEV6D2S' }, { quoted: message });
            }
            if (messageText === 'owner') {
                const ownerCommand = (await import('../plugins/owner.js')).default;
                return await ownerCommand.handler?.(sock, message, [], { chatId, senderId, isGroup, senderIsOwnerOrSudo, isOwnerOrSudoCheck, channelInfo, config });
            }
            if (messageText === 'support') {
                return await sock.sendMessage(chatId, { text: `*Support*\n\nhttps://whatsapp.com/channel/0029Vb83Wvt11ulWCcEV6D2S` }, { quoted: message });
            }
            // If not a core button, it falls through to the Command Handler below
        }

        const userBanned = await isBanned(senderId);
        if (userBanned && !userMessage.startsWith('.unban')) {
            if (Math.random() < 0.1) {
                await sock.sendMessage(chatId, { text: 'You are banned from using the bot.', ...channelInfo });
            }
            return;
        }

        if (/^[1-9]$/.test(userMessage) || userMessage === 'surrender') {
            await handleTicTacToeMove(sock, chatId, senderId, userMessage);
            return;
        }

        const ownJid = sock.user?.id || senderId;
        const ownName = sock.user?.name || sock.user?.notify || 'Me';
        await store.incrementMessageCount(chatId, message.key.fromMe ? ownJid : senderId, message.key.fromMe ? ownName : message.pushName);

        if (isGroup) {
            if (userMessage) await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            await handleLinkDetection(sock, chatId, message, userMessage, senderId);
            if (!message.key.fromMe) {
                const spammed = await handleAntiSpam(sock, chatId, message, senderId, senderIsOwnerOrSudo);
                if (spammed) return;
            }
        }

        if (!isGroup && !message.key.fromMe && !senderIsSudo) {
            try {
                const _pmblocker = (await import('../plugins/pmblocker.js')).default;
                const pmState = await _pmblocker?.readState();
                if (pmState?.enabled) {
                    await sock.sendMessage(chatId, { text: pmState.message || 'PMs are blocked.' });
                    await new Promise(r => setTimeout(r, 1500));
                    await sock.updateBlockStatus(chatId, 'block');
                    return;
                }
            } catch (e) { printLog('error', `PM blocker error: ${e.message}`); }
        }

        // --- COMMAND EXECUTION ---
        const usedPrefix = config.prefixes?.find(p => userMessage.startsWith(p));
        const command = commandHandler.getCommand(userMessage, config.prefixes);

        if (!command) {
            await handleAutotypingForMessage(sock, chatId, userMessage);
            if (isGroup) {
                await handleTagDetection(sock, chatId, message, senderId);
                await handleMentionDetection(sock, chatId, message);
            }
            const botMode = await store.getBotMode();
            const canUseChatbot = (botMode === 'public' || (botMode === 'groups' && isGroup) || (botMode === 'inbox' && !isGroup) || isOwnerOrSudoCheck);
            if (canUseChatbot) await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
            return;
        }

        const botMode = await store.getBotMode();
        const isAllowed = isOwnerOrSudoCheck || (botMode === 'public') || (botMode === 'groups' && isGroup) || (botMode === 'inbox' && !isGroup);
        if (!isAllowed) return;

        let args = usedPrefix ? messageText.slice(usedPrefix.length).trim().split(/\s+/).slice(1) : messageText.trim().split(/\s+/).slice(1);

        // Security Checks
        if (command.strictOwnerOnly) {
            const { isOwnerOnly } = await import('./isOwner.js');
            if (!message.key.fromMe && !isOwnerOnly(senderId)) {
                return await sock.sendMessage(chatId, { text: 'ℹ️ *Owner Only Command!*', ...channelInfo }, { quoted: message });
            }
        }
        if (command.ownerOnly && !isOwnerOrSudoCheck) {
            return await sock.sendMessage(chatId, { text: 'ℹ️ *Owner/Sudo Only!*', ...channelInfo }, { quoted: message });
        }
        if (command.groupOnly && !isGroup) {
            return await sock.sendMessage(chatId, { text: 'ℹ️ *Group Only Command!*', ...channelInfo }, { quoted: message });
        }

        let isSenderAdmin = false, isBotAdmin = false;
        if (command.adminOnly && isGroup) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;
            if (!isBotAdmin) return await sock.sendMessage(chatId, { text: 'ℹ️ *Bot must be Admin!*', ...channelInfo }, { quoted: message });
            if (!isSenderAdmin && !isOwnerOrSudoCheck) return await sock.sendMessage(chatId, { text: 'ℹ️ *Admins Only!*', ...channelInfo }, { quoted: message });
        }

        const context = { chatId, senderId, isGroup, isSenderAdmin, isBotAdmin, senderIsOwnerOrSudo, isOwnerOrSudoCheck, channelInfo, rawText, userMessage, messageText, config };

        try {
            await command.handler(sock, message, args, context);
            await addCommandReaction(sock, message);
            await showTypingAfterCommand(sock, chatId);
        } catch (error) {
            printLog('error', `Command error: ${error.message}`);
            await sock.sendMessage(chatId, { text: `❌ Error: ${error.message}`, ...channelInfo }, { quoted: message });
            writeErrorLog({ command: command.command, error: error.message, stack: error.stack, timestamp: new Date().toISOString(), user: senderId, chat: chatId });
        }

    } catch (error) {
        printLog('error', `Handler error: ${error.message}`);
    }
}

async function handleGroupParticipantUpdate(sock, update) {
    try {
        const { id, participants, action, author } = update;
        invalidateGroupCache(id);
        if (!id.endsWith('@g.us')) return;
        const botMode = await store.getBotMode();
        if (botMode !== 'public' && botMode !== 'groups') return;

        if (action === 'promote') {
            const { handlePromotionEvent } = (await import('../plugins/promote.js')).default || {};
            if (handlePromotionEvent) await handlePromotionEvent(sock, id, participants, author);
        } else if (action === 'demote') {
            const { handleDemotionEvent } = (await import('../plugins/demote.js')).default || {};
            if (handleDemotionEvent) await handleDemotionEvent(sock, id, participants, author);
        } else if (action === 'add') {
            const { handleJoinEvent } = await import('../plugins/welcome.js');
            await handleJoinEvent(sock, id, participants);
        } else if (action === 'remove') {
            const { handleLeaveEvent } = (await import('../plugins/goodbye.js')).default || {};
            if (handleLeaveEvent) await handleLeaveEvent(sock, id, participants);
        }
    } catch (error) { printLog('error', `Group error: ${error.message}`); }
}

async function handleStatus(sock, status) {
    try {
        const { default: _autostatus } = await import('../plugins/autostatus.js');
        await _autostatus.handleStatusUpdate(sock, status);
    } catch (error) { printLog('error', `Status error: ${error.message}`); }
}

async function handleCall(sock, calls) {
    try {
        const anticallPlugin = (await import('../plugins/anticall.js')).default;
        const state = await anticallPlugin.readState();
        if (!state?.enabled) return;
        for (const call of calls) {
            const callerJid = call.from;
            if (call.id) await sock.rejectCall(call.id, callerJid);
            await sock.sendMessage(callerJid, { text: '📵 Anticall enabled. You are being blocked.' });
            setTimeout(async () => { await sock.updateBlockStatus(callerJid, 'block'); }, 1000);
        }
    } catch (error) { printLog('error', `Call error: ${error.message}`); }
}

export { handleMessages, handleGroupParticipantUpdate, handleStatus, handleCall };
