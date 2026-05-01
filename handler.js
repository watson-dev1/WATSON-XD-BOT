import { format } from 'util'
import { fileURLToPath } from 'url'
import path from 'path'
import { unwatchFile, watchFile, readFileSync } from 'fs'
import chalk from 'chalk'
import fetch from 'node-fetch'

import { smsg } from './lib/simple.js'
import uploadImage from './lib/uploadImage.js'

const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms))

/**
 * Handle messages upsert
 * @param {import('@whiskeysockets/baileys').BaileysEventMap<unknown>['messages.upsert']} groupsUpdate 
 */

export async function handler(chatUpdate) {
    if (!chatUpdate) return
    this.pushMessage(chatUpdate.messages).catch(console.error)
    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m) return
    if (global.db.data == null)
        await global.loadDatabase()
    try {
        m = smsg(this, m) || m
        if (!m) return
        m.exp = 0
        m.limit = 0

        let user = global.db.data.users[m.sender]
        let settings = global.db.data.settings[this.user.jid]

         // auto typing 
        if (global.autotyping && typeof this.sendPresenceUpdate === 'function') {
  this.sendPresenceUpdate('composing', m.chat).catch(console.error)
}
if (global.autorecording && typeof this.sendPresenceUpdate === 'function') {
  this.sendPresenceUpdate('recording', m.chat).catch(console.error)
}
        try {
            if (m.sender.endsWith('@broadcast') || m.sender.endsWith('@newsletter')) return
            if (typeof user !== 'object')
                global.db.data.users[m.sender] = {}
            
            if (user) {
                if (!isNumber(user.exp)) user.exp = 0
                if (!isNumber(user.limit)) user.limit = 100
                if (!isNumber(user.afk)) user.afk = -1
                if (!('afkReason' in user)) user.afkReason = ''
                if (!('banned' in user)) user.banned = false
            } else {
                global.db.data.users[m.sender] = {
                    registered: false,
                    role: 'Free user',
                    exp: 0,
                    limit: 25,
                    afk: -1,
                    afkReason: '',
                    banned: false,
                }
            }

            if (m.isGroup) {
                let chat = global.db.data.chats[m.chat]
                if (typeof chat !== 'object')
                    global.db.data.chats[m.chat] = {}
                if (chat) {
                    if (!('isBanned' in chat)) chat.isBanned = false
                    if (!('welcome' in chat)) chat.welcome = false
                    if (!('detect' in chat)) chat.detect = false
                    if (!('sWelcome' in chat)) chat.sWelcome = ''
                    if (!('sBye' in chat)) chat.sBye = ''
                    if (!('sPromote' in chat)) chat.sPromote = ''
                    if (!('sDemote' in chat)) chat.sDemote = ''
                    if (!('listStr' in chat)) chat.listStr = {}
                    if (!('delete' in chat)) chat.delete = true
                    if (!('antiLink' in chat)) chat.antiLink = false
                    if (!('pembatasan' in chat)) chat.pembatasan = false
                    if (!('antiSticker' in chat)) chat.antiSticker = false
                    if (!('antiLinkWa' in chat)) chat.antiLinkWa = false
                    if (!('viewonce' in chat)) chat.viewonce = false
                    if (!('antiBotClone' in chat)) chat.antiBotClone = false
                    if (!("viewStory" in chat)) chat.viewStory = false
                    if (!('anticmds' in chat)) chat.anticmds = false
                    if (!('antiVirtex' in chat)) chat.antiVirtex = false
                    if (!('antiToxic' in chat)) chat.antiToxic = false
                    if (!('antiBadword' in chat)) chat.antiBadword = false
                    if (!('simi' in chat)) chat.simi = false
                    if (!('nsfw' in chat)) chat.nsfw = false
                    if (!('antiPorn' in chat)) chat.antiPorn = false
                    if (!('autoTranslate' in chat)) chat.autoTranslate = false
                    if (!('mute' in chat)) chat.mute = false
                    if (!('rpg' in chat)) chat.rpg = true
                    if (!('game' in chat)) chat.game = true
                    if (!('teks' in chat)) chat.teks = false
                    if (!('autolevelup' in chat)) chat.autolevelup = false
                    if (!isNumber(user.level)) user.level = 0
                    if (!isNumber(chat.expired)) chat.expired = 0
                    if (!("memgc" in chat)) chat.memgc = {}
                } else {
                    global.db.data.chats[m.chat] = {
                        isBanned: false,
                        welcome: false,
                        detect: false,
                        sWelcome: '',
                        sBye: '',
                        sPromote: '',
                        sDemote: '',
                        catatan: "",
                        ultah: "",
                        pasangan: "",
                        listStr: {},
                        delete: true,
                        antiLink: false,
                        pembatasan: false,
                        antiLinkWa: false,
                        antiSticker: false,
                        viewonce: false,
                        viewStory: false,
                        anticmds: false,
                        antiBotClone: false,
                        antiToxic: false,
                        antiVirtex: false,
                        antiBadword: false,
                        simi: false,
                        nsfw: false,
                        antiPorn: false,
                        autoTranslate: false,
                        mute: false,
                        rpg: true,
                        game: true,
                        teks: true,
                        autolevelup: false,
                        level: 0,
                        expired: 0,
                    }
                }
            }

            if (typeof settings !== 'object') global.db.data.settings[this.user.jid] = {}
            settings = global.db.data.settings[this.user.jid]
            if (settings) {
                if (!('public' in settings)) settings.public = true
                if (!('autoread' in settings)) settings.autoread = false
                if (!('restrict' in settings)) settings.restrict = false
                if (!('anticall' in settings)) settings.anticall = true
                if (!('alwaysonline' in settings)) settings.alwaysonline = false
            } else {
                global.db.data.settings[this.user.jid] = {
                    public: true,
                    autoread: false,
                    anticall: true,
                    restrict: false,
                    alwaysonline: false
                }
            }
        } catch (e) {
            console.error(e)
        }

        if (global.opts && global.opts["nyimak"]) return
        if (!m.fromMe && global.opts && global.opts['self']) return
        if (global.opts && global.opts["swonly"] && m.chat !== "status@broadcast") return
        if (typeof m.text !== "string") m.text = ""

        if (settings && settings.alwaysonline) {
            await this.sendPresenceUpdate('available', m.chat)
        } else {
            await this.sendPresenceUpdate('unavailable', m.chat)
        }

        if (global.opts && global.opts['pconly'] && m.chat.endsWith('g.us')) return
        if (global.opts && global.opts['gconly'] && !m.chat.endsWith('g.us')) return
        
        const isROwner = [conn.decodeJid(global.conn.user.id), ...global.owner.map(([number]) => number)].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)
        const isOwner = isROwner || m.fromMe
        const isMods = isOwner || global.mods.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)
        const isPrems = isROwner || (global.db.data.users[m.sender] && global.db.data.users[m.sender].premiumTime > 0)
        
        const selfMode = !!(global.opts && global.opts.self)
        const dbPublic = !!(settings && settings.public)
        const isPublic = dbPublic || !selfMode
        if (!isPublic && !isOwner && !m.fromMe) return

        if (m.isBaileys) return
        m.exp += Math.ceil(Math.random() * 10)

        let usedPrefix
        let _user = global.db.data && global.db.data.users && global.db.data.users[m.sender]
        const groupMetadata = (m.isGroup ? ((conn.chats[m.chat] || {}).metadata || await this.groupMetadata(m.chat).catch(_ => null)) : {}) || {}
        const participants = (m.isGroup ? groupMetadata.participants : []) || []
        
        // Use the 'user' variable already declared above
        user = (m.isGroup ? participants.find(u => (u.id === m.sender) || (u.jid === m.sender)) : {}) || {} 
        
        const bot = (m.isGroup ? participants.find(u => (u.id === this.user.jid) || (u.jid === this.user.jid)) : {}) || {} 
        const isRAdmin = user?.admin == 'superadmin' || false
        const isAdmin = isRAdmin || user?.admin == 'admin' || false 
        const isBotAdmin = bot?.admin || false 

        const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
        for (let name in global.plugins) {
            let plugin = global.plugins[name]
            if (!plugin || plugin.disabled) continue
            const __filename = path.join(___dirname, name)
            
            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, {
                        chatUpdate,
                        __dirname: ___dirname,
                        __filename
                    })
                } catch (e) {
                    console.error(e)
                    for (let [jid] of global.owner.filter(([number, _, isDeveloper]) => isDeveloper && number)) {
                        let data = (await conn.onWhatsApp(jid))[0] || {}
                        if (data.exists)
                            m.reply(`*Plugin:* ${name}\n*Sender:* ${m.sender}\n*Chat:* ${m.chat}\n*Command:* ${m.text}\n\n\`\`\`${format(e)}\`\`\``.trim(), data.jid)
                    }
                }
            }

            if (global.opts && !global.opts['restrict'])
                if (plugin.tags && plugin.tags.includes('admin')) continue

            const str2Regex = str => String(str).replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
            let match = null
            let _usedPrefix = ''
            let noPrefix = ''
            let command = ''
            let args = []
            let _args = []
            let text = ''

            if (plugin.customPrefix) {
                const re = plugin.customPrefix instanceof RegExp ? plugin.customPrefix : new RegExp('^' + str2Regex(plugin.customPrefix))
                const res = re.exec(m.text || '')
                if (!res) continue 
                match = [res, re]
                _usedPrefix = res[0] || ''
                noPrefix = m.text.slice(_usedPrefix.length).trim()
                command = (_usedPrefix || '').trim()
                args = noPrefix ? noPrefix.split(/\s+/) : []
                _args = args.slice(0)
                text = noPrefix
            } else {
                const _prefix = conn && conn.prefix ? conn.prefix : global.prefix
                if (_prefix instanceof RegExp) {
                    const res = _prefix.exec(m.text || '')
                    if (res) {
                        match = [res, _prefix]
                        _usedPrefix = res[0] || ''
                        noPrefix = m.text.slice(_usedPrefix.length).trim()
                    } else {
                        _usedPrefix = ''
                        noPrefix = (m.text || '').trim()
                    }
                } else if (Array.isArray(_prefix)) {
                    let found = false
                    for (const p of _prefix) {
                        if (p instanceof RegExp) {
                            const res = p.exec(m.text || '')
                            if (res) {
                                match = [res, p]
                                _usedPrefix = res[0] || ''
                                noPrefix = m.text.slice(_usedPrefix.length).trim()
                                found = true
                                break
                            }
                        } else if (m.text && m.text.startsWith(p)) {
                            match = [[p], new RegExp('^' + str2Regex(p))]
                            _usedPrefix = p
                            noPrefix = m.text.slice(p.length).trim()
                            found = true
                            break
                        }
                    }
                    if (!found) {
                        _usedPrefix = ''
                        noPrefix = (m.text || '').trim()
                    }
                } else if (typeof _prefix === 'string' && m.text && m.text.startsWith(_prefix)) {
                    match = [[_prefix], new RegExp('^' + str2Regex(_prefix))]
                    _usedPrefix = _prefix
                    noPrefix = m.text.slice(_prefix.length).trim()
                } else {
                    _usedPrefix = ''
                    noPrefix = (m.text || '').trim()
                }
                const parts = noPrefix ? noPrefix.split(/\s+/).filter(Boolean) : []
                command = (parts.shift() || '').toLowerCase()
                args = parts
                _args = parts.slice(0)
                text = _args.join(' ')
            }

            usedPrefix = _usedPrefix

            if (typeof plugin.before === 'function') {
                if (await plugin.before.call(this, m, {
                    match,
                    conn: this,
                    participants,
                    groupMetadata,
                    user,
                    bot,
                    isROwner,
                    isOwner,
                    isRAdmin,
                    isAdmin,
                    isBotAdmin,
                    isPrems,
                    chatUpdate,
                    __dirname: ___dirname,
                    __filename
                })) continue
            }

            if (typeof plugin !== 'function') continue

            let fail = plugin.fail || global.dfail 
            let isAccept = false
            if (plugin.command instanceof RegExp) {
                isAccept = plugin.command.test(command)
            } else if (Array.isArray(plugin.command)) {
                isAccept = plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command)
            } else if (typeof plugin.command === 'string') {
                isAccept = plugin.command === command
            }

            if (!isAccept) continue

            m.plugin = name
            if (m.chat in global.db.data.chats || m.sender in global.db.data.users) {
                let chat = global.db.data.chats[m.chat]
                let user_db = global.db.data.users[m.sender]
                if (name != 'owner-unbanchat.js' && name != 'owner-exec.js' && name != 'owner-exec2.js' && name != 'tool-delete.js' && chat?.isBanned) return 
                if (name != 'owner-unbanuser.js' && user_db?.banned) return
            }
            if (plugin.rowner && plugin.owner && !(isROwner || isOwner)) { fail('owner', m, this); continue }
            if (plugin.rowner && !isROwner) { fail('rowner', m, this); continue }
            if (plugin.owner && !isOwner) { fail('owner', m, this); continue }
            if (plugin.mods && !isMods) { fail('mods', m, this); continue }
            if (plugin.premium && !isPrems) { fail('premium', m, this); continue }
            if (plugin.group && !m.isGroup) { fail('group', m, this); continue }
            else if (plugin.botAdmin && !isBotAdmin) { fail('botAdmin', m, this); continue }
            else if (plugin.admin && !isAdmin) { fail('admin', m, this); continue }
            if (plugin.private && m.isGroup) { fail('private', m, this); continue }
            if (plugin.register == true && _user.registered == false) { fail('unreg', m, this); continue }

            m.isCommand = true
            let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17 
            if (xp > 200) console.log("ngecit -_-");
            else m.exp += xp

            const requiredLimit = !isPrems ? (plugin.limit === true ? 1 : Number(plugin.limit) || 0) : 0
            if (requiredLimit > 0) {
                const currentLimit = Number(global.db.data.users[m.sender].limit || 0)
                if (currentLimit < requiredLimit) {
                    this.reply(m.chat, `[❗] Your daily limit has been reached. Please purchase Premium via`, m)
                    continue 
                }
            }
            if (plugin.level > _user.level) {
                this.reply(m.chat, `[💬] Level required ${plugin.level} to use this command\n*Level mu:* ${_user.level} 📊`, m)
                continue 
            }

            let extra = {
                match,
                usedPrefix,
                noPrefix,
                _args,
                args,
                command,
                text,
                conn: this,
                participants,
                groupMetadata,
                user,
                bot,
                isROwner,
                isOwner,
                isRAdmin,
                isAdmin,
                isBotAdmin,
                isPrems,
                chatUpdate,
                __dirname: ___dirname,
                __filename
            }

            try {
                await plugin.call(this, m, extra)
                if (!isPrems) {
                    const cost = plugin.limit === true ? 1 : Number(plugin.limit) || 0
                    m.limit = Number(m.limit) || cost
                }
            } catch (e) {
                m.error = e
                console.error(e)
                if (e) {
                    let text = format(e)
                    for (let key of Object.values(global.APIKeys)) text = text.replace(new RegExp(key, 'g'), '#HIDDEN#')
                    if (e.name) {
                        for (let [jid] of global.owner.filter(([number, _, isDeveloper]) => isDeveloper && number)) {
                            let data = (await conn.onWhatsApp(jid))[0] || {}
                            if (data.exists) m.reply(`*🗂️ Plugin:* ${m.plugin}\n*👤 Sender:* ${m.sender}\n*💬 Chat:* ${m.chat}\n*💻 Command:* ${usedPrefix}${command} ${args.join(' ')}\n📄 *Error Logs:*\n\n\`\`\`${text}\`\`\``.trim(), data.jid)
                        }
                    }
                    m.reply(text)
                }
            } finally {
                if (typeof plugin.after === 'function') {
                    try { await plugin.after.call(this, m, extra) } catch (e) { console.error(e) }
                }
                if (m.limit) m.reply(+m.limit + '*Your limit has been used up*')
            }
            break
        }
    } catch (e) {
        console.error(e)
    } finally {
        let user_stat, stats = global.db.data.stats
        if (m) {
            if (m.sender && (user_stat = global.db.data.users[m.sender])) {
                user_stat.exp += Number(m.exp) || 0
                user_stat.limit -= Number(m.limit) || 0
                if (user_stat.limit < 0) user_stat.limit = 0
            }
            if (m.plugin) {
                let now = Date.now()
                let stat = stats[m.plugin] || (stats[m.plugin] = { total: 0, success: 0, last: 0, lastSuccess: 0 })
                stat.total += 1
                stat.last = now
                if (m.error == null) {
                    stat.success += 1
                    stat.lastSuccess = now
                }
            }
        }
        try {
            await (await import(`./lib/print.js`)).default(m, this)
        } catch (e) {
            console.log(m, m.quoted, e)
        }
        if (global.opts && (global.opts['autoread'] || global.db.data.settings[this.user.jid]?.autoread2)) await this.readMessages([m.key])

        let botSettings = global.db.data.settings[this.user.jid] || {}
        if ((process.env.STATUSVIEW === 'true' || botSettings.statusview) && m.key.remoteJid === 'status@broadcast' && !m.fromMe) {
            await this.readMessages([m.key])
            const emojis = ['🇿🇼', '🌿', '💜', '🌹', '🌌', '🟢', '🍷']
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
            await this.sendMessage(m.key.remoteJid, { react: { key: m.key, text: randomEmoji } }, { statusJidList: [m.key.participant, this.decodeJid(this.user.id)] })
        }
    }
}

