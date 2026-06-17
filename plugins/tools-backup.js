import fs from "fs";
import { exec } from "child_process";

let handler = async (m, { conn, command }) => {
  try {
    const ownerNumber = global.owner || []; // Adjust this to your owner number(s)
    if (!ownerNumber || ownerNumber.length === 0) return;

    await conn.reply(m.chat, "⏳ Creating backup file...", m);

    const output = `backup_${Date.now()}.zip`;

    // ZIP command excluding unnecessary folders
    const zipCmd = `zip -r ${output} . \
      -x "node_modules/*" ".git/*" ".npm/*" ".cache/*" \
      "temp/*" "session/*" "*.zip" "package-lock.json"`;

    exec(zipCmd, async (err) => {
      if (err) {
        console.error("Backup ZIP error:", err);
        return conn.reply(m.chat, "❌ Failed to create backup file.", m);
      }

      // Read ZIP file
      const buffer = fs.readFileSync(output);

      await conn.sendMessage(
        m.chat,
        {
          document: buffer,
          fileName: output,
          mimetype: "application/zip",
          caption: "✅ Backup completed successfully!"
        },
        { quoted: m }
      );

      // Clean up ZIP file
      fs.unlinkSync(output);
    });

  } catch (err) {
    console.error("Backup handler error:", err);
    conn.reply(m.chat, "❌ An error occurred while creating the backup.", m);
  }
};

handler.help = ["backup"];
handler.tags = ["owner"];
handler.command = /^backup$/i;
handler.owner = true;

export default handler;