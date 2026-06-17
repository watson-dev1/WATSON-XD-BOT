import fetch from 'node-fetch'
import { Sticker } from 'wa-sticker-formatter'

let handler = async (m, { conn, command }) => {

  let available = [
    'smug', 'woof', 'gasm', '8ball', 'goose', 'cuddle', 'avatar', 'slap',
    'v3', 'pat', 'gecg', 'feed', 'fox_girl', 'lizard', 'neko', 'hug',
    'meow', 'kiss', 'wallpaper', 'tickle', 'spank', 'waifu', 'lewd', 'ngif'
  ]

  if (!available.includes(command)) return m.reply('Category not available.')

  let res = await fetch(`https://nekos.life/api/v2/img/${command}`)
  if (!res.ok) throw 'Failed to fetch image.'

  let data = await res.json()
  let url = data.url

  let sticker = new Sticker(url, {
    pack: 'WATSON-XD-BOT',
    author: 'watson fourpence',
    type: 'full',
    categories: ['Anime'],
    id: command,
    quality: 70
  })

  let buffer = await sticker.toBuffer()
  await conn.sendMessage(m.chat, { sticker: buffer }, { quoted: m })
}

handler.command = /^(smug|woof|gasm|8ball|goose|cuddle|avatar|slap|v3|pat|gecg|feed|fox_girl|lizard|neko|hug|meow|kiss|wallpaper|tickle|spank|waifu|lewd|ngif)$/i

handler.tags = ['sticker']

handler.help = [
  'smug', 'woof', 'gasm', '8ball', 'goose', 'cuddle', 'avatar', 'slap',
  'v3', 'pat', 'gecg', 'feed', 'fox_girl', 'lizard', 'neko', 'hug',
  'meow', 'kiss', 'wallpaper', 'tickle', 'spank', 'waifu', 'lewd', 'ngif'
]

export default handler

/*
/* 
▢ Feature : Nekopack Sticker
▢ Plugin Type : ESM
▢ Source : https://whatsapp.com/channel/0029VbAYjQgKrWQulDTYcg2K
▢ Description :
  Generates anime stickers from the Nekos API.
*/

/*import fetch from 'node-fetch'
import { Sticker } from 'wa-sticker-formatter'

const categories = [
  'smug', 'woof', 'gasm', '8ball', 'goose', 'cuddle', 'avatar', 'slap',
  'v3', 'pat', 'gecg', 'feed', 'fox_girl', 'lizard', 'neko', 'hug',
  'meow', 'kiss', 'wallpaper', 'tickle', 'spank', 'waifu', 'lewd', 'ngif'
]

let handler = async (m, { conn, command }) => {

  // Check if the requested category exists
  if (!categories.includes(command)) {
    return m.reply('Invalid sticker category.')
  }

  // Fetch image from Nekos API
  let response = await fetch(`https://nekos.life/api/v2/img/${command}`)

  if (!response.ok) {
    throw 'Unable to fetch sticker image.'
  }

  let json = await response.json()
  let imageUrl = json.url

  // Create sticker
  let sticker = new Sticker(imageUrl, {
    pack: 'Ryo Yamada - MD',
    author: 'by Hilman',
    type: 'full',
    categories: ['Anime'],
    id: command,
    quality: 70
  })

  let buffer = await sticker.toBuffer()

  // Send sticker
  await conn.sendMessage(
    m.chat,
    { sticker: buffer },
    { quoted: m }
  )
}

handler.command = /^(smug|woof|gasm|8ball|goose|cuddle|avatar|slap|v3|pat|gecg|feed|fox_girl|lizard|neko|hug|meow|kiss|wallpaper|tickle|spank|waifu|lewd|ngif)$/i

handler.tags = ['sticker']

handler.help = categories

export default handler*/