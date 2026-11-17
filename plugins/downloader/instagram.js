import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

export default {
    command: ['instagram', 'igdl', 'ig', 'igvideo', 'igphoto', 'igreels'],
    category: 'downloader',
    execute: async (denn, m, { prefix, command, text }) => {
        if (!text) {
            return sendFakeQuoted(denn, m, 
                `📸 *INSTAGRAM DOWNLOADER*\n\n` +
                `*Format:* ${prefix + command} <link_instagram>\n` +
                `*Contoh:* ${prefix + command} https://www.instagram.com/reel/xxxx`,
                { title: 'Instagram Downloader', body: 'Masukkan link Instagram (Reels/Post)' }
            );
        }

        await denn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

        const wait = await sendFakeQuoted(denn, m, '⏳ Memproses media...', {
            title: 'Instagram Downloader', body: 'Mengunduh media, mohon tunggu...'
        }).catch(() => null);

        try {
            let apiUrl = `${global.jereBaseUrl}/api/downloader/instagram`;
            
            // Coba POST dulu, kalau gagal coba GET
            let response;
            try {
                response = await axios.post(apiUrl, { 
                    apikey: global.jereApiKey, 
                    url: text.trim() 
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000
                });
            } catch (postError) {
                console.log('[IG] POST gagal, mencoba GET...');
                response = await axios.get(`${apiUrl}?apikey=${global.jereApiKey}&url=${encodeURIComponent(text.trim())}`, { 
                    timeout: 60000 
                });
            }
            
            let data = response?.data;
            if (!data || !data.status || !data.result) {
                throw new Error(data?.error || data?.detail || 'Gagal mengambil data Instagram');
            }
            
            let urls = data.result.urls || (Array.isArray(data.result) ? data.result : [data.result]);
            if (!urls || urls.length === 0) throw new Error('Tidak ada media ditemukan di link tersebut.');

            // Hapus pesan loading
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            // Loop melalui setiap media (jika carousel/slide)
            for (let i = 0; i < urls.length; i++) {
                let item = urls[i];
                let itemUrl = typeof item === 'string' ? item : (item.url || item.downloadUrl || item.download);
                if (!itemUrl) continue;
                
                let isVideo = /\.(mp4|mov|avi|webm)($|\?)/i.test(itemUrl) || (typeof item === 'object' && item.type === 'video');
                
                let caption = `📸 *INSTAGRAM DOWNLOADER*\n\n` +
                              (urls.length > 1 ? `📎 *${i + 1}/${urls.length}*\n` : '') +
                              `✨ *Request by:* ${m.pushName || 'User'}`;

                try {
                    // Download media ke Buffer (Anti SSL/EPROTO)
                    const mediaRes = await axios.get(itemUrl, {
                        responseType: 'arraybuffer',
                        timeout: 45000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                            'Referer': 'https://www.instagram.com/'
                        }
                    });

                    const mediaBuffer = Buffer.from(mediaRes.data);
                    if (mediaBuffer.length < 100) throw new Error('File media rusak atau kosong.');

                    if (isVideo) {
                        await denn.sendMessage(m.chat, {
                            video: mediaBuffer,
                            caption: caption,
                            fileName: `instagram_${Date.now()}.mp4`,
                            mimetype: 'video/mp4'
                        }, { quoted: i === 0 ? m : undefined });
                    } else {
                        await denn.sendMessage(m.chat, {
                            image: mediaBuffer,
                            caption: caption
                        }, { quoted: i === 0 ? m : undefined });
                    }

                    // Jeda 1.5 detik antar media agar tidak kena rate-limit WA
                    if (i < urls.length - 1) {
                        await new Promise(r => setTimeout(r, 1500));
                    }

                } catch (mediaErr) {
                    console.error(`[IG Media ${i+1} Error]`, mediaErr.message);
                    // Fallback kirim link jika gagal download buffer
                    await denn.sendMessage(m.chat, {
                        text: `⚠️ Gagal mengunduh media ke-${i+1}.\n\n*Link Langsung:*\n${itemUrl}`
                    }, { quoted: m });
                }
            }
            
            await denn.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            console.error('[IG Error]', e.message);
            await denn.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            
            sendFakeQuoted(denn, m, `❌ *Gagal Instagram:*\n${e.message || 'Terjadi kesalahan pada server'}`, {
                title: 'Instagram Gagal', body: 'Pastikan link valid dan akun tidak private'
            });
        }
    }
};