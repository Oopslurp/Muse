/**
 * Garde-fou du téléphone : aucune page ne déborde horizontalement.
 *
 *   npm run audit:mobile
 *   MUSE_URL=http://localhost:4322 npm run audit:mobile   contre un build
 *
 * Pourquoi cet outil existe
 * -------------------------
 * `audit:console` mesure le débordement, mais à 1500 px, où il n'y en a
 * jamais. Les vrais débordements arrivent en dessous de 400 px et ont tous la
 * même cause : **un enfant de grille ou de flex garde `min-width: auto`** et
 * refuse de descendre sous la largeur minimale de son contenu. Il suffit d'un
 * élément en `white-space: nowrap` — une pastille de tempo, un `<select>` dont
 * la plus longue option fait quarante caractères — pour élargir toute la page.
 *
 * Deuxième cause, aussi discrète : `repeat(auto-fit, minmax(21rem, 1fr))`
 * impose un plancher de 336 px, plus large qu'un iPhone SE. La forme correcte
 * est `minmax(min(21rem, 100%), 1fr)`.
 *
 * Ce qui vit dans un conteneur à défilement — le graphe de l'arbre, les
 * tablatures — est ignoré : c'est le comportement voulu.
 *
 * ⚠️ Chrome headless borne une fenêtre à ~485 px. On passe donc par
 * `Emulation.setDeviceMetricsOverride`, qui force de vraies métriques.
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => existsSync(p));

if (!CHROME) {
  console.error('Aucun navigateur Chromium trouvé.');
  process.exit(1);
}

const BASE = (process.env.MUSE_URL ?? 'http://localhost:4321').replace(/\/$/, '');
const PORT = 9492;

/** 320 px : le plus étroit qu'on rencontre encore. 390 : un téléphone courant. */
const LARGEURS = [320, 390];

const ROUTES = [
  '/',
  '/techniques',
  '/techniques/tremolo',
  '/techniques/percussion-kick-snare-golpe',
  '/accordeur',
  '/arbre',
  '/pratique',
  '/style-guide',
];

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = execFile(CHROME, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.TEMP ?? '/tmp'}/muse-audit-mobile`,
  'about:blank',
]);
await attendre(2500);

const cibles = await (await fetch(`http://localhost:${PORT}/json/list`)).json();
const ws = new WebSocket(cibles.find((c) => c.type === 'page').webSocketDebuggerUrl);
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
const evaluer = async (expression) =>
  (await envoyer('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;

await envoyer('Page.enable');
await envoyer('Runtime.enable');

try {
  const sonde = await fetch(BASE + '/', { redirect: 'follow' });
  if (!sonde.ok) throw new Error(`HTTP ${sonde.status}`);
} catch (e) {
  console.error(`\n${BASE} ne répond pas (${e.message}).`);
  ws.close();
  chrome.kill();
  process.exit(2);
}

const problemes = [];

for (const largeur of LARGEURS) {
  await envoyer('Emulation.setDeviceMetricsOverride', {
    width: largeur,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  console.log(`\nÀ ${largeur} px\n`);

  for (const route of ROUTES) {
    await envoyer('Page.navigate', { url: BASE + route });
    await attendre(2400);

    const brut = await evaluer(`(() => {
      const de = document.documentElement;
      const trop = de.scrollWidth - de.clientWidth;
      if (trop <= 1) return JSON.stringify({ trop: 0, coupables: [] });
      const coupables = [...document.querySelectorAll('*')]
        .filter((e) => {
          const b = e.getBoundingClientRect();
          if (b.right <= de.clientWidth + 1 && b.left >= -1) return false;
          // Ce qui défile dans son propre cadre est prévu pour.
          for (let p = e.parentElement; p; p = p.parentElement) {
            const o = getComputedStyle(p).overflowX;
            if (o === 'auto' || o === 'scroll' || o === 'hidden') return false;
          }
          return true;
        })
        .slice(0, 4)
        .map((e) => {
          const c = typeof e.className === 'string' ? e.className.trim().split(' ')[0] : '';
          return e.tagName.toLowerCase() + (c ? '.' + c : '') +
            ' → ' + Math.round(e.getBoundingClientRect().right) + ' px';
        });
      return JSON.stringify({ trop, coupables });
    })()`);

    const { trop, coupables } = JSON.parse(brut ?? '{"trop":0,"coupables":[]}');
    if (trop > 1) {
      problemes.push(`${route} à ${largeur} px — déborde de ${trop} px`);
      console.log(`✗   ${route.padEnd(42)} +${trop} px`);
      for (const c of coupables) console.log(`      ${c}`);
    } else {
      console.log(`ok  ${route.padEnd(42)} aucun débordement`);
    }
  }
}

ws.close();
chrome.kill();

if (problemes.length) {
  console.log(`\n${problemes.length} débordement(s).`);
  process.exit(1);
}
console.log(`\n${ROUTES.length} routes × ${LARGEURS.length} largeurs : aucun débordement.`);
