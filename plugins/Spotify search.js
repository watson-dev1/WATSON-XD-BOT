/**
 * 🎵 WATSON-XD-BOT Spotify Search 🎵
 * -----------------------------------------
 * ✨ Type    : Plugins ESM
 * 👑 Creator : WATSON-XD-BOT
 
 **/
 
 import fetch from 'node-fetch'

let handler = async (
  m,
  { conn, text, usedPrefix, command }
) => {

  // 🎧 React Loading
  await conn.sendMessage(m.chat, {
    react: {
      text: '🎵',
      key: m.key
    }
  })

  // ❌ No Input
  if (!text) {

    throw `
╭━━━〔 🎵 WATSON-XD-BOT 🎵 〕━━━⬣
┃ 📌 Enter song title
┃
┃ ✨ Example:
┃ ${usedPrefix + command} swim chase atlantic
╰━━━━━━━━━━━━━━━━━━⬣
`.trim()
  }

  try {

    // ⏳ Searching React
    await conn.sendMessage(m.chat, {
      react: {
        text: '⏳',
        key: m.key
      }
    })

    // 🔍 Fetch Spotify Search
    let res = await fetch(
      `https://api.nexray.eu.cc/search/spotify?q=${encodeURIComponent(text)}`
    )

    let data = await res.json()

    // ❌ No Result
    if (!data.status || !data.result.length) {
      throw 'Song not found'
    }

    // 🎶 Get Top 10 Results
    let result = data.result.slice(0, 10)

    // 📝 Caption
    let caption = `
╭━━━〔 🎵 SPOTIFY SEARCH 🎵 〕━━━⬣
┃ 🌿 Powered By WATSON-XD-BOT
╰━━━━━━━━━━━━━━━━━━━━⬣

`.trim() + '\n\n'

    for (let i = 0; i < result.length; i++) {

      let v = result[i]

      caption += `
╭━━━〔 🎶 RESULT ${i + 1} 🎶 〕━━━⬣
┃ 📌 Title :
┃ ${v.title}
┃
┃ 👤 Artist :
┃ ${v.artist}
┃
┃ 💿 Album :
┃ ${v.album}
┃
┃ ⏱️ Duration :
┃ ${v.duration}
┃
┃ 🔥 Popularity :
┃ ${v.popularity}
┃
┃ 📅 Release :
┃ ${v.release_date}
┃
┃ 🔗 URL :
┃ ${v.url}
╰━━━━━━━━━━━━━━━━━━⬣
`.trim()

      if (i !== result.length - 1) {
        caption += '\n\n'
      }
    }

    // 🖼️ Send Result
    await conn.sendMessage(
      m.chat,
      {
        image: {
          url: result[0].thumbnail
        },
        caption
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

    console.log(e)

    // ❌ Error React
    await conn.sendMessage(m.chat, {
      react: {
        text: '❌',
        key: m.key
      }
    })

    throw `
╭━━━〔 ❌ ERROR ❌ 〕━━━⬣
┃ ⚠️ Failed to search song
┃
┃ ${e.message || e}
╰━━━━━━━━━━━━━━━━━━⬣
`.trim()
  }
}

handler.help = ['spotifysearch']
handler.tags = ['search']
handler.command = /^(spotifysearch|spotifys|sps)$/i

handler.limit = true
handler.register = true

export default handler