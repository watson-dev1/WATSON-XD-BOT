import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import axios from 'axios';
import { downloadContentFromMessage } from '@rexxhayanasi/elaina-baileys';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const TMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
let emojiFontRegistered = false;
async function registerEmojiFont() {
    if (emojiFontRegistered) return;
    try {
        const fontUrl = 'https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf';
        const fontPath = path.join(TMP_DIR, 'NotoColorEmoji.ttf');
        
        if (!fs.existsSync(fontPath)) {
            const res = await axios.get(fontUrl, { responseType: 'arraybuffer' });
            fs.writeFileSync(fontPath, Buffer.from(res.data));
        }
        GlobalFonts.registerFromPath(fontPath, 'NotoColorEmoji');
        emojiFontRegistered = true;
    } catch (e) {
        console.log('[TikTokDM] Gagal load emoji font:', e.message);
    }
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

export default {
    command: ['faketiktok', 'fakett', 'ttdm'],
    category: 'maker',
    execute: async (denn, m, { prefix, command, text }) => {
        const isQuoted = !!m.quoted;
        const msg = isQuoted ? (m.quoted.msg || m.quoted) : m.msg;
        const mtype = isQuoted ? m.quoted.mtype : m.mtype;
        let mediaMime = msg?.mimetype || '';
        if (!mediaMime && mtype === 'imageMessage') mediaMime = 'image/jpeg';

        if (!/image/.test(mediaMime)) {
            return sendFakeQuoted(denn, m, 
                `📱 *FAKE TIKTOK DM*\n\n` +
                `*Format:* ${prefix}${command} <username>|<pesan>\n\n` +
                `*Contoh:* ${prefix}${command} Hilman|Halo semuanya 😂\n\n` +
                `_Reply/kirim foto untuk dijadikan avatar._`,
                { title: 'Fake TikTok DM', body: 'Wajib kirim/reply foto' }
            );
        }

        if (!text || !text.includes('|')) {
            return sendFakeQuoted(denn, m, 
                `*Format salah!*\n\nContoh:\n${prefix}${command} DennCode|Halo semuanya 😂`, 
                { title: 'Fake TikTok DM', body: 'Gunakan: username|pesan' }
            );
        }

        const [usernameRaw, ...msgParts] = text.split('|');
        const username = (usernameRaw || '').trim();
        const chat = msgParts.join('|').trim();

        if (!username || !chat) {
            return sendFakeQuoted(denn, m, 
                `*Format salah!*\n\nPastikan username & pesan diisi.`, 
                { title: 'Fake TikTok DM', body: 'Lengkapi username & pesan' }
            );
        }

        const wait = await sendFakeQuoted(denn, m, '⏳ Membuat Fake TikTok DM...', { 
            title: 'Fake TikTok DM', body: 'Memproses...' 
        }).catch(() => null);
        try {
            await registerEmojiFont();
            const stream = await downloadContentFromMessage(msg, 'image');
            let avatarBuf = Buffer.from([]);
            for await (const chunk of stream) avatarBuf = Buffer.concat([avatarBuf, chunk]);
            if (!avatarBuf || avatarBuf.length < 100) throw new Error('Gagal unduh avatar');
            const avatarImg = await loadImage(avatarBuf);
            const W = 1080;
            const H = 1500;
            const canvas = createCanvas(W, H);
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, W, 140);
            ctx.strokeStyle = '#EEEEEE';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 140);
            ctx.lineTo(W, 140);
            ctx.stroke();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(90, 70);
            ctx.lineTo(50, 100);
            ctx.lineTo(90, 130);
            ctx.stroke();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.strokeRect(W - 120, 75, 60, 45);
            ctx.beginPath();
            ctx.arc(W - 90, 97, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.save();
            ctx.beginPath();
            ctx.arc(240, 360, 130, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatarImg, 110, 230, 260, 260);
            ctx.restore();
            ctx.fillStyle = '#000000';
            ctx.font = '800 52px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(username, 240, 550);
            ctx.fillStyle = '#888888';
            ctx.font = '400 26px Arial, sans-serif';
            ctx.fillText('TikTok Creator', 240, 595);
            ctx.fillText(`@${username.toLowerCase().replace(/[^a-z0-9_]/g, '')}`, 240, 635);
            ctx.textAlign = 'center';
            const statsX = 750;
            ctx.fillStyle = '#000000';
            ctx.font = '800 36px Arial, sans-serif';
            ctx.fillText('1.2M', statsX - 200, 340);
            ctx.fillText('500K', statsX, 340);
            ctx.fillText('5.8M', statsX + 200, 340);
            ctx.fillStyle = '#888888';
            ctx.font = '400 24px Arial, sans-serif';
            ctx.fillText('Followers', statsX - 200, 380);
            ctx.fillText('Following', statsX, 380);
            ctx.fillText('Likes', statsX + 200, 380);
            ctx.strokeStyle = '#EEEEEE';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(80, 720);
            ctx.lineTo(W - 80, 720);
            ctx.stroke();

            // Chat Title
            ctx.fillStyle = '#888888';
            ctx.font = '500 28px Arial, sans-serif';
            ctx.fillText('💬 Pesan', W / 2, 790);

            // Chat Bubble
            const bubbleX = 180;
            const bubbleY = 850;
            const bubbleMaxW = 850;
            const bubblePadding = 50;
            const fontSize = 38;
            
            ctx.font = `400 ${fontSize}px Arial, "NotoColorEmoji", sans-serif`;
            const lines = wrapText(ctx, chat, bubbleMaxW - (bubblePadding * 2));
            const lineHeight = fontSize * 1.4;
            const bubbleH = (lines.length * lineHeight) + (bubblePadding * 2);

            // Bubble Background
            ctx.fillStyle = '#F1F1F1';
            ctx.beginPath();
            ctx.roundRect(bubbleX, bubbleY, bubbleMaxW, bubbleH, 40);
            ctx.fill();

            // Bubble Text
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            let textY = bubbleY + bubblePadding;
            for (const line of lines) {
                ctx.fillText(line, bubbleX + bubblePadding, textY);
                textY += lineHeight;
            }

            // Time
            const timeStr = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
            ctx.fillStyle = '#888888';
            ctx.font = '400 24px Arial, sans-serif';
            ctx.fillText(timeStr, bubbleX, bubbleY + bubbleH + 40);
            const inputY = H - 200;
            ctx.fillStyle = '#F1F1F1';
            ctx.beginPath();
            ctx.roundRect(60, inputY, W - 120, 100, 50);
            ctx.fill();
            ctx.fillStyle = '#888888';
            ctx.font = '400 32px Arial, sans-serif';
            ctx.fillText('Kirim pesan...', 120, inputY + 62);
            ctx.fillStyle = '#FE2C55';
            ctx.beginPath();
            ctx.arc(W - 130, inputY + 50, 40, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(W - 145, inputY + 35);
            ctx.lineTo(W - 105, inputY + 50);
            ctx.lineTo(W - 145, inputY + 65);
            ctx.closePath();
            ctx.fill();
            const imageBuffer = await canvas.encode('png');

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            await denn.sendMessage(m.chat, {
                image: imageBuffer,
                caption: `📱 *FAKE TIKTOK DM BERHASIL*\n\n` +
                         `👤 *Username:* @${username}\n` +
                         `💬 *Pesan:* ${chat}\n\n` +
                         `_Request by: ${m.pushName || 'User'}_`
            }, { quoted: m });

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            console.error('[FakeTikTok Error]', e.message);
            sendFakeQuoted(denn, m, `❌ Gagal membuat Fake TikTok DM:\n${e.message}`, {
                title: 'Fake TikTok Gagal', body: 'Coba lagi nanti'
            });
        }
    }
};