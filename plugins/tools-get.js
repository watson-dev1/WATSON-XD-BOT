import axios from 'axios'
import path from 'path'

let handler = async (m, { text, conn }) => {
    if (!text) return m.reply('Url?')
    if (!/^https?:\/\//.test(text)) text = 'http://' + text

    let redirectCount = 0
    const maxRedirects = 10
    let currentUrl = text

    while (redirectCount < maxRedirects) {
        let res
        try {
            res = await axios({
                method: 'get',
                url: currentUrl,
                responseType: 'stream',
                validateStatus: null,
                maxRedirects: 0,
                timeout: 15000,
                headers: {
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
                    referer: currentUrl
                }
            })
        } catch (err) {
            throw new Error(err.message)
        }

        const status = res.status
        if ([301, 302, 303, 307, 308].includes(status)) {
            const location = res.headers?.location
            await res.data?.destroy?.()
            if (!location) break
            currentUrl = new URL(location, currentUrl).href
            redirectCount++
            continue
        }

        const headers = res.headers || {}
        const contentType = (headers['content-type'] || '').split(';')[0].trim()
        const contentLength = Number(headers['content-length'] || 0)
        if (contentLength && contentLength > 100 * 1024 * 1024) {
            await res.data?.destroy?.()
            throw new Error(`Content too large (${contentLength} bytes)`)
        }

        const filename = path.basename(new URL(currentUrl).pathname) || 'file'

        if (/^image\//.test(contentType)) {
            await conn.sendFile(m.chat, currentUrl, filename, text, m)
            await res.data?.destroy?.()
            return
        }

        if (/^application\/json/.test(contentType)) {
            let jsonText = ''
            try {
                const chunks = []
                for await (const chunk of res.data) chunks.push(chunk)
                jsonText = Buffer.concat(chunks).toString('utf8')
                const json = JSON.parse(jsonText)
                const pretty = JSON.stringify(json, null, 2)
                await m.reply(pretty.slice(0, 65536))
                await conn.sendFile(m.chat, Buffer.from(pretty), 'file.json', null, m)
                return
            } catch (e) {
                await res.data?.destroy?.()
                throw new Error('Failed to parse JSON')
            }
        }

        if (/^text\//.test(contentType) || /^text\/html/.test(contentType)) {
            const chunks = []
            try {
                for await (const chunk of res.data) chunks.push(chunk)
                const txt = Buffer.concat(chunks).toString('utf8')
                await m.reply(txt.slice(0, 65536))
                await conn.sendFile(m.chat, Buffer.from(txt), contentType === 'text/html' ? 'file.html' : 'file.txt', null, m)
                return
            } catch (e) {
                await res.data?.destroy?.()
                throw new Error(e.message)
            }
        }

        // fallback binary/file
        try {
            const chunks = []
            for await (const chunk of res.data) chunks.push(chunk)
            const fileBuf = Buffer.concat(chunks)
            await conn.sendFile(m.chat, fileBuf, filename || 'file.bin', text, m)
            return
        } catch (e) {
            await res.data?.destroy?.()
            throw new Error(e.message)
        }
    }

    if (redirectCount >= maxRedirects) throw new Error(`Too many redirects (max: ${maxRedirects})`)
}

handler.help = ['fetch', 'get'].map(v => v + ' <url>')
handler.tags = ['internet']
handler.command = /^(fetch|get)$/i
handler.register = true

export default handler