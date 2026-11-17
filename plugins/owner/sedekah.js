import { getUser, formatMoney } from '../../lib/rpg.js';
import { saveDatabase } from '../../lib/database.js';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

export default {
    command: ['sedekah', 'addstat', 'tambah', 'add'],
    category: 'owner',
    description: 'Menambahkan limit, xp, atau money ke user (Owner Only)',
    async execute(denn, m, { args, prefix, isOwner }) {
        if (!isOwner) {
            return sendFakeQuoted(denn, m, '❌ Command ini khusus untuk Owner!');
        }

        const argsLower = args.map(a => a.toLowerCase());
        const type = argsLower.find(a => ['limit', 'xp', 'money'].includes(a));
        
        if (!type) {
            return sendFakeQuoted(denn, m, 
                `❌ *FORMAT SALAH*\n\n` +
                `Gunakan format:\n` +
                `\`${prefix}sedekah <limit|xp|money> <target> <jumlah>\`\n\n` +
                `*Contoh:*\n` +
                `\`${prefix}sedekah money @tag 50000\`\n` +
                `\`${prefix}sedekah limit 628xxx 10\``
            );
        }

        const typeIndex = argsLower.indexOf(type);
        let target = m.mentionedJid?.[0] || m.quoted?.sender;
        let amount = 0;

        if (target) {
            const amountArg = args.find((a, i) => i !== typeIndex && /^\d+$/.test(a));
            if (amountArg) amount = parseInt(amountArg);
        } else {
            const numbers = args.filter((a, i) => i !== typeIndex && /^\d+$/.test(a));
            
            if (numbers.length >= 2) {
                const phone = numbers.find(n => n.length >= 10);
                const amountStr = numbers.find(n => n !== phone);
                
                if (phone) target = phone + '@s.whatsapp.net';
                if (amountStr) amount = parseInt(amountStr);
            }
        }

        if (!target) {
            return sendFakeQuoted(denn, m, '❌ Tag user, reply pesannya, atau masukkan nomor HP yang valid (min. 10 digit)!');
        }

        if (!amount || isNaN(amount) || amount <= 0) {
            return sendFakeQuoted(denn, m, '❌ Masukkan jumlah yang valid (angka lebih dari 0).');
        }

        try {
            const user = getUser(target);
            let addedText = '';

            if (type === 'limit') {
                user.limit = (user.limit || 0) + amount;
                addedText = `*${amount.toLocaleString('id-ID')}* Limit`;
            } 
            else if (type === 'xp') {
                user.xp = (user.xp || 0) + amount;
                addedText = `*${amount.toLocaleString('id-ID')}* XP`;
            } 
            else if (type === 'money') {
                user.money = (user.money || 0) + amount;
                addedText = formatMoney(amount);
            }

            saveDatabase();

            const targetName = target.split('@')[0];
            await sendFakeQuoted(denn, m, 
                `✅ *BERHASIL DIBERIKAN*\n\n` +
                `👤 *Target:* @${targetName}\n` +
                `📦 *Ditambahkan:* +${addedText}\n\n` +
                `_Data berhasil disimpan ke database._`,
                { mentions: [target], title: 'Owner Giveaway', body: 'Sukses' }
            );

        } catch (err) {
            await sendFakeQuoted(denn, m, `❌ Gagal menambahkan stat: ${err.message}`);
        }
    }
};