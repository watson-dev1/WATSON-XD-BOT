import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

export default {
    command: ['ytmp3', 'yta', 'ytmp3api'],
    category: 'downloader',
    execute: async (denn, m, { prefix, command, text }) => {
        if (!text) {
            return sendFakeQuoted(denn, m, 
                `🎵 *YOUTUBE MP3 DOWNLOADER*\n\n` +
                `📌 *Format:* ${prefix + command} <link_youtube>\n` +
                `*Contoh:* ${prefix + command} https://youtu.be/xxx`,
                { title: 'YouTube MP3', body: 'Masukkan link video YouTube' }
            );
        }

        await denn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

        const wait = await sendFakeQuoted(denn, m, '⏳ Memproses audio...', {
            title: 'YouTube MP3', body: 'Mengunduh audio, mohon tunggu...'
        }).catch(() => null);

        try {
            // 1. Ambil link audio dari API Jere
            const url = `${global.jereBaseUrl}/api/downloader/ytmp3?apikey=${global.jereApiKey}&url=${encodeURIComponent(text.trim())}`;
            const res = await axios.get(url, { timeout: 60000 });
            const json = res.data;
            
            if (!json.status) throw new Error(json.error || 'Gagal mengunduh audio YouTube');
            
            const audioUrl = json.downloadUrl || json.url || json.result?.downloadUrl || json.result?.url;
            if (!audioUrl) throw new Error('Link audio YouTube tidak ditemukan di response API');
            
            const title = json.title || json.result?.title || 'YouTube Audio';
            const channel = json.channel || json.author || 'YouTube';
            const duration = json.duration || '-';
            
            await denn.sendMessage(m.chat, { react: { text: '📥', key: m.key } }).catch(() => {});

            // 2. Unduh file audio sebagai Buffer
            const audioRes = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 180000, // 3 menit untuk audio besar
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            
            const audioBuffer = Buffer.from(audioRes.data);
            
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            const safeTitle = title.replace(/[\\/:*?"<>|]/g, '').trim() || 'audio';
            const filename = `${safeTitle}.mp3`;
            const sizeMB = (audioBuffer.length / (1024 * 1024)).toFixed(1);

            const caption = `🎵 *YOUTUBE MP3 DOWNLOADER*\n\n` +
                            `📌 *Judul:* ${title}\n` +
                            `👤 *Channel:* ${channel}\n` +
                            `⏱️ *Durasi:* ${duration}\n` +
                            `✨ *Request by:* ${m.pushName || 'User'}`;

            let sent = false;

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
                    console.warn('[YTMP3] Gagal kirim mode audio, mencoba mode dokumen:', errAudio.message);
                }
            }

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
                    console.warn('[YTMP3] Gagal kirim mode dokumen:', errDoc.message);
                }
            }

            if (!sent) {
                await sendFakeQuoted(denn, m, 
                    `${caption}\n\n` +
                    `⚠️ *Ukuran audio (${sizeMB} MB) terlalu besar untuk diunggah langsung ke WhatsApp.*\n\n` +
                    `📥 *Link Download Langsung:*\n${audioUrl}`, 
                    { title: 'YouTube MP3', body: 'File terlalu besar, gunakan link' }
                );
            }
            
            await denn.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            console.error('[YTMP3 ERROR]', e.message);
            await denn.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            
            sendFakeQuoted(denn, m, `❌ *Gagal YTMP3:*\n${e.message || 'Terjadi kesalahan pada server'}`, {
                title: 'YouTube MP3 Gagal', body: 'Server API sibuk atau video tidak tersedia'
            });
        }
    }
};