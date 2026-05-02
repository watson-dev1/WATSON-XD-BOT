import yargs from 'yargs';
import cfonts from 'cfonts';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { createRequire } from 'module';
import { createInterface } from 'readline';
import cluster from 'cluster';
import { watchFile, unwatchFile } from 'fs';
import http from 'http';

const { say } = cfonts;
const rl = createInterface(process.stdin, process.stdout);
const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(__dirname);

// Branding
say('PRECIOUS-MD', { font: 'console', align: 'center', colors: ['white'] });
say('By watsonxt', { font: 'console', align: 'center', colors: ['green'] });

// --- RAILWAY PORT BINDING (Fixes SIGTERM) ---
const port = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('PRECIOUS-MD IS LIVE');
  res.end();
}).listen(port, () => {
  console.log(`📡 Server heartbeat active on port ${port}`);
});

var isRunning = false;
function start(file) {
  if (isRunning) return;
  isRunning = true;
  let args = [join(__dirname, file), ...process.argv.slice(2)];
  
  if (cluster.setupPrimary) {
    cluster.setupPrimary({ exec: args[0], args: args.slice(1) });
  } else {
    cluster.setupMaster({ exec: args[0], args: args.slice(1) });
  }

  let p = cluster.fork();
  p.on('message', data => {
    if (data === 'reset') {
      p.process.kill();
      isRunning = false;
      start(file);
    }
  });

  p.on('exit', (code) => {
    isRunning = false;
    if (code !== 0) start(file);
  });
}

start('main.js');
