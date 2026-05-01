let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''

  // Validate media type
  if (!/image|video|webp/.test(mime)) {
    return m.reply(`Reply to an image, video, or sticker to create a sticker.\n\n*Usage:* ${usedPrefix + command} PackName, Author`)
  }

  // Handle media conversion
  if (/image|video|webp/.test(mime)) {
    // Treat GIFs as videos; verify duration for animated stickers
    const isVideoLike = /video|gif/.test(mime) || (q.mediaType === 'videoMessage')
    const seconds = Number(q.msg?.seconds || q.seconds || q.duration || 0)
    
    if (isVideoLike && seconds > 10) {
      return m.reply('Videos must be under 10 seconds to be converted into an animated sticker.')
    }

    // Reaction to show processing
    await conn.sendMessage(m.chat, { react: { text: '🎨', key: m.key } })

    let media = await q.download()
    let exif
    
    // Custom metadata logic (e.g., .s MyPack, WatsonXT)
    if (text) {
      const [packname, author] = text.split(/[,|\-+&]/)
      exif = { 
        packName: packname?.trim() || global.stickpack, 
        packPublish: author?.trim() || global.stickauth 
      }
    }

    try {
      await conn.sendSticker(m.chat, media, m, exif)
      
      // Success reaction
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } catch (e) {
      console.error(e)
      m.reply('❌ Failed to convert media to sticker.')
    }
    return
  }
  
  return m.reply('Send or reply to media to make a sticker.')
}

handler.help = ['sticker']
handler.tags = ['sticker']
handler.command = /^s(tic?ker)?(gif)?$/i
handler.register = true

export default handler
