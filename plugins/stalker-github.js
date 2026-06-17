import axios from 'axios'
import moment from 'moment-timezone'

let handler = async (m, { usedPrefix, command, conn, text }) => {
  if (!text) {
    return m.reply(`📘 *Example usage:*
${usedPrefix + command} sadxzyq`)
  }

  try {
    const res = await axios.get(
      `${global.rijalganzz}/stalk/github?username=${encodeURIComponent(text)}`
    )

    const data = res.data.result

    if (!data || !data.username) {
      return m.reply('❌ Username not found.')
    }

    const teks = `乂 *G I T H U B  S T A L K*

👤 *Username:* ${data.username}
🏷️ *Name:* ${data.name || '-'}
👥 *Followers:* ${data.followers}
👣 *Following:* ${data.following}
📁 *Public Repos:* ${data.public_repos}
📍 *Location:* ${data.location || '-'}
🔗 *Profile:* ${data.html_url}

🕓 *Created:* ${moment(data.created_at).tz('Asia/Jakarta').format('DD-MM-YYYY HH:mm:ss')}
🕒 *Updated:* ${moment(data.updated_at).tz('Asia/Jakarta').format('DD-MM-YYYY HH:mm:ss')}

📝 *Bio:* ${data.bio || '-'}
`

    await conn.sendFile(
      m.chat,
      data.avatar_url,
      'github-stalk.png',
      teks,
      m
    )

  } catch (e) {
    console.error(e)
    m.reply('⚠️ Failed to fetch data from API.')
  }
}

handler.help = ['githubstalk <username>']
handler.tags = ['stalker']
handler.command = /^(ghstalk|githubstalk)$/i
handler.limit = true

export default handler