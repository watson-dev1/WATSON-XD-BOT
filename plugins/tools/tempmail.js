import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const API_URL = 'https://api.jerexd.my.id/api/tools/tempmail';

const fetchTempMail = async (action, email = '') => {
    const apikey = global.jereApiKey;
    if (!apikey) throw new Error('jereApiKey belum diatur di settings.js');

    let url = `${API_URL}?apikey=${encodeURIComponent(apikey)}&action=${encodeURIComponent(action)}`;
    if (email) url += `&email=${encodeURIComponent(email)}`;

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
    command: ['tempmail', 'mailtemp'],
    category: 'tools',
    execute: async (denn, m, { args, prefix }) => {
        const firstArg = args[0]?.toLowerCase();

        if (['help', 'cara', '-h', '--help'].includes(firstArg) || !firstArg) {
            return sendFakeQuoted(denn, m,
                `📧 *TEMP MAIL HELP*\n\n` +
                `*1. Buat Email Baru:*\n` +
                `\`${prefix}tempmail create\`\n\n` +
                `*2. Cek Kotak Masuk:*\n` +
                `\`${prefix}tempmail inbox <alamat_email>\`\n\n` +
                `*Contoh:*\n` +
                `\`${prefix}tempmail create\`\n` +
                `\`${prefix}tempmail inbox budi@denncode.my.id\``,
                { title: 'Temp Mail Help', body: 'Panduan penggunaan' }
            );
        }

        await sendFakeQuoted(denn, m, '⏳ Memproses temp mail...', { title: 'Temp Mail', body: 'Memproses...' });

        try {
            let data, text;

            if (firstArg === 'create') {
                data = await fetchTempMail('create');
                if (!data || typeof data !== 'object') throw new Error('Respons API tidak valid');
                if (data.status === false || data.success === false) {
                    throw new Error(data.message || data.error || 'Gagal membuat email');
                }

                const result = data.result || data.data || data;
                const newEmail = result.email || result.address || (typeof result === 'string' ? result : '-');

                text = `📧 *TEMP MAIL BARU*\n\n`;
                text += `📩 *Email:* \`${newEmail}\`\n\n`;
                text += `_Gunakan perintah \`${prefix}tempmail inbox ${newEmail}\` untuk cek inbox._`;

            } else if (firstArg === 'inbox') {
                const email = args[1];
                if (!email) {
                    return sendFakeQuoted(denn, m, 
                        `❌ Masukkan alamat email.\n\n*Contoh:*\n\`${prefix}tempmail inbox budi@jerexd.my.id\``,
                        { title: 'Temp Mail', body: 'Email kosong' }
                    );
                }

                data = await fetchTempMail('inbox', email);
                if (!data || typeof data !== 'object') throw new Error('Respons API tidak valid');
                if (data.status === false || data.success === false) {
                    throw new Error(data.message || data.error || 'Gagal mengambil inbox');
                }

                const result = data.result || data.data || data;
                const messages = Array.isArray(result) ? result : (result.messages || result.inbox || []);

                text = `📧 *INBOX: ${email}*\n\n`;
                if (messages.length === 0) {
                    text += `📭 Kotak masuk kosong.`;
                } else {
                    messages.forEach((msg, i) => {
                        const from = msg.from || msg.sender || '-';
                        const subject = msg.subject || msg.title || '-';
                        text += `*${i + 1}. ${subject}*\n`;
                        text += `📤 Dari: ${from}\n\n`;
                    });
                    text += `_Ketik perintah ini lagi untuk refresh inbox._`;
                }

            } else {
                return sendFakeQuoted(denn, m,
                    `❌ Aksi *${firstArg}* tidak dikenali.\n\n` +
                    `Gunakan \`create\` atau \`inbox\`.\n\n` +
                    `Ketik \`${prefix}tempmail help\` untuk panduan.`
                );
            }

            await sendFakeQuoted(denn, m, text, { title: 'Temp Mail', body: 'Hasil' });
        } catch (err) {
            await sendFakeQuoted(denn, m, 
                `❌ *GAGAL TEMP MAIL*\n\n${err.message}\n\n_Ketik \`${prefix}tempmail help\` untuk panduan._`, 
                { title: 'Error', body: 'Gagal' }
            );
        }
    }
};