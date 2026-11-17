import os from 'os';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { spawn } from 'child_process';
import { clockString, formatSize } from '../../lib/helper.js';

const TMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// ─── Helper: Proses gambar jadi thumbnail JPG square 300x300 (Anti Blank) ───
function processThumbnail(buffer, size = 300) {
  return new Promise((resolve) => {
    if (!buffer || buffer.length < 100) return resolve(null);
    
    const tmpIn = path.join(TMP_DIR, `thumb_in_${Date.now()}.jpg`);
    const tmpOut = path.join(TMP_DIR, `thumb_out_${Date.now()}.jpg`);
    
    try { fs.writeFileSync(tmpIn, buffer); } catch { return resolve(buffer); }

    const ff = spawn('ffmpeg', [
      '-y', '-i', tmpIn,
      '-vf', `crop='min(iw,ih)':'min(iw,ih)',scale=${size}:${size}:flags=lanczos`,
      '-q:v', '5',
      '-frames:v', '1',
      '-f', 'mjpeg',
      tmpOut
    ]);

    ff.on('close', (code) => {
      try { fs.unlinkSync(tmpIn); } catch {}
      if (code !== 0) {
        try { fs.unlinkSync(tmpOut); } catch {}
        return resolve(null);
      }
      try {
        const out = fs.readFileSync(tmpOut);
        fs.unlinkSync(tmpOut);
        if (out.length < 5000 || out.length > 150 * 1024) return resolve(null);
        if (out[0] !== 0xFF || out[1] !== 0xD8) return resolve(null); // Validasi JPG
        resolve(out);
      } catch { resolve(null); }
    });

    ff.on('error', () => {
      try { fs.unlinkSync(tmpIn); } catch {}
      resolve(null);
    });
  });
}

// ─── Helper: Baca gambar dari file lokal atau URL ───
async function getImageBuffer(source) {
  if (!source) return null;
  try {
    if (typeof source === 'string' && !source.startsWith('http')) {
      const fullPath = path.resolve(process.cwd(), source);
      if (fs.existsSync(fullPath)) return fs.readFileSync(fullPath);
    }
    if (typeof source === 'string' && source.startsWith('http')) {
      const res = await axios.get(source, { 
        responseType: 'arraybuffer', 
        timeout: 10000,
        maxContentLength: 5 * 1024 * 1024,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const buf = Buffer.from(res.data || []);
      return buf.length > 100 ? buf : null;
    }
  } catch (e) {
    console.error('[Menu Image Error]', e.message);
  }
  return null;
}

function getTimeInZone(timeZone) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(new Date()).replace(/\./g, ':');
  } catch {
    return '--:--:--';
  }
}

