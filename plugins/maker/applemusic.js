import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { downloadContentFromMessage } from '@rexxhayanasi/elaina-baileys';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const TMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const escapeXml = (unsafe) => {
    return String(unsafe).replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
};

function resizeCover(buffer) {
    return new Promise((resolve, reject) => {
        const tmpIn = path.join(TMP_DIR, `cover_in_${Date.now()}.jpg`);
        const tmpOut = path.join(TMP_DIR, `cover_out_${Date.now()}.jpg`);
        try { fs.writeFileSync(tmpIn, buffer); } catch (e) { return reject(e); }

        const ff = spawn('ffmpeg', [
            '-y', '-i', tmpIn,
            '-vf', 'scale=600:600:force_original_aspect_ratio=increase,crop=600:600',
            '-q:v', '5',
            tmpOut
        ]);

        const timer = setTimeout(() => {
            ff.kill('SIGKILL');
            try { fs.unlinkSync(tmpIn); } catch {}
            reject(new Error('Resize gambar timeout'));
        }, 15000);

        ff.on('close', (code) => {
            clearTimeout(timer);
            try { fs.unlinkSync(tmpIn); } catch {}
            if (code !== 0) {
                try { fs.unlinkSync(tmpOut); } catch {}
                return reject(new Error('FFmpeg gagal resize cover'));
            }
            try {
                const buf = fs.readFileSync(tmpOut);
                fs.unlinkSync(tmpOut);
                resolve(buf);
            } catch (e) { reject(e); }
        });
        ff.on('error', (e) => { clearTimeout(timer); reject(e); });
    });
}

function svgToPng(svgString) {
    return new Promise((resolve, reject) => {
        const tmpSvg = path.join(TMP_DIR, `apple_${Date.now()}.svg`);
        const tmpPng = path.join(TMP_DIR, `apple_${Date.now()}.png`);
        try { fs.writeFileSync(tmpSvg, svgString); } catch (err) { return reject(new Error('Gagal menulis SVG')); }
        
        const ff = spawn('ffmpeg', ['-y', '-i', tmpSvg, '-frames:v', '1', tmpPng]);
        
        const timer = setTimeout(() => {
            ff.kill('SIGKILL');
            try { fs.unlinkSync(tmpSvg); } catch {}
            reject(new Error('FFmpeg render SVG terlalu lama'));
        }, 25000);

        ff.on('close', (code) => {
            clearTimeout(timer);
            try { fs.unlinkSync(tmpSvg); } catch {}
            if (code !== 0) { try { fs.unlinkSync(tmpPng); } catch {} return reject(new Error('FFmpeg gagal convert')); }
            try { const buf = fs.readFileSync(tmpPng); fs.unlinkSync(tmpPng); resolve(buf); } catch (err) { reject(err); }
        });
        ff.on('error', (e) => { clearTimeout(timer); reject(e); });
    });
}

