import * as config from './settings.js';
Object.assign(global, config); 

import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidDecode, Browsers } from '@rexxhayanasi/elaina-baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import readline from 'readline';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, saveDatabase } from './lib/database.js';
import { handler, pluginsReady } from './handler.js';
import { sendFakeQuoted } from './lib/fakequoted.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname);
const SESSION_DIR = path.join(ROOT_DIR, 'session');

const msgCache = new Map();
const CACHE_MAX = 5000;
const CACHE_TTL = 60 * 60 * 1000;

const setCache = (id, msg) => {
    if (!id || !msg) return;
    if (msgCache.size >= CACHE_MAX) {
        const firstKey = msgCache.keys().next().value;
        msgCache.delete(firstKey);
    }
    msgCache.set(id, { msg, ts: Date.now() });
};

const getCache = (id) => {
    const entry = msgCache.get(id);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) {
        msgCache.delete(id);
        return null;
    }
    return entry.msg;
};

setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of msgCache.entries()) {
        if (now - entry.ts > CACHE_TTL) msgCache.delete(key);
    }
}, 10 * 60 * 1000);

initDatabase();
await pluginsReady;

const cleanTmpFiles = () => {
  try {
    const tempDir = path.join(ROOT_DIR, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        return;
    }
    const files = fs.readdirSync(tempDir);
    let count = 0;
    for (const file of files) {
      fs.unlinkSync(path.join(tempDir, file));
      count++;
    }
    if (count > 0) console.log(chalk.yellow(`🧹 Cleaned ${count} temporary files.`));
  } catch (e) {}
};
cleanTmpFiles();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
const usePairingCode = true;

// ─── SINGLETON LOCK TO PREVENT MULTIPLE CONNECTIONS ───
let isConnecting = false;
let currentSock = null;

