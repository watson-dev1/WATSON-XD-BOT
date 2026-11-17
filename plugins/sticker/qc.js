import { createCanvas, loadImage } from '@napi-rs/canvas';
import { spawn } from 'child_process';
import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const STICKER_SIZE = 512;
const TARGET_MAX = 480;

const toWebpSticker = (pngBuffer) => {
    return new Promise((resolve, reject) => {
        if (!pngBuffer?.length) return reject(new Error('Buffer PNG kosong'));
        const ff = spawn('ffmpeg', [
            '-y', '-i', 'pipe:0',
            '-vf', `pad=${STICKER_SIZE}:${STICKER_SIZE}:(ow-iw)/2:(oh-ih)/2:color=#00000000`,
            '-c:v', 'libwebp',
            '-preset', 'default',
            '-frames:v', '1',
            '-an',
            '-f', 'webp',
            'pipe:1'
        ]);
        const chunks = [];
        ff.stdout.on('data', c => chunks.push(c));
        ff.stderr.on('data', () => {});
        ff.on('close', code => {
            if (code !== 0 || !chunks.length) return reject(new Error('FFmpeg gagal konversi webp'));
            resolve(Buffer.concat(chunks));
        });
        ff.on('error', reject);
        ff.stdin.end(pngBuffer);
    });
};

const wrapText = (ctx, text, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = w;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);
    return lines;
};

const roundedRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
};

const fetchAvatar = async (url) => {
    if (!url) return null;
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const buf = Buffer.from(res.data);
        if (buf.length < 100) return null;
        return await loadImage(buf);
    } catch (_) {
        return null;
    }
};

const generateQC = async (text, name, avatarUrl) => {
    const fontSize = 24;
    const nameFontSize = 18;
    const padding = 20;
    const avatarSize = 48;
    const gap = 14;
    const maxTextWidth = 340;

    const measure = createCanvas(1, 1).getContext('2d');
    measure.font = `${fontSize}px sans-serif`;
    const lines = wrapText(measure, text, maxTextWidth);

    const lineHeight = Math.round(fontSize * 1.4);
    const headerHeight = nameFontSize + 8;
    const textBlockHeight = headerHeight + (lines.length * lineHeight);
    const contentHeight = Math.max(avatarSize, textBlockHeight);

    const maxLineWidth = Math.max(
        measure.measureText(name).width,
        ...lines.map(l => measure.measureText(l).width)
    );

    const naturalW = padding * 2 + avatarSize + gap + Math.min(maxTextWidth, Math.ceil(maxLineWidth)) + 6;
    const naturalH = padding * 2 + contentHeight;

    const maxDim = Math.max(naturalW, naturalH);
    const scale = Math.min(2.5, TARGET_MAX / maxDim);

    const finalW = Math.round(naturalW * scale);
    const finalH = Math.round(naturalH * scale);

    const canvas = createCanvas(finalW, finalH);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, naturalW, naturalH);

    ctx.fillStyle = '#202c33';
    roundedRect(ctx, 0, 0, naturalW, naturalH, 18);
    ctx.fill();

    const avX = padding;
    const avY = padding + (contentHeight - avatarSize) / 2;
    const avatarImg = await fetchAvatar(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avX + avatarSize / 2, avY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (avatarImg) {
        ctx.drawImage(avatarImg, avX, avY, avatarSize, avatarSize);
    } else {
        ctx.fillStyle = '#6a7178';
        ctx.fillRect(avX, avY, avatarSize, avatarSize);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(avatarSize * 0.45)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name.charAt(0).toUpperCase(), avX + avatarSize / 2, avY + avatarSize / 2);
        ctx.textAlign = 'left';
    }
    ctx.restore();

    const textX = avX + avatarSize + gap;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#53bdeb';
    ctx.font = `bold ${nameFontSize}px sans-serif`;
    ctx.fillText(name, textX, padding);

    ctx.fillStyle = '#e9edef';
    ctx.font = `${fontSize}px sans-serif`;
    lines.forEach((line, i) => {
        ctx.fillText(line, textX, padding + headerHeight + i * lineHeight);
    });

    return canvas.toBuffer('image/png');
};

export default {
    command: ['qc', 'quote', 'fakeqc'],
    category: 'sticker',
    execute: async (denn, m, { text, prefix }) => {
        let qcText = (text || '').trim();
        let targetName = m.pushName || 'User';
        let targetJid = m.sender;

        if (m.quoted) {
            if (!qcText) qcText = (m.quoted.text || '').trim();
            if (m.quoted.sender) {
                targetJid = m.quoted.sender;
                targetName = m.quoted.sender.split('@')[0];
            }
        }

        if (qcText.includes('|')) {
            const idx = qcText.indexOf('|');
            const possibleName = qcText.slice(0, idx).trim();
            const possibleText = qcText.slice(idx + 1).trim();
            if (possibleName && possibleText) {
                targetName = possibleName;
                qcText = possibleText;
            }
        }

        if (!qcText) {
            return sendFakeQuoted(denn, m,
                `💬 *QUOTE STICKER (QC)*\n\n` +
                `*Cara pakai:*\n` +
                `• \`${prefix}qc <teks>\`\n` +
                `• \`${prefix}qc <nama>|<teks>\`\n` +
                `• Reply pesan + \`${prefix}qc\`\n\n` +
                `*Contoh:*\n` +
                `\`${prefix}qc Halo dunia\`\n` +
                `\`${prefix}qc Budi|Aku suka kamu\``,
                { title: 'QC Sticker', body: 'Buat sticker quote' }
            );
        }

        if (qcText.length > 250) qcText = qcText.slice(0, 247) + '...';
        if (targetName.length > 25) targetName = targetName.slice(0, 22) + '...';

        let avatarUrl = null;
        try {
            avatarUrl = await denn.profilePictureUrl(targetJid, 'image');
        } catch (_) {}

        try {
            const pngBuffer = await generateQC(qcText, targetName, avatarUrl);
            const webpBuffer = await toWebpSticker(pngBuffer);
            await denn.sendMessage(m.chat, { sticker: webpBuffer }, { quoted: m });
        } catch (err) {
            await sendFakeQuoted(denn, m, `❌ Gagal membuat sticker QC:\n${err.message}`);
        }
    }
};