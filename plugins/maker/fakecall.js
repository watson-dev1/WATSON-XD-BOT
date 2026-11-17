/**
‎✧ Name   : fake call ios
‎✧ Creator   : Rin imup/princes
‎✧ Category : maker
‎✧ sumber : https://whatsapp.com/channel/0029Vb6EHtR5Ui2gHMW9zX2x
‎✧ Remake : DennCode
‎✧ *Note* : Jangan hapus wm ya kalo hapus liat aja permainan nya pasti lu nyesel😘,kalo masih kurang bagus sesuikan lagi ya udah support emoji apple
‎**/

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';
import { downloadContentFromMessage } from '@rexxhayanasi/elaina-baileys';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const TMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const TEMPLATE_URL = 'https://raw.githubusercontent.com/ryyntwx/allimagerin/refs/heads/main/353dc125-a39c-4d27-9ba5-9ec7dfa6624a.png';

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

async function downloadBuffer(url) {
    const res = await axios.get(url, { 
        responseType: 'arraybuffer', 
        timeout: 20000, 
        headers: { 'User-Agent': 'Mozilla/5.0' } 
    });
    return Buffer.from(res.data);
}

function getImageDimensions(filePath) {
    return new Promise((resolve) => {
        const ff = spawn('ffprobe', [
            '-v', 'error', '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height',
            '-of', 'csv=p=0', filePath
        ]);
        let out = '';
        ff.stdout.on('data', d => out += d.toString());
        ff.on('close', (code) => {
            if (code !== 0) return resolve(null);
            const [w, h] = out.trim().split(',').map(Number);
            if (!w || !h) return resolve(null);
            resolve({ width: w, height: h });
        });
        ff.on('error', () => resolve(null));
    });
}

function resizeSquare(buffer, size = 400) {
    return new Promise((resolve, reject) => {
        const tmpIn = path.join(TMP_DIR, `fc_in_${Date.now()}.jpg`);
        const tmpOut = path.join(TMP_DIR, `fc_out_${Date.now()}.jpg`);
        try { fs.writeFileSync(tmpIn, buffer); } catch (e) { return reject(e); }
        const ff = spawn('ffmpeg', [
            '-y', '-i', tmpIn,
            '-vf', `scale=${size}:${size}:force_original_aspect_ratio=increase,crop=${size}:${size}`,
            '-q:v', '5', tmpOut
        ]);
        const timer = setTimeout(() => { ff.kill('SIGKILL'); try { fs.unlinkSync(tmpIn); } catch {} reject(new Error('Resize timeout')); }, 15000);
        ff.on('close', (code) => {
            clearTimeout(timer);
            try { fs.unlinkSync(tmpIn); } catch {}
            if (code !== 0) { try { fs.unlinkSync(tmpOut); } catch {} return reject(new Error('Resize gagal')); }
            try { const buf = fs.readFileSync(tmpOut); fs.unlinkSync(tmpOut); resolve(buf); } catch (e) { reject(e); }
        });
        ff.on('error', (e) => { clearTimeout(timer); reject(e); });
    });
}

function svgToPng(svgString) {
    return new Promise((resolve, reject) => {
        const tmpSvg = path.join(TMP_DIR, `fc_svg_${Date.now()}.svg`);
        const tmpPng = path.join(TMP_DIR, `fc_png_${Date.now()}.png`);
        try { fs.writeFileSync(tmpSvg, svgString); } catch (e) { return reject(e); }
        const ff = spawn('ffmpeg', ['-y', '-i', tmpSvg, '-frames:v', '1', tmpPng]);
        const timer = setTimeout(() => { ff.kill('SIGKILL'); try { fs.unlinkSync(tmpSvg); } catch {} reject(new Error('Render timeout')); }, 25000);
        ff.on('close', (code) => {
            clearTimeout(timer);
            try { fs.unlinkSync(tmpSvg); } catch {}
            if (code !== 0) { try { fs.unlinkSync(tmpPng); } catch {} return reject(new Error('Render gagal')); }
            try { const buf = fs.readFileSync(tmpPng); fs.unlinkSync(tmpPng); resolve(buf); } catch (e) { reject(e); }
        });
        ff.on('error', (e) => { clearTimeout(timer); reject(e); });
    });
}

