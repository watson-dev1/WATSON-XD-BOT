export async function before(m) {
    // Safety check: Ensure database and chat data exist before reading 'autotype'
    if (!global.db.data || !global.db.data.chats || !global.db.data.chats[m.chat]) return;

    const chat = global.db.data.chats[m.chat];
    
    // Safety check: Ensure autotype is actually enabled
    if (!chat || !chat.autotype) return;
  
    // Safety check: Ensure plugins exist
    if (!global.plugins) return;

    const commands = Object.values(global.plugins).flatMap((plugin) => [].concat(plugin.command || []));
    
    // Check if message text exists to avoid regex errors
    const mText = m.text || '';
    const presenceStatus = commands.some((cmd) => (cmd instanceof RegExp ? cmd.test(mText) : mText.includes(cmd))) ? 'composing' : 'available';
  
    if (presenceStatus) await this.sendPresenceUpdate(presenceStatus, m.chat);
}
  
export const disabled = false;