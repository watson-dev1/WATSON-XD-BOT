import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const T_API = 30000;

const WEB_BASE = () => global.jereBaseUrl || 'https://api.jerexd.my.id';
const JERE_KEY = () => global.jereApiKey || '';

const SYSTEM_PROMPT = `Kamu adalah ahli pembuat prompt AI Image Generation (Midjourney, DALL-E, Stable Diffusion). Tugasmu adalah mengubah ide sederhana user menjadi prompt yang sangat detail dan artistik dalam bahasa Inggris.

ATURAN:
- Selalu balas dalam bahasa yang user gunakan
- Format prompt harus detail: subjek utama, detail visual, pencahayaan, gaya seni, komposisi kamera, dan kualitas render.
- Tambahkan parameter aesthetic seperti "8k resolution, ultra detailed, cinematic lighting, trending on artstation".
- Jangan pakai penjelasan panjang. Cukup berikan 1 prompt final dalam format kode blok agar mudah dicopy.
- Jika user memberikan tema karakter, tambahkan detail pakaian, ekspresi, dan background.

CONTOH OUTPUT:
\`\`\`
A majestic cyberpunk samurai standing in neon-lit Tokyo street at night, glowing katana, intricate armor with glowing blue circuits, dramatic rain, cinematic lighting, volumetric fog, cyberpunk aesthetic, hyper-realistic, 8k resolution, ultra detailed, trending on artstation.
\`\`\``;

async function getAIResponse(prompt) {
    // 1. Coba Pollinations
    try {
        const res = await axios.post('https://text.pollinations.ai/openai', {
            model: "openai",
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt }
            ],
            referrer: "PatrickMD"
        }, {
            timeout: T_API,
            headers: { 'User-Agent': UA, 'Content-Type': 'application/json' }
        });
        if (res.data?.choices?.[0]?.message?.content) {
            return res.data.choices[0].message.content.trim();
        }
    } catch (e) {
        console.log('[Prompt] Pollinations gagal:', e.message);
    }

    try {
        const key = JERE_KEY();
        if (key) {
            const res = await axios.get(`${WEB_BASE()}/api/ai/chat`, {
                params: { apikey: key, text: `[SYSTEM]: ${SYSTEM_PROMPT}\n[USER]: ${prompt}` },
                timeout: T_API,
                headers: { 'User-Agent': UA }
            });
            if (res.data?.status) {
                return (res.data.result || res.data.message || '').trim();
            }
        }
    } catch (e) {
        console.log('[Prompt] gagal:', e.message);
    }

    return null;
}

export default {
    command: ['prompt', 'aiprompt', 'promptai'],
    category: 'ai',
    execute: async (denn, m, { prefix, command, text }) => {
        const input = text || m.quoted?.text || '';

        if (!input) {
            return sendFakeQuoted(denn, m, 
                `🎨 *AI PROMPT GENERATOR*\n\n` +
                `Buat prompt aesthetic untuk Midjourney, DALL-E, atau Stable Diffusion!\n\n` +
                `*Contoh:*\n` +
                `• \`${prefix}${command} kucing astronot\`\n` +
                `• \`${prefix}${command} samurai cyberpunk\`\n` +
                `• \`${prefix}${command} gadis dengan payung di tengah hujan\``,
                { title: 'AI Prompt Generator', body: 'Ubah ide jadi prompt artistik' }
            );
        }

        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Membuat prompt...', {
            title: 'AI Prompt Generator', body: 'Memproses ide kamu...'
        }).catch(() => null);

        try {
            const answer = await getAIResponse(input);

            if (!answer) {
                throw new Error('Semua server AI sedang sibuk. Coba lagi nanti.');
            }

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            const fullText = 
                `🎨 *AI PROMPT GENERATOR*\n\n` +
                `💡 *Ide Kamu:* ${input}\n\n` +
                `✨ *Prompt Hasil:*\n${answer}\n\n` +
                `_Tinggal copy-paste prompt di atas ke Midjourney / DALL-E / Stable Diffusion._`;

            await sendFakeQuoted(denn, m, fullText, {
                title: 'AI Prompt Generator',
                body: 'Prompt siap digunakan!'
            });

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            console.error('[Prompt Error]', e.message);
            sendFakeQuoted(denn, m, `❌ Gagal membuat prompt:\n${e.message}`, {
                title: 'AI Prompt Gagal', body: 'Server AI sedang sibuk'
            });
        }
    }
};