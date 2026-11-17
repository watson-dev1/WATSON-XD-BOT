import axios from 'axios';
import FormData from 'form-data';
import http from 'http';
import https from 'https';
import { sendFakeQuoted } from '../../lib/fakequoted.js';
import { downloadContentFromMessage } from '@rexxhayanasi/elaina-baileys';

const API_URL = 'https://apii.nexadev.my.id/fakeigprofile';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const T_API = 45000;
const T_UPLOAD = 20000;
const DEFAULT_AVATAR = 'https://i.ibb.co/3sXKqK5/avatar.png';

const keepAgent = new https.Agent({ keepAlive: true, keepAliveMsecs: 30000 });
const keepAgentHttp = new http.Agent({ keepAlive: true, keepAliveMsecs: 30000 });

const browserHeaders = {
    'User-Agent': UA,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Origin': 'https://apii.nexadev.my.id',
    'Referer': 'https://apii.nexadev.my.id/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin'
};

const isImage = (buf) => {
    if (!buf || buf.length < 100) return false;
    if (buf[0] === 0xFF && buf[1] === 0xD8) return true;
    if (buf[0] === 0x89 && buf[1] === 0x50) return true;
    if (buf.slice(0, 4).toString('ascii') === 'RIFF') return true;
    if (buf.slice(0, 3).toString('ascii') === 'GIF') return true;
    return false;
};

const isHtmlOrJson = (buf) => {
    if (!buf || buf.length < 10) return true;
    const head = buf.slice(0, 512).toString('utf8').trim().toLowerCase();
    return head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('{"');
};

