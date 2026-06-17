async function uploadUguu(buffer, filename) {
  const blob = new Blob([buffer]);
  const form = new FormData();
  form.append("files[]", blob, filename);

  const res = await fetch("https://uguu.se/upload.php", {
    method: "POST",
    body: form
  });

  const json = await res.json();
  return json.files?.[0]?.url || null;
}

let handler = async (m, { conn, text, usedPrefix, command, isBan }) => {
  if (isBan) return m.reply("🚫 You are banned!")

  if (!text) {
    return m.reply(
      `📌 *Usage:*\n` +
      `> ${usedPrefix + command} username|text|likes (reply image)\n\n` +
      `Example:\n${usedPrefix + command} John|Hello everyone|120`
    )
  }

  const [username, teks, like] = text.split("|")

  if (!username || !teks || !like) {
    return m.reply(
      `Invalid format!\nUse:\n${usedPrefix + command} name|text|likes`
    )
  }

  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ""

  if (!/image/.test(mime)) {
    return m.reply("Please reply/send an image for avatar!")
  }

  let buffer = await q.download()
  let avatarURL = await uploadUguu(buffer, "avatar.jpg")

  if (!avatarURL) return m.reply("❌ Failed to upload image to Uguu.")

  await m.reply("⏳ Creating fake threads...")

  const apiURL =
    `https://api.elrayyxml.web.id/api/maker/fakethreads?username=${encodeURIComponent(username)}` +
    `&avatar=${encodeURIComponent(avatarURL)}` +
    `&text=${encodeURIComponent(teks)}` +
    `&count_like=${encodeURIComponent(like)}`

  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 20000)

    let res = await fetch(apiURL, { signal: controller.signal })

    if (!res.ok) return m.reply(`❌ API Error: ${res.status}`)

    let arr = await res.arrayBuffer()

    if (arr.byteLength < 5000) {
      return m.reply("❌ Invalid API response (server may be down).")
    }

    let img = Buffer.from(arr)

    await conn.sendMessage(
      m.chat,
      {
        image: img,
        caption: "✨ Fake Threads created successfully!"
      },
      { quoted: m }
    )

  } catch (e) {
    if (e.name === "AbortError") {
      return m.reply("⏳ Request timeout (API too slow).")
    }

    return m.reply("❌ Error: " + e.message)
  }
}

handler.help = ["faketh", "fakethreads", "fth"].map(
  v => v + " <username|text|likes>"
)

handler.tags = ["maker", "tools", "fun"]
handler.command = ["faketh", "fakethreads", "fth"]
handler.register = true

export default handler