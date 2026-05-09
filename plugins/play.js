import yts from 'yt-search';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const DL_API = 'https://api.qasimdev.dpdns.org/api/loaderto/download';
const API_KEY = 'xbps-install-Syu';
const MAX_DOWNLOADS = 10;
const PREMIUM_CODE = 'watson-dev';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const DATA_FILE = path.join(process.cwd(), 'userDownloads.json');

// Load downloads from file
let userDownloads = {};
if (fs.existsSync(DATA_FILE)) {
    try {
        userDownloads = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (err) {
        console.error('Failed to load userDownloads.json:', err);
        userDownloads = {};
    }
}

// Save downloads to file
const saveDownloads = () => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(userDownloads, null, 2));
};

const downloadWithRetry = async (url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(DL_API, {
                params: { apiKey: API_KEY, format: 'mp3', url },
                timeout: 90000
            });
            if (data?.data?.downloadUrl) return data.data;
            throw new Error('No download URL');
        } catch (err) {
            if (i === retries - 1) throw err;
            await wait(5000);
        }
    }
};

export default {
    command: 'play',
    aliases: ['plays', 'music'],
    category: 'music',
    description: 'Search and download a song as MP3 from YouTube (10 downloads/day)',
    usage: '.play <song name> [premium code]',
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const userId = message.key.fromMe ? 'self' : message.key.participant || chatId;

        if (!args.length) {
            return sock.sendMessage(chatId, { text: '*Which song?*\nUsage: .play <song name> [premium code]' }, { quoted: message });
        }

        // Check premium code
        let hasPremium = false;
        if (args[args.length - 1]?.toLowerCase() === PREMIUM_CODE.toLowerCase()) {
            hasPremium = true;
            args.pop();
        }
        const query = args.join(' ').trim();

        // Initialize user
        if (!userDownloads[userId]) userDownloads[userId] = { count: 0, lastReset: Date.now() };
        // Reset daily count
        if (Date.now() - userDownloads[userId].lastReset > 24 * 60 * 60 * 1000) {
            userDownloads[userId] = { count: 0, lastReset: Date.now() };
        }

        // Check limit
        if (userDownloads[userId].count >= MAX_DOWNLOADS && !hasPremium) {
            return sock.sendMessage(chatId, {
                text: `❌ Daily limit reached (${MAX_DOWNLOADS}). Use premium code *${PREMIUM_CODE}* to bypass.`,
                quoted: message
            });
        }

        try {
            await sock.sendMessage(chatId, { text: '🔍 Searching...' }, { quoted: message });
            const { videos } = await yts(query);
            if (!videos?.length) return sock.sendMessage(chatId, { text: '❌ No results found' }, { quoted: message });

            const video = videos[0];
            await sock.sendMessage(chatId, { text: `✅ Found: ${video.title}\n⏱️ ${video.timestamp}\nDownloading...` }, { quoted: message });

            const songData = await downloadWithRetry(video.url);

            if (!hasPremium) userDownloads[userId].count += 1;
            saveDownloads();

            await sock.sendMessage(chatId, {
                audio: { url: songData.downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${songData.title}.mp3`,
            }, { quoted: message });

        } catch (err) {
            console.error('Play error:', err.message);
            await sock.sendMessage(chatId, { text: `❌ Failed to download song: ${err.message}` }, { quoted: message });
        }
    }
};