export default {
  command: ['menu', 'help'],
  category: 'main',
  execute: async (denn, m, { prefix, isOwner, text }) => {
    const uptime = clockString(process.uptime() * 1000);
    const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const totalFitur = global.plugins ? global.plugins.size : 0;
    const ram = `${formatSize(os.totalmem() - os.freemem())} / ${formatSize(os.totalmem())}`;
    const platform = os.platform();
    const status = isOwner ? '👑 Owner' : '👤 User';

    const jamWIB  = getTimeInZone('Asia/Jakarta');
    const jamWITA = getTimeInZone('Asia/Makassar');
    const jamWIT  = getTimeInZone('Asia/Jayapura');

    // Kelompokkan plugin
    const categorized = {};
    if (global.plugins) {
      global.plugins.forEach((plugin) => {
        if (!plugin || !plugin.command) return;
        if (plugin.category === 'hidden') return;
        const cat = (plugin.category || 'other').toLowerCase();
        const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
        const validCmds = cmds.filter(c => typeof c === 'string' && c.trim() !== '');
        if (validCmds.length === 0) return;
        const mainCmd = validCmds[0];
        if (!categorized[cat]) categorized[cat] = new Set();
        categorized[cat].add(mainCmd);
      });
    }

    const categoryOrder = [
  'main', 'anonymous', 'ai', 'downloader', 'tools', 'group', 'stalker', 
  'rpg', 'fun', 'game', 'rich', 'anime', 'islamic', 'info', 'search', 
  'owner', 'panel', 'maker', 'sticker', 'other'
];
    
    const categoryTitles = {
  main: 'MAIN',
  anonymous: 'ANONYMOUS',
  ai: 'AI',
  downloader: 'DOWNLOADER',
  tools: 'TOOLS',
  group: 'GROUP',
  stalker: 'STALKER',
  rpg: 'RPG',
  fun: 'FUN',
  game: 'GAME',
  rich: 'RICH',
  anime: 'ANIME',
  islamic: 'ISLAMIC',
  info: 'INFO',
  search: 'SEARCH',
  owner: 'OWNER',
  panel: 'PANEL',
  maker: 'MAKER',
  sticker: 'STICKER',
  other: 'LAINNYA'
};
    const categoryEmojis = {
      main: '⚙️', anonymous: '🕵️', downloader: '📥', tools: '🛠️', group: '👥',
      stalker: '🔍', rpg: '🎮', fun: '🎉', game: '🕹️', anime: '🌸',
      islamic: '🕌', info: 'ℹ️', search: '🔎', owner: '👑', panel: '💻',
      maker: '🎨', sticker: '🎨', other: '📦'
    };

    let dynamicMenu = '';
    const filterCat = (text || '').trim().toLowerCase();

    // ─── MODE 1: JIKA USER KETIK .menu <KATEGORI> ───
    if (filterCat && categorized[filterCat]) {
      const title = categoryTitles[filterCat] || filterCat.toUpperCase();
      const emoji = categoryEmojis[filterCat] || '📦';
      const sortedCmds = Array.from(categorized[filterCat]).sort();
      
      dynamicMenu = `【 ${emoji} *${title}* 】\n`;
      for (const cmd of sortedCmds) {
        dynamicMenu += `  ◃ ${prefix}${cmd}\n`;
      }
      dynamicMenu += `\n_Total: ${sortedCmds.length} fitur._`;
    } 
    // ─── MODE 2: ERROR JIKA KATEGORI TIDAK ADA ───
    else if (filterCat && !categorized[filterCat]) {
      dynamicMenu = `❌ Kategori *${filterCat}* tidak ditemukan.\n\nSilakan ketik *${prefix}menu* untuk melihat daftar kategori.`;
    } 
    // ─── MODE 3: TAMPILKAN DAFTAR KATEGORI (SIMPLE) ───
    else {
      for (const cat of categoryOrder) {
        if (!categorized[cat] || categorized[cat].size === 0) continue;
        const title = categoryTitles[cat] || cat.toUpperCase();
        const emoji = categoryEmojis[cat] || '📦';
        const count = categorized[cat].size;
        
        dynamicMenu += `【 ${emoji} *${title}* 】 (${count} fitur)\n`;
      }
      dynamicMenu += `\n_Ketik ${prefix}menu <kategori> untuk melihat fitur._\n`;
      dynamicMenu += `_Contoh: ${prefix}menu downloader_`;
    }

    const menuText = `
┌─ [ 👤 *USER INFO* ]
│ ◈ Nama   : ${m.pushName || 'User'}
│ ◈ Status : ${status}
│ ◈ Mode   : ${global.db?.public ? '🌐 PUBLIC' : '🔒 SELF'}
└──────────────

┌─ [ 🖥️ *SISTEM INFO* ]
│ ◈ WIB    : ${jamWIB}
│ ◈ WITA   : ${jamWITA}
│ ◈ WIT    : ${jamWIT}
│ ◈ Tanggal: ${tanggal}
│ ◈ Uptime : ${uptime}
│ ◈ OS     : ${platform}
│ ◈ RAM    : ${ram}
│ ◈ Fitur  : ${totalFitur} Command
└──────────────

${dynamicMenu}

✦ *Powered by ©${global.namaowner}* ✦
`.trim();

    // ─── AMBIL & PROSES GAMBAR ───
    const rawFoto = await getImageBuffer('media/menu.jpg');
    const rawThumb = await getImageBuffer(global.thumbnail);
    
    const thumbBuffer = rawThumb ? await processThumbnail(rawThumb, 300) : null;
    const fotoMenuBuffer = rawFoto;

    // ─── SUSUN PESAN 1 BUBBLE ───
    const msgContent = {
      caption: menuText,
      contextInfo: {
        externalAdReply: {
          title: global.namabot,
          body: `Fitur: ${totalFitur} | Uptime: ${uptime}`,
          sourceUrl: global.linkMenu || "https://whatsapp.com",
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    };

    // Set Foto Utama (media/menu.jpg)
    if (fotoMenuBuffer) {
      msgContent.image = fotoMenuBuffer;
    } else if (global.fotomenu) {
      msgContent.image = { url: global.fotomenu };
    }

    // Set Thumbnail Preview Besar (URL)
    if (thumbBuffer) {
      msgContent.contextInfo.externalAdReply.thumbnail = thumbBuffer;
    } else if (global.thumbnail) {
      msgContent.contextInfo.externalAdReply.thumbnailUrl = global.thumbnail;
    }

    // ─── KIRIM ───
    try {
      await denn.sendMessage(m.chat, msgContent);
    } catch (e) {
      console.error('[Menu Error]', e.message);
      delete msgContent.contextInfo.externalAdReply.thumbnail;
      msgContent.contextInfo.externalAdReply.thumbnailUrl = global.thumbnail;
      try {
        await denn.sendMessage(m.chat, msgContent);
      } catch (_) {
        await denn.sendMessage(m.chat, { text: menuText });
      }
    }
  }
};