export async function participantsUpdate({ id, participants, action, simulate = false }) {
    if (global.opts && global.opts['self']) return
    if (this.isInit && !simulate) return
    if (global.db.data == null) await global.loadDatabase()
    let chat = global.db.data.chats[id] || {}
    let text = ''
    switch (action) {
        case 'add':
        case 'remove':
            if (chat.welcome) {
                let groupMetadata = (conn.chats[id] || {}).metadata || await this.groupMetadata(id)
                for (let user_part of participants) {
                    if (action === 'add') await delay(1000)
                    const userJid = await this.getJid(user_part, id)
                    let pp = 'https://cdn.yupra.my.id/yp/0r9garcg.jpg';
                    try {
                        let pps = await this.profilePictureUrl(userJid, 'image').catch(_ => pp)
                        let ppB = await (await fetch(pps)).buffer()
                        if (ppB) pp = await uploadImage(ppB)
                    } catch (e) { console.error(pp) } finally {
                        const username = await this.getName(userJid)
                        const gcname = groupMetadata.subject || 'Unknown'
                        const welcomeBg = 'https://i.pinimg.com/originals/c9/20/b7/c920b7e2c281a02b4091bba5b5e56ea3.jpg'
                        const leaveBg = 'https://i.pinimg.com/originals/73/f8/9f/73f89fed08d3ecc5e4d94268a0084e0f.jpg'

                        text = (action === 'add' 
                            ? (chat.sWelcome || this.welcome || 'Welcome, @user!')
                                .replace('@subject', gcname)
                                .replace('@desc', groupMetadata.desc || '')
                            : (chat.sBye || this.bye || 'Bye, @user!')
                        ).replace('@user', '@' + userJid.split('@')[0])

                        const wel = `https://api.siputzx.my.id/api/canvas/welcomev4?avatar=${pp}&background=${welcomeBg}&description=${encodeURIComponent(username)} welcome to ${encodeURIComponent(gcname)}`
                        const lea = `https://api.siputzx.my.id/api/canvas/goodbyev4?avatar=${pp}&background=${leaveBg}&description=${encodeURIComponent(username)}`
                        const imgUrl = action === 'add' ? wel : lea

                        this.sendMessage(id, {
                            text: text,
                            contextInfo: { mentionedJid: [userJid] },
                        })
                    }
                }
            }
            break
        case 'promote':
            text = (chat.sPromote || this.spromote || conn.spromote || '@user ```is now Admin```')
        case 'demote':
            if (!text) text = (chat.sDemote || this.sdemote || conn.sdemote || '@user ```is no longer Admin```')
            text = text.replace('@user', '@' + participants[0].split('@')[0])
            if (chat.detect) this.sendMessage(id, { text, mentions: this.parseMention(text) })
            break
    }
}

