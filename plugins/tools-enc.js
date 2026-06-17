import JavaScriptObfuscator from "javascript-obfuscator"

let handler = async (m, { args }) => {
    try {
        const modes = ["low", "high"]

        const usage =
            "Reply to a code message!\n\nExample:\n.obfuscate high"

        if (!m.quoted) return m.reply(usage)

        const type = (args.shift() || "").toLowerCase()

        if (!modes.includes(type)) return m.reply(usage)

        const message =
            type === "high"
                ? await Encrypt(m.quoted.text)
                : await Decrypt(m.quoted.text)

        if (args.length >= 1) {
            const texts = args.join(" ")
            const response =
                type === "high"
                    ? await Encrypt(texts)
                    : await Decrypt(texts)

            return m.reply(response)
        }

        return m.reply(message)

    } catch (e) {
        console.error(e)
        await m.reply(e.message || "An error occurred")
    }
}

handler.help = ['encrypt']
handler.tags = ['tools']
handler.command = /^(encrypt|enc)$/i
handler.limit = true

export default handler


// ===== OBFUSCATION FUNCTIONS =====

async function Encrypt(query) {
    const result = JavaScriptObfuscator.obfuscate(query, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        numbersToExpressions: true,
        simplify: true,
        stringArrayShuffle: true,
        splitStrings: true,
        stringArrayThreshold: 1,
        sourceMap: false,
        sourceMapMode: "separate",
    })

    return result.getObfuscatedCode()
}

// NOTE: This is NOT real decryption.
// JavaScript obfuscation is one-way.
async function Decrypt(code) {
    return JavaScriptObfuscator.obfuscate(code, {
        compact: false,
        controlFlowFlattening: true,
    }).getObfuscatedCode()
}