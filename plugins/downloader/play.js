import axios from 'axios';
import yts from 'yt-search';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

// ─── FUNGSI MULTI-FALLBACK MENGAMBIL AUDIO ───
async function getYouTubeAudio(url) {
    const API_KEY = global.jereApiKey;
    let errors = [];

    // 1. Endpoint /api/downloader/youtube
    try {
        const res = await axios.get(`${global.jereBaseUrl}/api/downloader/youtube?apikey=${API_KEY}&url=${encodeURIComponent(url)}&format=mp3`, { timeout: 30000 });
        if (res.data?.status) {
            const data = res.data.result || res.data.data || res.data;
            const dl = data.download || data.url || data.downloadUrl || data.download_url;
            if (dl) return {
                title: data.title || "YouTube Audio",
                author: data.channel || data.author || "YouTube",
                duration: data.duration || "-",
                downloadUrl: dl
            };
        }
    } catch (e) { errors.push(`youtube: ${e.message}`); }

    // 2. Fallback /api/downloader/ytmp3
    try {
        const res = await axios.get(`${global.jereBaseUrl}/api/downloader/ytmp3?apikey=${API_KEY}&url=${encodeURIComponent(url)}`, { timeout: 30000 });
        if (res.data?.status) {
            const data = res.data.result || res.data;
            const dl = data.downloadUrl || data.download_url || data.download || data.url;
            if (dl) return {
                title: data.title || res.data.title || "YouTube Audio",
                author: data.channel || data.author || "YouTube",
                duration: data.duration || "-",
                downloadUrl: dl
            };
        }
    } catch (e) { errors.push(`ytmp3: ${e.message}`); }

    // 3. Fallback /api/downloader/ytmp3v2
    try {
        const res = await axios.get(`${global.jereBaseUrl}/api/downloader/ytmp3v2?apikey=${API_KEY}&url=${encodeURIComponent(url)}&format=mp3`, { timeout: 30000 });
        if (res.data?.status) {
            const data = res.data.result || res.data;
            const dl = data.download_url || data.downloadUrl || data.download || data.url;
            if (dl) return {
                title: data.title || "YouTube Audio",
                author: data.channel || data.author || "YouTube",
                duration: data.duration || "-",
                downloadUrl: dl
            };
        }
    } catch (e) { errors.push(`ytmp3v2: ${e.message}`); }

    throw new Error(`Gagal mengambil audio YouTube.`);
}

// ─── FUNGSI PENCARIAN YOUTUBE ───
async function searchYoutube(query) {
    try {
        const searchResults = await yts(query);
        if (!searchResults?.videos?.length) throw new Error('Tidak ditemukan hasil');
        return searchResults.videos.slice(0, 5);
    } catch (error) {
        try {
            const res = await axios.get(`${global.jereBaseUrl}/api/search/youtube?apikey=${global.jereApiKey}&q=${encodeURIComponent(query)}`, { timeout: 20000 });
            if (res.data?.status && Array.isArray(res.data.result) && res.data.result.length > 0) {
                return res.data.result.slice(0, 5).map(v => ({
                    title: v.title,
                    author: { name: v.channel || 'YouTube' },
                    timestamp: v.duration || '-',
                    url: v.link || `https://youtube.com/watch?v=${v.id}`
                }));
            }
        } catch { }
        throw error;
    }
}