export default {
    command: ['applemusic-canvas', 'applemusic', 'applecanvas'],
    category: 'maker',
    execute: async (denn, m, { prefix, command, text }) => {
        const isQuoted = !!m.quoted;
        const msg = isQuoted ? (m.quoted.msg || m.quoted) : m.msg;
        const mtype = isQuoted ? m.quoted.mtype : m.mtype;

        let mediaMime = msg?.mimetype || '';
        if (!mediaMime && mtype === 'imageMessage') mediaMime = 'image/jpeg';

        if (!/image/.test(mediaMime) || !text || !text.includes('|')) {
            return sendFakeQuoted(denn, m, 
                `🎵 *APPLE MUSIC CANVAS*\n\n` +
                `Buat desain pemutar lagu Apple Music dari gambarmu!\n\n` +
                `*Format:* ${prefix + command} <judul lagu>|<artis>\n\n` +
                `*Contoh:* ${prefix + command} Glimpse of Us|Joji\n\n` +
                `_Kirim/reply gambar dengan caption di atas._`,
                { title: 'Apple Music Canvas', body: 'Kirim gambar + judul|artis' }
            );
        }

        const [title, artist] = text.split('|').map(s => s.trim());
        if (!title || !artist) {
            return sendFakeQuoted(denn, m, '❌ Format salah. Gunakan: judul|artis', {
                title: 'Format Salah', body: 'Contoh: Glimpse of Us|Joji'
            });
        }

        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Membuat Apple Music Canvas...', {
            title: 'Apple Music Canvas', body: 'Memproses via FFmpeg...'
        }).catch(() => null);

        try {
            // 1. Download buffer gambar asli
            const stream = await downloadContentFromMessage(msg, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            if (!buffer || buffer.length < 100) {
                throw new Error('Gagal mengunduh gambar cover');
            }

            console.log('[AppleMusic] Resizing cover...');
            const resizedBuffer = await resizeCover(buffer);
            const base64Image = resizedBuffer.toString('base64');
            const imageDataUri = `data:image/jpeg;base64,${base64Image}`;

            const displayTitle = escapeXml(title.length > 30 ? title.slice(0, 30) + '...' : title);
            const displayArtist = escapeXml(artist.length > 30 ? artist.slice(0, 30) + '...' : artist);

            let titleSize = 34;
            if (displayTitle.length > 20) titleSize = 28;
            if (displayTitle.length > 26) titleSize = 24;

            const svg = `
            <svg width="720" height="1280" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#1c1c1e" stop-opacity="0.3"/>
                        <stop offset="40%" stop-color="#0a0a0a" stop-opacity="0.85"/>
                        <stop offset="100%" stop-color="#000000" stop-opacity="1"/>
                    </linearGradient>
                    <clipPath id="coverClip">
                        <rect x="-240" y="-240" width="480" height="480" rx="18"/>
                    </clipPath>
                </defs>
                
                <rect width="720" height="1280" fill="#000000"/>
                <image href="${imageDataUri}" x="0" y="0" width="720" height="720" preserveAspectRatio="xMidYMid slice" opacity="0.45"/>
                <rect width="720" height="1280" fill="url(#bgGrad)"/>
                
                <text x="360" y="80" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#FFFFFF" text-anchor="middle" font-weight="600" opacity="0.6" letter-spacing="4">N O W   P L A Y I N G</text>
                
                <g transform="translate(360, 400)">
                    <rect x="-235" y="-235" width="480" height="480" rx="18" fill="#000000" opacity="0.5"/>
                    <image href="${imageDataUri}" x="-240" y="-240" width="480" height="480" preserveAspectRatio="xMidYMid slice" clip-path="url(#coverClip)"/>
                </g>
                
                <text x="360" y="760" font-family="Arial, Helvetica, sans-serif" font-size="${titleSize}" fill="#FFFFFF" text-anchor="middle" font-weight="700">${displayTitle}</text>
                <text x="360" y="805" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#FF2D55" text-anchor="middle" font-weight="500">${displayArtist}</text>
                
                <g transform="translate(360, 870)">
                    <rect x="-300" y="0" width="600" height="5" rx="2.5" fill="#333333"/>
                    <rect x="-300" y="0" width="180" height="5" rx="2.5" fill="#FFFFFF"/>
                    <circle cx="-120" cy="2.5" r="7" fill="#FFFFFF"/>
                </g>
                
                <text x="60" y="898" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#888888">1:24</text>
                <text x="660" y="898" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#888888" text-anchor="end">-2:35</text>
                
                <g transform="translate(360, 990)">
                    <g transform="translate(-240, 0)">
                        <path d="M -15 -6 L -6 -6 L 6 6 L 15 6" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
                        <path d="M 10 1 L 15 6 L 10 11" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M -15 6 L -6 6" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
                    </g>
                    
                    <g transform="translate(-140, 0)">
                        <rect x="-13" y="-14" width="4" height="28" rx="2" fill="#FFFFFF"/>
                        <path d="M 15 -14 L -9 0 L 15 14 Z" fill="#FFFFFF"/>
                    </g>
                    
                    <g transform="translate(0, 0)">
                        <circle r="42" fill="#FFFFFF"/>
                        <path d="M -11 -16 L 17 0 L -11 16 Z" fill="#000000"/>
                    </g>
                    
                    <g transform="translate(140, 0)">
                        <rect x="9" y="-14" width="4" height="28" rx="2" fill="#FFFFFF"/>
                        <path d="M -15 -14 L 9 0 L -15 14 Z" fill="#FFFFFF"/>
                    </g>
                    
                    <g transform="translate(240, 0)">
                        <path d="M -14 -6 Q -14 -12 -8 -12 L 8 -12" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
                        <path d="M 5 -17 L 11 -12 L 5 -7" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M 14 6 Q 14 12 8 12 L -8 12" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
                        <path d="M -5 17 L -11 12 L -5 7" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </g>
                </g>
                
                <g transform="translate(360, 1130)">
                    <rect x="-200" y="-2" width="400" height="4" rx="2" fill="#333333"/>
                    <rect x="-200" y="-2" width="280" height="4" rx="2" fill="#FFFFFF"/>
                    <g transform="translate(-215, 0)">
                        <path d="M -6 -5 L -6 5 L -2 5 L 4 10 L 4 -10 L -2 -5 Z" fill="#666666"/>
                    </g>
                    <g transform="translate(215, 0)">
                        <path d="M -4 -5 L -4 5 L 0 5 L 6 10 L 6 -10 L 0 -5 Z" fill="#FFFFFF"/>
                        <path d="M 8 -3 Q 11 0 8 3" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
                        <path d="M 10 -6 Q 15 0 10 6" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
                    </g>
                </g>
                
                <text x="360" y="1225" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#666666" text-anchor="middle" letter-spacing="3">APPLE MUSIC</text>
            </svg>`;

            console.log('[AppleMusic] Rendering SVG to PNG...');
            const imageBuffer = await svgToPng(svg);

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            await denn.sendMessage(m.chat, {
                image: imageBuffer,
                caption: `🎵 *APPLE MUSIC CANVAS*\n\n` +
                         `🎶 *Judul:* ${title}\n` +
                         `🎤 *Artis:* ${artist}\n\n` +
                         `_Request by: ${m.pushName || 'User'}_`
            }, { quoted: m });

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            console.error('[AppleMusic Error]', e.message);
            sendFakeQuoted(denn, m, `❌ Gagal membuat Apple Music Canvas:\n${e.message}`, {
                title: 'Apple Music Gagal', body: 'Terjadi kesalahan pada server'
            });
        }
    }
};