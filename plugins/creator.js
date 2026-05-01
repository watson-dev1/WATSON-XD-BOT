let handler = async (m, { conn, command }) => {
  // Define the owner list
  let ownerList = [
    ['263789622747', 'watson-xd', 'true'],
    ['263781330745', 'watson-dev', 'true']
  ];

  // Create a message with owner details
  let ownerMessage = "Owner's Contacts:\n";
  let buttons = []; // To hold buttons

  ownerList.forEach(([number, name, status]) => {
    ownerMessage += `📞 ${name} - ${number} (${status})\n`;

    // Add a button for each owner
    buttons.push({
      buttonId: `contact_${number}`, // Unique button ID for each contact
      buttonText: { displayText: `Contact ${name}` },
      type: 1
    });
  });

  // Construct the button message
  const buttonMessage = {
    text: ownerMessage, // Message with owner contact info
    footer: "Click to contact an owner",
    buttons: buttons,
    headerType: 1 // Type 1 is for buttons
  };

  // Send the button message
  await conn.sendMessage(m.chat, buttonMessage, { quoted: m });

  // Optionally, you can send a reply message indicating that the buttons have been sent
  await conn.reply(m.chat, `Here are the owner's contact details with buttons to initiate chat.`, m);
};

// Command and help
handler.help = ['owner'];
handler.tags = ['info'];
handler.command = /^owner$/i;

export default handler;