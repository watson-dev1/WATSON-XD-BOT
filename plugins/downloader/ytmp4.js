
import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

export default {
    command: ['ytmp4', 'ytv', 'ytmp4api'],
    category: 'downloader',
    execute: async (denn, m, { prefix, command, text }) => {
        if (!text) {
            return sendFakeQuoted(denn, m, 
                `🎬 *YOUTUBE MP4 DOWNLOADER*\n\n` +
                `📌 *Format:* ${prefix + command} <link> [kualitas]\n` +
                `*Contoh:* ${prefix + command} https://youtu.be/xxx 720`,
                { title: 'YouTube MP4', body: 'Masukkan link YouTube dan kualitas (opsional)' }
            );
        }

        await denn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

        const wait = await sendFakeQuoted(denn, m, '⏳ Memproses video...', {
            title: 'YouTube MP4', body: 'Mengunduh video, mohon tunggu...'
        }).catch(() => null);

        try {
            const args = text.trim().split(' ');
            const targetUrl = args[0];
            const quality = args[1] || "720"; // Default 720p
            
            const apiUrl = `${global.jereBaseUrl}/api/downloader/ytmp4?apikey=${global.jereApiKey}&url=${encodeURIComponent(targetUrl)}&quality=${encodeURIComponent(quality)}`;
            
            const res = await axios.get(apiUrl, { timeout: 30000 });
            const json = res.data;
            
            if (!json.status) throw new Error(json.error || 'Gagal mengunduh video YouTube');
            
            const videoUrl = json.downloadUrl || json.url || json.result?.downloadUrl || json.result?.url;
            if (!videoUrl) throw new Error('Link video YouTube tidak ditemukan di response API');
            
            const title = json.title || json.result?.title || 'YouTube Video';
            const safeTitle = title.slice(0, 30).replace(/[^\w\s-]/g, '');
            
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            const caption = `🎬 *YOUTUBE MP4 DOWNLOADER*\n\n` +
                            `📌 *Judul:* ${title}\n` +
                            `📺 *Kualitas:* ${quality}p\n` +
                            `✨ *Request by:* ${m.pushName || 'User'}`;

            try {
                await denn.sendMessage(m.chat, {
                    video: { url: videoUrl },
                    caption: caption,
                    fileName: `${safeTitle || 'video'}.mp4`,
                    mimetype: 'video/mp4'
                }, { quoted: m });
            } catch (errVideo) {
                console.log('[YTMP4] Gagal kirim video, fallback ke dokumen...');
                await denn.sendMessage(m.chat, {
                    document: { url: videoUrl },
                    fileName: `${safeTitle || 'video'}.mp4`,
                    mimetype: 'video/mp4',
                    caption: caption
                }, { quoted: m });
            }
            
            await denn.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            console.error('[YTMP4 Error]', e.message);
            await denn.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            
            sendFakeQuoted(denn, m, `❌ *Gagal YTMP4:*\n${e.message || 'Terjadi kesalahan pada server'}`, {
                title: 'YouTube MP4 Gagal', body: 'Server API sibuk atau video tidak tersedia'
            });
        }
    }
};

