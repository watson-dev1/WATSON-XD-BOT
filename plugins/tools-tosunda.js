/**
 ╔══════════════════════
      ⧉  [Translate Sunda] — [Tools]
 ╚══════════════════════

  ✺ Type     : Plugin ESM
  ✺ Source   : https://whatsapp.com/channel/0029VbAXhS26WaKugBLx4E05
  ✺ Creator  : SXZnightmare
  ✺ Scrape      : 
[ https://codeshare.cloudku.click/view/raw/b4fc7c82 ]
[ https://whatsapp.com/channel/0029Vb4jDY82ER6beeXLOp0k/772 ]
 ✺ Scrape maker : [ Alfi ]
 ✺ Inspiration     : [ Bella ]
*/

let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text) return m.reply(`*Contoh: ${usedPrefix + command} orang mana kamu?*`);
        await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

        const body = new URLSearchParams({
            from_lang: 'id_ID',
            to: 'su_ID',
            text,
            platform: 'dp'
        }).toString();

        const headers = {
            Host: 'lingvanex.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0',
            Accept: 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'id,en-US;q=0.7,en;q=0.3',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            Origin: 'https://lingvanex.com',
            Referer: 'https://lingvanex.com/translation/indonesia-ke-bahasa-sunda'
        };

        const req = await fetch('https://lingvanex.com/translation/translate', {
            method: 'POST',
            headers,
            body
        });

        const json = await req.json();
        if (!json || json.err) {
            return m.reply(`*🍂 Terjadi kesalahan saat menerjemahkan.*`);
        }

        const hasil = json.result;

        await conn.sendMessage(
            m.chat,
            {
                text: `${hasil}`
            },
            { quoted: m.quoted ? m.quoted : m }
        );
    } catch {
        await m.reply(`*🍂 Gagal memproses permintaan, coba lagi.*`);
    } finally {
        await conn.sendMessage(m.chat, { react: { text: '', key: m.key } });
    }
};

handler.help = ['sunda'];
handler.tags = ['tools'];
handler.command = /^(sunda)$/i;
handler.register = true; // true kan jika ada fitur register atau daftar di bot mu.

export default handler;