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
 * Un débordement à l intérieur d un conteneur à défilement (le graphe de
 * l arbre, une tablature) est normal et voulu : ce qui compte est que
 * documentElement.scrollWidth reste égal au viewport.
 *
 * D où le code de sortie : **seul le débordement du document échoue**. Les
 * éléments larges vivant dans un conteneur à défilement sont listés à part,
 * pour le diagnostic, sans faire échouer l outil. Une version antérieure
 * comptait les deux ensemble et ressortait rouge sur une page saine — un
 * garde-fou qui crie sur du normal finit ignoré.
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

  /** Le plus proche ancêtre qui défile horizontalement, s'il y en a un. */
  const cadreDefilant = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') return p;
    }
    return null;
  };

  const decrire = (el, r) => ({
    tag: el.tagName.toLowerCase(),
    cls: (el.className && el.className.toString().slice(0, 60)) || '',
    left: Math.round(r.left),
    right: Math.round(r.right),
    width: Math.round(r.width),
    scrollW: el.scrollWidth,
    texte: (el.textContent || '').trim().slice(0, 40),
  });

  const coupables = [];
  const legitimes = [];
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      // On ne garde que les éléments dont aucun parent ne déborde déjà autant,
      // pour remonter à la cause plutôt qu'à ses conséquences.
      const p = el.parentElement;
      const pr = p ? p.getBoundingClientRect() : null;
      if (pr && pr.right > vw + 1 && Math.abs(pr.right - r.right) < 2) continue;

      const cadre = cadreDefilant(el);
      if (cadre) {
        legitimes.push({ ...decrire(el, r), dans: cadre.className.toString().slice(0, 40) });
      } else {
        coupables.push(decrire(el, r));
      }
    }
  }

  return JSON.stringify({
    viewport: vw,
    bodyScroll: document.body.scrollWidth,
    docScroll: document.documentElement.scrollWidth,
    // Le seul critère d'échec : la page elle-même déborde.
    echec: document.documentElement.scrollWidth > vw + 1,
    coupables: coupables.slice(0, 12),
    // Larges, mais dans un conteneur qui défile : c'est voulu.
    legitimes: legitimes.slice(0, 12),
  }, null, 2);
})()`;

const res = await envoyer('Runtime.evaluate', { expression: script, returnByValue: true });
const brut = res.result?.result?.value;
console.log(brut ?? JSON.stringify(res, null, 2));

ws.close();
chrome.kill();

let echec = false;
try {
  echec = JSON.parse(brut).echec;
} catch {
  echec = true; // pas de relevé lisible : c'est un échec, pas un succès
}
if (echec) console.error(`\nLe document déborde à ${LARGEUR} px.`);
process.exit(echec ? 1 : 0);
