import { sendFakeQuoted } from '../../lib/fakequoted.js';

export default {
    command: ['idch', 'cekidch'],
    category: 'main',
    execute: async (denn, m, { prefix, command, text }) => {
        console.log('[IDCH] Command dipanggil. Text:', text);

        // 1. Jika dijalankan di dalam Channel (tanpa text)
        if (!text) {
            if (m.chat.endsWith('@newsletter')) {
                return sendFakeQuoted(denn, m, 
                    `🆔 *ID CHANNEL INI:*\n\`${m.chat}\``,
                    { title: 'ID Channel', body: 'Berhasil diambil dari chat ini' }
                );
            }
            return sendFakeQuoted(denn, m, 
                `🆔 *CEK ID CHANNEL WHATSAPP*\n\n` +
                `*Format:* ${prefix + command} <link_channel>\n` +
                `*Contoh:* ${prefix + command} https://whatsapp.com/channel/0029Vb8vySGAYlUMLcZVFT3d`,
                { title: 'Cek ID Channel', body: 'Masukkan link channel WhatsApp' }
            );
        }

        // 2. Ekstrak kode invite dari link
        let inviteCode = text.trim();
        const match = text.match(/whatsapp\.com\/channel\/([a-zA-Z0-9_-]+)/i);
        if (match) {
            inviteCode = match[1];
        }
        
        console.log('[IDCH] Mencoba mengambil metadata untuk:', inviteCode);

        const wait = await sendFakeQuoted(denn, m, '⏳ Mengambil ID Channel...', {
            title: 'Cek ID Channel', body: 'Menghubungi server WhatsApp...'
        }).catch(() => null);

        try {
            // Pastikan fungsi newsletterMetadata tersedia
            if (typeof denn.newsletterMetadata !== 'function') {
                throw new Error('Fungsi newsletterMetadata tidak tersedia di Baileys ini.');
            }

            // 3. Ambil metadata channel
            const metadata = await denn.newsletterMetadata("invite", inviteCode);
            console.log('[IDCH] Metadata Response:', JSON.stringify(metadata, null, 2));
            
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            if (!metadata || !metadata.id) {
                throw new Error('Metadata kosong. Pastikan link channel masih aktif / tidak expired.');
            }

            // 4. Tampilkan hasil
            await sendFakeQuoted(denn, m, 
                `✅ *BERHASIL MENGAMBIL ID CHANNEL*\n\n` +
                `📛 *Nama Channel:* ${metadata.name || '-'}\n` +
                `🆔 *ID Channel:* \`${metadata.id}\`\n` +
                `🔗 *Kode Invite:* \`${inviteCode}\``,
                { title: 'ID Channel Ditemukan', body: metadata.name || 'Berhasil diambil' }
            );

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            console.error('[IDCH Error]', e);
            
            // Fallback: Jika gagal ambil ID, tetap kirim kode invite-nya
            sendFakeQuoted(denn, m, 
                `⚠️ *Gagal mengambil ID lengkap dari server WA.*\n\n` +
                `Namun, kode invite channel-nya adalah:\n\`${inviteCode}\`\n\n` +
                `_Error: ${e.message}_`,
                { title: 'IDCH Parsial', body: 'Hanya kode invite yang didapat' }
            );
        }
    }
};