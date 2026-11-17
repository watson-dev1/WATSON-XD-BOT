import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendFakeQuoted } from '../../lib/fakequoted.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

const MAX_TEXT_SIZE = 500 * 1024;
const MAX_LIST_ITEMS = 50;
const MAX_PREVIEW_CHAR = 3000;

const TEXT_EXT = [
    '.js', '.mjs', '.cjs', '.json', '.txt', '.md', '.yml', '.yaml',
    '.env', '.log', '.css', '.html', '.htm', '.xml', '.sh', '.bat',
    '.ini', '.conf', '.ts', '.jsx', '.tsx'
];

const MIME_MAP = {
    '.json': 'application/json',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.cjs': 'application/javascript',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.html': 'text/html',
    '.css': 'text/css',
    '.xml': 'application/xml',
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.zip': 'application/zip'
};

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function isTextFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return TEXT_EXT.includes(ext) || ext === '';
}

function getMime(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_MAP[ext] || 'application/octet-stream';
}

function resolvePath(input) {
    if (!input || input === '.' || input === '/') {
        return ROOT_DIR;
    }
    if (path.isAbsolute(input)) {
        return input;
    }
    return path.join(ROOT_DIR, input);
}

export default {
    command: ['gf', 'getfile', 'cat'],
    category: 'owner',
    execute: async (denn, m, { prefix, command, text, isOwner }) => {
        if (!isOwner) {
            return sendFakeQuoted(denn, m, '❌ Fitur ini khusus Owner!', {
                title: 'Akses Ditolak', body: 'Kamu bukan Owner'
            });
        }

        const target = (text || '').trim();
        const fullPath = resolvePath(target);

        try {
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                const items = fs.readdirSync(fullPath, { withFileTypes: true });

                const folders = items
                    .filter(i => i.isDirectory())
                    .sort((a, b) => a.name.localeCompare(b.name));
                const files = items
                    .filter(i => i.isFile())
                    .sort((a, b) => a.name.localeCompare(b.name));

                const all = [...folders, ...files];
                const shown = all.slice(0, MAX_LIST_ITEMS);

                let output = `[ DIRECTORY ]\n`;
                output += `Path : ${fullPath.replace(ROOT_DIR, '.')}\n`;
                output += `Total: ${items.length} item\n\n`;

                for (const item of shown) {
                    const itemPath = path.join(fullPath, item.name);
                    if (item.isDirectory()) {
                        output += `[DIR]  ${item.name}/\n`;
                    } else {
                        try {
                            const s = fs.statSync(itemPath);
                            output += `[FILE] ${item.name} (${formatSize(s.size)})\n`;
                        } catch {
                            output += `[FILE] ${item.name}\n`;
                        }
                    }
                }

                if (all.length > MAX_LIST_ITEMS) {
                    output += `\n... dan ${all.length - MAX_LIST_ITEMS} item lainnya`;
                }

                output += `\n\nKetik ${prefix}${command} <path> untuk baca file.`;
                output += `\nContoh: ${prefix}${command} plugins/main/menu.js`;

                return sendFakeQuoted(denn, m, output, {
                    title: 'Get File',
                    body: `${items.length} item di ${path.basename(fullPath) || 'root'}`
                });
            }

            if (stat.isFile()) {
                const fileName = path.basename(fullPath);
                const fileSize = stat.size;
                const modified = stat.mtime.toLocaleString('id-ID');

                if (isTextFile(fullPath) && fileSize <= MAX_TEXT_SIZE) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const truncated = content.length > MAX_PREVIEW_CHAR;
                    const preview = truncated
                        ? content.slice(0, MAX_PREVIEW_CHAR)
                        : content;

                    let card = `[ ${fileName} ]\n\n`;
                    card += `Path    : ${fullPath.replace(ROOT_DIR, '.')}\n`;
                    card += `Size    : ${formatSize(fileSize)}\n`;
                    card += `Modified: ${modified}\n`;
                    card += `Chars   : ${content.length}\n`;
                    if (truncated) card += `Preview : ${MAX_PREVIEW_CHAR} char (terpotong)\n`;
                    card += `\n\`\`\`\n${preview}\n\`\`\``;

                    return sendFakeQuoted(denn, m, card, {
                        title: 'Get File',
                        body: fileName
                    });
                }

                const buffer = fs.readFileSync(fullPath);

                await denn.sendMessage(m.chat, {
                    document: buffer,
                    fileName: fileName,
                    mimetype: getMime(fullPath),
                    caption:
                        `[ ${fileName} ]\n\n` +
                        `Path    : ${fullPath.replace(ROOT_DIR, '.')}\n` +
                        `Size    : ${formatSize(fileSize)}\n` +
                        `Modified: ${modified}\n\n` +
                        `_File dikirim sebagai dokumen._`
                }, { quoted: m });

                return;
            }

            return sendFakeQuoted(denn, m, `❌ Path bukan file atau folder:\n${fullPath}`, {
                title: 'Get File',
                body: 'Path tidak valid'
            });

        } catch (e) {
            if (e.code === 'ENOENT') {
                return sendFakeQuoted(denn, m,
                    `❌ File/folder tidak ditemukan:\n\`${fullPath.replace(ROOT_DIR, '.')}\`\n\n` +
                    `_Ketik ${prefix}${command} untuk lihat root directory._`,
                    { title: 'Get File', body: 'Path tidak ditemukan' }
                );
            }
            if (e.code === 'EACCES') {
                return sendFakeQuoted(denn, m, `❌ Akses ditolak:\n\`${fullPath}\``, {
                    title: 'Get File', body: 'Permission denied'
                });
            }
            return sendFakeQuoted(denn, m, `❌ Error: ${e.message}`, {
                title: 'Get File', body: 'Gagal baca file'
            });
        }
    }
};