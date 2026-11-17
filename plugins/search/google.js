import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export default {
    command: ['google', 'gsearch'],
    category: 'search',
    execute: async (denn, m, { prefix, command, text }) => {
        if (!text) {
            return sendFakeQuoted(denn, m, 
                `🔍 *PENCARIAN MULTI-PLATFORM*\n\n` +
                `*Format:* ${prefix}${command} <kata kunci>\n` +
                `*Contoh:* ${prefix}${command} cara masak nasi\n\n` +
                `💡 *Tips:* Tambahkan \`--ss\` untuk screenshot halaman Google.\n` +
                `Contoh: \`${prefix}${command} resep rendang --ss\``,
                { title: 'Google Search', body: 'Cari di berbagai platform' }
            );
        }

        // Cek apakah user minta screenshot
        const wantsScreenshot = /--ss\b/i.test(text);
        const query = text.replace(/--ss\b/gi, '').trim();

        if (!query) {
            return m.reply('❌ Kata kunci tidak boleh kosong.');
        }

        const encoded = encodeURIComponent(query);

        // ─── MODE SCREENSHOT ───
        if (wantsScreenshot) {
            const wait = await sendFakeQuoted(denn, m, '📸 Mengambil screenshot Google...', {
                title: 'Google Screenshot', body: `Query: ${query}`
            }).catch(() => null);

            try {
                const apiUrl = `${global.jereBaseUrl}/api/tools/ssweb?apikey=${global.jereApiKey}&url=${encodeURIComponent('https://www.google.com/search?q=' + encoded)}&device=desktop&theme=light&fullPage=false`;
                
                const res = await axios.get(apiUrl, { 
                    responseType: 'arraybuffer', 
                    timeout: 30000,
                    headers: { 'User-Agent': UA }
                });

                const buffer = Buffer.from(res.data || []);
                if (buffer.length < 100) throw new Error('Screenshot kosong');

                if (wait?.key?.id) {
                    try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
                }

                await denn.sendMessage(m.chat, {
                    image: buffer,
                    caption: `📸 *SCREENSHOT GOOGLE*\n\n🔍 *Query:* ${query}\n🔗 https://www.google.com/search?q=${encoded}`
                }, { quoted: m });

            } catch (e) {
                if (wait?.key?.id) {
                    try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
                }
                console.error('[Google SS Error]', e.message);
                sendFakeQuoted(denn, m, `❌ Gagal mengambil screenshot: ${e.message}`, {
                    title: 'Screenshot Gagal', body: 'Server API sedang sibuk'
                });
            }
            return;
        }

        // ─── MODE LINK MULTI-PLATFORM ───
        let out = `🔍 *HASIL PENCARIAN*\n\n`;
        out += `📝 *Query:* ${query}\n\n`;
        out += `🌐 *Cari di:*\n`;
        out += `• 📘 Google: https://www.google.com/search?q=${encoded}\n`;
        out += `• 🅱️ Bing: https://www.bing.com/search?q=${encoded}\n`;
        out += `• 🦆 DuckDuckGo: https://duckduckgo.com/?q=${encoded}\n`;
        out += `• ▶️ YouTube: https://www.youtube.com/results?search_query=${encoded}\n`;
        out += `• 📚 Wikipedia: https://id.wikipedia.org/wiki/Special:Search?search=${encoded}\n`;
        out += `• 🖼️ Google Images: https://www.google.com/search?tbm=isch&q=${encoded}\n`;
        out += `• 📰 Google News: https://news.google.com/search?q=${encoded}\n\n`;
        out += `_💡 Tips: Tambahkan \`--ss\` untuk screenshot Google_`;

        await sendFakeQuoted(denn, m, out.trim(), {
            title: 'Pencarian Multi-Platform',
            body: `Hasil untuk "${query}"`
        });
    }
};