export async function groupsUpdate(groupsUpdate) {
    if (global.opts && global.opts['self']) return
    for (const groupUpdate of groupsUpdate) {
        const id = groupUpdate.id
        if (!id) continue
        let chats = global.db.data.chats[id], text = ''
        if (!chats?.detect) continue
        if (groupUpdate.desc) text = (chats.sDesc || this.sDesc || conn.sDesc || '```Description has been changed to```\n@desc').replace('@desc', groupUpdate.desc)
        if (groupUpdate.subject) text = (chats.sSubject || this.sSubject || conn.sSubject || '```Subject has been changed to```\n@subject').replace('@subject', groupUpdate.subject)
        if (groupUpdate.icon) text = (chats.sIcon || this.sIcon || conn.sIcon || '```Icon has been changed to```').replace('@icon', groupUpdate.icon)
        if (groupUpdate.revoke) text = (chats.sRevoke || this.sRevoke || conn.sRevoke || '```Group link has been changed to```\n@revoke').replace('@revoke', groupUpdate.revoke)
        if (groupUpdate.announce == true) text = (chats.sAnnounceOn || this.sAnnounceOn || conn.sAnnounceOn || '*Group has been closed!*')
        if (groupUpdate.announce == false) text = (chats.sAnnounceOff || this.sAnnounceOff || conn.sAnnounceOff || '*Group has been open!*')
        if (groupUpdate.restrict == true) text = (chats.sRestrictOn || this.sRestrictOn || conn.sRestrictOn || '*Group has been all participants!*')
        if (groupUpdate.restrict == false) text = (chats.sRestrictOff || this.sRestrictOff || conn.sRestrictOff || '*Group has been only admin!*')
        if (!text) continue
        this.reply(id, text.trim())
    }
}

