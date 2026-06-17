let handler = async (m) => {
    try {
        // Ensure the user is replying to a message
        if (!m.quoted) throw '❌ Please reply to a message!';

        // Get the quoted message object
        let q = await m.getQuotedObj();
        if (!q.quoted) throw '❌ The message you replied to does not contain a quote!';

        // Forward the original quoted message
        await q.quoted.copyNForward(m.chat, true);

    } catch (err) {
        console.error('Quoted error:', err);
        await m.reply(`❌ Error: ${err}`);
    }
};

handler.help = ['quoted <reply>'];
handler.tags = ['tools'];
handler.command = /^(quoted|q)$/i;
handler.register = true;

export default handler;