export default {
    command: ['play', 'musik', 'music', 'song'],
    category: 'downloader',
    execute: async (denn, m, { prefix, command, text }) => {
        if (!text) {
            return sendFakeQuoted(denn, m, 
                `🎵 *YOUTUBE PLAY*\n\n` +
                `📌 *Cara Pakai:*\n` +
                `> \`${prefix + command} <judul lagu / link youtube>\`\n\n` +
                `💡 *Contoh:*\n` +
                `> \`${prefix + command} Never Gonna Give You Up\`\n` +
                `> \`${prefix + command} https://youtu.be/dQw4w9WgXcQ\``,
                { title: 'YouTube Play', body: 'Cari atau download lagu dari YouTube' }
            );
        }

        await denn.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});

        // ─── MODE 1: DOWNLOAD LINK LANGSUNG ───
        if (text.includes('youtube.com') || text.includes('youtu.be')) {
            const wait = await sendFakeQuoted(denn, m, '⏳ Memproses audio...', {
                title: 'YouTube Play', body: 'Mengunduh audio...'
            }).catch(() => null);

            try {
                const audioData = await getYouTubeAudio(text.trim());
                await denn.sendMessage(m.chat, { react: { text: "📥", key: m.key } }).catch(() => {});

                const audioRes = await axios.get(audioData.downloadUrl, {
                    responseType: 'arraybuffer',
                    timeout: 120000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });

                const audioBuffer = Buffer.from(audioRes.data);
                const safeTitle = audioData.title.replace(/[\\/:*?"<>|]/g, '').trim() || 'audio';
                const filename = `${safeTitle}.mp3`;
                const sizeMB = (audioBuffer.length / (1024 * 1024)).toFixed(1);

                const caption = `🎵 *YOUTUBE MUSIC*\n\n` +
                                `📌 *Judul:* ${audioData.title}\n` +
                                `👤 *Channel:* ${audioData.author}\n` +
                                `⏱️ *Durasi:* ${audioData.duration}\n` +
                                `✨ *Request by:* ${m.pushName || 'User'}`;

                let sent = false;

                // Hapus pesan loading
                if (wait?.key?.id) {
                    try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
                }

                // 1. Kirim sebagai Audio (<= 20MB)
                if (audioBuffer.length <= 20 * 1024 * 1024) {
                    try {
                        await denn.sendMessage(m.chat, {
                            audio: audioBuffer,
                            mimetype: 'audio/mpeg',
                            ptt: false,
                            fileName: filename
                        }, { quoted: m });
                        sent = true;
                    } catch (errAudio) {
                        console.warn('[PLAY] Gagal kirim mode audio:', errAudio.message);
                    }
                }

                // 2. Fallback Dokumen (<= 100MB)
                if (!sent && audioBuffer.length <= 100 * 1024 * 1024) {
                    try {
                        await denn.sendMessage(m.chat, {
                            document: audioBuffer,
                            mimetype: 'audio/mpeg',
                            fileName: filename,
                            caption: caption
                        }, { quoted: m });
                        sent = true;
                    } catch (errDoc) {
                        console.warn('[PLAY] Gagal kirim mode dokumen:', errDoc.message);
                    }
                }

                // 3. Fallback Link jika > 100MB / Gagal Upload
                if (!sent) {
                    await sendFakeQuoted(denn, m, 
                        `${caption}\n\n` +
                        `⚠️ *Ukuran audio (${sizeMB} MB) terlalu besar untuk diunggah langsung.*\n\n` +
                        `📥 *Link Download:*\n${audioData.downloadUrl}`,
                        { title: 'YouTube Play', body: 'File terlalu besar, gunakan link' }
                    );
                }

                await denn.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
            } catch (e) {
                if (wait?.key?.id) try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
                console.error('[PLAY Error]', e.message);
                await denn.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
                sendFakeQuoted(denn, m, `❌ *Gagal memproses lagu:*\n${e.message}`, {
                    title: 'YouTube Play Gagal', body: 'Server sibuk atau link tidak valid'
                });
            }
            return;
        }

        // ─── MODE 2: PENCARIAN JUDUL ───
        try {
            const videos = await searchYoutube(text.trim());
            if (!videos.length) {
                await denn.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
                return sendFakeQuoted(denn, m, `❌ Tidak ditemukan lagu untuk: "${text}"`, {
                    title: 'Pencarian Gagal', body: 'Lagu tidak ditemukan'
                });
            }

            let listText = `🎵 *HASIL PENCARIAN YOUTUBE*\n\n`;
            listText += `🔍 *Query:* ${text}\n`;
            listText += `📌 *Ditemukan:* ${videos.length} hasil\n\n`;

            videos.forEach((v, i) => {
                listText += `*${i + 1}. ${v.title}*\n`;
                listText += `   👤 ${v.author?.name || 'YouTube'}\n`;
                listText += `   ⏱️ ${v.timestamp || '-'}\n`;
                listText += `   🔗 ${v.url}\n\n`;
            });

            listText += `_Salin link video di atas, lalu ketik \`${prefix}${command} <link>\` untuk mengunduh._`;

            await sendFakeQuoted(denn, m, listText, {
                title: 'Pencarian YouTube',
                body: `Ditemukan ${videos.length} hasil untuk "${text}"`
            });

            await denn.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});

        } catch (error) {
            console.error('[PLAY Search Error]', error);
            await denn.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            sendFakeQuoted(denn, m, `❌ *Gagal mencari lagu:*\n${error.message}`, {
                title: 'Pencarian Gagal', body: 'Server sedang sibuk'
            });
        }
    }
};