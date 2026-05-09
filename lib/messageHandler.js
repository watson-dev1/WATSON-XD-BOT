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
        } catch { return {}; }
    }
}

async function handleMessages(sock, messageUpdate) {
    try {
        const { messages, type } = messageUpdate;
        if (type !== 'notify') return;
        const message = messages[0];
        if (!message?.message) return;

        await printMessage(message, sock);

        // --- GHOST / STEALTH MODE ---
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

        // --- SENDER RESOLUTION ---
        const rawSenderId = message.key.participant || message.key.remoteJid;
        let senderId = rawSenderId;
        if (rawSenderId?.includes('@lid') && sock.store?.contacts) {
            const contacts = sock.store.contacts;
            const resolved = Object.keys(contacts).find(k => contacts[k]?.lid === rawSenderId || contacts[k]?.lid?.split(':')[0] === rawSenderId.split('@')[0]);
            if (resolved?.includes('@s.whatsapp.net')) senderId = resolved;
        }

        // --- DYNAMIC TEXT & BUTTON EXTRACTION (THE FIX) ---
        let rawText = 
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            message.message?.buttonsResponseMessage?.selectedButtonId ||
            message.message?.templateButtonReplyMessage?.selectedId ||
            message.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            '';

        // Handle Interactive/NativeFlow Buttons (JSON Parsing)
        if (message.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
            try {
                const params = JSON.parse(message.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
                rawText = params.id || params.text || rawText;
            } catch (e) {
                printLog('error', 'Failed to parse button JSON');
            }
        }

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

        // --- BUTTON CLICK PRE-ROUTING ---
        if (message.message?.buttonsResponseMessage || message.message?.templateButtonReplyMessage || message.message?.listResponseMessage || message.message?.interactiveResponseMessage) {
            printLog('info', `Button click detected: ${messageText}`);
            
            if (messageText === 'channel') {
                return await sock.sendMessage(chatId, { text: '*Join our Channel:*\nhttps://whatsapp.com/channel/0029Vb83Wvt11ulWCcEV6D2S' }, { quoted: message });
            }
            if (messageText === 'owner') {
                const ownerCommand = (await import('../plugins/owner.js')).default;
                return await ownerCommand.handler?.(sock, message, [], { chatId, senderId, isGroup, senderIsOwnerOrSudo, isOwnerOrSudoCheck, channelInfo, config });
            }
        }

        // --- BAN CHECK ---
        const userBanned = await isBanned(senderId);
        if (userBanned && !userMessage.startsWith('.unban')) {
            if (Math.random() < 0.1) await sock.sendMessage(chatId, { text: 'You are banned from using the bot.', ...channelInfo });
            return;
        }

        // --- GAME LOGIC ---
        if (/^[1-9]$/.test(userMessage) || userMessage === 'surrender') {
            await handleTicTacToeMove(sock, chatId, senderId, userMessage);
            return;
        }

        // --- GROUP SECURITY & ANTISPAM ---
        if (isGroup) {
            if (userMessage) await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
            await handleLinkDetection(sock, chatId, message, userMessage, senderId);
            if (!message.key.fromMe) {
                const spammed = await handleAntiSpam(sock, chatId, message, senderId, senderIsOwnerOrSudo);
                if (spammed) return;
            }
        }

        // --- COMMAND EXECUTION ---
        const usedPrefix = config.prefixes?.find(p => userMessage.startsWith(p));
        // Use our updated commandHandler that handles button IDs without prefixes
        const command = commandHandler.getCommand(userMessage, config.prefixes);

        if (!command) {
            await handleAutotypingForMessage(sock, chatId, userMessage);
            if (isGroup) {
                await handleTagDetection(sock, chatId, message, senderId);
                await handleMentionDetection(sock, chatId, message);
            }
            const botMode = await store.getBotMode();
            if (botMode === 'public' || isOwnerOrSudoCheck) await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
            return;
        }

        const botMode = await store.getBotMode();
        const isAllowed = isOwnerOrSudoCheck || (botMode === 'public') || (botMode === 'groups' && isGroup) || (botMode === 'inbox' && !isGroup);
        if (!isAllowed) return;

        let args = usedPrefix ? messageText.slice(usedPrefix.length).trim().split(/\s+/).slice(1) : messageText.trim().split(/\s+/).slice(1);

        // Permissions
        if (command.ownerOnly && !isOwnerOrSudoCheck) {
            return await sock.sendMessage(chatId, { text: 'ℹ️ *Owner/Sudo Only!*', ...channelInfo }, { quoted: message });
        }
        if (command.groupOnly && !isGroup) {
            return await sock.sendMessage(chatId, { text: 'ℹ️ *Group Only!*', ...channelInfo }, { quoted: message });
        }

        let isSenderAdmin = false, isBotAdmin = false;
        if (command.adminOnly && isGroup) {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;
            isBotAdmin = adminStatus.isBotAdmin;
            if (!isBotAdmin) return await sock.sendMessage(chatId, { text: 'ℹ️ *Bot must be Admin!*' }, { quoted: message });
            if (!isSenderAdmin && !isOwnerOrSudoCheck) return await sock.sendMessage(chatId, { text: 'ℹ️ *Admins Only!*' }, { quoted: message });
        }

        const context = { chatId, senderId, isGroup, isSenderAdmin, isBotAdmin, senderIsOwnerOrSudo, isOwnerOrSudoCheck, channelInfo, rawText, userMessage, messageText, config };

        try {
            await command.handler(sock, message, args, context);
            await addCommandReaction(sock, message);
            await showTypingAfterCommand(sock, chatId);
        } catch (error) {
            printLog('error', `Command error: ${error.message}`);
            await sock.sendMessage(chatId, { text: `❌ Error: ${error.message}` }, { quoted: message });
            writeErrorLog({ command: command.command, error: error.message, user: senderId, chat: chatId });
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
    } catch (error) { printLog('error', `Group update error: ${error.message}`); }
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