export async function deleteUpdate(message) {
    try {
        const { fromMe, id, participant } = message;
        if (fromMe) return;
        let msg = this.serializeM(this.loadMessage(id));
        if (!msg) return;
        let chat = global.db.data.chats[msg.chat] || {};
        if (!chat.antidelete) return;
        this.reply(msg.chat, `Detected @${participant.split`@` [0]} has deleted a message.\n\nUntuk mematikan fitur ini, ketik\n*.disable antidelete*`.trim(), msg);
        this.copyNForward(msg.chat, msg).catch(e => console.log(e, msg));
    } catch (e) { console.error(e); }
}

global.dfail = async (type, m, conn) => {
    let msg = {
        rowner: '*OWNER ONLY ⚠️* This command is only for the bot owner!!',
        owner: '*OWNER ONLY ⚠️* This command is only for the bot owner!!',
        mods: '*MODERATOR ONLY ⚠️* Only moderators can use this!',
        premium: '*PREMIUM ONLY ⚠️* Only premium members can use this!!',
        group: '*GROUP ONLY ⚠️* Can only be used in a group!!',
        private: '*PRIVATE ONLY ⚠️* Can only be used in private chat!!',
        admin: '*ADMIN ONLY ⚠️* Only group admins can use this!!',
        botAdmin: 'Please make the bot an admin first!',
        onlyprem: 'Only *PREMIUM* users can use this in private chat!!',
        nsfw: '*NSFW* feature is not active!',
        rpg: '*RPG* feature is not active!',
        game: '*GAME* feature is not active!',
        limitExp: 'Your limit has run out!',
        restrict: 'This feature is restricted!',
    }
    
     // Special case for unregistered users
    if (type === 'unreg') {
        return await conn.sendMessage(
            m.chat,
            {
                text: 'Please register in the bot database first if you want to use the bot\n\nMANUAL: .register name.age\nAUTOMATIC: @verify',
                footer: 'Watson-Xd Multidevice!',
                buttons: [
                    {
                        buttonId: '.register name.age',
                        buttonText: { displayText: '☔️ Manual Register' }
                    },
                    {
                        buttonId: '@verify',
                        buttonText: { displayText: '🍫 Auto Register' }
                    },
                    {
                        buttonId: '.me',
                        buttonText: { displayText: '👤 View Profile' }
                    }
                ]
            },
            { quoted: m }
        )
    }

    if (msg[type]) return conn.reply(m.chat, msg[type], m)
}

// --- HOT RELOAD WATCHER ---
let file = global.__filename(import.meta.url, true)
watchFile(file, async () => {
    unwatchFile(file)
    console.log(chalk.redBright("Update 'handler.js'"))
    if (global.reloadHandler) console.log(await global.reloadHandler())
})