export default {
    command: ['fakecall', 'fakecallios'],
    category: 'maker',
    execute: async (denn, m, { prefix, command, text }) => {
        const isQuoted = !!m.quoted;
        const msg = isQuoted ? (m.quoted.msg || m.quoted) : m.msg;
        const mtype = isQuoted ? m.quoted.mtype : m.mtype;
        let mediaMime = msg?.mimetype || '';
        if (!mediaMime && mtype === 'imageMessage') mediaMime = 'image/jpeg';

        if (!/image/.test(mediaMime)) {
            return sendFakeQuoted(denn, m, 
                `📞 *FAKE CALL iOS*\n\n` +
                `*Format:* ${prefix}${command} Nama | Durasi\n\n` +
                `*Contoh:* ${prefix}${command} my heart | 01:00:39\n\n` +
                `_Kirim/reply foto dengan caption di atas._`,
                { title: 'Fake Call iOS', body: 'Wajib kirim/reply foto' }
            );
        }

        if (!text || !text.includes('|')) {
            return sendFakeQuoted(denn, m, 
                `Format salah!\n\nContoh:\n${prefix}${command} my heart | 01:00:39`, 
                { title: 'Fake Call iOS', body: 'Gunakan: nama | durasi' }
            );
        }

        const [namaPayload, durasiPayload] = text.split('|');
        if (!namaPayload?.trim() || !durasiPayload?.trim()) {
            return sendFakeQuoted(denn, m, 'Format salah! Pastikan nama & durasi diisi.', { 
                title: 'Fake Call', body: 'nama | durasi' 
            });
        }

        const nama = escapeXml(namaPayload.trim());
        const durasi = escapeXml(durasiPayload.trim());

        const wait = await sendFakeQuoted(denn, m, '⏳ Membuat fake call iOS...', { 
            title: 'Fake Call iOS', body: 'Memproses via FFmpeg...' 
        }).catch(() => null);

        try {
            const stream = await downloadContentFromMessage(msg, 'image');
            let userBuf = Buffer.from([]);
            for await (const chunk of stream) userBuf = Buffer.concat([userBuf, chunk]);
            if (!userBuf || userBuf.length < 100) throw new Error('Gagal unduh gambar user');

            const resizedUser = await resizeSquare(userBuf, 400);
            const templateBuf = await downloadBuffer(TEMPLATE_URL);
            
            const tmpTemplate = path.join(TMP_DIR, `tpl_${Date.now()}.png`);
            fs.writeFileSync(tmpTemplate, templateBuf);
            const dims = await getImageDimensions(tmpTemplate) || { width: 1080, height: 1920 };
            try { fs.unlinkSync(tmpTemplate); } catch {}

            const W = dims.width;
            const H = dims.height;

            const userB64 = resizedUser.toString('base64');
            const templateB64 = templateBuf.toString('base64');

            const nameY = Math.round(H * 0.075);
            const durY = Math.round(H * 0.135);
            const nameSize = Math.round(H * 0.042);
            const durSize = Math.round(H * 0.033);
            const ppX = W / 2;
            const ppY = H * 0.50;
            const ppR = W * 0.22;

            const svg = `
            <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <clipPath id="ppClip">
                        <circle cx="${ppX}" cy="${ppY}" r="${ppR}"/>
                    </clipPath>
                </defs>
                <image href="data:image/png;base64,${templateB64}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
                <image href="data:image/jpeg;base64,${userB64}" x="${ppX - ppR}" y="${ppY - ppR}" width="${ppR * 2}" height="${ppR * 2}" clip-path="url(#ppClip)" preserveAspectRatio="xMidYMid slice"/>
                <text x="${W/2}" y="${nameY}" font-family="Arial, Helvetica, sans-serif" font-size="${nameSize}" fill="#FFFFFF" text-anchor="middle" font-weight="700" dominant-baseline="hanging">${nama}</text>
                <text x="${W/2}" y="${durY}" font-family="Arial, Helvetica, sans-serif" font-size="${durSize}" fill="#C5C5C5" text-anchor="middle" font-weight="400" dominant-baseline="hanging">${durasi}</text>
            </svg>`;

            const imageBuffer = await svgToPng(svg);

            if (wait?.key?.id) try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}

            await denn.sendMessage(m.chat, {
                image: imageBuffer,
                caption: `📞 *FAKE CALL iOS BERHASIL*\n\n` +
                         `👤 *Nama:* ${nama}\n` +
                         `⏱️ *Durasi:* ${durasi}\n\n` +
                         `_Request by: ${m.pushName || 'User'}_`
            }, { quoted: m });

        } catch (e) {
            if (wait?.key?.id) try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            console.error('[FakeCall Error]', e.message);
            sendFakeQuoted(denn, m, `❌ Gagal membuat Fake Call:\n${e.message}`, { 
                title: 'Fake Call Gagal', body: 'Coba lagi nanti' 
            });
        }
    }
};