import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const CORS_PROXY = 'https://corsproxy.io/?';

const buildApiUrl = (targetUrl, number) => {
    const key = global.nexadevApiKey;
    if (!key) throw new Error('nexadevApiKey belum diatur di settings.js');
    const base = `https://api.nexadev.my.id/api/vote/?key=${encodeURIComponent(key)}`;
    return `${base}&url=${encodeURIComponent(targetUrl)}&number=${encodeURIComponent(number)}`;
};

const fetchVote = async (apiUrl) => {
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
    command: ['vote', 'votech'],
    category: 'tools',
    execute: async (denn, m, { args, prefix }) => {
        if (args.length < 2) {
            return sendFakeQuoted(denn, m,
                `🗳️ *VOTE POLLING*\n\n` +
                `*Format:* \`${prefix}vote <url_polling> <nomor_pilihan>\`\n\n` +
                `*Contoh:*\n` +
                `\`${prefix}vote https://whatsapp.com/channel/0029Vb8vySGAYlUMLcZVFT3d/123 1\``,
                { title: 'Vote Polling', body: 'Kirim suara ke polling' }
            );
        }

        const targetUrl = args[0];
        const number = args[1];

        if (!/^https?:\/\//i.test(targetUrl)) {
            return sendFakeQuoted(denn, m, '❌ URL polling tidak valid. Harus diawali http:// atau https://');
        }

        if (!/^\d+$/.test(number)) {
            return sendFakeQuoted(denn, m, '❌ Nomor pilihan harus berupa angka.');
        }

        await sendFakeQuoted(denn, m, '⏳ Mengirim vote... Mohon tunggu.', { title: 'Vote Polling', body: 'Memproses...' });

        try {
            const apiUrl = buildApiUrl(targetUrl, number);
            const data = await fetchVote(apiUrl);

            let replyText = '';
            if (data && typeof data === 'object') {
                if (data.status === true || data.success === true) {
                    replyText = `✅ *VOTE BERHASIL DIKIRIM*\n\n📊 Polling: ${targetUrl}\n🔢 Pilihan: ${number}`;
                } else {
                    const errMsg = data.message || data.error || JSON.stringify(data);
                    replyText = `❌ *GAGAL VOTE*\n\n${errMsg}`;
                }
            } else {
                replyText = `✅ *VOTE TERKIRIM*\n\nRespons mentah: ${String(data).slice(0, 300)}`;
            }

            await sendFakeQuoted(denn, m, replyText, { title: 'Hasil Vote', body: 'Selesai' });
        } catch (err) {
            await sendFakeQuoted(denn, m,
                `❌ *GAGAL VOTE*\n\n${err.message}\n\n` +
                `_Jika error terkait CORS/blokir, coba aktifkan \`nexadevUseCorsProxy = true\` di settings.js._`,
                { title: 'Vote Gagal', body: 'Terjadi kesalahan' }
            );
        }
    }
};