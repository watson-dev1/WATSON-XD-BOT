import yargs from 'yargs';
import cfonts from 'cfonts';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { createRequire } from 'module';
import { createInterface } from 'readline';
import cluster from 'cluster';
import { watchFile, unwatchFile } from 'fs';
import http from 'http'; // Required for Railway Health Check

// Setup console output
const { say } = cfonts;
const rl = createInterface(process.stdin, process.stdout);
const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(__dirname);
const { name, author } = require(join(__dirname, './package.json'));

// Changed to 'console' font to fix the white blocks on Railway mobile
say('PRECIOUS-MD', {
  font: 'console',
  align: 'center',
  colors: ['white']
})
say(`Multi-functional Bot By @watsonxt`, { 
  font: 'console',
  align: 'center',
  colors: ['green']
})

/*============= RAILWAY HEALTH CHECK =============*/
// This keeps Railway from restarting the bot every 5 minutes
const port = process.env.PORT || 8080
http.createServer((req, res) => {
  res.write('PRECIOUS-MD is live and running.')
  res.end()
}).listen(port, () => {
  console.log(`📡 Health Check: Listening on port ${port}`)
})

console.log('💬 Starting PRECIOUS-MD...'); 

var isRunning = false;

/**
 * Start a js file
 * @param {String} file `path/to/file`
 */
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
    console.log('[✅ RECEIVED]', data);
    switch (data) {
      case 'reset':
        p.process.kill();
        isRunning = false;
        start(file);
        break;
      case 'uptime':
        p.send(process.uptime());
        break;
      default:
          console.warn('[⚠️ UNRECOGNIZED MESSAGE]', data);
    }
  });

  p.on('exit', (worker, code, signal) => {
    isRunning = false;
    console.error('[❗] PRECIOUS-MD Exited. Code:', code, 'Signal:', signal);
    
    if (code !== 0) {
      console.log('[🔄] Restarting worker due to crash...');
      return start(file);
    }
    
    watchFile(args[0], () => {
      unwatchFile(args[0]);
      start(file);
    });
  });

  let opts = yargs(process.argv.slice(2)).exitProcess(false).parse();
  
  if (!opts['test']) {
    if (!rl.listenerCount('line')) {
      rl.on('line', line => {
        p.send(line.trim()); 
      });
    }
  }
}

start('main.js');
