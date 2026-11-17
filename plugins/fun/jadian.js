import { sendFakeQuoted } from '../../lib/fakequoted.js';
import { saveDatabase } from '../../lib/database.js';
import { handleTerima } from './jadian-terima.js';
import { handleTolak } from './jadian-tolak.js';
import { handlePutus } from './jadian-putus.js';

export const TTL_PENDING = 5 * 60 * 1000; // 5 menit

export const ensureDb = () => {
    if (!global.db.jadian) global.db.jadian = {};
    if (!global.db.jadianPending) global.db.jadianPending = {};
};

export const getJadianGroup = (gid) => {
    ensureDb();
    if (!global.db.jadian[gid]) global.db.jadian[gid] = {};
    return global.db.jadian[gid];
};

export const getPendingGroup = (gid) => {
    ensureDb();
    if (!global.db.jadianPending[gid]) global.db.jadianPending[gid] = {};
    return global.db.jadianPending[gid];
};

export const fmtDate = (ts) => {
    const d = new Date(ts);
    const bln = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${d.getDate()} ${bln[d.getMonth()]} ${d.getFullYear()}`;
};

export default {
    command: 'jadian',
    category: 'fun',
    description: 'Jadian / putus / terima / tolak (khusus grup)',
    async execute(denn, m, { args, prefix }) {
        if (!m.isGroup) {
            return sendFakeQuoted(denn, m, '❌ Fitur ini hanya untuk dalam grup!');
        }

        ensureDb();
        const sub = (args[0] || '').toLowerCase();
        const jadianGroup = getJadianGroup(m.chat);
        const pendingGroup = getPendingGroup(m.chat);

        // Bersihkan pending expired
        const now = Date.now();
        let changed = false;
        for (const [jid, req] of Object.entries(pendingGroup)) {
            if (now - req.ts > TTL_PENDING) { delete pendingGroup[jid]; changed = true; }
        }
        if (changed) saveDatabase();

        // ─── SUBCOMMAND ───
        if (sub === 'terima') return handleTerima(denn, m, { jadianGroup, pendingGroup, saveDatabase });
        if (sub === 'tolak')  return handleTolak(denn, m, { pendingGroup, saveDatabase });
        if (sub === 'putus')  return handlePutus(denn, m, { jadianGroup, saveDatabase });

        // ─── NO ARG → TAMPILKAN STATUS ───
        if (!sub) {
            const myRel = jadianGroup[m.sender];
            if (myRel) {
                return sendFakeQuoted(
                    denn, m,
                    `💑 *STATUS JADIAN*\n\n` +
                    `Kamu jadian dengan @${myRel.partner.split('@')[0]}\n` +
                    `📅 Sejak: ${fmtDate(myRel.since)}\n\n` +
                    `_Ketik \`${prefix}jadian putus\` untuk mengakhiri._`,
                    { mentions: [myRel.partner], title: 'Status Jadian', body: 'Hubungan aktif' }
                );
            }
            return sendFakeQuoted(
                denn, m,
                `😔 Kamu masih jomblo di grup ini.\n\n` +
                `_Tag seseorang untuk mengajak jadian:_\n` +
                `\`${prefix}jadian @tag\``,
                { title: 'Status Jadian', body: 'Belum ada pasangan' }
            );
        }

        // ─── AJUKAN JADIAN ───
        const target = m.mentionedJid?.[0] || m.quoted?.sender || null;
        if (!target) {
            return sendFakeQuoted(
                denn, m,
                `❌ Tag atau reply seseorang yang mau kamu ajak jadian.\n\n` +
                `_Contoh:_ \`${prefix}jadian @user\``
            );
        }

        if (target === m.sender) {
            return sendFakeQuoted(denn, m, '❌ Kamu tidak bisa jadian dengan diri sendiri 😅');
        }

        if (jadianGroup[m.sender]) {
            return sendFakeQuoted(
                denn, m,
                `❌ Kamu sudah jadian dengan @${jadianGroup[m.sender].partner.split('@')[0]}.\n` +
                `_Ketik \`${prefix}jadian putus\` dulu._`,
                { mentions: [jadianGroup[m.sender].partner] }
            );
        }
        if (jadianGroup[target]) {
            return sendFakeQuoted(
                denn, m,
                `❌ @${target.split('@')[0]} sudah jadian dengan orang lain.`,
                { mentions: [target] }
            );
        }
        if (pendingGroup[target]) {
            const sisa = Math.ceil((TTL_PENDING - (now - pendingGroup[target].ts)) / 60000);
            return sendFakeQuoted(
                denn, m,
                `⚠️ @${target.split('@')[0]} sedang di-ajak jadian oleh @${pendingGroup[target].requester.split('@')[0]}.\n` +
                `_Tunggu ${sisa} menit lagi._`,
                { mentions: [target, pendingGroup[target].requester] }
            );
        }

        pendingGroup[target] = { requester: m.sender, ts: now };
        saveDatabase();

        const timeLeft = Math.round(TTL_PENDING / 60000);
        return sendFakeQuoted(
            denn, m,
            `💌 *AJAKAN JADIAN*\n\n` +
            `@${m.sender.split('@')[0]} mengajak @${target.split('@')[0]} untuk jadian! 🥰\n\n` +
            `Ketik:\n` +
            `✅ \`${prefix}jadian terima\` — untuk menerima\n` +
            `❌ \`${prefix}jadian tolak\` — untuk menolak\n\n` +
            `_Ajakan berlaku ${timeLeft} menit._`,
            { mentions: [m.sender, target], title: 'Ajakan Jadian', body: 'Menunggu konfirmasi' }
        );
    }
};