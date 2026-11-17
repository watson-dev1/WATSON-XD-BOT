import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import googleTTS from 'google-tts-api';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const TMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// Helper: Konversi MP3 ke OGG/Opus (Voice Note) via FFmpeg
function convertToOpus(inputBuffer) {
    return new Promise((resolve, reject) => {
        const tmpIn = path.join(TMP_DIR, `tts_in_${Date.now()}.mp3`);
        const tmpOut = path.join(TMP_DIR, `tts_out_${Date.now()}.ogg`);
        
        try { fs.writeFileSync(tmpIn, inputBuffer); } catch (err) { return reject(new Error('Gagal membuat file temp')); }

        const ff = spawn('ffmpeg', [
            '-y', 
            '-i', tmpIn,
            '-c:a', 'libopus',
            '-b:a', '64k',
            tmpOut
        ]);

        ff.on('close', (code) => {
            try { fs.unlinkSync(tmpIn); } catch {}
            if (code !== 0) {
                try { fs.unlinkSync(tmpOut); } catch {}
                return reject(new Error('FFmpeg gagal convert audio ke Opus'));
            }
            try {
                const buf = fs.readFileSync(tmpOut);
                fs.unlinkSync(tmpOut);
                resolve(buf);
            } catch (err) { reject(err); }
        });
        ff.on('error', reject);
    });
}

export default {
    command: ['tts', 'audiotext'],
    category: 'tools',
    execute: async (denn, m, { prefix, command, text }) => {
        if (!text) {
            return sendFakeQuoted(denn, m, `Format salah!\n\nContoh: ${prefix + command} halo apa kabar`, {
                title: 'TTS Maker', body: 'Masukkan teks yang ingin diubah jadi suara'
            });
        }

        const wait = await sendFakeQuoted(denn, m, global.msg?.wait || '⏳ Memproses suara...', {
            title: 'TTS Maker', body: 'Mengonversi teks ke Voice Note...'
        }).catch(() => null);

        try {
            // 1. Ambil URL Audio dari Google TTS
            const url = googleTTS.getAudioUrl(text, {
                lang: 'id',
                slow: false,
                host: 'https://translate.google.com',
            });

            // 2. Download audio ke Buffer (menggunakan Axios)
            const res = await axios.get(url, { 
                responseType: 'arraybuffer', 
                timeout: 15000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const mp3Buffer = Buffer.from(res.data || []);

            if (mp3Buffer.length < 100) {
                throw new Error('Gagal mengunduh audio dari Google TTS.');
            }

            // 3. Konversi MP3 ke OGG (Opus) via FFmpeg
            const opusBuffer = await convertToOpus(mp3Buffer);

            // 4. Hapus pesan loading dan kirim Voice Note
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }

            await denn.sendMessage(m.chat, {
                audio: opusBuffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true // Mengirim sebagai Voice Note (VN)
            }, { quoted: m });

        } catch (e) {
            if (wait?.key?.id) {
                try { await denn.sendMessage(m.chat, { delete: wait.key }); } catch (_) {}
            }
            console.error('[TTS Error]', e.message);
            sendFakeQuoted(denn, m, `❌ Gagal TTS:\n${e.message}`, {
                title: 'TTS Gagal', body: 'Terjadi kesalahan saat memproses audio'
            });
        }
    }
};