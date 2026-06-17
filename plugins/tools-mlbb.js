import fetch from 'node-fetch'

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) {
    return conn.sendMessage(
      m.chat,
      { text: `Example usage:\n${usedPrefix + command} Eudora` },
      { quoted: m }
    )
  }

  // Loading reaction
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

  try {
    const name = args.join(' ')

    const res = await fetch(
      `https://fastrestapis.fasturl.cloud/character/mlbb?name=${encodeURIComponent(name)}`
    )

    const json = await res.json()

    if (!json || json.status !== 200 || !json.result?.name) {
      throw new Error('Hero not found.')
    }

    const hero = json.result

    const caption =
      `*${hero.name}*\n\n` +
      `*ID:* ${hero.id}\n` +
      `*Story:* ${hero.story}\n` +
      `*Role:* ${hero.role.map(r => r.name).filter(n => n !== 'No role').join(', ') || '-'}\n` +
      `*Lane:* ${hero.lane.map(l => l.name).filter(n => n !== 'No lane').join(', ') || '-'}\n` +
      `*Specialty:* ${hero.speciality.join(', ') || '-'}\n\n` +
      `*Ability*\n` +
      `- Durability: ${hero.ability.durability}\n` +
      `- Offense: ${hero.ability.offense}\n` +
      `- Effects: ${hero.ability.ability_effects}\n` +
      `- Difficulty: ${hero.ability.difficulty}\n\n` +
      `*Skill: ${hero.skills[0].name}*\n${hero.skills[0].desc}`

    await conn.sendFile(m.chat, hero.media.potrait, 'hero.jpg', caption, m)

    // Success reaction
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.error('MLBB ERROR:', e)

    // Error reaction
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })

    await conn.sendMessage(
      m.chat,
      { text: 'An error occurred while fetching MLBB hero data.' },
      { quoted: m }
    )
  }
}

handler.help = ['mlbb <name>']
handler.tags = ['tools']
handler.command = /^mlbb$/i
handler.register = true

export default handler