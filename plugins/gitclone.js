import fetch from 'node-fetch';

export default {
    command: 'gitclone',
    aliases: ['githubdl', 'clone'],
    category: 'download',
    description: 'Download a GitHub repository as a ZIP file with repo info preview',
    usage: '.gitclone <url> OR <username> <repo>',
    async handler(sock, message, args) {
        const chatId = message.key.remoteJid;

        if (!args || args.length === 0) {
            return sock.sendMessage(chatId, {
                text: 
`✨ *GitHub Repository Downloader* ✨

❗ Please provide a GitHub URL or a username and repository name.

*Example usage:*
• \`.gitclone https://github.com/watson-dev1/WATSON-XD-BOT\`
• \`.gitclone watson-dev1 WATSON-XD-BOT\`

💡 The repository will be downloaded as a ZIP file automatically!`
            });
        }

        let repoName = '';
        let username = '';
        let baseUrl = '';

        // URL input
        if (args[0].startsWith('http')) {
            const inputUrl = args[0].replace(/\.git$/, '');
            const parts = inputUrl.split('/');
            username = parts[parts.length - 2];
            repoName = parts[parts.length - 1];
            baseUrl = inputUrl.endsWith('/') ? inputUrl : inputUrl + '/';
        }
        // Username + repo input
        else if (args.length >= 2) {
            username = args[0];
            repoName = args[1];
            baseUrl = `https://github.com/${username}/${repoName}/`;
        } else {
            return sock.sendMessage(chatId, {
                text: 
`❌ *Oops! Repository info is incomplete.*

*Example usage:*
• \`.gitclone https://github.com/watson-dev1/WATSON-XD-BOT\`
• \`.gitclone watson-dev1 WATSON-XD-BOT\`` 
            });
        }

        await sock.sendMessage(chatId, { text: '⏳ *Fetching repository info...*' });

        // Fetch repo info from GitHub API
        let repoInfo = {};
        try {
            const response = await fetch(`https://api.github.com/repos/${username}/${repoName}`);
            if (!response.ok) throw new Error('Repository not found on GitHub API');
            repoInfo = await response.json();
        } catch (err) {
            console.log('GitHub API fetch failed:', err.message);
        }

        // Attempt main first, then master
        const branches = ['main', 'master'];
        let success = false;

        for (let branch of branches) {
            const zipUrl = `${baseUrl}archive/refs/heads/${branch}.zip`;
            try {
                let caption = `✅ *Repository Ready!*\n\n` +
                              `• Name: *${repoName}*\n` +
                              `• Branch: *${branch}*\n` +
                              `• URL: [GitHub Repo](${baseUrl})\n`;

                if (repoInfo.name) {
                    caption += `• Description: ${repoInfo.description || 'No description'}\n` +
                               `• Language: ${repoInfo.language || 'Unknown'}\n` +
                               `• ⭐ Stars: ${repoInfo.stargazers_count}\n` +
                               `• 🍴 Forks: ${repoInfo.forks_count}\n`;
                }

                caption += `\n💾 Enjoy your download!`;

                await sock.sendMessage(chatId, {
                    document: { url: zipUrl },
                    fileName: `${repoName}-${branch}.zip`,
                    mimetype: 'application/zip',
                    caption
                });

                success = true;
                break; // Stop after first successful download
            } catch (err) {
                console.log(`Branch ${branch} failed: ${err.message}`);
            }
        }

        if (!success) {
            await sock.sendMessage(chatId, {
                text: 
`❌ *Failed to fetch the repository.*

⚠️ Please make sure:
• The repository exists
• The URL or username/repo is correct
• It has either a *main* or *master* branch`
            });
        }
    }
};