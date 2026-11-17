import os from 'os';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { spawn } from 'child_process';
import { clockString, formatSize } from '../../lib/helper.js';
const TMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

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
        if (out[0] !== 0xFF || out[1] !== 0xD8) return resolve(null);
        resolve(out);
      } catch { resolve(null); }
    });

    ff.on('error', () => {
      try { fs.unlinkSync(tmpIn); } catch {}
      resolve(null);
    });
  });
}

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
  command: ['menuall', 'allmenu'],
  category: 'main',
  execute: async (denn, m, { prefix, isOwner }) => {
    const uptime = clockString(process.uptime() * 1000);
    const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const totalFitur = global.plugins ? global.plugins.size : 0;
    const ram = `${formatSize(os.totalmem() - os.freemem())} / ${formatSize(os.totalmem())}`;
    const platform = os.platform();
    const status = isOwner ? '👑 Owner' : '👤 User';

    const jamWIB  = getTimeInZone('Asia/Jakarta');
    const jamWITA = getTimeInZone('Asia/Makassar');
    const jamWIT  = getTimeInZone('Asia/Jayapura');

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
    'main', 'anonymous', 'ai', 'downloader', 'sticker', 'maker',
    'tools', 'stalker', 'group', 'rpg', 'game', 'fun', 'search',
    'rich', 'anime', 'islamic', 'info', 'owner', 'panel', 'other'
];
    
    const categoryTitles = {
    main: 'MAIN MENU', anonymous: 'ANONYMOUS', ai: 'ARTIFICIAL INTELLIGENCE',
    downloader: 'DOWNLOADER', sticker: 'STICKER MAKER', maker: 'MAKER',
    tools: 'TOOLS & CONVERT', stalker: 'SOCIAL STALKER', group: 'GROUP MENU',
    rpg: 'RPG & EKONOMI', game: 'GAME', fun: 'FUN & ISENG',
    search: 'PENCARIAN', rich: 'RICH INTERACTIVE', anime: 'ANIME',
    islamic: 'ISLAMIC', info: 'INFORMASI', owner: 'OWNER MENU',
    panel: 'PANEL MENU', other: 'LAINNYA'
};

    const categoryEmojis = {
    main: '⚙️', anonymous: '🕵️', downloader: '📥', tools: '🛠️', group: '👥',
    stalker: '🔍', rpg: '🎮', fun: '🎉', game: '🕹️', anime: '🌸',
    islamic: '🕌', info: 'ℹ️', search: '🔎', owner: '👑', panel: '💻',
    maker: '🎨', sticker: '🎨', other: '📦'
};

    let dynamicMenu = '';
    
    for (const cat of categoryOrder) {
      if (!categorized[cat] || categorized[cat].size === 0) continue;
      const title = categoryTitles[cat] || cat.toUpperCase();
      const emoji = categoryEmojis[cat] || '📦';
      const sortedCmds = Array.from(categorized[cat]).sort();
      
      dynamicMenu += `【 ${emoji} *${title}* 】\n`;
      for (const cmd of sortedCmds) {
        dynamicMenu += `  ◃ ${prefix}${cmd}\n`;
      }
      dynamicMenu += `\n`;
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

${dynamicMenu}✦ *Powered by ©${global.namaowner}* ✦
`.trim();

    const rawFoto = await getImageBuffer('media/menu.jpg');
    const rawThumb = await getImageBuffer(global.thumbnail);
    const thumbBuffer = rawThumb ? await processThumbnail(rawThumb, 300) : null;
    const fotoMenuBuffer = rawFoto;
    console.log(`[Menu] Thumbnail: ${thumbBuffer ? thumbBuffer.length + ' bytes' : 'GAGAL'}`);
    console.log(`[Menu] Foto: ${fotoMenuBuffer ? fotoMenuBuffer.length + ' bytes' : 'GAGAL'}`);

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

    if (fotoMenuBuffer) {
      msgContent.image = fotoMenuBuffer;
    } else if (global.fotomenu) {
      msgContent.image = { url: global.fotomenu };
    }

    if (thumbBuffer) {
      msgContent.contextInfo.externalAdReply.thumbnail = thumbBuffer;
    } else if (global.thumbnail) {
      msgContent.contextInfo.externalAdReply.thumbnailUrl = global.thumbnail;
      console.log('[Menu] ⚠️ Thumbnail process gagal, pakai URL fallback');
    }

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