import { createHash } from 'crypto';

let handler = async function (m, { args }) {
  if (!args[0]) throw 'Serial Number kosong. Please provide a valid Serial Number to unregister.';
  
  let user = global.db.data.users[m.sender];
  let sn = createHash('md5').update(m.sender).digest('hex');

  // Check if the provided serial number matches the one generated for the user
  if (args[0] !== sn) throw 'Serial Number salah. Please check the Serial Number you provided.';
  
  // Check if the user is already unregistered
  if (!user.registered) throw 'You are not registered yet! Please register first before unregistration.';

  // Prompt for confirmation before unregistration
  await m.reply('Are you sure you want to unregister? Type "yes" to confirm or "no" to cancel.');

  // Listen for user reply to confirm unregistration
  const confirm = await m.waitForReply(['yes', 'no'], 30000); // 30 seconds to reply
  
  if (confirm === 'yes') {
    user.registered = false;
    m.reply('```Success! You have been unregistered successfully.```');
  } else {
    m.reply('Unregistration cancelled. You are still registered.');
  }
}

handler.help = ['unreg <SN|SERIAL NUMBER>']
handler.tags = ['xp']
handler.command = /^unreg(ister)?$/i
handler.register = true

export default handler;