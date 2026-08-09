/**
 * Serveur statique minimal, sans dépendance.
 *
 * Nécessaire parce que la page de test charge alphaTab en module ES depuis
 * node_modules : les imports de modules sont bloqués par CORS sur file://.
 *
 *   node tools/serve.mjs          → http://localhost:5173
 *   node tools/serve.mjs 8080     → autre port
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.argv[2] ?? 5173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.sf2': 'application/octet-stream',
  '.sf3': 'application/octet-stream',
  '.wasm': 'application/wasm',
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let filePath = path.join(ROOT, urlPath);

    // Empêche de sortir de la racine du projet via ../
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end(`404 — ${urlPath}`);
      return;
    }

    res.writeHead(200, {
      'content-type': MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
      // Pas de COEP `require-corp` ici. Il était arrivé pour AudioWorklet, mais
      // AudioWorklet n'en a pas besoin — seul SharedArrayBuffer l'exige. En
      // revanche il bloque toute sous-ressource sans en-tête CORP, y compris
      // les modules du même site : les îlots ne se chargeaient plus et la page
      // se vidait. Si SharedArrayBuffer devient nécessaire, réactiver COEP
      // *avec* `cross-origin-resource-policy: same-origin` sur chaque réponse.
    });
    fs.createReadStream(filePath).pipe(res);
  })
  .listen(PORT, () => {
    console.log(`\n  Muse — serveur statique\n`);
    console.log(`  Racine  : ${ROOT}`);
    console.log(`  Test    : http://localhost:${PORT}/tools/percussion-audio-test.html\n`);
    console.log(`  Ctrl+C pour arrêter.\n`);
  });
