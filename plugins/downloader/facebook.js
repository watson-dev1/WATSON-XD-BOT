import axios from 'axios';
import getFBInfo from '@renpwn/fb-downloader';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const isVideoBuf = (buf) => {
    if (!buf || buf.length < 100) return false;
    if (buf.slice(4, 8).toString('ascii') === 'ftyp') return true;
    if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) return true;
    return false;
};

const isImageBuf = (buf) => {
    if (!buf || buf.length < 100) return false;
    if (buf[0] === 0xFF && buf[1] === 0xD8) return true;
    if (buf[0] === 0x89 && buf[1] === 0x50) return true;
    return false;
};

export default {
    command: ['facebook', 'fb', 'fbdl', 'fbvideo'],
    category: 'downloader',
    execute: async (denn, m, { prefix, command, text }) => {
        if (!text || !text.startsWith('http')) {
            return sendFakeQuoted(denn, m, 
                `📘 *FACEBOOK DOWNLOADER*\n\n` +
                `*Mendukung:* Video, Reels, & Foto\n\n` +
                `*Format:* ${prefix + command} <link_facebook>\n` +
                `*Contoh:* ${prefix + command} https://www.facebook.com/watch/?v=xxxx`,
                { title: 'Facebook Downloader', body: 'Masukkan link Facebook publik' }
            );
        }

        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Memproses media...', {
            title: 'Facebook Downloader', body: 'Mengunduh media dari Facebook...'
        }).catch(() => null);

        try {
            let mediaUrl = null;
            let mediaType = 'video';
            let title = 'Facebook Media';
            let quality = 'HD';

            try {
                const res = await getFBInfo(text);
                
                if (res) {
                    mediaUrl = res.hd || res.sd;
                    title = res.title || title;
                    quality = res.hd ? 'HD (High Definition)' : 'SD (Standard Definition)';
                    
                    if (!mediaUrl && res.thumbnail) {
                        mediaUrl = res.thumbnail;
                        mediaType = 'image';
                    }
                }
            } catch (e) {
                console.log('[FB] @renpwn/fb-downloader gagal:', e.message);
            }
         if (!mediaUrl) {
                try {
                    const key = global.jereApiKey;
                    const res = await axios.get(`${global.jereBaseUrl}/api/downloader/facebook`, {
                        params: { apikey: key, url: text },
                        timeout: 20000,
                        headers: { 'User-Agent': UA }
                    });
                    
                    if (res.data && res.data.status) {
                        const data = res.data.result || res.data.data || res.data;
                        mediaUrl = data.video_hd || data.video_sd || data.hd || data.sd || data.video || data.url;
                        
                        if (!mediaUrl && (data.image || data.thumbnail)) {
                            mediaUrl = data.image || data.thumbnail;
                            mediaType = 'image';
                        }
                        
                        title = data.title || title;
                        quality = data.video_hd ? 'HD (High Definition)' : 'SD (Standard Definition)';
                    }
                } catch (e) {
                    console.log('[FB] Jere gagal:', e.message);
                }
            }

            if (!mediaUrl || !mediaUrl.startsWith('http')) {
                throw new Error('Gagal mendapatkan link media dari server. Pastikan video/foto bersifat publik.');
            }

            const mediaRes = await axios.get(mediaUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                maxContentLength: 100 * 1024 * 1024,
                headers: { 
                    'User-Agent': UA,
                    'Referer': 'https://www.facebook.com/'
                }
            });

            const mediaBuffer = Buffer.from(mediaRes.data || []);
            if (mediaBuffer.length < 5000) {
                throw new Error('File media terlalu kecil atau rusak.');
            }

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            const caption = `📘 *FACEBOOK DOWNLOADER*\n\n` +
                            `📌 *Judul:* ${title}\n` +
                            `📺 *Kualitas:* ${quality}\n` +
                            `✨ *Request by:* ${m.pushName || 'User'}`;

            if (isVideoBuf(mediaBuffer) || mediaType === 'video') {
                await denn.sendMessage(m.chat, {
                    video: mediaBuffer,
                    mimetype: 'video/mp4',
                    fileName: `facebook_${Date.now()}.mp4`,
                    caption
                }, { quoted: m });
            } else if (isImageBuf(mediaBuffer) || mediaType === 'image') {
                await denn.sendMessage(m.chat, {
                    image: mediaBuffer,
                    caption
                }, { quoted: m });
            } else {
                await denn.sendMessage(m.chat, {
                    document: mediaBuffer,
                    mimetype: 'application/octet-stream',
                    fileName: `facebook_${Date.now()}.bin`,
                    caption
                }, { quoted: m });
            }

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            console.error('[FB Error]', e.message);
            sendFakeQuoted(denn, m, `❌ *Error:* ${e.message || 'Terjadi kesalahan pada server'}`, {
                title: 'FB Downloader Gagal', body: 'Pastikan link valid dan video/foto publik'
            });
        }
    }
};