import axios from 'axios';
import yts from 'yt-search';
import fs from 'fs';
import path from 'path';

const DL_API = 'https://api.qasimdev.dpdns.org/api/loaderto/download';
const API_KEY = 'xbps-install-Syu';
const DAILY_LIMIT = 10;
const SECRET_CODE = 'watson-dev';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const DATA_FILE = path.join(process.cwd(), 'songDownloads.json');

// Ensure JSON file exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
}

// Load user download data
let userData = {};
try {
    userData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (err) {
    console.error('Failed to read songDownloads.json, starting fresh:', err);
    userData = {};
}

// Save user download data
const saveUserData = () => fs.writeFileSync(DATA_FILE, JSON.stringify(userData, null, 2));

const downloadWithRetry = async (url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const { data } = await axios.get(DL_API, {
                params: { apiKey: API_KEY, format: 'mp3', url },
                timeout: 90000
            });
            if (data?.data?.downloadUrl) return data.data;
            throw new Error('No download URL found.');
        } catch (err) {
            if (i === retries - 1) throw err;
            console.log(`⚠️ Download attempt ${i + 1} failed, retrying in 5s...`);
            await wait(5000);
        }
    }
};

export default {
    command: 'song',
    aliases: ['music', 'audio', 'mp3'],
    category: 'music',
    description: 'Download a song from YouTube as MP3 (10 downloads/day)',
    usage: '.song <song name | YouTube link> [secret_code]',

    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const userId = message.key.participant || chatId;

        if (!args.length) {
            return sock.sendMessage(chatId, {
                text: `🎵 *Song Downloader*\nUsage:\n.song <song name | YouTube link> [secret_code]`
            }, { quoted: message });
        }

        // Handle secret code
        let secretOverride = false;
        if (args[args.length - 1]?.toLowerCase() === SECRET_CODE.toLowerCase()) {
            secretOverride = true;
            args.pop();
        }
        const query = args.join(' ').trim();

        try {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            userData[userId] = userData[userId] || { date: today, count: 0 };

            // Reset count if a new day
            if (userData[userId].date !== today) {
                userData[userId].date = today;
                userData[userId].count = 0;
            }

            if (!secretOverride && userData[userId].count >= DAILY_LIMIT) {
                return sock.sendMessage(chatId, {
                    text: `❌ Daily download limit reached (${DAILY_LIMIT}). Use secret code for override.`
                }, { quoted: message });
            }

            // Determine video
            let video;
            if (/youtu(?:\.be|be\.com)/.test(query)) {
                video = { url: query, title: query }; // direct link
            } else {
                const { videos } = await yts(query);
                if (!videos?.length) {
                    return sock.sendMessage(chatId, { text: '❌ No results found.' }, { quoted: message });
                }
                video = videos[0];
            }

            // Send thumbnail info if available
            if (video.thumbnail) {
                await sock.sendMessage(chatId, {
                    image: { url: video.thumbnail },
                    caption: `🎶 *${video.title}*\n⏱ ${video.timestamp || 'N/A'}\n\n⏳ Downloading...`
                }, { quoted: message });
            }

            // Download the audio
            const audio = await downloadWithRetry(video.url);

            await sock.sendMessage(chatId, {
                audio: { url: audio.downloadUrl },
                mimetype: 'audio/mpeg',
                fileName: `${audio.title || video.title || 'song'}.mp3`,
                ptt: false
            }, { quoted: message });

            // Increment user count if not secret
            if (!secretOverride) {
                userData[userId].count += 1;
                saveUserData();
            }

        } catch (err) {
            console.error('🎵 Song plugin error:', err);
            await sock.sendMessage(chatId, {
                text: `❌ Failed to download song: ${err.message}`
            }, { quoted: message });
        }
    }
};