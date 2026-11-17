import { saveDatabase } from '../../lib/database.js';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

export default {
    command: ['delowner', 'hapusowner'],
    category: 'owner',
    execute: async (denn, m, { isOwner, getTarget }) => {
        if (!isOwner) {
            return sendFakeQuoted(denn, m, '❌ Fitur ini khusus Owner!', {
                title: 'Akses Ditolak', body: 'Kamu bukan Owner'
            });
        }

        let target = getTarget();
        if (!target) {
            return sendFakeQuoted(denn, m, 
                `👑 *HAPUS OWNER*\n\n` +
                `*Format:* Tag/Reply/ketik nomor target\n` +
                `*Contoh:* .delowner @user atau .delowner 628xxx`,
                { title: 'Hapus Owner', body: 'Tag orang yang ingin dihapus dari Owner' }
            );
        }

        const targetNum = target.split('@')[0];

        // Owner utama di settings.js TIDAK BISA DIHAPUS
        if (targetNum === String(global.owner)) {
            return sendFakeQuoted(denn, m, '❌ Owner Utama (di settings.js) tidak bisa dihapus!', {
                title: 'Gagal Hapus', body: 'Owner utama dilindungi sistem'
            });
        }

        if (!global.db.owners) global.db.owners = [];

        const index = global.db.owners.indexOf(targetNum);
        if (index === -1) {
            return sendFakeQuoted(denn, m, '⚠️ User tersebut bukan Owner tambahan.', {
                title: 'Gagal Hapus', body: 'User tidak ditemukan di daftar owner'
            });
        }

        // Hapus dari database
        global.db.owners.splice(index, 1);
        saveDatabase();

        await sendFakeQuoted(denn, m, 
            `✅ *BERHASIL MENGHAPUS OWNER*\n\n` +
            `👤 *Nomor:* ${targetNum}\n` +
            `_User tersebut sudah tidak memiliki akses Owner lagi._`,
            { title: 'Owner Dihapus', body: `Nomor: ${targetNum}`, mentions: [target] }
        );
    }
};