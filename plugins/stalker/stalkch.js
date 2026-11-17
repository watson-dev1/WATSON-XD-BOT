import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const CORS_PROXY = 'https://corsproxy.io/?';

const buildApiUrl = (channelUrl) => {
    return `https://api.nexadev.my.id/api/channel/?url=${encodeURIComponent(channelUrl)}`;
};

const fetchChannelInfo = async (apiUrl) => {
    const useProxy = global.nexadevUseCorsProxy === true;
    const finalUrl = useProxy ? CORS_PROXY + encodeURIComponent(apiUrl) : apiUrl;

    const res = await axios.get(finalUrl, {
        timeout: 30000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        },
        validateStatus: () => true
    });

    return res.data;
};

export default {
    command: ['stalkch', 'chinfo', 'ceksaluran'],
    category: 'stalker',
    execute: async (denn, m, { args, prefix }) => {
        if (!args[0]) {
            return sendFakeQuoted(denn, m,
                `📢 *STALK CHANNEL WHATSAPP*\n\n` +
                `*Format:* \`${prefix}stalkch <link_channel>\`\n\n` +
                `*Contoh:*\n` +
                `\`${prefix}stalkch https://whatsapp.com/channel/0029Vb7TkCcD38CStrAMMb3N\``,
                { title: 'Stalk Channel', body: 'Dapatkan info channel' }
            );
        }

        const channelUrl = args[0];

        if (!/^https?:\/\/(www\.)?(whatsapp\.com|wa\.me)\/channel\//i.test(channelUrl)) {
            return sendFakeQuoted(denn, m, '❌ URL tidak valid. Pastikan menggunakan link channel WhatsApp.');
        }

        await sendFakeQuoted(denn, m, '⏳ Mengambil informasi channel...', { title: 'Stalk Channel', body: 'Memproses...' });

        try {
            const apiUrl = buildApiUrl(channelUrl);
            const data = await fetchChannelInfo(apiUrl);

            if (!data || typeof data !== 'object') throw new Error('Respons API tidak valid');

            if (data.status === false || data.success === false) {
                throw new Error(data.message || data.error || 'Gagal mengambil data channel');
            }

            const result = data.result || data.data || data;
            const name = result.name || result.title || 'Tidak diketahui';
            const subscribers = result.subscribers || result.subscriberCount || 'Tidak diketahui';
            const description = result.description || result.desc || '-';
            const inviteLink = result.invite || result.link || channelUrl;

            let text = `📢 *CHANNEL WHATSAPP INFO*\n\n`;
            text += `📛 *Nama:* ${name}\n`;
            text += `👥 *Subscriber:* ${subscribers}\n`;
            text += `🔗 *Link:* ${inviteLink}\n\n`;
            text += `📝 *Deskripsi:*\n${description}\n\n`;
            text += `_Data diambil via Nexadev API_`;

            await sendFakeQuoted(denn, m, text, { title: 'Channel Info', body: 'Hasil Stalk' });

        } catch (err) {
            await sendFakeQuoted(denn, m,
                `❌ *GAGAL STALK CHANNEL*\n\n${err.message}\n\n` +
                `_Jika terjadi error CORS, coba aktifkan \`nexadevUseCorsProxy = true\` di settings.js._`,
                { title: 'Stalk Gagal', body: 'Terjadi kesalahan' }
            );
        }
    }
};