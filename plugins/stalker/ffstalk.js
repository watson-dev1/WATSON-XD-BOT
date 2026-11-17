import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const CORS_PROXY = 'https://corsproxy.io/?';

const buildApiUrl = (uid) => {
    return `https://api.nexadev.my.id/api/ff?id=${encodeURIComponent(uid)}`;
};

const fetchFF = async (apiUrl) => {
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
    command: ['ffstalk', 'ff', 'freefire'],
    category: 'stalker',
    execute: async (denn, m, { args, prefix }) => {
        if (!args[0]) {
            return sendFakeQuoted(denn, m,
                `🎮 *STALK FREE FIRE*\n\n` +
                `*Format:* \`${prefix}ffstalk <id_freefire>\`\n\n` +
                `*Contoh:*\n` +
                `\`${prefix}ffstalk 7606762852\``,
                { title: 'Stalk Free Fire', body: 'Dapatkan info akun FF' }
            );
        }

        const uid = args[0].replace(/[^0-9]/g, '');
        if (!uid || uid.length < 5 || uid.length > 15) {
            return sendFakeQuoted(denn, m, '❌ ID Free Fire tidak valid. Harus berupa angka 5-15 digit.');
        }

        await sendFakeQuoted(denn, m, '⏳ Mengambil data akun Free Fire...', { title: 'Stalk FF', body: 'Memproses...' });

        try {
            const apiUrl = buildApiUrl(uid);
            const data = await fetchFF(apiUrl);

            if (!data || typeof data !== 'object') throw new Error('Respons API tidak valid');

            const result = data.result || data.data || data;
            const name = result.name || result.nickname || result.username || 'Tidak diketahui';
            const level = result.level || result.account_level || '-';
            const rank = result.rank || result.battle_royale_rank || result.br_rank || '-';
            const exp = result.exp || result.experience || '-';
            const guild = result.guild || result.clan || result.guild_name || '-';
            const region = result.region || 'ID';

            let text = `🎮 *FREE FIRE ACCOUNT INFO*\n\n`;
            text += `🆔 *UID:* \`${uid}\`\n`;
            text += `📛 *Nama:* ${name}\n`;
            text += `⭐ *Level:* ${level}\n`;
            text += `🏆 *Rank:* ${rank}\n`;
            text += `✨ *EXP:* ${exp}\n`;
            text += `🛡️ *Guild:* ${guild}\n`;
            text += `🌍 *Region:* ${region}\n\n`;
            text += `_Data diambil via Nexadev API_`;

            await sendFakeQuoted(denn, m, text, { title: 'FF Account', body: 'Hasil Stalk' });

        } catch (err) {
            await sendFakeQuoted(denn, m,
                `❌ *GAGAL STALK FREE FIRE*\n\n${err.message}\n\n` +
                `_Jika error terkait CORS/blokir, coba aktifkan \`nexadevUseCorsProxy = true\` di settings.js._`,
                { title: 'Stalk FF Gagal', body: 'Terjadi kesalahan' }
            );
        }
    }
};