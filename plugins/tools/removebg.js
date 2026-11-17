import FormData from 'form-data';
import axios from 'axios';
import { getBuffer } from '../../lib/helper.js';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_INPUT = 15 * 1024 * 1024;
const T_DL = 30000;
const T_API = 60000;

const PROVIDERS = [
    { name: 'BGNinja', url: 'https://bgninja.com/api/remove', field: 'file' },
    { name: 'oyyi', url: 'https://api.oyyi.xyz/ai/remove-background', field: 'file' },
    { name: 'nobg', url: 'https://api.nobg.akshit.io/api/v1/remove-background', field: 'image' }
];

const isHtml = (buf) => {
    if (!buf || buf.length < 16) return true;
    const head = buf.slice(0, 512).toString('utf8').toLowerCase();
    return head.includes('<!doctype') || head.includes('<html') || head.includes('<body');
};

const isImageBuf = (buf) => {
    if (!buf || buf.length < 100) return false;
    if (buf[0] === 0xFF && buf[1] === 0xD8) return true;
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
    if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return true;
    if (buf.slice(0, 3).toString('ascii') === 'GIF') return true;
    return false;
};

const withTimeout = (promise, ms, label) => {
    let t;
    const timeout = new Promise((_, rej) => {
        t = setTimeout(() => rej(new Error(`${label} timeout`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
};

async function tryProvider(provider, buffer, mime) {
    const form = new FormData();
    form.append(provider.field, buffer, { filename: 'image.jpg', contentType: mime || 'image/jpeg' });

    const res = await withTimeout(axios.post(provider.url, form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': UA
        },
        timeout: T_API,
        maxContentLength: 25 * 1024 * 1024,
        maxBodyLength: MAX_INPUT,
        validateStatus: () => true,
        responseType: 'arraybuffer'
    }), T_API + 8000, `${provider.name}-api`);

    const outBuf = Buffer.from(res.data || []);
    const contentType = String(res.headers['content-type'] || '').toLowerCase();

    if (contentType.includes('application/json')) {
        let errMsg = 'API mengembalikan error JSON';
        try {
            const json = JSON.parse(outBuf.toString('utf8'));
            errMsg = json.error || json.message || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
    }

    if (res.status >= 400) {
        throw new Error(`HTTP ${res.status}`);
    }

    if (outBuf.length < 100) {
        throw new Error('Hasil gambar kosong');
    }
    if (isHtml(outBuf)) {
        throw new Error('Server mengembalikan HTML');
    }
    if (!isImageBuf(outBuf)) {
        throw new Error('Format gambar tidak dikenali');
    }

    return outBuf;
}

async function callRemoveBgApi(buffer, mime) {
    let lastError = 'Semua provider gagal';
    for (const provider of PROVIDERS) {
        try {
            return await tryProvider(provider, buffer, mime);
        } catch (e) {
            lastError = `${provider.name}: ${e.message}`;
        }
    }
    throw new Error(lastError);
}

export default {
    command: ['removebg', 'nobg', 'hapusbg', 'transparan'],
    category: 'tools',
    execute: async (denn, m, { prefix, command }) => {
        let imgMsg = null;
        let imgMime = '';

        if (m.quoted?.msg && typeof m.quoted.msg.mimetype === 'string' && m.quoted.msg.mimetype.startsWith('image/')) {
            imgMsg = m.quoted.msg;
            imgMime = m.quoted.msg.mimetype;
        } else if (m.mtype === 'imageMessage' && typeof m.msg?.mimetype === 'string' && m.msg.mimetype.startsWith('image/')) {
            imgMsg = m.msg;
            imgMime = m.msg.mimetype;
        }

        if (!imgMsg) {
            return sendFakeQuoted(denn, m, 
                `✂️ *REMOVE BACKGROUND*\n\n` +
                `📌 *Cara pakai:*\n` +
                `• Kirim gambar dengan caption \`${prefix}${command}\`\n` +
                `• Atau reply gambar dengan \`${prefix}${command}\`\n\n` +
                `💡 Support: JPG, PNG, WEBP\n` +
                `📦 Maks input: 15 MB`
            );
        }

        await sendFakeQuoted(denn, m, global.msg.wait || '⏳ Memproses...');

        let inputBuffer;
        try {
            inputBuffer = await withTimeout(getBuffer(imgMsg, 'image'), T_DL, 'dl-input');
        } catch (e) {
            return sendFakeQuoted(denn, m, `❌ Gagal unduh gambar sumber.\n\n_${e.message}_`);
        }

        if (!inputBuffer || inputBuffer.length < 1024) {
            return sendFakeQuoted(denn, m, '❌ Buffer gambar kosong atau rusak.');
        }
        if (!isImageBuf(inputBuffer)) {
            return sendFakeQuoted(denn, m, '❌ File bukan gambar valid.');
        }
        if (inputBuffer.length > MAX_INPUT) {
            return sendFakeQuoted(denn, m, `❌ Gambar terlalu besar (${(inputBuffer.length / 1024 / 1024).toFixed(2)} MB). Maks 15 MB.`);
        }

        await sendFakeQuoted(denn, m, '⏳ Menghapus background... Mohon tunggu.');

        let outBuffer;
        try {
            outBuffer = await callRemoveBgApi(inputBuffer, imgMime);
        } catch (e) {
            return sendFakeQuoted(denn, m, `❌ Gagal memproses RemoveBG.\n\n_${e.message}_`);
        }

        const beforeKB = (inputBuffer.length / 1024).toFixed(0);
        const afterKB = (outBuffer.length / 1024).toFixed(0);
        
        const caption =
            `✂️ *BACKGROUND BERHASIL DIHAPUS*\n\n` +
            `📦 *Ukuran:* ${beforeKB} KB → ${afterKB} KB\n` +
            `✨ *Request:* ${m.pushName || 'User'}`;

        try {
            await denn.sendMessage(m.chat, { image: outBuffer, caption }, { quoted: m });
            return;
        } catch (e) {}

        try {
            await denn.sendMessage(m.chat, {
                document: outBuffer,
                mimetype: 'image/png',
                fileName: `removebg_${Date.now()}.png`,
                caption
            }, { quoted: m });
            return;
        } catch (e) {}

        return sendFakeQuoted(denn, m, '❌ Gagal mengirim gambar hasil ke WhatsApp.');
    }
};