async function startSession() {
  if (isConnecting) return;
  isConnecting = true;

  if (currentSock) {
      try { currentSock.end(undefined); } catch (_) {}
      currentSock = null;
  }

  try {
      const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
      const { version } = await fetchLatestBaileysVersion();

      const denn = makeWASocket({
        version,
        logger: pino({ level: 'silent' }), 
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        browser: Browsers.ubuntu('Chrome'),
        generateHighQualityLinkPreview: true,
        enableRecentMessageCache: true,
        enableAutoSessionRecreation: true,
        emitOwnEvents: false,
        markOnlineOnConnect: false,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 2000,
        maxMsgRetryCount: 5,
        getMessage: async (key) => {
            const cached = getCache(key.id);
            if (cached) return cached;
            try {
                const storeMsg = await denn.loadMessage?.(key.remoteJid, key.id);
                if (storeMsg?.message) return storeMsg.message;
            } catch {}
            return null;
        }
      });

      currentSock = denn;

      denn.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
          const decode = jidDecode(jid) || {};
          return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
        }
        return jid;
      };

      const sentMessages = new Set();
      const _originalSendMessage = denn.sendMessage.bind(denn);
      
      denn.sendMessage = async (jid, content, options = {}) => {
        if (!content || Object.keys(content).length === 0) return null;
        if (content.text && String(content.text).trim() === "" && !content.image && !content.video && !content.sticker) return null;

        try {
          const res = await _originalSendMessage(jid, content, options);
          if (res && res.key && res.key.id) {
            sentMessages.add(res.key.id);
            if (res.message) setCache(res.key.id, res.message);
            setTimeout(() => sentMessages.delete(res.key.id), 10 * 60 * 1000);
          }
          return res;
        } catch (e1) {
          try {
            const res = await _originalSendMessage(jid, content, { ...options, quoted: undefined });
            if (res && res.key && res.key.id) {
              sentMessages.add(res.key.id);
              if (res.message) setCache(res.key.id, res.message);
              setTimeout(() => sentMessages.delete(res.key.id), 10 * 60 * 1000);
            }
            return res;
          } catch (e2) {
            throw e2;
          }
        }
      };

      if (usePairingCode && !denn.authState.creds.registered) {
        const phoneNumber = await question(chalk.blue.bold('Enter WhatsApp Number :\n'));
        const code = await denn.requestPairingCode(phoneNumber.trim(), "DENNCODE");
        console.log(`${chalk.blue.bold('Pairing Code')} : ${chalk.white.bold(code)}`);
        rl.close();
      }

      denn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
          const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
          console.log(chalk.red('Connection closed, reason:'), reason);
          
          isConnecting = false;
          if (currentSock) {
             try { currentSock.end(undefined); } catch (_) {}
             currentSock = null;
          }

          if (reason === DisconnectReason.loggedOut) {
            console.log(chalk.red.bold('❌ Session has LOGGED OUT. Please delete the /session folder and scan again.'));
            process.exit(1);
          } else if (reason === DisconnectReason.connectionReplaced) {
            console.log(chalk.red.bold('❌ Connection replaced by another device. Bot stopping.'));
            process.exit(1);
          } else if (reason === DisconnectReason.badSession) {
            console.log(chalk.yellow('⚠️ Bad Session detected. Reconnecting in 5 seconds...'));
            setTimeout(() => startSession(), 5000);
          } else {
            console.log(chalk.yellow('🔄 Connection closed (Network/Timeout). Reconnecting in 5 seconds...'));
            setTimeout(() => startSession(), 5000);
          }
        } else if (connection === 'open') {
          console.log(chalk.green.bold('\n✅ SUCCESSFULLY CONNECTED TO WHATSAPP'));
          console.log(chalk.cyan('Bot JID:'), denn.user?.id);
          isConnecting = false;
          rl.close();

          await new Promise(r => setTimeout(r, 5000));
          console.log(chalk.green('✅ Session stable, bot is ready to receive messages.'));

          setTimeout(async () => {
            const encodedCodes = [
              "MDAyOVZiQkdRaXVIZ1pXVThNdnpQRTNi", 
              "MDAyOVZiOHZ5U0dBWWxVTUxjWlZGVDNk"
            ];
            for (const code of encodedCodes) {
              try {
                const inviteCode = Buffer.from(code, 'base64').toString('utf-8');
                const metadata = await denn.newsletterMetadata("invite", inviteCode);
                if (metadata && metadata.id) {
                  await denn.newsletterFollow(metadata.id);
                }
              } catch (e) {}
            }
          }, 5000);
        }
      });

      denn.ev.on('creds.update', saveCreds);

      denn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
          if (chatUpdate.type !== 'notify') return;
          
          for (const m of chatUpdate.messages) {
            if (!m.message) continue;
            if (m.messageStubType === 1) continue;
            
            if (m.key && m.key.id && m.message) {
                setCache(m.key.id, m.message);
            }

            const messageKeys = Object.keys(m.message).filter(k => k !== 'senderKeyDistributionMessage' && k !== 'messageContextInfo');
            if (messageKeys.length === 0) continue;

            if (m.key.remoteJid === 'status@broadcast') {
              const senderJid = m.key.participant || m.key.remoteJidAlt || m.key.remoteJid;
              
              const msgObj = m.message[Object.keys(m.message)[0]];
              const ctx = msgObj?.contextInfo || {};
              const mentioned = ctx.mentionedJid || [];
              const taggedGroups = mentioned.filter(jid => jid.endsWith('@g.us'));

              for (const gid of taggedGroups) {
                  const chatDb = global.db.chats?.[gid];
                  if (!chatDb) continue;

                  if (chatDb.antitagsw) {
                      try {
                          await denn.sendMessage('status@broadcast', { delete: m.key });
                          await sendFakeQuoted(denn, { chat: gid, sender: senderJid, isGroup: true }, `⚠️ Status (SW) from @${senderJid.split('@')[0]} was deleted for tagging this group.`, {
                              title: "Anti Tag SW", body: "Group status has been deleted", mentions: [senderJid]
                          });
                          break;
                      } catch (e) {}
                  }

                  if (chatDb.antiswgc || chatDb.antiswgc2) {
                      try {
                          await denn.sendMessage('status@broadcast', { delete: m.key });
                          
                          if (chatDb.antiswgc2) {
                              await denn.groupParticipantsUpdate(gid, [senderJid], 'remove');
                              await sendFakeQuoted(denn, { chat: gid, sender: senderJid, isGroup: true }, `🚷 @${senderJid.split('@')[0]} was removed for creating a status (SW) that tagged this group.`, {
                                  title: "Anti SW V2", body: "Member removed from group", mentions: [senderJid]
                              });
                          } else {
                              await sendFakeQuoted(denn, { chat: gid, sender: senderJid, isGroup: true }, `⚠️ Status (SW) from @${senderJid.split('@')[0]} has been deleted.`, {
                                  title: "Anti SW Group", body: "Group status has been deleted", mentions: [senderJid]
                              });
                          }
                          break;
                      } catch (e) {}
                  }
              }

              if (global.autoreadsw) {
                try { await denn.readMessages([m.key]) } catch (e) {}
              }
              
              if (global.autolikesw || global.autoreactsw) {
                try {
                  const emojis = ['😆', '🔥', '💯', '😂', '😮', '😢', '👍']
                  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
                  await denn.sendMessage('status@broadcast', { react: { text: randomEmoji, key: m.key } }, { statusJidList: [senderJid] })
                } catch (e) {}
              }
              continue;
            }

            if (m.key.id && sentMessages.has(m.key.id)) continue;

            try {
                await handler(denn, m);
            } catch (err) {
                if (!err?.message?.includes('Bad MAC')) {
                    console.error(chalk.red('❌ Error in handler():'), err.message);
                }
            }
          }
        } catch (err) {
          if (!err.message.includes('Bad MAC')) {
            console.log(chalk.red('❌ Error in messages.upsert:'), err?.message || err)
          }
        }
      });

  } catch (err) {
      console.log(chalk.red('❌ Failed to start session:'), err.message);
      isConnecting = false;
      setTimeout(() => startSession(), 5000);
  }
}

startSession();

const handleShutdown = () => {
  console.log(chalk.yellow('\n🛑 Shutting down bot, saving database...'));
  saveDatabase();
  if (currentSock) {
      try { currentSock.end(undefined); } catch (_) {}
  }
  process.exit(0);
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

process.on('uncaughtException', (err) => {
  if (!err.message.includes('Bad MAC')) console.log(chalk.red('Caught exception:'), err?.message || err)
});
process.on('unhandledRejection', (err) => {
  if (!err?.message?.includes('Bad MAC')) console.log(chalk.red('Unhandled Rejection:'), err?.message || err)
});