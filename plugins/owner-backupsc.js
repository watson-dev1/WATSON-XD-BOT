import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const exec_ = promisify(exec);

const handler = async (m, { conn }) => {
   if (m.chat === "263781330745@s.whatsapp.net") { // Ensure this comparison is strict
      try {
         const zipFileName = `Watson-Beta.zip`;

         m.reply("Starting the backup process. Please wait...");

         // Set a delay of 1 second before starting the backup process
         setTimeout(async () => {
            const zipCommand = `zip -r ${zipFileName} * -x "node_modules/*"`;

            try {
               await exec_(zipCommand);

               // Check if the zip file was created successfully
               if (fs.existsSync(zipFileName)) {
                  // Delay 2 seconds before sending the backup file
                  setTimeout(() => {
                     const file = fs.readFileSync(zipFileName);
                     conn.sendMessage(
                        m.chat,
                        {
                           document: file,
                           mimetype: "application/zip",
                           fileName: zipFileName,
                           caption: "Backup completed. Please download the backup file.",
                        },
                        { quoted: m }
                     );

                     // Delete the zip file after 5 seconds
                     setTimeout(() => {
                        fs.unlinkSync(zipFileName);
                        m.reply("Backup file has been deleted.");
                     }, 5000);
                  }, 2000);
               } else {
                  m.reply("Failed to create the backup file.");
               }
            } catch (execError) {
               console.error("Error during zip creation:", execError);
               m.reply("Failed to create the backup file.");
            }
         }, 1000);
      } catch (error) {
         m.reply("An error occurred while performing the backup.");
         console.error("Error in backup process:", error);
      }
   } else {
      // Send message if the user is not the correct owner
      conn.sendMessage(m.chat, {
         document: fs.readFileSync('./README.md'),
         mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         fileName: 'WATSON-XD-BOT',
         fileLength: 271000000000000,
         caption: 'What are you up to? 😂😂',
         contextInfo: {
            mentionedJid: [m.sender],
            isForwarded: true,
            forwardingScore: 256,
            forwardedNewsletterMessageInfo: {
               newsletterJid: '120363424621387196@newsletter',
               newsletterName: `Powered By: ${global.author}`,
               serverMessageId: -1
            },
            externalAdReply: {
               showAdAttribution: false,
               title: wm,
               body: 'I am an automated WhatsApp bot that can help with something, search, and get data/information only through WhatsApp.',
               thumbnailUrl: 'https://kua.lat/inori',
               sourceUrl: sgc,
               mediaType: 1,
               renderLargerThumbnail: false
            }
         }
      }, { quoted: m });
   }
};

handler.help = ["backupsc"];
handler.tags = ["owner"];
handler.command = ["pibackup", "backupsc"];
handler.rowner = true; // Restrict this command to the owner
handler.private = false;

export default handler;