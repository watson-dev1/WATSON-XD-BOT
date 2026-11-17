import axios from 'axios';
import http from 'http';
import https from 'https';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const DEFAULT_REACTION = '🔥';

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

const CHANNEL_REGEX = /^https?:\/\/(www\.)?whatsapp\.com\/channel\/[a-zA-Z0-9]+\/\d+/i;

function getApi() {
    const base = global.nexadevBaseUrl;
    const key = global.nexadevApiKey;
    if (!base || !key) {
        throw new Error('nexadevBaseUrl atau nexadevApiKey belum diisi di settings.js');
    }
    return { base: base.replace(/\/+$/, ''), key };
}

function parseInput(raw) {
    if (!raw) return null;
    const trimmed = raw.trim();

    let url = '';
    let reaction = DEFAULT_REACTION;

    if (trimmed.includes('|')) {
        const [u, r] = trimmed.split('|').map(s => s.trim());
        url = u;
        reaction = r || DEFAULT_REACTION;
    } else {
        const parts = trimmed.split(/\s+/);
        url = parts[0];
        if (parts.length > 1) reaction = parts.slice(1).join(' ');
    }

    if (!CHANNEL_REGEX.test(url)) return null;
    return { url, reaction };
}

function isSuccess(json) {
    if (!json || typeof json !== 'object') return false;

    if (json.status === true) return true;
    if (json.success === true) return true;
    if (json.ok === true) return true;
    if (json.status === 'success' || json.status === 'Succes') return true;

    const r = json.result;
    if (r && typeof r === 'object') {
        if (r.success === true) return true;
        if (r.status === true) return true;
        if (r.status === 'success' || r.status === 'Succes') return true;
        if (r.task && (r.task.status === 'success' || r.task.status === 'Succes' || r.task.status === true)) return true;
    }

    return false;
}

async function requestApi(finalUrl, method = 'GET', body = null) {
    const config = {
        timeout: 25000,
        headers: browserHeaders,
        httpAgent: keepAgentHttp,
        httpsAgent: keepAgent,
        validateStatus: () => true,
        maxRedirects: 5
    };

    let res;
    if (method === 'POST') {
        res = await axios.post(finalUrl, body || {}, config);
    } else {
        res = await axios.get(finalUrl, config);
    }

    let json = res.data;
    if (typeof json === 'string') {
        try { json = JSON.parse(json); } catch { throw new Error('Response bukan JSON'); }
    }
    return { status: res.status, json };
}

async function callRchApi(channelUrl, reaction) {
    const { base, key } = getApi();

    const getUrl =
        `${base}/api/rch?key=${encodeURIComponent(key)}` +
        `&url=${encodeURIComponent(channelUrl)}` +
        `&reaction=${encodeURIComponent(reaction)}`;

    const postUrl = `${base}/api/rch`;
    const postBody = { key, url: channelUrl, reaction };

    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const { status, json } = await requestApi(getUrl, 'GET');

            if (status === 429) {
                lastError = new Error('Rate limited');
                await new Promise(r => setTimeout(r, 3000));
                continue;
            }
            if (status >= 500) {
                lastError = new Error(`Server error (HTTP ${status})`);
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }
            if (status === 200 && json) return json;

            throw new Error(`HTTP ${status}`);
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

    try {
        const { status, json } = await requestApi(postUrl, 'POST', postBody);
        if (status === 200 && json) return json;
    } catch (e) {
        lastError = e;
    }

    throw lastError || new Error('Gagal menghubungi API');
}

export default {
    command: ['rch', 'reactch', 'swreact'],
    category: 'tools',
    execute: async (denn, m, { prefix, command, text }) => {
        const parsed = parseInput(text);

        if (!parsed) {
            return sendFakeQuoted(denn, m,
                `🔥 *REACT CHANNEL*\n\n` +
                `*Format:* ${prefix}${command} <link_channel> [emoji]\n\n` +
                `*Contoh:*\n` +
                `• \`${prefix}${command} link | 🥶\`\n` +
                `• \`${prefix}${command} https://whatsapp.com/channel/0029Vb8vySGAYlUMLcZVFT3d/148 😂\`\n` +
                `• \`${prefix}${command} https://whatsapp.com/channel/xxx/148|❤️\`\n\n` +
                `_Default emoji: 🔥, max emoji 4,lalu pisahkan dengan koma ( , ) contoh 🥶,💙,😝,😋_`,
                { title: 'React Channel', body: 'Masukkan link post channel WA' }
            );
        }

        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Mengirim reaction...', {
            title: 'React Channel', body: `Emoji: ${parsed.reaction}`
        }).catch(() => null);

        try {
            const json = await callRchApi(parsed.url, parsed.reaction);

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            if (!json || typeof json !== 'object') {
                throw new Error('Response tidak valid');
            }

            if (!isSuccess(json)) {
                const apiMsg = json.message || json.msg || json.error || json.info || json.result?.message || '';
                const jsonPreview = JSON.stringify(json, null, 2).slice(0, 1200);

                return sendFakeQuoted(denn, m,
                    `❌ *API MENOLAK REQUEST*\n\n` +
                    (apiMsg ? `📝 *Pesan API:* ${apiMsg}\n\n` : '') +
                    `📋 *Preview Response:*\n\`\`\`json\n${jsonPreview}\n\`\`\`\n\n` +
                    `_Kirim preview ini ke Owner._`,
                    { title: 'React Channel Gagal', body: apiMsg || 'API error' }
                );
            }

            const result = json.result || {};
            const limitRemaining = json.limit_remaining ?? '-';
            const limitDeducted = json.limit_deducted ?? '-';
            const responseTime = json.response_time || '-';
            const apiMsg = result.message || 'Reaction terkirim';

            let card = `🔥 *REACT CHANNEL BERHASIL*\n\n`;
            card += `🔗 *Link:* ${parsed.url}\n`;
            card += `😀 *Emoji:* ${parsed.reaction}\n`;
            card += `⏱️ *Response:* ${responseTime}\n`;
            if (limitDeducted !== '-') card += `📉 *Kuota Terpakai:* ${limitDeducted}\n`;
            if (limitRemaining !== '-') card += `💳 *Sisa Kuota:* ${limitRemaining}\n`;
            card += `\n_${apiMsg}_`;

            await sendFakeQuoted(denn, m, card.trim(), {
                title: 'React Channel',
                body: `Emoji ${parsed.reaction} terkirim`
            });

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            const code = e.code || '';
            let msg = e.message;
            if (code === 'ECONNRESET') msg = 'Server memutus koneksi. Coba lagi.';
            if (code === 'ETIMEDOUT' || code === 'ECONNABORTED') msg = 'Server timeout. Coba lagi.';
            if (code === 'ENOTFOUND') msg = 'Server tidak ditemukan.';

            sendFakeQuoted(denn, m, `❌ *Gagal kirim reaction:*\n${msg}`, {
                title: 'React Channel Gagal',
                body: 'Coba lagi nanti'
            });
        }
    }
};