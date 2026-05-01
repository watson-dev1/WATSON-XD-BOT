import axios from 'axios';
import * as cheerio from 'cheerio';

const base = "https://otakudesu.best";

async function ongoing() {
  const { data } = await axios.get(base);
  const $ = cheerio.load(data);
  let result = [];
  $(".venz ul li").each((i, el) => {
    result.push({
      title: $(el).find("h2.jdlflm").text().trim(),
      eps: $(el).find(".epz").text().trim(),
      day: $(el).find(".epztipe").text().trim(),
      date: $(el).find(".newnime").text().trim(),
      thumb: $(el).find(".thumbz img").attr("src"),
      link: $(el).find("a").attr("href")
    });
  });
  return result;
}

async function animeList() {
  const { data } = await axios.get(base + "/anime-list/");
  const $ = cheerio.load(data);
  let result = [];
  $(".venser ul li").each((i, el) => {
    result.push({
      title: $(el).find("a").text().trim(),
      link: $(el).find("a").attr("href")
    });
  });
  return result;
}

async function genres() {
  const { data } = await axios.get(base + "/genre-list/");
  const $ = cheerio.load(data);
  let result = [];
  $(".genres li a").each((i, el) => {
    result.push({
      genre: $(el).text().trim(),
      link: $(el).attr("href")
    });
  });
  return result;
}

async function schedule() {
  const { data } = await axios.get(base + "/jadwal-rilis/");
  const $ = cheerio.load(data);
  let result = [];
  $(".kglist321").each((i, el) => {
    const day = $(el).find("h2").text().trim();
    let list = [];
    $(el).find("ul li a").each((j, a) => {
      list.push({
        title: $(a).text().trim(),
        link: $(a).attr("href")
      });
    });
    result.push({ day, list });
  });
  return result;
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const helpMessage = `
*Usage:*
 ${usedPrefix + command} <option>

*Available options:*
- ongoing: Displays currently airing anime.
- list: Displays the list of all anime.
- genres: Displays the list of anime genres.
- schedule: Displays the anime release schedule.

*Example:*
 ${usedPrefix + command} ongoing
`;

  if (!text) return m.reply(helpMessage);

  const commandLower = text.toLowerCase();

  try {
    if (commandLower === 'ongoing') {
      m.reply('⏳ Fetching ongoing anime...');
      let res = await ongoing();
      if (!res || res.length === 0) return m.reply('🚨 No ongoing data found.');

      let caption = `📺 *Ongoing Anime (Latest)*\n\n`;
      res.forEach((item, index) => {
        caption += `${index + 1}. *${item.title}*\n`;
        caption += `   📬 ${item.eps}\n`;
        caption += `   📅 ${item.day} - ${item.date}\n`;
        caption += `   🔗 ${item.link}\n\n`;
      });
      await m.reply(caption);

    } else if (commandLower === 'list') {
      m.reply('⏳ Fetching anime list... (This may take a few seconds)');
      let res = await animeList();
      if (!res || res.length === 0) return m.reply('🚨 No anime list found.');

      let caption = `📚 *List of All Anime*\n\n`;
      res.forEach((item, index) => {
        caption += `${index + 1}. ${item.title}\n`;
        caption += `   🔗 ${item.link}\n\n`;
      });
      await m.reply(caption);

    } else if (commandLower === 'genres') {
      m.reply('⏳ Fetching genre list...');
      let res = await genres();
      if (!res || res.length === 0) return m.reply('🚨 No genre list found.');

      let caption = `🏷️ *List of Anime Genres*\n\n`;
      res.forEach((item, index) => {
        caption += `${index + 1}. ${item.genre}\n`;
        caption += `   🔗 ${item.link}\n\n`;
      });
      await m.reply(caption);

    } else if (commandLower === 'schedule') {
      m.reply('⏳ Fetching release schedule...');
      let res = await schedule();
      if (!res || res.length === 0) return m.reply('🚨 No release schedule found.');

      let caption = `🗓️ *Anime Release Schedule*\n\n`;
      res.forEach((daySchedule) => {
        caption += `📍 *${daySchedule.day}*\n`;
        daySchedule.list.forEach((anime) => {
          caption += `   - ${anime.title}\n`;
          caption += `     🔗 ${anime.link}\n`;
        });
        caption += `\n`;
      });
      await m.reply(caption);

    } else {
      return m.reply(`🚨 Option "${text}" is invalid.\n\n${helpMessage}`);
    }
  } catch (e) {
    console.error('Error:', e);
    m.reply('🚨 An error occurred while fetching the data. The website might be down or try again later.');
  }
}

handler.help = ['otakudesu']
handler.tags = ['anime']
handler.command = /^(otakudesu|otaku)$/i // Added 'otaku' alias for convenience
handler.limit = true

export default handler;