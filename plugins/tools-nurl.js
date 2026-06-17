import FormData from "form-data";
import axios from "axios";
import moment from "moment-timezone";
import mime from "mime-types";

const unitLabel = { minutes: "minutes", hours: "hours", days: "days" };

const ensureExt = (name, mimeType) => {
  if (/\.[a-z0-9]{1,5}$/i.test(name)) return name;
  const ext = mime.extension(mimeType);
  return name + (ext ? `.${ext}` : "");
};

const toSize = s =>
  s < 1024
    ? `${s} B`
    : s < 1048576
    ? `${(s / 1024).toFixed(1)} KB`
    : `${(s / 1048576).toFixed(2)} MB`;

let handler = async (m, { conn, text, command }) => {
  const q = m.quoted ? m.quoted : m
  const mimeType = (q.msg || q).mimetype || ""
  const isReply = !!m.quoted

  if (!mimeType && !isReply) {
    return m.reply(
`📤 *How to use .${command}*

1️⃣ Reply media ➜ \`.${command} myfile|30|minutes\`
2️⃣ Reply text  ➜ \`.${command} notes|1|hours\`
3️⃣ Send media with caption ➜ \`.${command} docs|2|days\`

📌 expire_unit: minutes | hours | days
📦 Max: 100 MB`
    )
  }

  // ── Buffer & filename ──
  let buffer, filename
  let rawName = text?.split("|")[0]?.trim()

  if (mimeType) {
    buffer = await q.download()
    if (!rawName) rawName = `file_${Date.now()}`
    filename = ensureExt(rawName, mimeType)

  } else if (isReply && q.text) {
    buffer = Buffer.from(q.text, "utf-8")
    if (!rawName) rawName = `text_${Date.now()}`
    filename = rawName.endsWith(".txt") ? rawName : `${rawName}.txt`

  } else {
    return m.reply(`⚠️ Please reply to media or text.`)
  }

  // ── Parameters ──
  const [name = filename, expVal = "30", expUnit = "minutes"] =
    (text || "").split("|").map(v => v.trim().toLowerCase())

  if (!["minutes", "hours", "days"].includes(expUnit)) {
    return m.reply("❗ expire_unit must be: minutes | hours | days")
  }

  // ── Upload to API ──
  const form = new FormData()
  form.append("file", buffer, { filename, contentType: mimeType || "text/plain" })
  form.append("filename", name)
  form.append("expire_value", expVal)
  form.append("expire_unit", expUnit)

  try {
    const { data: up } = await axios.post("https://nauval.cloud/upload", form, {
      headers: { ...form.getHeaders(), "User-Agent": "TixoBot" }
    })

    const ext = filename.split(".").pop().toLowerCase()

    const icon =
      /audio/.test(mimeType) ? "🎵" :
      /image/.test(mimeType) ? "🖼️" :
      /video/.test(mimeType) ? "🎞️" :
      ["pdf"].includes(ext) ? "📕" :
      ["ppt", "pptx"].includes(ext) ? "📊" :
      ["doc", "docx"].includes(ext) ? "📝" :
      ["xls", "xlsx"].includes(ext) ? "📈" :
      ["zip", "rar"].includes(ext) ? "🗂️" :
      ["js", "html", "css", "json", "py", "cpp", "sh"].includes(ext) ? "🧩" :
      "📄"

    const expiredWIB = up.expires_at
      ? moment.utc(up.expires_at).tz("Asia/Jakarta").format("D MMM YYYY, HH:mm [WIB]")
      : "Not set"

    const caption =
`${icon} *File uploaded successfully!*

🔗 *URL:* ${up.file_url}
🕓 *Expires At:* ${expiredWIB}
📆 *Expires In:* ${expVal} ${unitLabel[expUnit]}
📄 *Filename:* ${up.filename}
📦 *Size:* ${toSize(up.size)}`

    const qrBuf = Buffer.from(up.qr_code_base64.split(",")[1], "base64")

    await conn.sendMessage(
      m.chat,
      {
        image: qrBuf,
        caption,
        footer: "QR code valid until file expires.",
        buttons: [
          { buttonId: up.file_url, buttonText: { displayText: "📥 Download" }, type: 1 },
          { buttonId: "menu", buttonText: { displayText: "🏠 Menu" }, type: 1 }
        ],
        headerType: 4
      },
      { quoted: m }
    )

  } catch (e) {
    console.error("[Upload Error]", e)
    m.reply("❌ Failed to upload file.")
  }
}

handler.help = ["nurl"]
handler.tags = ["tools"]
handler.command = /^nurl$/i

export default handler