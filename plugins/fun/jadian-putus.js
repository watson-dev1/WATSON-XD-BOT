import { sendFakeQuoted } from '../../lib/fakequoted.js';

export async function handlePutus(denn, m, { jadianGroup, saveDatabase }) {
    const rel = jadianGroup[m.sender];
    if (!rel) {
        return sendFakeQuoted(denn, m, '❌ Kamu tidak sedang jadian dengan siapa pun di grup ini.');
    }

    const partner = rel.partner;
    delete jadianGroup[m.sender];
    if (jadianGroup[partner]?.partner === m.sender) {
        delete jadianGroup[partner];
    }
    saveDatabase();

    return sendFakeQuoted(
        denn, m,
        `💔 *PUTUS*\n\n` +
        `@${m.sender.split('@')[0]} dan @${partner.split('@')[0]} telah memutuskan hubungan mereka.\n\n` +
        `_Keduanya kini kembali jomblo._ 😔`,
        { mentions: [m.sender, partner], title: 'Putus', body: 'Hubungan berakhir' }
    );
}