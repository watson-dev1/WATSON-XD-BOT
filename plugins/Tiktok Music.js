/*
╔══════════════════════════════╗
║ 🎵 WATSON-XD-BOT TTMUSIC 🎵 ║
╚══════════════════════════════╝

✨ Type    : Plugins ESM
👑 Creator : WATSON-XD-BOT
📥 Feature : TikTok Music Downloader
⚡ Version : React Style
*/

import fetch from 'node-fetch'

let handler = async (
  m,
  { text, usedPrefix, command, conn }
) => {

  try {

    // 🎧 React Loading
    await conn.sendMessage(m.chat, {
      react: {
        text: '🎵',
        key: m.key
      }
    })

    const input = m.quoted
      ? m.quoted.text
      : text

    // ❌ No Input
    if (!input) {

      return m.reply(
        `
╭━━━〔 🎵 WATSON-XD-BOT 🎵 〕━━━⬣
┃ 📌 Example Usage:
┃ ${usedPrefix + command} https://vt.tiktok.com/xxxx
┃ ${usedPrefix + command} elaina edit
╰━━━━━━━━━━━━━━━━━━⬣
`.trim()
      )
    }

    // 🔍 TikTok URL Regex
    const regex =
      /(https:\/\/(vt|vm)\.tiktok\.com\/[^\s]+|https:\/\/www\.tiktok\.com\/@[\w.-]+\/video\/\d+)/

    let url = input.match(regex)?.[0]

    let data

    // 🔗 If Input Is TikTok URL
    if (url) {

      await conn.sendMessage(m.chat, {
        react: {
          text: '⏳',
          key: m.key
        }
      })

      let res = await (
        await fetch(
          `https://www.tikwm.com/api/?url=${url}&hd=1`
        )
      ).json()

      if (!res?.data) {
        return m.reply(
          '❌ Failed to fetch TikTok data.'
        )
      }

      data = res.data

    } else {

      // 🔎 Search TikTok Video
      let search = await (
        await fetch(
          `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(input)}&count=1&cursor=0&web=1&hd=1`
        )
      ).json()

      let video = search?.data?.videos?.[0]

      if (!video) {
        return m.reply(
          `❌ No results found for "${input}"`
        )
      }

      // 📥 Get Video Data
      let res = await (
        await fetch(
          `https://www.tikwm.com/api/?url=https://www.tiktok.com/@${video.author.unique_id}/video/${video.video_id}&hd=1`
        )
      ).json()

      if (!res?.data) {
        return m.reply(
          '❌ Failed to fetch search result data.'
        )
      }

      data = res.data
    }

    // ❌ No Audio
    if (!data.music_info?.play) {
      return m.reply(
        '❌ Audio not found.'
      )
    }

    // 🎶 Sending Audio React
    await conn.sendMessage(m.chat, {
      react: {
        text: '🎧',
        key: m.key
      }
    })

    // 📤 Send Audio
    await conn.sendMessage(
      m.chat,
      {
        audio: {
          url: data.music_info.play
        },
        mimetype: 'audio/mpeg',
        fileName: `${data.title || 'tiktok'}.mp3`
      },
      { quoted: m }
    )

    // ✅ Success React
    await conn.sendMessage(m.chat, {
      react: {
        text: '✅',
        key: m.key
      }
    })

  } catch (e) {

    console.error(e)

    // ❌ Error React
    await conn.sendMessage(m.chat, {
      react: {
        text: '❌',
        key: m.key
      }
    })

    m.reply(
      `
╭━━━〔 ❌ ERROR ❌ 〕━━━⬣
┃ ⚠️ An error occurred.
┃ ${e.message || e}
╰━━━━━━━━━━━━━━⬣
`.trim()
    )
  }
}

handler.help = [
  'ttmp3',
  'ttmusic',
  'tiktokmusic'
]

handler.tags = ['downloader']

handler.command =
  /^(ttmp3|ttmusic|tiktokmusic)$/i

handler.limit = true

export default handler