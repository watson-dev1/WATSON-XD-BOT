import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const TIMEOUT = 8000;
const CONCURRENCY = 10;
const MAX_FOUND_SHOW = 30;
const MAX_SCAN_TIME = 45000;

const PLATFORMS = [
    { name: 'GitHub', url: 'https://github.com/{u}' },
    { name: 'GitLab', url: 'https://gitlab.com/{u}' },
    { name: 'Bitbucket', url: 'https://bitbucket.org/{u}' },
    { name: 'Reddit', url: 'https://www.reddit.com/user/{u}' },
    { name: 'Twitch', url: 'https://www.twitch.tv/{u}' },
    { name: 'Medium', url: 'https://medium.com/@{u}' },
    { name: 'SoundCloud', url: 'https://soundcloud.com/{u}' },
    { name: 'Vimeo', url: 'https://vimeo.com/{u}' },
    { name: 'Dribbble', url: 'https://dribbble.com/{u}' },
    { name: 'Behance', url: 'https://www.behance.net/{u}' },
    { name: 'Kaggle', url: 'https://www.kaggle.com/{u}' },
    { name: 'Linktree', url: 'https://linktr.ee/{u}' },
    { name: 'Wattpad', url: 'https://www.wattpad.com/user/{u}' },
    { name: 'Goodreads', url: 'https://www.goodreads.com/{u}' },
    { name: 'Letterboxd', url: 'https://letterboxd.com/{u}' },
    { name: 'Fiverr', url: 'https://www.fiverr.com/{u}' },
    { name: 'Pinterest', url: 'https://www.pinterest.com/{u}/' },
    { name: 'Spotify', url: 'https://open.spotify.com/user/{u}' },
    { name: 'Telegram', url: 'https://t.me/{u}' },
    { name: 'Tumblr', url: 'https://{u}.tumblr.com' },
    { name: 'Patreon', url: 'https://www.patreon.com/{u}' },
    { name: 'Venmo', url: 'https://venmo.com/{u}' },
    { name: 'AboutMe', url: 'https://about.me/{u}' },
    { name: 'ProductHunt', url: 'https://www.producthunt.com/@{u}' },
    { name: 'Scribd', url: 'https://www.scribd.com/{u}' }
];

async function checkPlatform(p, username) {
    const targetUrl = p.url.replace('{u}', encodeURIComponent(username));

    try {
        const res = await axios.get(targetUrl, {
            timeout: TIMEOUT,
            headers: {
                'User-Agent': UA,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            maxRedirects: 0,
            validateStatus: () => true
        });

        if (res.status === 200) {
            return { platform: p.name, url: targetUrl, status: 'found' };
        }
        if (res.status === 404) {
            return { platform: p.name, url: targetUrl, status: 'not_found' };
        }
        if (res.status >= 300 && res.status < 400) {
            const location = (res.headers.location || '').toLowerCase();
            const uLower = username.toLowerCase();
            if (location.includes(uLower)) {
                return { platform: p.name, url: targetUrl, status: 'found' };
            }
            return { platform: p.name, url: targetUrl, status: 'not_found' };
        }
        return { platform: p.name, url: targetUrl, status: 'unknown' };
    } catch (e) {
        return { platform: p.name, url: targetUrl, status: 'error' };
    }
}

async function scanAll(username) {
    const queue = [...PLATFORMS];
    const results = [];

    const worker = async () => {
        while (queue.length > 0) {
            const p = queue.shift();
            if (!p) return;
            const r = await checkPlatform(p, username);
            results.push(r);
        }
    };

    const workers = [];
    for (let i = 0; i < Math.min(CONCURRENCY, PLATFORMS.length); i++) {
        workers.push(worker());
    }

    const scanPromise = Promise.all(workers);
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Scan timeout')), MAX_SCAN_TIME)
    );

    try {
        await Promise.race([scanPromise, timeoutPromise]);
    } catch (e) {}

    return results;
}

export default {
    command: ['track', 'osint', 'sharelok'],
    category: 'tools',
    execute: async (denn, m, { prefix, command, text }) => {
        const username = (text || '').trim().replace(/^@/, '');

        if (!username) {
            return sendFakeQuoted(denn, m,
                `🔍 *OSINT*\n\n` +
                `Cari username di ${PLATFORMS.length}+ platform!\n\n` +
                `*Format:* ${prefix}${command} <username>\n` +
                `*Contoh:* ${prefix}${command} denncode\n\n` +
                `_Username harus 3-30 karakter (huruf, angka, underscore, dot)._`,
                { title: 'Sherlock OSINT', body: 'Cari akun di banyak platform' }
            );
        }

        if (!/^[a-zA-Z0-9._]{3,30}$/.test(username)) {
            return sendFakeQuoted(denn, m,
                `❌ *Username tidak valid.*\n\n` +
                `Harus 3-30 karakter.\n` +
                `Hanya huruf, angka, titik, dan underscore.`,
                { title: 'Username Invalid', body: 'Format salah' }
            );
        }

        const wait = await sendFakeQuoted(denn, m,
            `🔍 *Scanning ${username}...*\n\n` +
            `_Memindai ${PLATFORMS.length} platform, mohon tunggu ~10-20 detik._`,
            { title: 'Sherlock OSINT', body: `Scan: ${username}` }
        ).catch(() => null);

        try {
            const results = await scanAll(username);

            const found = results.filter(r => r.status === 'found');
            const notFound = results.filter(r => r.status === 'not_found');
            const unknown = results.filter(r => !['found', 'not_found'].includes(r.status));

            let output = `🔍 *SHERLOCK OSINT*\n`;
            output += `👤 Username: *${username}*\n`;
            output += `📊 Scan: ${results.length}/${PLATFORMS.length} platform\n\n`;

            if (found.length > 0) {
                output += `✅ *DITEMUKAN (${found.length}):*\n`;
                const shown = found.slice(0, MAX_FOUND_SHOW);
                shown.forEach((r, i) => {
                    output += `${i + 1}. *${r.platform}*\n   ${r.url}\n`;
                });
                if (found.length > MAX_FOUND_SHOW) {
                    output += `_...dan ${found.length - MAX_FOUND_SHOW} platform lainnya_\n`;
                }
                output += `\n`;
            } else {
                output += `❌ *TIDAK ADA AKUN DITEMUKAN*\n\n`;
            }

            if (notFound.length > 0) {
                output += `❌ *Tidak ditemukan (${notFound.length}):*\n`;
                output += notFound.map(r => r.platform).join(', ');
                output += `\n\n`;
            }

            if (unknown.length > 0) {
                output += `⚠️ *Tidak bisa diverifikasi (${unknown.length}):*\n`;
                output += unknown.map(r => r.platform).join(', ');
            }

            output += `\n\n_Request by: ${m.pushName || 'User'}_`;

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            await sendFakeQuoted(denn, m, output.trim(), {
                title: 'Sherlock OSINT',
                body: `${found.length} akun ditemukan dari ${results.length} platform`
            });

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            sendFakeQuoted(denn, m,
                `❌ *Gagal scan:*\n${e.message}`,
                { title: 'Sherlock Error', body: 'Coba lagi nanti' }
            );
        }
    }
};