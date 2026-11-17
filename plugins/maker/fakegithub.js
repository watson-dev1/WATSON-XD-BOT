import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const TMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function svgToPng(svgString) {
    return new Promise((resolve, reject) => {
        const tmpSvg = path.join(TMP_DIR, `fakegh_${Date.now()}.svg`);
        const tmpPng = path.join(TMP_DIR, `fakegh_${Date.now()}.png`);
        
        try { fs.writeFileSync(tmpSvg, svgString); } 
        catch (err) { return reject(new Error('Gagal menulis file SVG')); }

        const ff = spawn('ffmpeg', [
            '-y',
            '-i', tmpSvg,
            '-frames:v', '1',
            tmpPng
        ]);

        ff.on('close', (code) => {
            try { fs.unlinkSync(tmpSvg); } catch {}
            if (code !== 0) {
                try { fs.unlinkSync(tmpPng); } catch {}
                return reject(new Error('FFmpeg gagal mengonversi SVG ke PNG'));
            }
            try {
                const buf = fs.readFileSync(tmpPng);
                fs.unlinkSync(tmpPng);
                resolve(buf);
            } catch (err) { reject(err); }
        });
        ff.on('error', reject);
    });
}

export default {
    command: ['fakegithub', 'fakegh'],
    category: 'maker',
    execute: async (denn, m, { prefix, command, text }) => {
        if (!text || !text.includes('|')) {
            return sendFakeQuoted(denn, m, 
                `🐦 *FAKE GITHUB PROFILE MAKER*\n\n` +
                `*Format:* ${prefix + command} <username>|<nama>|<repos>|<followers>\n\n` +
                `*Contoh:*\n` +
                `• \`${prefix + command} denncode|DennCode|15|1000\`\n` +
                `• \`${prefix + command} lumnztyz6x|Lumnz Tyz|42|5M\``,
                { title: 'Fake GitHub', body: 'Buat screenshot profil GitHub palsu' }
            );
        }

        const parts = text.split('|').map(v => v.trim());
        const username = parts[0] || 'github';
        const name = parts[1] || username;
        const repos = parts[2] || '0';
        const followers = parts[3] || '0';
        const initial = username.charAt(0).toUpperCase();

        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Membuat profil...', {
            title: 'Fake GitHub', body: 'Memproses gambar via FFmpeg...'
        }).catch(() => null);

        try {
            const svg = `
            <svg width="600" height="320" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#0d1117" />
                
                <!-- Header Profil -->
                <rect x="20" y="20" width="560" height="280" rx="10" fill="#161b22" stroke="#30363d" stroke-width="1"/>
                
                <!-- Avatar (Lingkaran) -->
                <circle cx="80" cy="80" r="40" fill="#1f2937" stroke="#30363d" stroke-width="2"/>
                <text x="80" y="95" font-family="Arial" font-size="40" fill="#ffffff" text-anchor="middle" font-weight="bold">${initial}</text>
                
                <!-- Nama & Username -->
                <text x="140" y="70" font-family="Arial" font-size="24" fill="#ffffff" font-weight="bold">${name}</text>
                <text x="140" y="95" font-family="Arial" font-size="18" fill="#8b949e">@${username}</text>
                
                <!-- Bio -->
                <text x="140" y="130" font-family="Arial" font-size="14" fill="#c9d1d9">Passionate Developer &amp; Creator. Building things for the web.</text>
                
                <!-- Stats -->
                <text x="140" y="170" font-family="Arial" font-size="14" fill="#c9d1d9">📦 <tspan fill="#ffffff" font-weight="bold">${repos}</tspan> Repositories</text>
                <text x="280" y="170" font-family="Arial" font-size="14" fill="#c9d1d9">👥 <tspan fill="#ffffff" font-weight="bold">${followers}</tspan> Followers</text>
                
                <!-- Garis Pemisah -->
                <line x1="20" y1="200" x2="580" y2="200" stroke="#30363d" stroke-width="1" />
                
                <!-- Kotak Pinned Repo 1 -->
                <rect x="40" y="220" width="240" height="60" rx="6" fill="#0d1117" stroke="#30363d" stroke-width="1" />
                <text x="55" y="245" font-family="Arial" font-size="14" fill="#58a6ff" font-weight="bold">📘 awesome-project</text>
                <text x="55" y="265" font-family="Arial" font-size="12" fill="#8b949e">A really cool open source project.</text>
                
                <!-- Kotak Pinned Repo 2 -->
                <rect x="320" y="220" width="240" height="60" rx="6" fill="#0d1117" stroke="#30363d" stroke-width="1" />
                <text x="335" y="245" font-family="Arial" font-size="14" fill="#58a6ff" font-weight="bold">⚡ fast-scripts</text>
                <text x="335" y="265" font-family="Arial" font-size="12" fill="#8b949e">Lightning fast automation scripts.</text>
            </svg>`;

            const imageBuffer = await svgToPng(svg);

            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            await denn.sendMessage(m.chat, {
                image: imageBuffer,
                caption: `🐦 *FAKE GITHUB BERHASIL*\n\n` +
                         `👤 *Username:* @${username}\n` +
                         `🏷️ *Nama:* ${name}\n` +
                         `📦 *Repos:* ${repos}\n` +
                         `👥 *Followers:* ${followers}\n\n` +
                         `_Request by: ${m.pushName || 'User'}_`
            }, { quoted: m });

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            console.error('[FakeGitHub Error]', e.message);
            sendFakeQuoted(denn, m, `❌ Gagal membuat Fake GitHub via FFmpeg:\n${e.message}`, {
                title: 'Fake GitHub Gagal', body: 'Pastikan FFmpeg support SVG'
            });
        }
    }
};