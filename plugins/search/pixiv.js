import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_IMAGE = 15 * 1024 * 1024;
const T_DL = 30000;

const log = (...a) => console.log('[Pixiv]', ...a);

const isValidUrl = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);

const isHtml = (buf) => {
    if (!buf || buf.length < 16) return true;
    const head = buf.slice(0, 512).toString('utf8').toLowerCase();
    return head.includes('<!doctype') || head.includes('<html') || head.includes('<body');
};

const isImageBuf = (buf) => {
    if (!buf || buf.length < 100) return false;
    if (buf[0] === 0xFF && buf[1] === 0xD8) return true; // JPG
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true; // PNG
    if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return true; // WEBP
    if (buf.slice(0, 3).toString('ascii') === 'GIF') return true; // GIF
    return false;
};

// ─── FUNGSI PENCARIAN LANGSUNG KE PIXIV AJAX API ───
async function searchPixivDirect(query) {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `https://www.pixiv.net/ajax/search/artworks/${encodedQuery}?word=${encodedQuery}&order=date_d&mode=all&p=1&s_mode=s_tag_full`;

    log('Mencari via Pixiv Ajax:', url);

    try {
        const res = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': UA,
                'Referer': 'https://www.pixiv.net/',
                'Accept': 'application/json'
            },
            validateStatus: () => true
        });

        if (res.status !== 200) {
            throw new Error(`Pixiv merespons dengan status ${res.status}`);
        }

        const json = res.data;
        if (json.error) {
            throw new Error(json.message || 'Pixiv mengembalikan error');
        }

        const data = json.body?.illustManga?.data;
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error(`Tidak ada hasil untuk "${query}"`);
        }

        // Ambil maksimal 5 hasil
        return data.slice(0, 5).map(item => ({
            id: item.id,
            title: item.title || 'Tanpa Judul',
            author: item.userName || 'Anonim',
            authorId: item.userId,
            // Gunakan thumbnail (c/250x250_80_a2) untuk dikirim
            imageUrl: item.url,
            // Alternatif: coba ganti ke gambar asli (img-original) jika thumbnail gagal
            originalUrl: item.url.replace('/c/250x250_80_a2/', '/img-original/'),
            tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
            width: item.width,
            height: item.height
        }));

    } catch (e) {
        log('Pixiv Ajax Error:', e.message);
        throw new Error(`Gagal mencari di Pixiv: ${e.message}`);
    }
}

// ─── FUNGSI DOWNLOAD GAMBAR ───
async function fetchImageBuf(url) {
    if (!isValidUrl(url)) throw new Error('URL tidak valid');
    
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: T_DL,
        maxContentLength: MAX_IMAGE,
        headers: {
            'User-Agent': UA,
            'Referer': 'https://www.pixiv.net/',
            'Accept': 'image/*,*/*'
        },
        validateStatus: () => true
    });

    const buf = Buffer.from(res.data || []);
    if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
    if (buf.length < 1024) throw new Error('Buffer terlalu kecil');
    if (isHtml(buf)) throw new Error('Response berupa HTML');
    if (!isImageBuf(buf)) throw new Error('Bukan format gambar valid');
    
    return buf;
}

const buildCaption = (meta) => {
    const lines = [`🎨 *PIXIV ARTWORK*`];
    lines.push('');
    lines.push(`📌 *Judul:* ${meta.title}`);
    lines.push(`👤 *Artist:* ${meta.author}`);
    if (meta.tags) lines.push(`🏷️ *Tags:* ${String(meta.tags).slice(0, 200)}`);
    if (meta.id) lines.push(`🔗 *Link:* https://www.pixiv.net/artworks/${meta.id}`);
    lines.push(`⚙️ *Sumber:* Pixiv Official`);
    return lines.join('\n');
};

export default {
    command: ['pixiv'],
    category: 'search',
    execute: async (denn, m, { prefix, text }) => {
        if (!text) {
            return sendFakeQuoted(denn, m,
                `🎨 *PIXIV ARTWORK SEARCH*\n\n` +
                `📌 *Contoh:*\n` +
                `• \`${prefix}pixiv hatsune miku\`\n` +
                `• \`${prefix}pixiv genshin impact\``,
                { title: 'Pixiv Search', body: 'Cari artwork di Pixiv' }
            );
        }

        let waitMsg;
        try {
            waitMsg = await sendFakeQuoted(denn, m, `🔍 Mencari "${text.trim()}" di Pixiv...`, {
                title: 'Pixiv Search', body: 'Sedang mencari artwork...'
            });
        } catch (_) {}

        const updateWait = async (newText) => {
            if (!waitMsg?.key?.id) return;
            try { await denn.sendMessage(m.chat, { text: newText, edit: waitMsg.key }) } catch (_) {}
        };

        const deleteWait = async () => {
            if (!waitMsg?.key?.id) return;
            try { await denn.sendMessage(m.chat, { delete: waitMsg.key }) } catch (_) {}
        };

        try {
            const items = await searchPixivDirect(text.trim());
            log(`Ditemukan ${items.length} hasil untuk "${text.trim()}"`);

            let sentCount = 0;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const caption = buildCaption(item);
                let sent = false;

                // Coba download dari thumbnail dulu
                try {
                    const buf = await fetchImageBuf(item.imageUrl);
                    await denn.sendMessage(m.chat, { image: buf, caption }, { quoted: i === 0 ? m : undefined });
                    sent = true;
                } catch (e) {
                    log(`Thumbnail gagal: ${e.message}`);
                }

                // Jika thumbnail gagal, coba gambar original
                if (!sent) {
                    try {
                        const buf = await fetchImageBuf(item.originalUrl);
                        await denn.sendMessage(m.chat, { image: buf, caption }, { quoted: i === 0 ? m : undefined });
                        sent = true;
                    } catch (e) {
                        log(`Original gagal: ${e.message}`);
                    }
                }

                if (sent) {
                    sentCount++;
                } else {
                    log(`Gagal mengirim gambar untuk item ${i+1}`);
                }
            }

            await deleteWait();

            if (sentCount === 0) {
                await sendFakeQuoted(denn, m,
                    `❌ Gagal mengirim gambar dari Pixiv.\n\n` +
                    `_Kemungkinan server gambar memblokir atau gambar sudah dihapus._`,
                    { title: 'Pixiv Gagal', body: 'Gambar gagal dikirim' }
                );
            } else if (sentCount < items.length) {
                await sendFakeQuoted(denn, m, `⚠️ Hanya ${sentCount}/${items.length} gambar terkirim.`, {
                    title: 'Pixiv Parsial', body: 'Beberapa gambar gagal'
                });
            }

        } catch (e) {
            log('Error Utama:', e.message);
            await deleteWait();
            await sendFakeQuoted(denn, m, `❌ *PENCARIAN PIXIV GAGAL*\n\n${e.message}`, {
                title: 'Pixiv Gagal', body: 'Pencarian tidak ditemukan'
            });
        }
    }
};