let handler = async (m, { conn }) => {
  let vid;

  // Get video from quoted message
  if (m.quoted && m.quoted.mtype === "videoMessage") {
    vid = await m.quoted.download();
  }

  // Or from current message
  else if (m.mtype === "videoMessage") {
    vid = await m.download();
  }

  if (!vid) {
    throw `Send a *video* or reply to a *video* then type:\n\n.ptvch`
  }

  const channelId = "120363424621387196@newsletter" // CHANGE TO YOUR CHANNEL ID

  await conn.sendMessage(channelId, {
    video: vid,
    mimetype: "video/mp4",
    gifPlayback: true,
    ptv: true
  })

  m.reply("✓ Video successfully sent to channel as PTV!")
}

handler.help = ["ptvch"]
handler.tags = ["owner"]
handler.command = /^ptvch$/i
handler.owner = true

export default handler