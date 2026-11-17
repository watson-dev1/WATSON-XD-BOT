import crypto from 'crypto';

function buildStickerExif(metadata) {
    const json = Buffer.from(JSON.stringify(metadata), 'utf-8');
    const exif = Buffer.concat([
        Buffer.from([
            0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
            0x07, 0x00
        ]),
        Buffer.alloc(4),
        Buffer.from([0x16, 0x00, 0x00, 0x00]),
        json,
    ]);
    exif.writeUInt32LE(json.length, 14);
    return exif;
}

function makeChunk(type, data) {
    const typeBuffer = Buffer.from(type);
    const sizeBuffer = Buffer.alloc(4);
    sizeBuffer.writeUInt32LE(data.length, 0);
    const padding = data.length % 2 === 1 ? Buffer.from([0x00]) : Buffer.alloc(0);
    return Buffer.concat([typeBuffer, sizeBuffer, data, padding]);
}

function setWebpExif(webpBuffer, metadata) {
    if (webpBuffer.slice(0, 4).toString() !== 'RIFF' || webpBuffer.slice(8, 12).toString() !== 'WEBP') {
        throw new Error('File bukan WEBP valid.');
    }

    const chunks = [];
    let offset = 12;
    while (offset + 8 <= webpBuffer.length) {
        const type = webpBuffer.slice(offset, offset + 4).toString();
        const size = webpBuffer.readUInt32LE(offset + 4);
        const chunkStart = offset;
        const chunkEnd = offset + 8 + size + (size % 2);
        
        if (chunkEnd > webpBuffer.length) break;
        if (type !== 'EXIF') {
            chunks.push(webpBuffer.slice(chunkStart, chunkEnd));
        }
        offset = chunkEnd;
    }

    const exifPayload = buildStickerExif(metadata);
    const exifChunk = makeChunk('EXIF', exifPayload);
    const body = Buffer.concat([...chunks, exifChunk]);

    const header = Buffer.alloc(12);
    header.write('RIFF', 0);
    header.writeUInt32LE(body.length + 4, 4);
    header.write('WEBP', 8);

    return Buffer.concat([header, body]);
}

export function addStickerMetadata(webpBuffer, packName, publisher, emojis = ['🤖']) {
    try {
        if (!webpBuffer || webpBuffer.length < 100) return webpBuffer;

        const metadata = {
            "sticker-pack-id": `com.patrickmd.sticker.${crypto.randomBytes(4).toString('hex')}`,
            "sticker-pack-name": packName || "Patrick MD",
            "sticker-pack-publisher": publisher || "DennCode",
            "android-app-store-link": "https://whatsapp.com",
            "ios-app-store-link": "https://whatsapp.com/ios",
            "emojis": Array.isArray(emojis) ? emojis : ["🤖"],
            "is-from-sticker-maker": 0,
            "is-avatar-sticker": 0,
            "is-ai-sticker": 0,
            "is-text-sticker": 0,
            "premium": 0
        };

        console.log(`[StickerExif] ✅ Sukses inject EXIF`);
        return setWebpExif(webpBuffer, metadata);
    } catch (e) {
        console.error('[StickerExif] ❌ Gagal inject metadata:', e.message);
        return webpBuffer;
    }
}