import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

// User-Agent resmi sesuai kebijakan Wikimedia
const UA = 'PatrickMD-Bot/1.0 (WhatsApp Bot; +https://github.com/denncode) axios/1.7.9';

// ─── FUNGSI PENCARIAN WIKIPEDIA (Action API) ───
const searchWikipedia = async (query) => {
    const langs = ['id', 'en'];
    
    for (const lang of langs) {
        try {
            // Step 1: Cari judul halaman berdasarkan kata kunci
            const searchRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
                params: {
                    action: 'query',
                    list: 'search',
                    srsearch: query,
                    srlimit: 1,
                    format: 'json',
                    origin: '*'
                },
                headers: { 'User-Agent': UA },
                timeout: 15000
            });

            const searchResults = searchRes.data?.query?.search;
            if (!searchResults || searchResults.length === 0) continue;

            const pageTitle = searchResults[0].title;

            // Step 2: Ambil detail halaman (ringkasan + gambar + URL)
            const detailRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
                params: {
                    action: 'query',
                    prop: 'extracts|pageimages|info',
                    exintro: 1,
                    explaintext: 1,
                    pithumbsize: 600,
                    titles: pageTitle,
                    format: 'json',
                    inprop: 'url',
                    redirects: 1
                },
                headers: { 'User-Agent': UA },
                timeout: 15000
            });

            const pages = detailRes.data?.query?.pages;
            if (!pages) continue;

            const page = Object.values(pages)[0];
            if (!page || page.missing !== undefined || !page.extract) continue;

            return {
                title: page.title,
                extract: page.extract,
                thumbnail: page.thumbnail?.source || null,
                url: page.fullurl || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
                lang
            };
        } catch (e) {
            console.error(`[Wiki ${lang}] Error: ${e.message}`);
        }
    }
    return null;
};

export default {
    command: ['wiki', 'wikipedia'],
    category: 'search',
    execute: async (denn, m, { prefix, text }) => {
        if (!text) {
            return sendFakeQuoted(denn, m, 
                `📚 *WIKIPEDIA SEARCH*\n\n*Format:* ${prefix}wiki <kata kunci>\n*Contoh:* ${prefix}wiki indonesia`,
                { title: 'Wikipedia', body: 'Cari artikel di Wikipedia' }
            );
        }

        const wait = await sendFakeQuoted(denn, m, '⏳ Mencari di Wikipedia...', {
            title: 'Wikipedia', body: 'Mencari artikel...'
        }).catch(() => null);

        try {
            const data = await searchWikipedia(text.trim());

            // Hapus pesan loading
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            if (!data) {
                return sendFakeQuoted(denn, m, 
                    `❌ Tidak ditemukan di Wikipedia.\n\nCoba kata kunci lain atau gunakan bahasa Inggris.`,
                    { title: 'Wikipedia', body: 'Artikel tidak ditemukan' }
                );
            }

            let caption = `📚 *${data.title}*\n`;
            caption += `🌐 *Bahasa:* ${data.lang === 'ID' ? 'Indonesia' : 'English'}\n\n`;
            caption += `${(data.extract || '').slice(0, 900)}`;
            
            if (data.url) {
                caption += `\n\n🔗 ${data.url}`;
            }

            // Kirim dengan thumbnail jika ada
            if (data.thumbnail) {
                try {
                    await denn.sendMessage(m.chat, { 
                        image: { url: data.thumbnail }, 
                        caption 
                    }, { quoted: m });
                } catch {
                    await sendFakeQuoted(denn, m, caption, {
                        title: data.title,
                        body: `Wikipedia ${data.lang}`
                    });
                }
            } else {
                await sendFakeQuoted(denn, m, caption, {
                    title: data.title,
                    body: `Wikipedia ${data.lang}`
                });
            }

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            sendFakeQuoted(denn, m, `❌ Error: ${e.message}`, {
                title: 'Wikipedia Error', body: 'Terjadi kesalahan'
            });
        }
    }
};