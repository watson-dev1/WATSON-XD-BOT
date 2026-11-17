import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const checkBan = async (number) => {
    const apikey = global.jereApiKey;
    if (!apikey) throw new Error('jereApiKey belum diatur di settings.js');
    
    const url = `https://api.jerexd.my.id/api/whatsapp/checkban?apikey=${encodeURIComponent(apikey)}&number=${encodeURIComponent(number)}`;

    const res = await axios.get(url, {
        timeout: 30000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        },
        validateStatus: () => true
    });

    return res.data;
};

export default {
    command: ['checkban', 'cekbanned', 'cekban'],
    category: 'stalker',
    execute: async (denn, m, { args, prefix }) => {
        let target = m.mentionedJid?.[0] || m.quoted?.sender;

        if (!target && args[0]) {
            const cleanNum = args[0].replace(/[^0-9]/g, '');
            if (cleanNum) target = cleanNum;
        }

        if (!target) {
            return sendFakeQuoted(denn, m,
                `📱 *CEK BANNED WHATSAPP*\n\n` +
                `*Format:* \`${prefix}checkban <nomor>\`\n\n` +
                `*Contoh:*\n` +
                `\`${prefix}checkban 628123456789\`\n` +
                `Atau tag/reply orang lalu ketik \`${prefix}checkban\``,
                { title: 'Cek Banned WA', body: 'Masukkan nomor target' }
            );
        }

        const number = target.split('@')[0].replace(/[^0-9]/g, '');

        if (number.length < 8) {
            return sendFakeQuoted(denn, m, '❌ Nomor tidak valid. Minimal 8 digit.');
        }

        await sendFakeQuoted(denn, m, `⏳ Mengecek status nomor *${number}*...`, { title: 'Cek Banned WA', body: 'Memproses...' });

        try {
            const data = await checkBan(number);

            if (!data) throw new Error('Respons API kosong');

            const status = data.status === true || data.success === true;
            const result = data.result || data.data || data;

            let isBanned = false;
            let extraInfo = '';

            if (typeof result.banned === 'boolean') {
                isBanned = result.banned;
            } else if (typeof result.isBanned === 'boolean') {
                isBanned = result.isBanned;
            } else if (typeof result.status === 'string') {
                const st = result.status.toLowerCase();
                if (st.includes('ban') || st.includes('block')) isBanned = true;
            } else if (typeof result === 'string') {
                const st = result.toLowerCase();
                if (st.includes('ban') || st.includes('block')) isBanned = true;
            }

            if (!status && data.message) {
                extraInfo = `\n📝 *Pesan:* ${data.message}`;
            }

            const statusText = isBanned ? '🚫 *BANNED*' : '✅ *AKTIF / TIDAK BANNED*';

            let text = `📱 *WHATSAPP CHECK BAN*\n\n`;
            text += `🔢 *Nomor:* ${number}\n`;
            text += `📊 *Status:* ${statusText}\n`;
            text += extraInfo;
            text += `\n_Data diambil via Jerexd API_`;

            await sendFakeQuoted(denn, m, text, { title: 'Hasil Cek Banned', body: 'Selesai' });

        } catch (err) {
            await sendFakeQuoted(denn, m,
                `❌ *GAGAL CEK BANNED*\n\n${err.message}`,
                { title: 'Cek Gagal', body: 'Terjadi kesalahan' }
            );
        }
    }
};