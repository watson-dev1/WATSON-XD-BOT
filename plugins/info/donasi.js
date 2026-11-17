import { sendFakeQuoted } from '../../lib/fakequoted.js';

export default {
    command: ['donate', 'donasi'],
    category: 'info',
    description: 'Info donasi via Saweria',
    async execute(denn, m, { prefix }) {
        const saweriaUrl = global.saweriaUrl || '-';
        const botName = global.namabot || 'PatrickMD';

        if (saweriaUrl === '-') {
            return sendFakeQuoted(denn, m, '❌ Link donasi belum disetting oleh owner.');
        }

        const text = 
            `╭───「 *D O N A S I* 」───╮\n\n` +
            `Dukung kelangsungan bot *${botName}* agar terus aktif!\n\n` +
            `💖 *Link Donasi:*\n${saweriaUrl}\n\n` +
            `📌 *Cara Donasi:*\n` +
            `1. Buka link di atas.\n` +
            `2. Isi nominal dan data (boleh anonymous).\n` +
            `3. Selesaikan pembayaran (QRIS/E-Wallet).\n\n` +
            `_Setiap donasi akan diumumkan di Channel WhatsApp bot secara manual oleh Owner._ 🙏\n\n` +
            `Terima kasih! 🫶`;

        await sendFakeQuoted(denn, m, text, { title: 'Donasi Bot', body: 'Support PatrickMD' });
    }
};