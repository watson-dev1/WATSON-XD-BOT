import axios from 'axios'

export const Jawa = {
    translate: async (text, { from = 'indo', to = 'krama-alus' } = {}) => {
        try {
            if (!text) throw new Error('Text is required.')
            
            const languageMap = {
                indo: 'id',
                jawa: 'jw',
                'krama-lugu': 'kl',
                'krama-alus': 'ka',
                ngoko: 'ng'
            }
            
            const fromCode = languageMap[from]
            const toCode = languageMap[to]
            
            if (!fromCode) throw new Error(`Invalid 'from' language: ${from}. Valid options: indo, jawa.`)
            if (!toCode) throw new Error(`Invalid 'to' language: ${to}. Valid options: indo, krama-lugu, krama-alus, ngoko.`)
            if (fromCode === 'id' && toCode === 'id') throw new Error('Cannot translate from indo to indo.')
            if (fromCode === 'jw' && toCode !== 'id') throw new Error('When translating from jawa, target must be indo.')
            
            const { data } = await axios.post('https://api.translatejawa.id/translate', {
                text: text.trim(),
                from: fromCode,
                to: toCode
            }, {
                headers: {
                    'content-type': 'application/json',
                    referer: 'https://translatejawa.id/',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
                }
            })
            
            return data.result
        } catch (e) {
            throw new Error(e.message)
        }
    },
    
    aksara: async (text, { direction = 'toJavanese', withSpace = true, withMurda = true } = {}) => {
        try {
            if (!text) throw new Error('Text is required.')
            
            const validDirections = ['toJavanese', 'toLatin']
            if (!validDirections.includes(direction)) throw new Error(`Invalid 'direction': ${direction}. Valid options: ${validDirections.join(', ')}.`)
            
            const { data } = await axios.post('https://aksarajawa.id/api/translate', {
                text: text.trim(),
                direction: direction,
                options: {
                    withSpace: withSpace,
                    withMurda: withMurda,
                    typeMode: true
                }
            }, {
                headers: {
                    'content-type': 'application/json',
                    referer: 'https://aksarajawa.id/',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
                }
            })
            
            return data.result
        } catch (e) {
            throw new Error(e.message)
        }
    }
}

let handler = async (m, { command, args }) => {
    try {
        const text = args.join(' ')
        if (!text) return m.reply(`*Example :* .${command} Katakan Pada Dunia Aku Jawa Dan aku Bangga`)
        
        let result
        switch (command) {
            case 'krama':
                result = await Jawa.translate(text, { to: 'krama-alus' })
                break
            case 'lugu':
                result = await Jawa.translate(text, { to: 'krama-lugu' })
                break
            case 'ngoko':
                result = await Jawa.translate(text, { to: 'ngoko' })
                break
            case 'aksara':
                result = await Jawa.aksara(text)
                break
            default:
                result = await Jawa.translate(text)
                break
        }
        
        m.reply(result)
    } catch (e) {
        m.reply(e.message)
    }
}

handler.help = ['krama', 'lugu', 'ngoko', 'aksara']
handler.tags = ['tools']
handler.command = ['krama', 'lugu', 'ngoko', 'aksara']
handler.register = true

export default handler