import { fileURLToPath, pathToFileURL } from 'url';
import path, { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import fs from 'fs';

class CommandHandler {
    constructor() {
        this.commands = new Map();
        this.aliases = new Map();
        this.categories = new Map();
        this.stats = new Map();
        this.cooldowns = new Map();
        this.disabledCommands = new Set();
        this.prefixlessCommands = new Map();
        this.watchPlugins();
    }

    async watchPlugins() {
        const pluginsPath = path.join(process.cwd(), 'plugins');
        if (!fs.existsSync(pluginsPath)) return;
        fs.watch(pluginsPath, async (_eventType, filename) => {
            if (filename && filename.endsWith('.js')) {
                const filePath = path.join(pluginsPath, filename);
                try {
                    if (fs.existsSync(filePath)) {
                        const plugin = (await import(pathToFileURL(filePath).href)).default || (await import(pathToFileURL(filePath).href));
                        if (plugin.command) {
                            this.registerCommand(plugin);
                            if (plugin.isPrefixless === true) {
                                const cmdKey = plugin.command.toLowerCase();
                                this.prefixlessCommands.set(cmdKey, cmdKey);
                                if (plugin.aliases && Array.isArray(plugin.aliases)) {
                                    plugin.aliases.forEach((alias) => {
                                        this.prefixlessCommands.set(alias.toLowerCase(), cmdKey);
                                    });
                                }
                            }
                            console.log(`[WATCHER] Hot-reloaded: ${filename}`);
                        }
                    }
                } catch (error) {
                    console.error(`[WATCHER] Error reloading ${filename}:`, error.message);
                }
            }
        });
    }

    async loadCommands() {
        const pluginsPath = path.join(process.cwd(), 'plugins');
        const files = fs.readdirSync(pluginsPath).filter(f => f.endsWith('.js'));
        for (const file of files) {
            try {
                const filePath = path.join(pluginsPath, file);
                const plugin = (await import(pathToFileURL(filePath).href)).default || (await import(pathToFileURL(filePath).href));
                if (plugin.command) {
                    this.registerCommand(plugin);
                    if (plugin.isPrefixless === true) {
                        const cmdKey = plugin.command.toLowerCase();
                        this.prefixlessCommands.set(cmdKey, cmdKey);
                        if (plugin.aliases && Array.isArray(plugin.aliases)) {
                            plugin.aliases.forEach((alias) => {
                                this.prefixlessCommands.set(alias.toLowerCase(), cmdKey);
                            });
                        }
                    }
                }
            } catch (error) {
                console.error(`Error loading ${file}:`, error.message);
            }
        }
    }

    registerCommand(plugin) {
        const { command, aliases = [], category = 'misc', handler } = plugin;
        if (!command || typeof handler !== 'function') {
            console.error(`[SKIP] Plugin at ${command || 'unknown'} is missing valid handler.`);
            return;
        }
        const cmdKey = command.toLowerCase();
        this.stats.set(cmdKey, { calls: 0, errors: 0, totalTime: 0n, avgMs: 0 });

        const monitoredHandler = async (sock, message, ...args) => {
            const s = this.stats.get(cmdKey);
            if (this.disabledCommands.has(cmdKey)) {
                return await sock.sendMessage(message.key.remoteJid, { text: `🚫 *${cmdKey}* is disabled.` }, { quoted: message });
            }
            const userId = message.key.participant || message.key.remoteJid;
            const now = Date.now();
            const cooldownKey = `${userId}_${cmdKey}`;
            if (this.cooldowns.has(cooldownKey)) {
                if (now < this.cooldowns.get(cooldownKey) + (plugin.cooldown || 3000)) return;
            }
            this.cooldowns.set(cooldownKey, now);
            const start = process.hrtime.bigint();
            try {
                s.calls++;
                return await handler(sock, message, ...args);
            } catch (err) {
                s.errors++;
                throw err;
            } finally {
                const end = process.hrtime.bigint();
                s.totalTime += (end - start);
                s.avgMs = Number(s.totalTime / BigInt(s.calls || 1)) / 1000000;
            }
        };

        this.commands.set(cmdKey, { ...plugin, command, handler: monitoredHandler, category: category.toLowerCase(), aliases });
        for (const alias of aliases) this.aliases.set(alias.toLowerCase(), cmdKey);
        if (!this.categories.has(category.toLowerCase())) this.categories.set(category.toLowerCase(), []);
        if (!this.categories.get(category.toLowerCase()).includes(command)) this.categories.get(category.toLowerCase()).push(command);
    }

    // --- SMART BUTTON & PREFIX DETECTION ---
    getCommand(text, prefixes) {
        const trimText = text.trim();
        const firstWord = trimText.split(' ')[0].toLowerCase();
        
        // 1. Check if it has a prefix
        const usedPrefix = prefixes.find(p => trimText.startsWith(p));

        if (!usedPrefix) {
            // Check prefixless commands (great for buttons that send raw words)
            if (this.prefixlessCommands.has(firstWord)) {
                return this.commands.get(this.prefixlessCommands.get(firstWord));
            }
            // FALLBACK FOR BUTTONS: Try to match the word even without a prefix
            if (this.commands.has(firstWord)) return this.commands.get(firstWord);
            if (this.aliases.has(firstWord)) return this.commands.get(this.aliases.get(firstWord));
            
            return null;
        }

        // 2. Standard Prefix Command handling
        const fullCommand = trimText.slice(usedPrefix.length).trim().split(' ')[0].toLowerCase();
        
        if (this.commands.has(fullCommand)) return this.commands.get(fullCommand);
        if (this.aliases.has(fullCommand)) return this.commands.get(this.aliases.get(fullCommand));

        // 3. Levenshtein Suggestion
        const suggestion = this.findSuggestion(fullCommand);
        if (suggestion) {
            return {
                command: suggestion,
                handler: async (sock, message) => {
                    await sock.sendMessage(message.key.remoteJid, { text: `❓ Did you mean *${usedPrefix}${suggestion}*?` }, { quoted: message });
                }
            };
        }
        return null;
    }

    toggleCommand(name) {
        const cmd = name.toLowerCase();
        if (this.disabledCommands.has(cmd)) {
            this.disabledCommands.delete(cmd);
            return 'enabled';
        }
        this.disabledCommands.add(cmd);
        return 'disabled';
    }

    _levenshtein(a, b) {
        const tmp = [];
        for (let i = 0; i <= a.length; i++) tmp[i] = [i];
        for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                tmp[i][j] = Math.min(tmp[i - 1][j] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            }
        }
        return tmp[a.length][b.length];
    }

    findSuggestion(cmd) {
        const allNames = [...this.commands.keys(), ...this.aliases.keys()];
        let bestMatch = null;
        let minDistance = 3;
        for (const name of allNames) {
            const distance = this._levenshtein(cmd, name);
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = name;
            }
        }
        return bestMatch;
    }

    getDiagnostics() {
        return Array.from(this.stats.entries()).map(([name, data]) => ({
            command: name, usage: data.calls, errors: data.errors, speed: `${data.avgMs.toFixed(3)}ms`, status: this.disabledCommands.has(name) ? 'OFF' : 'ON'
        })).sort((a, b) => b.usage - a.usage);
    }

    async reloadCommands() {
        this.commands.clear();
        this.aliases.clear();
        this.categories.clear();
        this.stats.clear();
        this.prefixlessCommands.clear();
        await this.loadCommands();
    }

    getCommandsByCategory(category) { return this.categories.get(category.toLowerCase()) || []; }
}

export default new CommandHandler();