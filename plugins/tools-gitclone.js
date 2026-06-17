const regex =
  /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?/i

function isValidUrl(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

let handler = async (m, { conn, text, args, usedPrefix, command }) => {

  if (m.fromMe) return

  if (!text) {
    return m.reply(
      `[!] *Wrong input*\n\nExample: ${usedPrefix + command} https://github.com/user/repo`
    )
  }

  if (!isValidUrl(args[0]) || !args[0].includes("github.com")) {
    return m.reply(`❌ Invalid GitHub link!`)
  }

  let match = args[0].match(regex)
  if (!match) return m.reply(`❌ Invalid GitHub repository URL.`)

  let user = match[1]
  let repo = match[2].replace(/\.git$/, "")

  let url = `https://api.github.com/repos/${user}/${repo}/zipball`
  let filename = `${repo}.zip`

  await m.reply(wait)

  conn.sendFile(m.chat, url, filename, null, m)
}

handler.help = ['gitclone <link>']
handler.tags = ['downloader']
handler.command = /gitclone/i
handler.register = true

export default handler