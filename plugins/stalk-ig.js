import axios from "axios";
import cheerio from "cheerio";

// Scraper function
async function igstalk(user) {
  try {
    const response = await axios.post(
      "https://privatephotoviewer.com/wp-json/instagram-viewer/v1/fetch-profile",
      { find: user },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    const $ = cheerio.load(response.data.html);

    let profilePicture = $("#profile-insta img").attr("src");
    const nickname = $(".col-md-8 h4").text().trim();
    const username = $(".col-md-8 h5").text().trim();
    const posts = $(".col-md-8 .text-center").eq(0).find("strong").text().trim();
    const followers = $(".col-md-8 .text-center").eq(1).find("strong").text().trim();
    const following = $(".col-md-8 .text-center").eq(2).find("strong").text().trim();

    const bio = $(".col-md-8 p")
      .html()
      ?.replace(/<br\s*\/?>/g, "\n")
      .trim();

    return {
      status: true,
      creator: "JER OFC",
      data: {
        nickname,
        username,
        bio,
        posts,
        followers,
        following,
        profile: "https://www.instagram.com/" + username.replace("@", ""),
        profileUrl: profilePicture,
      },
    };
  } catch (e) {
    console.log(e);
    throw e;
  }
}

// Command handler
let handler = async (m, { text, conn }) => {
  if (!text) return m.reply("Please enter the Instagram username to stalk!");

  try {
    let result = await igstalk(text);

    let message = `
*Instagram Stalker*
- *Nickname:* ${result.data.nickname}
- *Username:* ${result.data.username}
- *Bio:* ${result.data.bio}
- *Posts:* ${result.data.posts}
- *Followers:* ${result.data.followers}
- *Following:* ${result.data.following}
- *Profile:* ${result.data.profile}
    `.trim();

    // Send profile picture with caption
    await conn.sendMessage(
      m.chat,
      { image: { url: result.data.profileUrl }, caption: message },
      { quoted: m }
    );

  } catch (e) {
    console.error(e);
    m.reply("❌ An error occurred or the username was not found!");
  }
};

handler.help = ['igstalk <username>'];
handler.tags = ['tools'];
handler.command = /^igstalk$/i;
handler.limit = false;

export default handler;