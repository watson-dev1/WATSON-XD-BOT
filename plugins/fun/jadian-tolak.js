import { sendFakeQuoted } from '../../lib/fakequoted.js';

export async function handleTolak(denn, m, { pendingGroup, saveDatabase }) {
    const pending = pendingGroup[m.sender];
    if (!pending) {
        return sendFakeQuoted(denn, m, '❌ Tidak ada ajakan jadian untukmu.');
    }

    const requester = pending.requester;
    delete pendingGroup[m.sender];
    saveDatabase();

    return sendFakeQuoted(
        denn, m,
        `💔 *AJAKAN DITOLAK*\n\n` +
        `@${m.sender.split('@')[0]} menolak ajakan jadian dari @${requester.split('@')[0]}.\n\n` +
        `_Tetap semangat, jodoh tidak ke mana-mana._`,
        { mentions: [m.sender, requester], title: 'Ajakan Ditolak', body: 'Semangat jomblo' }
    );
}