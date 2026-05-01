import axios from 'axios'
import yts from 'yt-search'

let handler = async (m, { conn, usedPrefix, command, args }) => {
  if (!args[0]) throw `Example:\n${usedPrefix + command} https://youtu.be/abc123\n${usedPrefix + command} song title`

  let query = args.join(" ")
  let url = ''
  let format = /yt(a|mp3)/i.test(command) ? 'mp3' : 'mp4'

  // Search for video using yt-search
  let vidInfo
  if (/^https?:\/\//i.test(query)) {
    // If input is a direct URL
    let videoId = query.split("v=")[1] || query.split("/").pop().split("?")[0]
    let search = await yts({ videoId })
    vidInfo = search
    url = query
  } else {
    // If input is a keyword
    let search = await yts(query)
    vidInfo = search.videos[0]
    if (!vidInfo) throw '❌ Video not found.'
    url = vidInfo.url
  }

  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    // Using the specified downloader API
    let apiUrl = `https://api.platform.web.id/notube/download?url=${encodeURIComponent(url)}&format=${format}`
    let { data } = await axios.get(apiUrl)

    if (!data.download_url) throw '❌ Download link not found from API.'

    // Metadata from yt-search
    let title = vidInfo.title
    let thumbnail = vidInfo.thumbnail
    let duration = vidInfo.timestamp || '-'

    let caption = `📥 *YouTube Downloader*\n\n` +
                  `📌 Title: *${title}*\n` +
                  `⏱️ Duration: ${duration}\n` +
                  `📂 Format: ${format.toUpperCase()}\n` +
                  `🔗 URL: ${url}`

    if (format === 'mp3') {
      await conn.sendMessage(m.chat, {
        audio: { url: data.download_url },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        contextInfo: {
          externalAdReply: {
            title,
            body: "YouTube Audio Downloader",
            thumbnailUrl: thumbnail,
            sourceUrl: url,
            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, {
        video: { url: data.download_url },
        caption,
        fileName: `${title}.mp4`,
        mimetype: 'video/mp4',
        contextInfo: {
          externalAdReply: {
            title,
            body: "YouTube Video Downloader",
            thumbnailUrl: thumbnail,
            sourceUrl: url,
            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
      }, { quoted: m })
    }

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  } catch (e) {
    console.error(e)
    m.reply(`❌ An error occurred: ${e?.response?.data?.message || e?.message || e}`)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
  }
}

handler.help = ['ytmp3 <url/query>', 'ytmp4 <url/query>']
handler.tags = ['downloader']
handler.command = /^yt(mp3|mp4|a|v)$/i
handler.limit = true

export default handler
