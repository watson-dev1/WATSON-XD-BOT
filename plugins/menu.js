import { promises } from 'fs'
import { join } from 'path'
import { xpRange } from '../lib/levelling.js'
import moment from 'moment-timezone'
import { platform as getPlatform, totalmem } from 'os'

const uptime = clockString(process.uptime() * 1000);
const defaultMenu = {
  before: `
*▢ Information*
- *Bot Name* : ${global.namebot}
- *Platform* : %platform
- *RAM Usage* : %ramusage
- *Developer* : ${global.author}
- *Library* : baileys
- *Version* : 10.0.0
- *Prefix* : .
- *Uptime* : ${uptime}

*▢ User Status*
- *Level* : %level
- *Role* : %role
- *Progress* : [%progbar] %percent%
%readmore
`.trimStart(),
  header: '┌─⦿『 %category 』⦿',
  body: '┃⬡▸ %cmd',
  footer: '╰─────────────────⦿',
  after: global.wm,
}

let handler = async (m, { conn, usedPrefix: _p, __dirname, args, command }) => {

  let tags = {
    'main': 'Main',
    'ai': 'AI Features',
    'downloader': 'Downloader',
    'internet': 'Internet',
    'anime': 'Anime',
    'sticker': 'Sticker',
    'tools': 'Tools',
    'group': 'Group',
    'info': 'Info',
    'owner': 'Owner',
  }

  try {
    let dash = global.dashmenu
    let m1 = global.dmenut
    let m2 = global.dmenub
    let m3 = global.dmenuf
    let m4 = global.dmenub2

    let cc = global.cmenut
    let c1 = global.cmenuh
    let c2 = global.cmenub
    let c3 = global.cmenuf
    let c4 = global.cmenua

    let lprem = global.lopr
    let llim = global.lolm
    let tag = `@${m.sender.split('@')[0]}`

    let ucpn = `${ucapan()}`
    let d = new Date(new Date + 3600000)
    let locale = 'en'
    let week = d.toLocaleDateString(locale, { weekday: 'long' })
    let date = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender
    let weton = ['Pahing', 'Pon', 'Wage', 'Kliwon', 'Legi'][Math.floor(d / 84600000) % 5]
    let dateIslamic = Intl.DateTimeFormat(locale + '-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d)
    let time = d.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    })
    
    let _uptime = process.uptime() * 1000
    let _muptime
    if (process.send) {
      process.send('uptime')
      _muptime = await new Promise(resolve => {
        process.once('message', resolve)
        setTimeout(resolve, 1000)
      }) * 1000
    }
    let muptime = clockString(_muptime)
    let uptime = clockString(_uptime)

    let usrs = db.data.users[m.sender]
    let wib = moment.tz('Africa/Harare').format('HH:mm:ss')
    
    let mode = db.data.settings[conn.user.jid].public ? 'Public' : 'Self'
    let _package = JSON.parse(await promises.readFile(join(__dirname, '../package.json')).catch(_ => ({}))) || {}

    let { age, exp, limit, level, role, registered, money } = global.db.data.users[m.sender]
    let { min, xp, max } = xpRange(level, global.multiplier)
    let name = await conn.getName(m.sender)
    let premium = global.db.data.users[m.sender].premiumTime
    let prems = `${premium > 0 ? 'Premium' : 'Free'}`
    
    // RAM and Progress Logic
    let sysPlatform = getPlatform()
    let usedRam = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
    let totalRam = (totalmem() / 1024 / 1024).toFixed(2)
    let currXp = exp - min
    let percent = Math.min(Math.max(parseInt((currXp / xp) * 100), 0), 100)
    let progbar = getProgressBar(percent)

    let totalreg = Object.keys(global.db.data.users).length
    let rtotalreg = Object.values(global.db.data.users).filter(user => user.registered == true).length
    let help = Object.values(global.plugins).filter(plugin => !plugin.disabled).map(plugin => {
      return {
        help: Array.isArray(plugin.tags) ? plugin.help : [plugin.help],
        tags: Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags],
        prefix: 'customPrefix' in plugin,
        limit: plugin.limit,
        premium: plugin.premium,
        enabled: !plugin.disabled,
      }
    })

    let groups = {}
    for (let tag in tags) {
      groups[tag] = []
      for (let plugin of help)
        if (plugin.tags && plugin.tags.includes(tag))
          if (plugin.help) groups[tag].push(plugin)
    }

    conn.menu = conn.menu ? conn.menu : {}
    let before = conn.menu.before || defaultMenu.before
    let header = conn.menu.header || defaultMenu.header
    let body = conn.menu.body || defaultMenu.body
    let footer = conn.menu.footer || defaultMenu.footer
    let after = conn.menu.after || (conn.user.jid == global.conn.user.jid ? '' : `Powered by https://wa.me/${global.conn.user.jid.split`@`[0]}`) + defaultMenu.after

    let _text = [
      before,
      ...Object.keys(tags).map(tag => {
        return header.replace(/%category/g, tags[tag]) + '\n' + [
          ...help.filter(menu => menu.tags && menu.tags.includes(tag) && menu.help).map(menu => {
            return menu.help.map(help => {
              return body.replace(/%cmd/g, menu.prefix ? help : '%_p' + help)
                .replace(/%islimit/g, menu.limit ? llim : '')
                .replace(/%isPremium/g, menu.premium ? lprem : '')
                .trim()
            }).join('\n')
          }),
          footer
        ].join('\n')
      }),
      after
    ].join('\n')

    let text = typeof conn.menu == 'string' ? conn.menu : typeof conn.menu == 'object' ? _text : ''
    let replace = {
      '%': '%',
      p: _p, 
      uptime, muptime,
      me: conn.getName(conn.user.jid),
      npmname: _package.name,
      npmdesc: _package.description,
      version: _package.version,
      exp: exp - min,
      maxexp: xp,
      totalexp: exp,
      xp4levelup: max - exp,
      github: _package.homepage ? _package.homepage.url || _package.homepage : '[unknown github url]',
      tag, dash, m1, m2, m3, m4, cc, c1, c2, c3, c4, lprem, llim,
      ucpn, platform: sysPlatform, wib: time, mode, _p, money, age, name, prems, level, limit, weton, week, date, dateIslamic, time, totalreg, rtotalreg, role,
      ramusage: `${usedRam}MB / ${totalRam}MB`,
      progbar,
      percent,
      readmore: readMore
    }

    text = text.replace(new RegExp(`%(${Object.keys(replace).sort((a, b) => b.length - a.length).join`|`})`, 'g'), (_, name) => '' + replace[name])

 let pp = await conn.profilePictureUrl(who, 'image').catch(_ => 'https://cdn.phototourl.com/free/2026-04-30-ae19f7d1-2015-4d8b-8651-fb9de299f257.png')
 
  const fkontak = { key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: `status@broadcast` } : {}) }, message: { 'contactMessage': { 'displayName': name, 'vcard': `BEGIN:VCARD\nVERSION:3.0\nN:XL;${name},;;;\nFN:${name},\nitem1.TEL;waid=${who.split('@')[0]}:${who.split('@')[0]}\nitem1.X-ABLabell:Mobile\nEND:VCARD`, 'jpegThumbnail': pp, thumbnail: pp, sendEphemeral: true }}}
  
    await conn.relayMessage(m.chat, {
  reactionMessage: {
    key: m.key,
    text: '📊'
  }
}, { messageId: m.key.id });

