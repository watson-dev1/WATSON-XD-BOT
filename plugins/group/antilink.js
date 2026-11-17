import { sendFakeQuoted } from '../../lib/fakequoted.js';

export default {
    command: ['antilink'],
    category: 'group',
    execute: async (denn, m, { text, isOwner, checkAdmin, prefix }) => {
        if (!m.isGroup) {
            return sendFakeQuoted(denn, m, global.msg?.group || '❌ Fitur ini hanya untuk grup!', {
                title: 'Antilink', body: 'Hanya bisa digunakan di grup'
            });
        }

        const { isAdmin } = await checkAdmin();
        if (!isAdmin && !isOwner) {
            return sendFakeQuoted(denn, m, global.msg?.admin || '❌ Kamu bukan Admin!', {
                title: 'Antilink', body: 'Khusus Admin Grup'
            });
        }

        if (!global.db.chats) global.db.chats = {};
        if (!global.db.chats[m.chat]) global.db.chats[m.chat] = {};

        const on = text === 'on';
        const off = text === 'off';
        
        if (!on && !off) {
            return sendFakeQuoted(denn, m, `Format salah!\n\nContoh: ${prefix}antilink on / off`, {
                title: 'Antilink', body: 'Pilih on atau off'
            });
        }

        global.db.chats[m.chat].antilink = on;

        await sendFakeQuoted(denn, m, 
            `✅ *ANTILINK ${on ? 'DIAKTIFKAN' : 'DIMATIKAN'}*\n\n` +
            `Bot akan otomatis menghapus pesan yang mengandung link dari member (kecuali admin).`, 
            { title: 'Antilink', body: on ? 'Status: Aktif' : 'Status: Nonaktif' }
        );
    }
};