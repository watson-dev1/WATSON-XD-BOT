import fetch from 'node-fetch';
import moment from 'moment-timezone';

let handler = async (m, { conn, text }) => {
  // Get current time in Jakarta
  const time = moment().tz('Africa/Harare');
  const displayDate = time.format('dddd, DD MMMM YYYY'); // Date in Indonesian
  const displayTime = `${time.format('HH:mm:ss')}`;

  // Ensure text is provided
  if (!text) throw 'Please use the format: .iqc message\nExample: .iqc Hello there!';

  // Inform the user that the bot is processing the request
  await conn.reply(m.chat, '⏳ Processing, please wait...', m);

  try {
    // Construct the API URL with necessary parameters
    let url = `https://brat.siputzx.my.id/iphone-quoted?time=${displayTime}&batteryPercentage=60&carrierName=INDOSAT&messageText=${encodeURIComponent(text)}&emojiStyle=apple`;

    // Fetch data from the API
    let res = await fetch(url);

    // Check if the response is OK
    if (!res.ok) throw 'Failed to fetch the image. Please try again later.';

    // Get the image buffer
    let buffer = await res.buffer();

    // Send the image to the chat
    await conn.sendMessage(m.chat, { image: buffer, caption: `🖼️ *Message Quote*:\n${text}` }, { quoted: m });
  } catch (e) {
    // Handle any errors and give feedback to the user
    console.error(e);
    m.reply('❌ An error occurred. Please try again later.');
  }
}

handler.help = ['iqc']
handler.tags = ['internet']
handler.command = ['iqc']

export default handler;