await conn.sendMessage(m.chat, {
  document: await promises.readFile('./README.md'),
  mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  fileName: 'Watson Fourpence',
  fileLength: 271000000000000,
  pageCount: 999,
  caption: text.trim(),
  contextInfo: {
    mentionedJid: [m.sender],
    isForwarded: true,
    forwardingScore: 256,
    forwardedNewsletterMessageInfo: {
      newsletterJid: '120363424621387196@newsletter',
      newsletterName: `Powered By: ${global.author}`,
      serverMessageId: -1
    },
    externalAdReply: {
      showAdAttribution: false,
      title: `System Status: Online`,
      body: `Level Progress: ${percent}%`,
      thumbnailUrl: 'https://cdn.phototourl.com/free/2026-04-30-ae19f7d1-2015-4d8b-8651-fb9de299f257.png',
      sourceUrl: sgc,
      mediaType: 1,
      renderLargerThumbnail: true
    }
  }
}, { quoted: fkontak });

  } catch (e) {
    conn.reply(m.chat, 'Sorry, the menu encountered an error.', m)
    throw e
  }
}

handler.help = ['menu']
handler.tags = ['main']
handler.command = /^(allmenu|menu|\?)$/i
handler.register = true
handler.exp = 3

export default handler

//----------- FUNCTIONS -------

const more = String.fromCharCode(8206)
const readMore = more.repeat(4001)

function getProgressBar(percent) {
  let p = Math.max(0, Math.min(100, percent))
  let len = 15
  let fill = Math.floor(p / (100 / len))
  let bar = "█".repeat(fill) + "░".repeat(len - fill)
  return bar
}

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, 'H', m, 'M', s, 'S'].map(v => v.toString().padStart(2, 0)).join(' ')
}

function ucapan() {
  const time = moment.tz('Africa/Harare').format('HH')
  let res = "Why are you still awake? 🥱"
  if (time >= 4) res = "Good Morning 🌄"
  if (time >= 10) res = "Good Day ☀️"
  if (time >= 15) res = "Good Afternoon 🌇"
  if (time >= 18) res = "Good Evening 🌙"
  return res
}
