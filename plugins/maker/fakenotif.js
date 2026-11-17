import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';
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

function svgToPng(svgString) {
    return new Promise((resolve, reject) => {
        const tmpSvg = path.join(TMP_DIR, `notif_${Date.now()}.svg`);
        const tmpPng = path.join(TMP_DIR, `notif_${Date.now()}.png`);
        try { fs.writeFileSync(tmpSvg, svgString); } catch (err) { return reject(new Error('Gagal menulis SVG')); }
        const ff = spawn('ffmpeg', ['-y', '-i', tmpSvg, '-frames:v', '1', tmpPng]);
        ff.on('close', (code) => {
            try { fs.unlinkSync(tmpSvg); } catch {}
            if (code !== 0) { try { fs.unlinkSync(tmpPng); } catch {} return reject(new Error('FFmpeg gagal convert')); }
            try { const buf = fs.readFileSync(tmpPng); fs.unlinkSync(tmpPng); resolve(buf); } catch (err) { reject(err); }
        });
        ff.on('error', reject);
    });
}

export default {
    command: ['fakenotif', 'fakenotification'],
    category: 'maker',
    execute: async (denn, m, { prefix, command, text }) => {
        if (!text || !text.includes('|')) {
            return sendFakeQuoted(denn, m, 
                `📱 *FAKE NOTIFICATION MAKER*\n\n` +
                `*Format:* ${prefix + command} <aplikasi>|<pengirim>|<pesan>\n\n` +
                `*Pilihan Aplikasi:* wa, ig, tg, atau bebas\n\n` +
                `*Contoh:*\n` +
                `• \`${prefix + command} wa|DennCode|Halo, lagi dimana?\`\n` +
                `• \`${prefix + command} ig|Ayang|Aku kangen kamu\``,
                { title: 'Fake Notification', body: 'Buat screenshot notifikasi palsu' }
            );
        }

        const parts = text.split('|').map(v => v.trim());
        const appName = parts[0] ? parts[0].toLowerCase() : 'wa';
        const sender = parts[1] || 'Pengirim';
        const message = parts[2] || 'Pesan notifikasi...';

        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Membuat notifikasi...', {
            title: 'Fake Notification', body: 'Memproses...'
        }).catch(() => null);

        try {
            let buffer = null;
            const apiKey = global.jereApiKey;
            const baseUrl = global.jereBaseUrl;

            if (apiKey && baseUrl) {
                try {
                    const res = await axios.get(`${baseUrl}/api/maker/fakenotif`, {
                        params: { apikey: apiKey, app: appName, sender: sender, message: message },
                        responseType: 'arraybuffer',
                        timeout: 15000,
                        validateStatus: () => true
                    });
                    if (res.status === 200 && res.data.length > 100) {
                        buffer = Buffer.from(res.data);
                    }
                } catch (e) {}
            }

            if (!buffer) {
                let appDisplayName = 'WhatsApp';
                let iconSvg = '';

                if (appName === 'wa' || appName === 'whatsapp') {
                    appDisplayName = 'WhatsApp';
                    iconSvg = `
                    <svg x="40" y="122" width="42" height="42" viewBox="0 0 24 24">
                        <rect width="24" height="24" rx="5.5" fill="#25D366" />
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.76.46 3.42 1.27 4.85L2 22l5.15-1.27C8.58 21.54 10.24 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.54 0-2.98-.43-4.23-1.18l-.3-.18-3.12.77.77-3.12-.18-.3C4.43 14.98 4 13.54 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" fill="#fff"/>
                        <path d="M16.5 13.5c-.28-.14-1.65-.81-1.9-.9-.25-.09-.43-.14-.61.14-.18.28-.7.9-.86 1.08-.16.18-.32.2-.6.06-.28-.14-1.18-.44-2.25-1.39-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.32.42-.48.14-.16.18-.28.28-.46.09-.18.05-.34-.02-.48-.07-.14-.61-1.48-.84-2.02-.22-.53-.44-.46-.61-.47-.16-.01-.35-.01-.54-.01-.19 0-.5.07-.76.35-.26.28-1 0-1 1.25s1.02 2.45 1.16 2.64c.14.19 2.01 3.07 4.87 4.3.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.65-.67 1.88-1.32.23-.65.23-1.21.16-1.32-.07-.11-.25-.18-.53-.32z" fill="#fff"/>
                    </svg>`;
                } else if (appName === 'ig' || appName === 'instagram') {
                    appDisplayName = 'Instagram';
                    iconSvg = `
                    <svg x="40" y="122" width="42" height="42" viewBox="0 0 24 24">
                        <rect width="24" height="24" rx="5.5" fill="#E1306C" />
                        <rect x="4" y="4" width="16" height="16" rx="4.5" fill="none" stroke="#fff" stroke-width="1.8"/>
                        <circle cx="12" cy="12" r="3.5" fill="none" stroke="#fff" stroke-width="1.8"/>
                        <circle cx="17" cy="7" r="1.2" fill="#fff"/>
                    </svg>`;
                } else if (appName === 'tg' || appName === 'telegram') {
                    appDisplayName = 'Telegram';
                    iconSvg = `
                    <svg x="40" y="122" width="42" height="42" viewBox="0 0 24 24">
                        <rect width="24" height="24" rx="5.5" fill="#0088cc" />
                        <path d="M18.5 5.5L4.5 11c-.8.3-.8.9-.1 1.1l3.4 1.1 1.3 4c.1.4.3.4.6.2l1.9-1.4 3.8 2.8c.7.4 1.2.2 1.4-.6l2.5-11.9c.2-.9-.3-1.3-1.3-.8z" fill="#fff"/>
                    </svg>`;
                } else {
                    appDisplayName = escapeXml(parts[0]);
                    iconSvg = `
                    <svg x="40" y="122" width="42" height="42" viewBox="0 0 24 24">
                        <rect width="24" height="24" rx="5.5" fill="#555555" />
                        <rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="#fff" stroke-width="1.5"/>
                        <circle cx="12" cy="12" r="3" fill="#fff"/>
                    </svg>`;
                }

                let displayMessage = escapeXml(message);
                if (displayMessage.length > 35) displayMessage = displayMessage.substring(0, 35) + '...';
                const displaySender = escapeXml(sender);
                
                const currentTime = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace(/\./g, ':');

                const svg = `
                <svg width="600" height="300" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="#000000" />
                    <circle cx="300" cy="150" r="300" fill="#1c1c1e" opacity="0.5" />
                    
                    <rect x="25" y="100" width="550" height="86" rx="22" fill="#1c1c1e" stroke="#2c2c2e" stroke-width="1"/>
                    
                    ${iconSvg}
                    
                    <text x="98" y="132" font-family="Arial" font-size="13" fill="#8e8e93" font-weight="bold">${appDisplayName}</text>
                    <text x="555" y="132" font-family="Arial" font-size="13" fill="#8e8e93" text-anchor="end">${currentTime}</text>
                    
                    <text x="98" y="153" font-family="Arial" font-size="15" fill="#ffffff" font-weight="bold">${displaySender}</text>
                    
                    <text x="98" y="171" font-family="Arial" font-size="15" fill="#ffffff">${displayMessage}</text>
                </svg>`;
                buffer = await svgToPng(svg);
            }

            if (wait?.key?.id) try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}

            await denn.sendMessage(m.chat, {
                image: buffer,
                caption: `📱 *FAKE NOTIFIKASI BERHASIL*\n\n` +
                         `📱 *App:* ${appName.toUpperCase()}\n` +
                         `👤 *Pengirim:* ${sender}\n` +
                         `💬 *Pesan:* ${message}\n\n` +
                         `_Request by: ${m.pushName || 'User'}_`
            }, { quoted: m });

        } catch (e) {
            if (wait?.key?.id) try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            console.error('[FakeNotif Error]', e.message);
            sendFakeQuoted(denn, m, `❌ Gagal membuat Fake Notifikasi:\n${e.message}`, {
                title: 'Fake Notifikasi Gagal', body: 'API dan FFmpeg gagal'
            });
        }
    }
};