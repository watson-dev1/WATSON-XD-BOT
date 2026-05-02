process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1';

import './config.js'
import path, { join } from 'path'
import { platform } from 'process'
import { fileURLToPath, pathToFileURL } from 'url'
import { createRequire } from 'module'
global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') { return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString() }; global.__dirname = function dirname(pathURL) { return path.dirname(global.__filename(pathURL, true)) }; global.__require = function require(dir = import.meta.url) { return createRequire(dir) }
import {
  readdirSync,
  statSync,
  unlinkSync,
  existsSync,
  readFileSync,
  watch
} from 'fs'

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
const argv = yargs(hideBin(process.argv)).argv;

import { spawn } from 'child_process'
import syntaxerror from 'syntax-error'
import chalk from 'chalk'
import { tmpdir } from 'os'
import { format } from 'util'
import pino from 'pino'
import ws from 'ws'
const {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  jidNormalizedUser,
  makeCacheableSignalKeyStore
} = await import('@whiskeysockets/baileys')
import { Low, JSONFile } from 'lowdb'
import { makeWASocket, protoType, serialize } from './lib/simple.js'

const { CONNECTING } = ws

protoType()
serialize()

global.API = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({ ...query, ...(apikeyqueryname ? { [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name] } : {}) })) : '')

const __dirname = global.__dirname(import.meta.url)

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.prefix = new RegExp('^[' + (opts['prefix'] || '‎xzXZ/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']')
global.db = new Low(new JSONFile(`database.json`));

global.loadDatabase = async function loadDatabase() {
  if (db.READ) return new Promise((resolve) => setInterval(async function () {
    if (!db.READ) {
      clearInterval(this)
      resolve(db.data == null ? global.loadDatabase() : db.data)
    }
  }, 1 * 1000))
  if (db.data !== null) return
  db.READ = true
  await db.read().catch(console.error)
  db.READ = null
  db.data = {
    users: {},
    chats: {},
    stats: {},
    msgs: {},
    sticker: {},
    settings: {},
      ...(db.data || {})
  }
}
loadDatabase()

const { state, saveCreds } = await useMultiFileAuthState('./sessions')
const connectionOptions = {
  logger: pino({ level: 'fatal' }),
  browser: ['Mac OS', 'safari', '5.1.10'],
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, pino().child({
      level: 'silent',
      stream: 'store'
    })),
  },
  getMessage: async key => {
    const jid = jidNormalizedUser(key.remoteJid);
    return ''; 
  },
  generateHighQualityLinkPreview: true,
  patchMessageBeforeSending: (message) => {
    const requiresPatch = !!(message.buttonsMessage || message.templateMessage || message.listMessage);
    if (requiresPatch) {
      message = { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {}, }, ...message, }, }, };
    }
    return message;
  },
  connectTimeoutMs: 60000, defaultQueryTimeoutMs: 0, syncFullHistory: true, markOnlineOnConnect: true
}

global.conn = makeWASocket(connectionOptions)
conn.isInit = false

if (!conn.authState.creds.registered) {
  console.log(chalk.bgWhite(chalk.blue('Generating code...')))
  setTimeout(async () => {
    let code = await conn.requestPairingCode(global.pairing)
    code = code?.match(/.{1,4}/g)?.join('-') || code
    console.log(chalk.black(chalk.bgGreen(`Your Pairing Code : `)), chalk.black(chalk.white(code)))
  }, 3000)
}

if(global.db) {
   setInterval(async () => {
    if(global.db.data) await global.db.write().catch(console.error);
    if ((global.support || {}).find) {
      const tmp = [tmpdir(), 'tmp'];
      tmp.forEach(filename => spawn('find', [filename, '-amin', '3', '-type', 'f', '-delete']));
    }
  }, 2000);
}

async function connectionUpdate(update) {
  const { receivedPendingNotifications, connection, lastDisconnect, isOnline, isNewLogin } = update;
  if (isNewLogin) conn.isInit = true;
  if (connection == 'connecting') console.log(chalk.redBright('⚡ Activating WatsonXdBot... Please wait.'));
  else if (connection == 'open') console.log(chalk.green('✅ Bot Connected'));
  if (isOnline == true) console.log(chalk.green('The bot is Active.'));
  else if (isOnline == false) console.log(chalk.red('The bot is Offline.'));
  if (receivedPendingNotifications) console.log(chalk.yellow('Waiting for a new message'));
  if (connection == 'close') {
    console.log(chalk.red('⏱️ Connection lost & trying to reconnect.'));
    if (lastDisconnect && lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
        global.reloadHandler(true);
    }
  }
}

process.on('uncaughtException', console.error)

let isInit = true
let handler = await import('./handler.js')
global.reloadHandler = async function (restatConn) {
  try {
    const Handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error)
    if (Object.keys(Handler || {}).length) handler = Handler
  } catch (e) {
    console.error(e)
  }
  
  if (restatConn) {
    try { global.conn.ws.close() } catch { }
    global.conn = makeWASocket(connectionOptions)
  }

  // REBIND LISTENERS TO GLOBAL.CONN
  conn.ev.removeAllListeners('messages.upsert')
  conn.ev.removeAllListeners('connection.update')
  conn.ev.removeAllListeners('creds.update')
  conn.ev.removeAllListeners('group-participants.update')
  conn.ev.removeAllListeners('groups.update')

  conn.handler = handler.handler.bind(global.conn)
  conn.participantsUpdate = handler.participantsUpdate.bind(global.conn)
  conn.groupsUpdate = handler.groupsUpdate.bind(global.conn)
  conn.onDelete = handler.deleteUpdate.bind(global.conn)
  conn.connectionUpdate = connectionUpdate.bind(global.conn)
  conn.credsUpdate = saveCreds.bind(global.conn)

  conn.ev.on('messages.upsert', conn.handler)
  conn.ev.on('group-participants.update', conn.participantsUpdate)
  conn.ev.on('groups.update', conn.groupsUpdate)
  conn.ev.on('message.delete', conn.onDelete)
  conn.ev.on('connection.update', conn.connectionUpdate)
  conn.ev.on('creds.update', conn.credsUpdate)
  
  isInit = false
  return true
}

const pluginFolder = join(__dirname, './plugins')
const pluginFilter = filename => /\.js$/.test(filename)
global.plugins = {}
async function filesInit() {
  for (let filename of readdirSync(pluginFolder).filter(pluginFilter)) {
    try {
      let file = global.__filename(join(pluginFolder, filename))
      const module = await import(file)
      global.plugins[filename] = module.default || module
    } catch (e) {
      console.error(`❌ Failed to load plugins ${filename}: ${e}`)
    }
  }
}

filesInit().then(_ => console.log(`Successfully Loaded ${Object.keys(global.plugins).length} Plugins`)).catch(console.error)

global.reload = async (_ev, filename) => {
  if (pluginFilter(filename)) {
    let dir = global.__filename(join(pluginFolder, filename), true)
    try {
      const module = (await import(`${global.__filename(dir)}?update=${Date.now()}`))
      global.plugins[filename] = module.default || module
    } catch (e) {
      console.error(`error require plugin '${filename}'`)
    }
  }
}
watch(pluginFolder, global.reload)
await global.reloadHandler()
