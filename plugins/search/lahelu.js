import axios from 'axios';
import http from 'http';
import https from 'https';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_RESULTS = 5;

const keepAgent = new https.Agent({ keepAlive: true, keepAliveMsecs: 30000 });
const keepAgentHttp = new http.Agent({ keepAlive: true, keepAliveMsecs: 30000 });

const browserHeaders = {
    'User-Agent': UA,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Origin': 'https://api.nexadev.my.id',
    'Referer': 'https://api.nexadev.my.id/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin'
};

function getApiBase() {
    const base = global.nexadevBaseUrl;
    if (!base) throw new Error('nexadevBaseUrl belum diisi di settings.js');
    return base.replace(/\/+$/, '');
}

async function callLaheluApi(query) {
    const url = `${getApiBase()}/api/lahelu?query=${encodeURIComponent(query)}`;
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await axios.get(url, {
                timeout: 25000,
                headers: browserHeaders,
                httpAgent: keepAgentHttp,
                httpsAgent: keepAgent,
                validateStatus: () => true,
                maxRedirects: 5
            });

            if (res.status === 429) {
                lastError = new Error('Rate limited');
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

// ─── Cek apakah object mirip post Lahelu ───
function looksLikePost(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const keys = Object.keys(obj).map(k => k.toLowerCase());
    const hasId = keys.some(k => k === 'id' || k === 'postid' || k === 'post_id' || k === 'slug');
    const hasContent = keys.some(k =>
        k === 'title' || k === 'caption' || k === 'media' ||
        k === 'image' || k === 'thumbnail' || k === 'video' ||
        k === 'likes' || k === 'comments' || k === 'content'
    );
    return hasId || hasContent;
}

// ─── Cari array of posts di kedalaman objek apapun ───
function deepFindPosts(node, depth = 0, seen = new Set()) {
    if (depth > 6 || !node || typeof node !== 'object') return null;
    if (seen.has(node)) return null;
    seen.add(node);

    if (Array.isArray(node)) {
        // Kalau array berisi object mirip post
        const objs = node.filter(x => x && typeof x === 'object');
        if (objs.length > 0 && objs.some(looksLikePost)) {
            return objs;
        }
        // Kalau array of array, telusuri lagi
        for (const item of node) {
            const found = deepFindPosts(item, depth + 1, seen);
            if (found) return found;
        }
        return null;
    }

    // Kalau object, telusuri semua value
    for (const [key, value] of Object.entries(node)) {
        // Prioritaskan key yang menandakan list post
        const lowerKey = key.toLowerCase();
        if (['posts', 'results', 'data', 'items', 'list', 'content', 'memes'].includes(lowerKey)) {
            if (Array.isArray(value) && value.length > 0 && value.some(looksLikePost)) {
                return value;
            }
        }
    }

    // Fallback: telusuri semua value
    for (const value of Object.values(node)) {
        const found = deepFindPosts(value, depth + 1, seen);
        if (found) return found;
    }

    return null;
}

function extractImage(item) {
    if (!item || typeof item !== 'object') return '';

    // Cek media array
    const media = item.media || item.images || item.files;
    if (Array.isArray(media)) {
        for (const m of media) {
            if (!m) continue;
            const url = typeof m === 'string' ? m : (m.url || m.image || m.src || m.link);
            if (url && /^https?:\/\//i.test(url)) return url;
        }
    }

    // Cek field langsung
    const candidates = [
        item.image, item.imageUrl, item.image_url, item.thumbnail,
        item.thumbnailUrl, item.thumbnail_url, item.cover, item.coverUrl,
        item.thumb, item.preview, item.img,
        item.user?.avatar, item.user?.profilePicture,
        typeof media === 'string' ? media : null
    ];

    for (const c of candidates) {
        if (typeof c === 'string' && /^https?:\/\//i.test(c)) return c;
    }

    return '';
}

function formatNumber(n) {
    const num = Number(n);
    if (!isFinite(num)) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace('.0', '') + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace('.0', '') + 'K';
    return String(num);
}

export default {
    command: ['lahelu', 'lahelusearch', 'meme'],
    category: 'search',
    execute: async (denn, m, { prefix, command, text }) => {
        const query = (text || '').trim();

        if (!query) {
            return sendFakeQuoted(denn, m,
                `😂 *LAHELU SEARCH*\n\n` +
                `*Format:* ${prefix}${command} <query>\n` +
                `*Contoh:* ${prefix}${command} sad\n` +
                `*Contoh:* ${prefix}${command} kucing`,
                { title: 'Lahelu Search', body: 'Cari meme Lahelu' }
            );
        }

        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Mencari di Lahelu...', {
            title: 'Lahelu Search', body: `Query: ${query}`
        }).catch(() => null);

        try {
            const json = await callLaheluApi(query);

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            const posts = deepFindPosts(json) || [];

            if (!posts.length) {
                // ─── DEBUG: Tampilkan struktur JSON ───
                const preview = JSON.stringify(json, null, 2).slice(0, 1500);
                return sendFakeQuoted(denn, m,
                    `⚠️ *LAHELU: 0 HASIL*\n\n` +
                    `Query: *${query}*\n\n` +
                    `📋 *Struktur JSON:*\n\`\`\`json\n${preview}\n\`\`\`\n\n` +
                    `_Kirim preview ini ke Owner agar parser disesuaikan._`,
                    { title: 'Lahelu Debug', body: 'Struktur JSON tidak dikenali' }
                );
            }

            const shown = posts.slice(0, MAX_RESULTS);

            await sendFakeQuoted(denn, m,
                `😂 *LAHELU SEARCH*\n\n` +
                `Query: *${query}*\n` +
                `Ditemukan: *${posts.length}* post\n` +
                `Menampilkan: *${shown.length}* teratas`,
                { title: 'Lahelu Search', body: `${posts.length} hasil` }
            );

            for (let i = 0; i < shown.length; i++) {
                const item = shown[i];
                const title = (item.title || item.caption || item.text || item.description || item.content || 'Tanpa Judul').toString().slice(0, 150);
                const author = item.user?.username || item.username || item.author || item.creator || '-';
                const likes = formatNumber(item.likes ?? item.like_count ?? item.likes_count ?? item.totalLikes ?? 0);
                const comments = formatNumber(item.comments ?? item.comment_count ?? item.comments_count ?? item.totalComments ?? 0);
                const shares = formatNumber(item.shares ?? item.share_count ?? item.shares_count ?? item.totalShares ?? 0);

                const postId = item.postID || item.post_id || item.id || item.slug;
                const postUrl = postId
                    ? `https://lahelu.com/post/${postId}`
                    : (item.url || item.link || item.postUrl || item.post_url || '');

                const imageUrl = extractImage(item);

                let caption = `*${i + 1}. ${title}*\n\n`;
                caption += `👤 *Author:* @${author}\n`;
                caption += `❤️ ${likes}  💬 ${comments}  🔁 ${shares}\n`;
                if (postUrl) caption += `\n🔗 ${postUrl}`;

                if (imageUrl) {
                    try {
                        await denn.sendMessage(m.chat, {
                            image: { url: imageUrl },
                            caption
                        }, { quoted: i === 0 ? m : undefined });
                    } catch {
                        await sendFakeQuoted(denn, m, caption, {
                            title: title,
                            body: 'Lahelu Post'
                        });
                    }
                } else {
                    await sendFakeQuoted(denn, m, caption, {
                        title: title,
                        body: 'Lahelu Post'
                    });
                }

                if (i < shown.length - 1) {
                    await new Promise(r => setTimeout(r, 1000));
                }
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

            sendFakeQuoted(denn, m, `❌ *Gagal mencari di Lahelu:*\n${msg}`, {
                title: 'Lahelu Gagal',
                body: 'Coba lagi nanti'
            });
        }
    }
};