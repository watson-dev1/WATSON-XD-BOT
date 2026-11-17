import axios from 'axios';
import http from 'http';
import https from 'https';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const API_BASE = 'https://api.nexadev.my.id/api/aio';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_VIDEO = 30 * 1024 * 1024;
const MAX_AUDIO = 15 * 1024 * 1024;

const keepAgent = new https.Agent({ keepAlive: true, keepAliveMsecs: 30000 });
const keepAgentHttp = new http.Agent({ keepAlive: true, keepAliveMsecs: 30000 });

const browserHeaders = {
    'User-Agent': UA,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Origin': 'https://api.nexadev.my.id',
    'Referer': 'https://api.nexadev.my.id/',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin'
};

function getReferer(url) {
    try {
        const host = new URL(url).hostname.toLowerCase();
        if (host.includes('tiktok')) return 'https://www.tiktok.com/';
        if (host.includes('facebook') || host.includes('fb.watch')) return 'https://www.facebook.com/';
        if (host.includes('instagram')) return 'https://www.instagram.com/';
        if (host.includes('twitter') || host.includes('x.com')) return 'https://twitter.com/';
        if (host.includes('youtube') || host.includes('youtu.be')) return 'https://www.youtube.com/';
    } catch {}
    return 'https://www.google.com/';
}

async function callAioApi(targetUrl) {
    const finalUrl = `${API_BASE}?url=${encodeURIComponent(targetUrl)}`;
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await axios.get(finalUrl, {
                timeout: 25000,
                headers: browserHeaders,
                httpAgent: keepAgentHttp,
                httpsAgent: keepAgent,
                validateStatus: () => true,
                maxRedirects: 5
            });

            if (res.status === 429) {
                lastError = new Error('Rate limited. Coba lagi 30 detik lagi.');
                await new Promise(r => setTimeout(r, 3000));
                continue;
            }
            if (res.status >= 500) {
                lastError = new Error(`Server error (HTTP ${res.status})`);
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }
            if (res.status !== 200) throw new Error(`HTTP ${res.status}`);

            let json = res.data;
            if (typeof json === 'string') {
                try { json = JSON.parse(json); } catch { throw new Error('Response bukan JSON'); }
            }
            return json;
        } catch (e) {
            lastError = e;
            const code = e.code || '';
            if ((code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNABORTED' || code === 'ENOTFOUND') && attempt < 3) {
                await new Promise(r => setTimeout(r, 2000 * attempt));
                continue;
            }
            if (attempt >= 3) break;
        }
    }
    throw lastError || new Error('Gagal menghubungi API');
}

function isValidVideo(buf) {
    if (!buf || buf.length < 1000) return false;
    if (buf.slice(4, 8).toString('ascii') === 'ftyp') return true;
    if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return true;
    if (buf.slice(0, 3).toString('ascii') === 'FLV') return true;
    return false;
}

function isValidAudio(buf) {
    if (!buf || buf.length < 500) return false;
    if (buf.slice(0, 3).toString('ascii') === 'ID3') return true;
    if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) return true;
    if (buf.slice(4, 8).toString('ascii') === 'ftyp') return true;
    if (buf.slice(0, 4).toString('ascii') === 'OggS') return true;
    return false;
}

function isJsonOrHtml(buf) {
    if (!buf || buf.length < 10) return true;
    const head = buf.slice(0, 512).toString('utf8').trim().toLowerCase();
    return head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('{"') || head.startsWith('{ "');
}

function extractAllMedia(obj) {
    const found = { videos: [], audios: [], images: [], others: [] };
    const seen = new Set();

    function classify(url, keyHint) {
        if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;
        if (seen.has(url)) return;
        seen.add(url);

        const u = url.toLowerCase();
        const k = (keyHint || '').toLowerCase();

        if (/\.(mp4|webm|mov|mkv)/i.test(u)) { found.videos.push(url); return; }
        if (/\.(mp3|m4a|opus|ogg|wav)/i.test(u)) { found.audios.push(url); return; }
        if (/\.(jpg|jpeg|png|webp|gif)/i.test(u)) { found.images.push(url); return; }

        if (k === 'video' || k === 'videohd' || k === 'videosd' || k === 'hd' || k === 'sd' || k === 'play' || k === 'downloadaddr' || k === 'downloadaddr_hd' || k === 'videoplay' || k === 'video_hd' || k === 'video_sd' || k.includes('video') && !k.includes('cover') && !k.includes('thumb') && !k.includes('image')) {
            found.videos.push(url);
            return;
        }
        if (k === 'audio' || k === 'music' || k === 'sound' || k === 'audio_url' || k === 'music_url' || (k.includes('audio') && !k.includes('cover') && !k.includes('thumb'))) {
            found.audios.push(url);
            return;
        }
        if (k === 'cover' || k === 'thumbnail' || k === 'image' || k === 'photo' || k.includes('cover') || k.includes('thumb')) {
            found.images.push(url);
            return;
        }
        found.others.push({ url, key: keyHint });
    }

    function walk(node, keyHint = '', depth = 0) {
        if (depth > 10 || !node) return;
        if (typeof node === 'string') { classify(node, keyHint); return; }
        if (Array.isArray(node)) { node.forEach(item => walk(item, keyHint, depth + 1)); return; }
        if (typeof node === 'object') {
            for (const [key, value] of Object.entries(node)) walk(value, key, depth + 1);
        }
    }

    walk(obj);
    return found;
}

