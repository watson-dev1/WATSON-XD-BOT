let handler = async (m) => {
    const steps = [
        "🔌 Initiating satellite connection...",
        "🛰️ Syncing with orbital network...",
        "🔒 Engaging secure protocol...",
        "💻 Accessing global security infrastructure...",
        "⚡ Bypassing high-level firewalls...",
        "🔑 Decrypting satellite encryption keys...",
        "🧩 Compiling security override data...",
        "💣 Deploying anti-countermeasures...",
        "📡 Reestablishing link to satellite...",
        "🚀 Finalizing control sequence...",
        "✅ Satellite successfully hacked! (but only here, for fun 😎)"
    ];

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // To store all messages
    let allMessages = [];

    await m.reply("💥 **Satellite Hack Sequence Initiated** 💥\n\n");

    // Simulating increasing complexity with randomized delays
    let timeElapsed = 0;
    let interval = setInterval(async () => {
        if (timeElapsed >= 10 * 1000) {
            clearInterval(interval); // Stop if 10 seconds have passed
            return;
        }

        for (let i = 0; i < steps.length; i++) {
            let message = await m.reply(steps[i]);
            allMessages.push(message);  // Save each sent message

            // Start deleting the message 1 second after it's sent
            await delay(1000);  // 1-second delay before deleting

            // Delete the message after it's been sent
            await message.delete(); 
            
            timeElapsed += 1000; // Track time elapsed for 10-second limit
            if (timeElapsed >= 10 * 1000) {
                clearInterval(interval); // Stop once 10 seconds pass
                return;
            }
        }
    }, 500); // This interval checks every 500ms (a rapid check)

    // Give the user an indication that the "hack" was successful before deleting all messages
    await delay(3000);
    await m.reply("✅ **Satellite successfully controlled!** (But again, just for fun 😜)");

    // Start deleting the remaining messages after the last reply
    await delay(1000);
    for (let msg of allMessages) {
        if (msg) {
            await msg.delete(); // Delete each message
        }
    }
}

handler.help = ['hacksatellite'];
handler.tags = ['fun'];
handler.command = /^hacksatellite$/i;
handler.limit = true;

export default handler;