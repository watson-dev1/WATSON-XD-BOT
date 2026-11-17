import { saveUser, getAllUsers } from '../lib/rpg.js';
import { sendFakeQuoted } from '../lib/fakequoted.js';

const afkCooldown = new Map();

const getPhone = (jid) => String(jid || '').split(':')[0].split('@')[0];

const findAfkUser = (jid) => {
    if (!jid) return null;
    const phone = getPhone(jid);
    if (!phone) return null;
    
    const variants = [jid, `${phone}@s.whatsapp.net`, `${phone}@lid`];
    const allUsers = getAllUsers();
    
    for (const v of variants) {
        if (allUsers[v] && allUsers[v].afk) return { key: v, user: allUsers[v] };
    }
    for (const [key, u] of Object.entries(allUsers)) {
        if (u.afk && getPhone(key) === phone) return { key, user: u };
    }
    return null;
};

const formatDuration = (ms) => {
    const d = Math.floor(ms / (24 * 60 * 60 * 1000));
    const h = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const s = Math.floor((ms % (60 * 1000)) / 1000);
    let parts = [];
    if (d > 0) parts.push(`${d} hari`);
    if (h > 0) parts.push(`${h} jam`);
    if (m > 0) parts.push(`${m} menit`);
    if (s > 0 || parts.length === 0) parts.push(`${s} detik`);
    return parts.join(' ');
};

const listener = async (denn, m, body) => {
    // 1. Lepaskan status AFK jika user mengirim pesan apa saja
    const senderAfk = findAfkUser(m.sender);
    if (senderAfk) {
        // Abaikan jika user sedang mengetik command .afk lagi
        if (body && /^[.!#/]afk/i.test(body.trim())) {
            return false;
        }

        const { key, user: afkUser } = senderAfk;
        const duration = formatDuration(Date.now() - (afkUser.afkTime || Date.now()));
        const reason = afkUser.afkReason || 'Tanpa Alasan';

        afkUser.afk = false;
        afkUser.afkTime = 0;
        afkUser.afkReason = '';
        saveUser(key, afkUser);

        await sendFakeQuoted(denn, m, 
            `✨ *@${m.sender.split('@')[0]} telah kembali online!*\n` +
            `⏱️ *Durasi AFK:* ${duration}\n` +
            `📝 *Alasan Sebelumnya:* ${reason}`,
            {
                title: 'Selamat Datang Kembali',
                body: 'Status AFK dihapus otomatis',
                mentions: [m.sender]
            }
        ).catch(() => {});
    }

    // Jangan trigger peringatan AFK jika pesan berupa command bot
    if (body && /^[.!#/]/i.test(body.trim())) return false;

    // 2. Peringatan jika ada yang nge-tag / me-reply user yang sedang AFK
    const jids = [...(m.mentionedJid || [])];
    if (m.quoted && m.quoted.sender) {
        jids.push(m.quoted.sender);
    }

    const notifiedJids = new Set();
    const now = Date.now();

    for (const jid of jids) {
        if (!jid) continue;
        if (jid === m.sender) continue;
        if (notifiedJids.has(jid)) continue;

        // Cooldown 30 detik per user per grup agar tidak spam
        const cdKey = `${m.chat}_${jid}`;
        if (afkCooldown.has(cdKey) && (now - afkCooldown.get(cdKey) < 30000)) continue;

        const targetAfk = findAfkUser(jid);
        if (targetAfk) {
            notifiedJids.add(jid);
            afkCooldown.set(cdKey, now);

            const duration = formatDuration(now - (targetAfk.user.afkTime || now));
            const reason = targetAfk.user.afkReason || 'Tanpa Alasan';
            const name = targetAfk.user.name || getPhone(jid);

            await sendFakeQuoted(denn, m, 
                `⚠️ *Ssssttt! Jangan tag dia!*\n\n` +
                `👤 *${name} sedang AFK*\n` +
                `📝 *Alasan:* ${reason}\n` +
                `⏱️ *Sejak:* ${duration} yang lalu`,
                {
                    title: 'User Sedang AFK',
                    body: `${name} sedang tidak tersedia`,
                    mentions: [jid]
                }
            ).catch(() => {});
        }
    }

    return false; // Biarkan pesan tetap diproses command lain
};

// Daftarkan sebagai listener global (kunci unik `*_afk`)
if (global.passiveListeners instanceof Map) {
    global.passiveListeners.set('*_afk', listener);
    console.log('✅ [AFK] Listener AFK berhasil didaftarkan');
}

export default { listener };