function pickMeta(obj) {
    if (!obj || typeof obj !== 'object') return {};
    const data = obj.data || obj.result || obj;
    return {
        title: data.title || data.desc || data.description || data.caption || data.text || 'Media',
        author: data.author || data.username || data.nickname || data.user?.nickname || data.user?.username || '-'
    };
}

async function fetchBuffer(url, maxSize, referer) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 45000,
        maxContentLength: maxSize,
        headers: {
            'User-Agent': UA,
            'Referer': referer || 'https://www.google.com/',
            'Accept': '*/*'
        },
        httpAgent: keepAgentHttp,
        httpsAgent: keepAgent,
        maxRedirects: 5,
        validateStatus: () => true
    });

    if (res.status >= 400) throw new Error(`HTTP ${res.status}`);

    const ct = String(res.headers['content-type'] || '').toLowerCase();
    if (ct.includes('text/html') || ct.includes('application/json')) {
        throw new Error('Response bukan media');
    }

    const buf = Buffer.from(res.data || []);
    if (isJsonOrHtml(buf)) throw new Error('Buffer berupa HTML/JSON');

    return buf;
}

export default {
    command: ['aio', 'alldl'],
    category: 'downloader',
    execute: async (denn, m, { prefix, command, text }) => {
        if (!text || !/^https?:\/\//i.test(text.trim())) {
            return sendFakeQuoted(denn, m,
                `📥 *ALL-IN-ONE DOWNLOADER*\n\n` +
                `*Format:* ${prefix}${command} <link>\n` +
                `*Contoh:* ${prefix}${command} https://vt.tiktok.com/xxxx`,
                { title: 'AIO Downloader', body: 'Masukkan link yang valid' }
            );
        }

        const targetUrl = text.trim();
        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Memproses...', {
            title: 'AIO Downloader', body: 'Mengambil media...'
        }).catch(() => null);

        try {
            const json = await callAioApi(targetUrl);

            if (!json || typeof json !== 'object') throw new Error('Response tidak valid');
            if (!json.status && !json.data && !json.result) {
                throw new Error(json.msg || json.message || 'API error');
            }

            const payload = json.data || json.result || json;
            const meta = pickMeta(json);
            const { videos, audios, images } = extractAllMedia(payload);

            if (!videos.length && !audios.length && !images.length) {
                if (wait?.key?.id) {
                    try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
                }
                const jsonPreview = JSON.stringify(payload, null, 2).slice(0, 1500);
                return sendFakeQuoted(denn, m,
                    `⚠️ *Struktur JSON tidak dikenali*\n\n` +
                    `📋 *Preview Response:*\n\`\`\`json\n${jsonPreview}\n\`\`\`\n\n` +
                    `_Kirim pesan ini ke Owner._`,
                    { title: 'Debug AIO', body: 'Parser perlu disesuaikan' }
                );
            }

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            const referer = getReferer(targetUrl);
            const caption = `📥 *${meta.title}*\n👤 *Author:* ${meta.author}`;

            if (videos.length) {
                for (const vid of videos.slice(0, 3)) {
                    try {
                        const buffer = await fetchBuffer(vid, MAX_VIDEO, referer);
                        if (isValidVideo(buffer)) {
                            await denn.sendMessage(m.chat, {
                                video: buffer,
                                mimetype: 'video/mp4',
                                fileName: `aio_${Date.now()}.mp4`,
                                caption
                            }, { quoted: m });
                            return;
                        }
                    } catch (e) {}
                }

                const fallbackVid = videos[0];
                await denn.sendMessage(m.chat, {
                    video: { url: fallbackVid },
                    mimetype: 'video/mp4',
                    caption
                }, { quoted: m });
                return;
            }

            if (images.length) {
                const limited = images.slice(0, 10);
                for (let i = 0; i < limited.length; i++) {
                    await denn.sendMessage(m.chat, {
                        image: { url: limited[i] },
                        caption: i === 0 ? caption : undefined
                    }, { quoted: i === 0 ? m : undefined });
                    if (i < limited.length - 1) await new Promise(r => setTimeout(r, 1000));
                }
                return;
            }

            if (audios.length) {
                for (const aud of audios.slice(0, 3)) {
                    try {
                        const buffer = await fetchBuffer(aud, MAX_AUDIO, referer);
                        if (isValidAudio(buffer)) {
                            await denn.sendMessage(m.chat, {
                                audio: buffer,
                                mimetype: 'audio/mpeg',
                                ptt: false,
                                fileName: `aio_${Date.now()}.mp3`
                            }, { quoted: m });
                            return;
                        }
                    } catch (e) {}
                }

                await denn.sendMessage(m.chat, {
                    audio: { url: audios[0] },
                    mimetype: 'audio/mpeg',
                    ptt: false
                }, { quoted: m });
            }

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            const code = e.code || '';
            let msg = e.message;
            if (code === 'ECONNRESET') msg = 'Server memutus koneksi. Coba lagi.';
            if (code === 'ETIMEDOUT' || code === 'ECONNABORTED') msg = 'Server timeout. Coba lagi.';
            if (code === 'ENOTFOUND') msg = 'Server tidak ditemukan.';

            sendFakeQuoted(denn, m, `❌ *Gagal download:*\n${msg}`, {
                title: 'AIO Downloader Gagal',
                body: 'Coba lagi nanti'
            });
        }
    }
};