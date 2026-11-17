import { saveDatabase } from '../../lib/database.js';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

export default {
    command: ['addowner', 'tambahowner'],
    category: 'owner',
    execute: async (denn, m, { isOwner, getTarget, args }) => {
        if (!isOwner) {
            return sendFakeQuoted(denn, m, '❌ Fitur ini khusus Owner!', {
                title: 'Akses Ditolak', body: 'Kamu bukan Owner'
            });
        }

        // Ambil target dari tag, reply, atau angka yang diketik
        let target = getTarget();
        if (!target) {
            return sendFakeQuoted(denn, m, 
                `👑 *TAMBAH OWNER*\n\n` +
                `*Format:* Tag/Reply/ketik nomor target\n` +
                `*Contoh:* .addowner @user atau .addowner 628xxx`,
                { title: 'Tambah Owner', body: 'Tag orang yang ingin dijadikan owner' }
            );
        }

        // Format nomor HP standar
        const targetNum = target.split('@')[0];
        const botOwnerNum = String(global.owner);

        // Pastikan database owners siap
        if (!global.db.owners) global.db.owners = [];

        // Cek duplikasi
        if (targetNum === botOwnerNum || global.db.owners.includes(targetNum)) {
            return sendFakeQuoted(denn, m, '⚠️ User tersebut sudah menjadi Owner.', {
                title: 'Tambah Owner', body: 'User sudah terdaftar sebagai Owner'
            });
        }

        // Simpan ke database
        global.db.owners.push(targetNum);
        saveDatabase();

        await sendFakeQuoted(denn, m, 
            `✅ *BERHASIL MENAMBAHKAN OWNER*\n\n` +
            `👤 *Nomor:* ${targetNum}\n` +
            `_Sekarang user tersebut memiliki akses penuh ke fitur Owner._`,
            { title: 'Owner Ditambahkan', body: `Nomor: ${targetNum}`, mentions: [target] }
        );
    }
};