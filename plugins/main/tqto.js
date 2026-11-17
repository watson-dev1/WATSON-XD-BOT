import { sendFakeQuoted } from '../../lib/fakequoted.js';

/**
 * Daftar kontributor & kredit.
 * Edit array di bawah untuk menambahkan/mengurangi.
 * Field `tag` opsional — kalau diisi nomor (628xxx), akan di-mention.
 */
const CONTRIBUTORS = [
    { role: 'Developer',        name: 'DennCode',         tag: null },
    { role: 'Best Friend',     name: 'Sandi Setiawan',        tag: null },
    { role: 'Partner',     name: 'Agatha',        tag: null },
    { role: 'Partner',     name: 'Dapszz',        tag: null },
    { role: 'Partner',     name: 'Rafzz',        tag: null },

    // { role: '💻 Developer', name: 'Nama',           tag: '62xxx' },
    // { role: '🎨 Designer',  name: 'Nama',           tag: null },
];

const LIBS = [
    { name: '@rexxhayanasi/elaina-baileys', by: 'RexxHayanasi', desc: 'WhatsApp Web API' },
    { name: 'termai.cc',                         by: 'TermAI',        desc: 'Rest Api' },
    { name: 'api.jerexd.my.id',                        by: 'Jerexd',   desc: 'Rest Api' },
    { name: 'api.nexadev.my.id',                          by: 'NexaDev',       desc: 'Rest Api ' },
];

export default {
    command: ['tqto', 'thanks', 'credit', 'credits'],
    category: 'main',
    description: 'kredit & kontributor bot',
    async execute(denn, m, { prefix }) {
        const mentions = [];

        const contributorLines = CONTRIBUTORS.map(c => {
            if (c.tag) {
                const jid = `${c.tag}@s.whatsapp.net`;
                mentions.push(jid);
                return `│ ${c.role.padEnd(14)} : @${c.tag}`;
            }
            return `│ ${c.role.padEnd(14)} : ${c.name}`;
        }).join('\n');

        const libLines = LIBS.map(l =>
            `│ • *${l.name}*\n│    _${l.desc} — by ${l.by}_`
        ).join('\n');

        const botName = global.namabot || 'PatrickMD';
        const ownerName = global.namaowner || 'DennCode';

        let text = `╭───「 *T H A N K S  T O* 」───╮\n\n`;
        text += `Terima kasih kepada semua pihak yang\n`;
        text += `telah berkontribusi pada *${botName}*:\n\n`;

        text += `╭───「 *C O N T R I B U T O R S* 」\n`;
        text += contributorLines + '\n';
        text += `╰─────────────────\n\n`;

        text += `╭───「 *L I B R A R I E S* 」\n`;
        text += libLines + '\n';
        text += `╰─────────────────\n\n`;

        text += `╭───「 *I N F O* 」\n`;
        text += `│ 🛠️ *Bot:* ${botName}\n`;
        text += `│ 👤 *Owner:* ${ownerName}\n`;
        text += `│ 💡 *Prefix:* \`${prefix}\`\n`;
        text += `╰─────────────────\n\n`;

        text += `_Jika kamu merasa berkontribusi namun\n`;
        text += `belum tercantum, hubungi owner._ 🙏`;

        await sendFakeQuoted(denn, m, text, {
            title: 'Thanks To',
            body: `${botName} Credits`,
            mentions
        });
    }
};