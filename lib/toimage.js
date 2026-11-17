import axios from 'axios';
import FormData from 'form-data';
import { getBuffer } from './helper.js';
import { sendFakeQuoted } from './fakequoted.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export const TO_COMMANDS = [
    'tobotak', 'tochibi', 'tofunk',
    'tofigura', 'tofigurav2', 'tofigurav3', 'toghibli', 'tohijab',
    'tojapanese', 'tojepang', 'tokacamata', 'tokamboja', 'tolego',
    'toliquor', 'tomaid', 'tomirror', 'tomoai', 'tomonyet',
    'topacar', 'topeci', 'topiramida', 'toputih', 'toreal',
    'toroblox', 'toroh', 'totato', 'totua', 'toviking',
    'tozombie', 'tounderground', 'tohitam'
];

async function uploadUguu(buffer) {
    try {
        const form = new FormData();
        form.append('files[]', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
        const { data } = await axios.post('https://uguu.se/upload', form, {
            headers: form.getHeaders(),
            timeout: 30000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        return data?.files?.[0]?.url || null;
    } catch { return null; }
}

async function fetchConverted(command, imageUrl) {
    try {
        const res = await axios.get(
            `https://api-faa.my.id/faa/${command}?url=${encodeURIComponent(imageUrl)}`,
            {
                responseType: 'arraybuffer',
                timeout: 60000,
                maxContentLength: 50 * 1024 * 1024,
                headers: { 'User-Agent': UA }
            }
        );
        const buf = Buffer.from(res.data || []);
        return buf.length ? buf : null;
    } catch { return null; }
}

export async function convertToImage(denn, m, command, prefix) {
    try { await denn.sendMessage(m.chat, { react: { text: '✨', key: m.key } }); } catch {}

    let targetMsg = null;
    if (m.quoted && (m.quoted.mtype === 'imageMessage' || m.quoted.msg?.mimetype?.startsWith('image/'))) {
        targetMsg = m.quoted.msg;
    } else if (m.mtype === 'imageMessage' || m.msg?.mimetype?.startsWith('image/')) {
        targetMsg = m.msg;
    }

    if (!targetMsg) {
        const list = TO_COMMANDS.map(v => `• \`${prefix}${v}\``).join('\n');
        return sendFakeQuoted(denn, m,
            `✨ *AI IMAGE CONVERTER*\n\nReply gambar dengan salah satu command:\n\n${list}`,
            { title: 'AI Image Converter', body: 'Pilih command yang diinginkan' });
    }

    let buffer;
    try { buffer = await getBuffer(targetMsg, 'image'); } catch {}
    if (!buffer?.length) return sendFakeQuoted(denn, m, '❌ Gagal mengambil gambar.');

    const imageUrl = await uploadUguu(buffer);
    if (!imageUrl) return sendFakeQuoted(denn, m, '❌ Upload gambar gagal.');

    const result = await fetchConverted(command, imageUrl);
    if (!result) return sendFakeQuoted(denn, m, '❌ Gagal convert gambar (API error).');

    return denn.sendMessage(m.chat, { image: result, caption: `✨ *${command}*` }, { quoted: m });
}