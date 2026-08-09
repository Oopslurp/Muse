/**
 * Audit de mise en page : détecte le débordement horizontal et remonte à
 * l élément fautif, via le protocole DevTools.
 *
 *   npm run audit:layout -- http://localhost:4321/techniques 390
 *
 * Utilise une vraie émulation d appareil : Chrome headless refuse de
 * descendre la fenêtre sous ~485 px, ce qui donne des captures étroites
 * trompeuses. Ici la largeur demandée est celle du viewport.
 *
 * Un débordement à l intérieur d un conteneur à défilement (la navigation
 * en vue mobile) est normal : ce qui compte est que documentElement.scrollWidth
 * reste égal au viewport.
 */
import { execFile } from 'node:child_process';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL_PAGE = process.argv[2] ?? 'http://localhost:4321/techniques';
const LARGEUR = Number(process.argv[3] ?? 420);
const PORT = 9444;

const chrome = execFile(CHROME, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${PORT}`,
  `--window-size=${LARGEUR},1200`,
  '--user-data-dir=' + process.env.TEMP + '/muse-cdp',
  'about:blank',
]);

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
await attendre(2500);

const cibles = await (await fetch(`http://localhost:${PORT}/json/list`)).json();
const page = cibles.find((c) => c.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const attente = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && attente.has(m.id)) {
    attente.get(m.id)(m);
    attente.delete(m.id);
  }
};
const envoyer = (method, params = {}) =>
  new Promise((r) => {
    const n = ++id;
    attente.set(n, r);
    ws.send(JSON.stringify({ id: n, method, params }));
  });

await envoyer('Page.enable');
await envoyer('Runtime.enable');
await envoyer('Emulation.setDeviceMetricsOverride', { width: LARGEUR, height: 900, deviceScaleFactor: 1, mobile: LARGEUR < 700 });
await envoyer('Page.navigate', { url: URL_PAGE });
await attendre(4000);

const script = `(() => {
  const vw = document.documentElement.clientWidth;
  const coupables = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      // On ne garde que les éléments dont aucun parent ne déborde déjà autant,
      // pour remonter à la cause plutôt qu'à ses conséquences.
      const p = el.parentElement;
      const pr = p ? p.getBoundingClientRect() : null;
      if (pr && pr.right > vw + 1 && Math.abs(pr.right - r.right) < 2) continue;
      coupables.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && el.className.toString().slice(0, 60)) || '',
        left: Math.round(r.left),
        right: Math.round(r.right),
        width: Math.round(r.width),
        scrollW: el.scrollWidth,
        texte: (el.textContent || '').trim().slice(0, 40),
      });
    }
  }
  return JSON.stringify({
    viewport: vw,
    bodyScroll: document.body.scrollWidth,
    docScroll: document.documentElement.scrollWidth,
    cartes: document.querySelectorAll('.fiche').length,
    coupables: coupables.slice(0, 12),
  }, null, 2);
})()`;

const res = await envoyer('Runtime.evaluate', { expression: script, returnByValue: true });
console.log(res.result?.result?.value ?? JSON.stringify(res, null, 2));

ws.close();
chrome.kill();
