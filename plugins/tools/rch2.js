import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const API_URL = 'https://api.jerexd.my.id/api/whatsapp/reactch';

const sendReaction = async (targetUrl, emoji) => {
    const apikey = global.jereApiKey;
    if (!apikey) throw new Error('jereApiKey belum diatur di settings.js');

    const body = {
        apikey: apikey,
        url: targetUrl,
        emoji: emoji
    };

    const res = await axios.post(API_URL, body, {
        timeout: 30000,
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        },
        validateStatus: () => true
    });

    return res.data;
};

export default {
    command: ['rch2', 'reactch', 'reactchannel'],
    category: 'tools',
    execute: async (denn, m, { args, prefix }) => {
        if (args.length < 2) {
            return sendFakeQuoted(denn, m,
                `🎯 *REACT CHANNEL/PESAN*\n\n` +
                `*Format:* \`${prefix}rch2 <url> <emoji>\`\n\n` +
                `*Contoh:*\n` +
                `\`${prefix}rch2 https://whatsapp.com/channel/0029Vb8vySGAYlUMLcZVFT3d 🔥\``,
                { title: 'React Channel', body: 'Kirim reaksi ke channel/pesan' }
            );
        }

        const targetUrl = args[0];
        const emoji = args[1];

        if (!/^https?:\/\//i.test(targetUrl)) {
            return sendFakeQuoted(denn, m, '❌ URL tidak valid. Harus diawali http:// atau https://');
        }

        if (!emoji || emoji.length > 10) {
            return sendFakeQuoted(denn, m, '❌ Emoji tidak valid.');
        }

        await sendFakeQuoted(denn, m, '⏳ Mengirim reaksi...', { title: 'React Channel', body: 'Memproses...' });

        try {
            const data = await sendReaction(targetUrl, emoji);

            let replyText = '';
            if (data && typeof data === 'object') {
                if (data.status === true || data.success === true) {
                    replyText = `✅ *REAKSI BERHASIL DIKIRIM*\n\n🎯 Target: ${targetUrl}\n💫 Emoji: ${emoji}`;
                } else {
                    const errMsg = data.message || data.error || JSON.stringify(data);
                    replyText = `❌ *GAGAL MENGIRIM REAKSI*\n\n${errMsg}`;
                }
            } else {
                replyText = `✅ *REAKSI TERKIRIM*\n\nRespons: ${String(data).slice(0, 300)}`;
            }

            await sendFakeQuoted(denn, m, replyText, { title: 'Hasil React', body: 'Selesai' });
        } catch (err) {
            await sendFakeQuoted(denn, m,
                `❌ *GAGAL MENGIRIM REAKSI*\n\n${err.message}`,
                { title: 'React Gagal', body: 'Terjadi kesalahan' }
            );
        }
    }
};