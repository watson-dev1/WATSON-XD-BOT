import fetch from 'node-fetch';  // Importing fetch for making API calls

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Example : ${usedPrefix + command} spongebob`;  // Ensure text input is provided

    try {
        // Fetch data from the Pinterest API with the provided search term
        let response = await fetch(`https://api.platform.web.id/pinterest?q=${text}`);
        let data = await response.json();  // Parse JSON response

        // Check if the API returns any results
        if (!data || !data.results || data.results.length === 0) {
            return m.reply('No media found for the search query. Please try again with a different term.');
        }

        // Get a random result from the search results
        let randomResult = data.results[Math.floor(Math.random() * data.results.length)];

        // React with a search icon to acknowledge the search
        await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } });

        // Send the random result as a file/image
        await conn.sendFile(m.chat, randomResult.url, '', `*Search result for:* ${text.trim()}`, m);
    } catch (e) {
        console.log(e);
        m.reply('Sorry, an error occurred while fetching the image. Please try again later.');
    }
}

handler.help = ['pinterest'];  // Help command
handler.tags = ['internet'];   // Tag for the command
handler.command = /^pin(terest)?$/i;  // Regex to handle both "pin" and "pinterest"
handler.limit = 2;  // Set a limit for the number of times it can be used
handler.register = true;  // Allow registration of the handler

export default handler;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));  // Helper function to delay for the given time in ms
}