import { exec } from "child_process";
import { writeFileSync, unlinkSync } from "fs";

let handler = async (m, { conn, text, command }) => {
    if (!text) 
        return m.reply(`⚠️ Contoh:\n.${command} Halo`);

    try {
        // API endpoint
        let url = `https://api.elrayyxml.web.id/api/maker/bratvid?text=${encodeURIComponent(text)}`;

        // Ambil video dari API
        let res = await fetch(url);
        let buff = Buffer.from(await res.arrayBuffer());

        if (!buff || buff.length < 10000)
            return m.reply("❌ Gagal mengambil video dari API.");

        // Simpan video sementara
        let input = "./tmp/bratvid.mp4";
        let output = "./tmp/bratvid.webp";
        writeFileSync(input, buff);

        // Convert ke sticker webp animasi
        await new Promise((resolve, reject) => {
            exec(
                `ffmpeg -i ${input} -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15" -loop 0 -c:v libwebp -q:v 50 ${output}`,
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Kirim sebagai sticker
        await conn.sendMessage(
            m.chat,
            {
                sticker: { url: output }
            },
            { quoted: m }
        );

        // Bersihkan file
        unlinkSync(input);
        unlinkSync(output);

    } catch (err) {
        console.log(err);
        return m.reply("❌ Terjadi kesalahan: " + err.message);
    }
};

handler.help = ["bratvid <teks>"];
handler.tags = ["maker"];
handler.command = /^bratvid$/i;

export default handler;