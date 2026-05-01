import yts from 'yt-search'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { pipeline } from 'stream'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)

let handler = async (m, { conn, args, text, command }) => {
  if (!text) return m.reply(`*Example:* ${command} god of war theme`)
  
  // Use global wait message or default text
  m.reply(global.wait || 'Searching for audio... please wait.')

  try {
    let search = await yts(text)
    let video = search.videos[0]
    if (!video) return m.reply('Video not found, please try another keyword.')

    const api = `https://api.platform.web.id/savetube?url=${encodeURIComponent(video.url)}&format=mp3`
    const response = await fetch(api)
    const res = await response.json()
    
    // Extracted download URL
    const audioUrl = res.result.download_url
    
    let caption = `• *Title:* ${video.title}\n• *Duration:* ${video.timestamp}\n• *Uploaded:* ${video.ago}\n• *Views:* ${video.views}\n• *Link:* ${video.url}\n\n> Please wait, audio is being sent...`

    await conn.relayMessage(m.chat, {
      extendedTextMessage: {
        text: caption,
        contextInfo: {
          externalAdReply: {
            title: video.title,
            body: `By ${video.author.name}`,
            mediaType: 1,
            previewType: 0,
            renderLargerThumbnail: true,
            thumbnailUrl: video.image,
            sourceUrl: video.url
          }
        },
        mentions: [m.sender]
      }
    }, {})

    await conn.sendMessage(m.chat, {
      audio: { url: audioUrl },
      mimetype: 'audio/mpeg',
      fileName: `${video.title}.mp3`
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    m.reply(`An error occurred while processing your request: ${e.message}`)
  }
}

handler.help = ['play'].map(v => v + ' <query>')
handler.tags = ['downloader']
handler.command = /^(play)$/i

handler.limit = 8
handler.register = true
handler.disable = false

export default handler
