import axios from 'axios';

/**
 * Fetch data with retries
 */
async function fetchWithRetries(url, retries = 3, delay = 2000) {
    let attempt = 0;
    while (attempt < retries) {
        try {
            const { data } = await axios.get(url, { timeout: 10000 });
            return data;
        } catch (err) {
            attempt++;
            console.warn(`[WHY] Attempt ${attempt} failed: ${err.message}`);
            if (attempt >= retries) throw new Error('Max retries reached for API');
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

/**
 * Returns a random background image URL
 */
function getRandomBackground() {
    const backgrounds = [
        'https://i.imgur.com/3yQ0QyM.png', // blue gradient
        'https://i.imgur.com/P5FpruC.png', // galaxy
        'https://i.imgur.com/xS3FRi9.png', // colorful abstract
        'https://i.imgur.com/7mYh4jF.png', // neon
        'https://i.imgur.com/8D4P2iW.png', // yellow pastel
        'https://i.imgur.com/HUuqXcz.png', // sunset
        'https://i.imgur.com/1X2cA2t.png'  // dark gradient
    ];
    return backgrounds[Math.floor(Math.random() * backgrounds.length)];
}

/**
 * Generate meme image URL with text overlay
 */
function generateImageUrl(text) {
    const encoded = encodeURIComponent(text);
    const bg = encodeURIComponent(getRandomBackground());
    // Using memegen.link API for custom images
    return `https://api.memegen.link/images/custom/_/${encoded}.png?background=${bg}`;
}

export default {
    command: 'why',
    aliases: ['whyme', 'question'],
    category: 'fun',
    description: 'Get a random “why” question with a fun image',
    usage: '.why',
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;

        try {
            const data = await fetchWithRetries('https://nekos.life/api/v2/why');

            if (!data?.why?.trim()) {
                return await sock.sendMessage(chatId, { 
                    text: '❌ API returned an empty response. Try again.' 
                }, { quoted: message });
            }

            const question = data.why;
            const imageUrl = generateImageUrl(question);

            await sock.sendMessage(chatId, {
                image: { url: imageUrl },
                caption: `🤔 *Why Question*\n\n${question}`,
                quoted: message
            });

        } catch (error) {
            console.error('[WHY] Plugin error:', error);
            await sock.sendMessage(chatId, { 
                text: '❌ Failed to fetch a question. Please try again later.' 
            }, { quoted: message });
        }
    }
};