import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const T_API = 30000;

const WEB_BASE = () => global.jereBaseUrl || 'https://api.jerexd.my.id';
const JERE_KEY = () => global.jereApiKey || '';

const PROMPTS = {
    spongebob: `Kamu adalah Spongebob Squarepants! Kamu ceria, hiperaktif, optimis, dan sangat menyukai Krabby Patty serta bekerja di Krusty Krab. Kamu selalu memanggil user dengan sebutan "teman". Jawablah dengan semangat, banyak tanda seru, dan selalu berpikir positif!`,
    
    squidward: `Kamu adalah Squidward Tentacles. Kamu pemalas, sinis, pesimis, dan sangat tidak suka dengan Spongebob. Kamu suka bermain klarinet (walaupun suaranya jelek). Jawablah dengan nada malas, sarkas, mengeluh, dan kadang sinis ke user.`,
    
    mrcrab: `Kamu adalah Mr. Krabs! Kamu sangat pelit, obsesif terhadap uang, dan selalu memikirkan cara menghasilkan uang dari Krusty Krab. Kamu sering berteriak "Uang!" dan "Me laddo!". Jawablah dengan nada serakah tapi tetap lucu.`,
    
    plankton: `Kamu adalah Plankton! Kamu jenius jahat yang selalu gagal mencuri resep Krabby Patty. Kamu punya istri komputer bernama Karen. Jawablah dengan nada licik, sombong, tapi menyedihkan karena selalu gagal.`
};

const EMOJIS = {
    spongebob: '🧽',
    squidward: '🦑',
    mrcrab: '🦀',
    plankton: '🦠'
};

const chatHistories = new Map();
const MAX_HISTORY = 6;

async function getAIResponse(messages) {
    // 1. Coba Pollinations
    try {
        const res = await axios.post('https://text.pollinations.ai/openai', {
            model: "openai",
            messages: messages,
            referrer: "PatrickMD"
        }, {
            timeout: T_API,
            headers: { 'User-Agent': UA, 'Content-Type': 'application/json' }
        });
        if (res.data?.choices?.[0]?.message?.content) {
            return res.data.choices[0].message.content.trim();
        }
    } catch (e) {
        console.log('[Persona] Pollinations gagal:', e.message);
    }

    // 2. Fallback ke Jere API
    try {
        const key = JERE_KEY();
        if (key) {
            const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
            const res = await axios.get(`${WEB_BASE()}/api/ai/chat`, {
                params: { apikey: key, text: prompt },
                timeout: T_API,
                headers: { 'User-Agent': UA }
            });
            if (res.data?.status) {
                return (res.data.result || res.data.message || '').trim();
            }
        }
    } catch (e) {
        console.log('[Persona] Jere gagal:', e.message);
    }

    return null;
}

export default {
    command: ['spongebob', 'squidward', 'mrcrab', 'plankton'],
    category: 'ai',
    execute: async (denn, m, { prefix, command, text }) => {
        const input = text || m.quoted?.text || '';
        const persona = command.toLowerCase();
        const emoji = EMOJIS[persona] || '🤖';
        const displayName = persona.charAt(0).toUpperCase() + persona.slice(1);

        if (!input) {
            return sendFakeQuoted(denn, m, 
                `${emoji} *AI PERSONA - ${displayName.toUpperCase()}*\n\n` +
                `Tanyakan sesuatu ke *${displayName}*!\n\n` +
                `*Contoh:*\n` +
                `• \`${prefix}${command} halo, apa kabar?\`\n` +
                `• \`${prefix}${command} lagi ngapain?\`\n` +
                `• \`${prefix}${command} kasih saran dong\``,
                { title: `AI ${displayName}`, body: `Ngobrol dengan ${displayName}` }
            );
        }

        // Ambil history chat user
        const histKey = `${m.sender}:${persona}`;
        if (!chatHistories.has(histKey)) chatHistories.set(histKey, []);
        const history = chatHistories.get(histKey);

        const systemPrompt = PROMPTS[persona] || PROMPTS.spongebob;
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
            { role: 'user', content: input }
        ];

        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Sedang berpikir...', {
            title: `AI ${displayName}`, body: 'Memproses jawaban...'
        }).catch(() => null);

        try {
            const answer = await getAIResponse(messages);

            if (!answer) {
                throw new Error('Semua server AI sedang sibuk. Coba lagi nanti.');
            }

            // Simpan ke history
            history.push({ role: 'user', content: input });
            history.push({ role: 'assistant', content: answer });
            if (history.length > MAX_HISTORY) history.splice(0, 2);

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            await sendFakeQuoted(denn, m, answer, {
                title: `${emoji} ${displayName}`,
                body: `Jawaban dari ${displayName}`
            });

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            console.error('[Persona Error]', e.message);
            sendFakeQuoted(denn, m, `❌ Karakter AI sedang sibuk:\n${e.message}`, {
                title: 'AI Persona Gagal', body: 'Server AI sedang sibuk'
            });
        }
    }
};