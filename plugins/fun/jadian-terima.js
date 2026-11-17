import { sendFakeQuoted } from '../../lib/fakequoted.js';

export async function handleTerima(denn, m, { jadianGroup, pendingGroup, saveDatabase }) {
    const pending = pendingGroup[m.sender];
    if (!pending) {
        return sendFakeQuoted(
            denn, m,
            '❌ Tidak ada ajakan jadian untukmu.\n\n_Minta seseorang mengajakmu jadian dulu._'
        );
    }

    const now = Date.now();
    const requester = pending.requester;

    // Re-cek status
    if (jadianGroup[m.sender]) {
        delete pendingGroup[m.sender];
        saveDatabase();
        return sendFakeQuoted(denn, m, '❌ Kamu sudah jadian dengan orang lain.');
    }
    if (jadianGroup[requester]) {
        delete pendingGroup[m.sender];
        saveDatabase();
        return sendFakeQuoted(
            denn, m,
            `❌ @${requester.split('@')[0]} sudah jadian dengan orang lain.`,
            { mentions: [requester] }
        );
    }

    const since = now;
    jadianGroup[m.sender] = { partner: requester, since };
    jadianGroup[requester] = { partner: m.sender, since };
    delete pendingGroup[m.sender];
    saveDatabase();

    const { fmtDate } = await import('./jadian.js');
    return sendFakeQuoted(
        denn, m,
        `🎉 *SELAMAT!*\n\n` +
        `@${m.sender.split('@')[0]} ❤️ @${requester.split('@')[0]}\n\n` +
        `Mereka resmi jadian sejak *${fmtDate(since)}* 💑\n\n` +
        `_Semoga langgeng!_`,
        { mentions: [m.sender, requester], title: 'Jadian Baru!', body: 'Selamat untuk pasangan baru' }
    );
}