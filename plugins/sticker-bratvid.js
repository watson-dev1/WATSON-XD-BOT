import axios from 'axios'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFile, unlink } from 'fs/promises'

let handler = async (m, { conn, args, command }) => {
  // Check for input text
  if (!args[0]) throw `Example: .${command} Hello Watson`
  
  let text = encodeURIComponent(args.join(" "))
  let api = `https://alfixd-brat.hf.space/maker/bratvid?text=${text}&background=%23FFFFFF&color=%23000000`

  // Send a reaction to show the bot is working
  await conn.sendMessage(m.chat, { react: { text: '🎥', key: m.key } })

  try {
    // Fetch JSON from API
    let { data } = await axios.get(api)
    if (data.status !== 'success') throw 'API failed to return the video'

    // Download the video file
    let res = await axios.get(data.video_url, { responseType: 'arraybuffer' })
    let buffer = Buffer.from(res.data)

    // Save to temp directory
    let tmpPath = join(tmpdir(), `${Date.now()}.mp4`)
    await writeFile(tmpPath, buffer)

    // Create animated sticker from the video
    let sticker = new Sticker(tmpPath, {
      type: StickerTypes.FULL,
      pack: `${global.stickpack}`, // Uses your global pack name
      author: `${global.stickauth}`, // Uses your global author name
      categories: ['🎥'],
      id: 'bratvid',
      quality: 50 // Lowered slightly to ensure it stays under the WhatsApp sticker size limit
    })

    let stickerBuffer = await sticker.toBuffer()

    // Send to chat
    await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m })

    // Clean up: delete the temporary video file
    await unlink(tmpPath)

  } catch (err) {
    console.error(err)
    m.reply('❌ Failed to create the animated brat sticker.')
  }
}

handler.help = ['bratvid <text>']
handler.tags = ['sticker']
handler.command = /^bratvid$/i
handler.limit = true
handler.register = true
handler.group = false

export default handler
