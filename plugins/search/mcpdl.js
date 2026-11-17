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
    'DNT': '1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin'
};

function getApiBase() {
    const base = global.nexadevBaseUrl;
    if (!base) throw new Error('nexadevBaseUrl belum diisi di settings.js');
    return base.replace(/\/+$/, '');
}

async function callSearchApi(query) {
    const base = getApiBase();
    const url = `${base}/api/mcpdl/?q=${encodeURIComponent(query)}`;

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

function formatNumber(n) {
    if (typeof n !== 'number') return String(n || '-');
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'K';
    return String(n);
}

function formatRating(r) {
    const num = parseFloat(r);
    if (isNaN(num)) return '-';
    return num.toFixed(1) + ' / 5';
}

export default {
    command: ['mcpdl', 'mcpedl', 'mcaddon'],
    category: 'search',
    execute: async (denn, m, { prefix, command, text }) => {
        const query = (text || '').trim();

        if (!query) {
            return sendFakeQuoted(denn, m,
                `⛏️ *MCPEDL SEARCH*\n\n` +
                `*Format:* ${prefix}${command} <query>\n` +
                `*Contoh:* ${prefix}${command} lucky block\n` +
                `*Contoh:* ${prefix}${command} one block survival`,
                { title: 'MCPEDL Search', body: 'Cari addon/map Minecraft PE' }
            );
        }

        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Mencari di MCPEDL...', {
            title: 'MCPEDL Search', body: `Query: ${query}`
        }).catch(() => null);

        try {
            const json = await callSearchApi(query);

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            if (!json || !json.status) {
                throw new Error(json?.message || json?.msg || 'API menolak request');
            }

            const results = json.data?.results || [];
            const meta = json.data?.meta || {};
            const total = meta.total ?? results.length;

            if (!results.length) {
                return sendFakeQuoted(denn, m,
                    `⛏️ *MCPEDL SEARCH*\n\n` +
                    `Query: *${query}*\n` +
                    `Hasil: *0* (tidak ditemukan)\n\n` +
                    `_Coba kata kunci lain, misal "lucky block" atau "one block"._`,
                    { title: 'MCPEDL Search', body: 'Tidak ada hasil' }
                );
            }

            const shown = results.slice(0, MAX_RESULTS);

            await sendFakeQuoted(denn, m,
                `⛏️ *MCPEDL SEARCH*\n\n` +
                `Query: *${query}*\n` +
                `Total: *${total}* hasil\n` +
                `Menampilkan: *${shown.length}* teratas`,
                { title: 'MCPEDL Search', body: `Ditemukan ${total} hasil` }
            );

            for (let i = 0; i < shown.length; i++) {
                const item = shown[i];
                const title = item.title || item.highlight?.title?.[0] || 'Tanpa Judul';
                const summary = (item.summary || item.highlight?.description?.[0] || '-').replace(/\s+/g, ' ').trim().slice(0, 180);
                const image = item.image || item.thumbnail || '';
                const downloads = formatNumber(item.downloadCount);
                const rating = formatRating(item.average_rating);
                const author = item.display_name || item.user_nicename || '-';
                const link = item.link || '-';

                let caption = `*${i + 1}. ${title}*\n\n`;
                caption += `📝 ${summary}\n\n`;
                caption += `👤 *Author:* ${author}\n`;
                caption += `📥 *Download:* ${downloads}\n`;
                caption += `⭐ *Rating:* ${rating}\n`;
                caption += `🔗 ${link}`;

                if (image && /^https?:\/\//i.test(image)) {
                    try {
                        await denn.sendMessage(m.chat, {
                            image: { url: image },
                            caption
                        }, { quoted: i === 0 ? m : undefined });
                    } catch {
                        await sendFakeQuoted(denn, m, caption, {
                            title: title,
                            body: 'MCPEDL'
                        });
                    }
                } else {
                    await sendFakeQuoted(denn, m, caption, {
                        title: title,
                        body: 'MCPEDL'
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

            sendFakeQuoted(denn, m, `❌ *Gagal mencari:*\n${msg}`, {
                title: 'MCPEDL Gagal',
                body: 'Coba lagi nanti'
            });
        }
    }
};