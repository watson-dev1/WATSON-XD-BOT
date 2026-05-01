import yts from 'yt-search'

let handler = async (m, { conn, text }) => {
  // Check if a query was provided
  if (!text) throw 'What are you looking for?'
  
  // Use a global waiting message if available, otherwise a fallback
  await conn.reply(m.chat, global.wait || 'Searching YouTube... Please wait.', m)

  let results = await yts(text)
  let videos = results.all.filter(v => v.type === 'video') 
  
  // Check if any videos were found
  if (videos.length === 0) throw 'Video not found!'

  // Logic for cycling through results or selecting the first one
  let index = 0 
  let video = videos[index] 

  let caption = `
✨ *${video.title}*

↳ *Link :* ${video.url}
↳ *Duration :* ${video.timestamp}
↳ *Uploaded :* ${video.ago}
↳ *Views :* ${video.views}`

  await conn.sendMessage(
    m.chat,
    {
      image: { url: video.thumbnail },
      caption: caption.trim(),
      headerType: 4,
      contextInfo: {
        externalAdReply: {
          title: "YouTube Search Results",
          body: video.author.name,
          thumbnailUrl: video.thumbnail,
          sourceUrl: video.url,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      },
      buttons: [
        {
          buttonId: `.ytmp4 ${video.url}`,
          buttonText: { displayText: "Download Video" },
          type: 1
        },
        {
          buttonId: `.ytmp3 ${video.url}`,
          buttonText: { displayText: "Download Audio" },
          type: 1
        },
        {
          buttonId: `.yts ${text}`,
          buttonText: { displayText: "Next Result" },
          type: 1
        }
      ],
      footer: "Powered by watsonxt",
      viewOnce: true
    },
    { quoted: m }
  )
}

handler.help = ['yts <query>']
handler.tags = ['internet']
handler.command = /^yts(earch)?$/i

export default handler