async function withTimeout(promise, ms, label = 'op') {
    let t;
    const timeout = new Promise((_, rej) => {
        t = setTimeout(() => rej(new Error(`${label} timeout ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

function sanitizeNumber(input) {
    if (!input) return '0';
    const str = String(input).trim().toUpperCase().replace(/,/g, '').replace(/\./g, '');

    let multiplier = 1;
    let numStr = str;

    if (str.endsWith('M')) { multiplier = 1_000_000; numStr = str.slice(0, -1); }
    else if (str.endsWith('K')) { multiplier = 1_000; numStr = str.slice(0, -1); }
    else if (str.endsWith('B')) { multiplier = 1_000_000_000; numStr = str.slice(0, -1); }

    const num = parseFloat(numStr);
    if (isNaN(num)) return '0';
    return String(Math.floor(num * multiplier));
}

function sanitizeBio(bio) {
    return String(bio || '')
        .replace(/[<>{}]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 150);
}

async function uploadToCatbox(buffer) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, { filename: `pp_${Date.now()}.jpg`, contentType: 'image/jpeg' });

    const res = await withTimeout(axios.post('https://catbox.moe/user/api.php', form, {
        headers: { ...form.getHeaders(), 'User-Agent': UA },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: T_UPLOAD,
        validateStatus: () => true
    }), T_UPLOAD + 5000, 'catbox');

    const url = typeof res.data === 'string' ? res.data.trim() : '';
    if (!url || !/^https?:\/\//i.test(url)) throw new Error('Upload Catbox gagal');
    return url;
}

async function callApi(params) {
    const res = await withTimeout(axios.get(API_URL, {
        params,
        responseType: 'arraybuffer',
        timeout: T_API,
        maxContentLength: 20 * 1024 * 1024,
        headers: browserHeaders,
        httpAgent: keepAgentHttp,
        httpsAgent: keepAgent,
        validateStatus: () => true
    }), T_API + 5000, 'api');

    const buf = Buffer.from(res.data || []);
    const contentType = String(res.headers['content-type'] || '').toLowerCase();

    if (res.status >= 400) {
        let detail = '';

        if (contentType.includes('application/json')) {
            try {
                const json = JSON.parse(buf.toString('utf8'));
                detail = json.message || json.error || json.msg || json.info || '';
            } catch (_) {}
        } else if (buf.length > 0 && buf.length < 2000) {
            const text = buf.toString('utf8').trim();
            if (text && text.length < 500) detail = text;
        }

        throw new Error(`HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
    }

    if (!isImage(buf) || isHtmlOrJson(buf)) {
        throw new Error('API mengembalikan data bukan gambar valid');
    }

    return buf;
}

export default {
    command: ['igprofile', 'fakeig', 'fakeigprofile'],
    category: 'maker',
    execute: async (denn, m, { prefix, command, text }) => {
        const input = (m.quoted && m.quoted.text && !text) ? m.quoted.text : text;

        if (!input || !input.includes('|')) {
            return sendFakeQuoted(denn, m,
                `📸 *FAKE IG PROFILE*\n\n` +
                `*Format:* ${prefix}${command} <username>|<bio>|<postingan>|<mengikuti>|<pengikut>\n\n` +
                `*Contoh:*\n` +
                `• \`${prefix}${command} lumnztyz6x|Programmer|12|2|1000\`\n` +
                `• \`${prefix}${command} denncode|Full Stack|50|10|5000\`\n\n` +
                `_Bisa pakai suffix: 100M, 5K, 1B._`,
                { title: 'Fake IG Profile', body: 'Masukkan 5 data dipisah |' }
            );
        }

        const parts = input.split('|').map(v => v.trim());
        if (parts.length < 5) {
            return sendFakeQuoted(denn, m,
                `⚠️ *Format salah!*\n\n5 data wajib dipisah |:\n` +
                `username|bio|postingan|mengikuti|pengikut`,
                { title: 'Format Salah', body: 'Data kurang lengkap' }
            );
        }

        const [username, bioRaw, postinganRaw, mengikutiRaw, pengikutRaw] = parts;

        if (!username || !bioRaw || !postinganRaw || !mengikutiRaw || !pengikutRaw) {
            return sendFakeQuoted(denn, m,
                `⚠️ *Format salah!*\n\nSemua field wajib diisi.`,
                { title: 'Format Salah', body: 'Ada field kosong' }
            );
        }

        const cleanUsername = username.replace(/^@/, '').replace(/[^a-zA-Z0-9._]/g, '').slice(0, 30);
        const cleanBio = sanitizeBio(bioRaw);
        const cleanPostingan = sanitizeNumber(postinganRaw);
        const cleanMengikuti = sanitizeNumber(mengikutiRaw);
        const cleanPengikut = sanitizeNumber(pengikutRaw);

        if (!cleanUsername) {
            return sendFakeQuoted(denn, m, '❌ Username tidak valid.', {
                title: 'Format Salah', body: 'Hanya huruf, angka, titik, underscore'
            });
        }

        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Memproses...', {
            title: 'Fake IG Profile', body: 'Menyiapkan data...'
        }).catch(() => null);

        try {
            let ppurl = '';

            const isQuoted = !!m.quoted;
            const msg = isQuoted ? (m.quoted.msg || m.quoted) : m.msg;
            const mtype = isQuoted ? m.quoted.mtype : m.mtype;
            let mediaMime = msg?.mimetype || '';
            if (!mediaMime && mtype === 'imageMessage') mediaMime = 'image/jpeg';

            let ppBuffer = null;

            if (/image/.test(mediaMime)) {
                const stream = await downloadContentFromMessage(msg, 'image');
                let buf = Buffer.from([]);
                for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
                if (buf && buf.length > 100) ppBuffer = buf;
            }

            if (!ppBuffer) {
                try {
                    const ppWaUrl = await denn.profilePictureUrl(m.sender, 'image');
                    if (ppWaUrl) {
                        const res = await withTimeout(axios.get(ppWaUrl, {
                            responseType: 'arraybuffer',
                            timeout: 15000,
                            maxContentLength: 5 * 1024 * 1024,
                            headers: { 'User-Agent': UA },
                            validateStatus: () => true
                        }), 18000, 'pp-wa');
                        if (res.status === 200) {
                            const buf = Buffer.from(res.data || []);
                            if (isImage(buf)) ppBuffer = buf;
                        }
                    }
                } catch (_) {}
            }

            if (ppBuffer && ppBuffer.length > 100) {
                try {
                    ppurl = await uploadToCatbox(ppBuffer);
                } catch (_) {
                    ppurl = global.thumbnail || DEFAULT_AVATAR;
                }
            } else {
                ppurl = global.thumbnail || DEFAULT_AVATAR;
            }

            if (!ppurl || !/^https?:\/\//i.test(ppurl)) {
                ppurl = DEFAULT_AVATAR;
            }

            const outBuf = await callApi({
                ppurl,
                username: cleanUsername,
                postingan: cleanPostingan,
                mengikuti: cleanMengikuti,
                pengikut: cleanPengikut,
                bio: cleanBio
            });

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            const caption =
                `✅ *FAKE IG PROFILE BERHASIL*\n\n` +
                `👤 *Username:* @${cleanUsername}\n` +
                `📝 *Bio:* ${cleanBio}\n` +
                `📮 *Posts:* ${cleanPostingan}\n` +
                `👣 *Following:* ${cleanMengikuti}\n` +
                `👥 *Followers:* ${cleanPengikut}\n\n` +
                `_Request by: ${m.pushName || 'User'}_`;

            await denn.sendMessage(m.chat, { image: outBuf, caption }, { quoted: m });

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            const code = e.code || '';
            let msg = e.message;
            if (code === 'ECONNRESET') msg = 'Server memutus koneksi. Coba lagi.';
            if (code === 'ETIMEDOUT' || code === 'ECONNABORTED') msg = 'Server timeout. Coba lagi.';

            sendFakeQuoted(denn, m, `❌ *Gagal buat Fake IG Profile:*\n${msg}`, {
                title: 'Fake IG Profile Gagal',
                body: 'Coba lagi nanti'
            });
        }
    }
};