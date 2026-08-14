/**
 * Garde-fou de poids et d'isolement.
 *
 *   npm run audit:poids
 *   MUSE_URL=http://localhost:4322 npm run audit:poids   contre un build
 *
 * Deux invariants que rien ne vérifiait jusqu'ici.
 *
 * **1. Aucun appel réseau hors origine.** CLAUDE.md décision 8 : pas de CDN,
 * pas de Google Fonts, pas d'appel réseau à l'exécution. Tout est servi depuis
 * le bundle. C'est une règle facile à enfreindre sans s'en apercevoir — une
 * police importée par une feuille tierce, une image d'exemple, un script
 * d'analyse ajouté « juste pour voir ». Elle ne se voit ni au build ni à
 * l'écran ; seule la liste des requêtes la trahit.
 *
 * **2. Un budget de poids par route.** Un site qui grossit de 40 Ko par
 * tranche est un site dont personne ne remarque qu'il a doublé.
 *
 * ⚠️ Le budget porte sur le **chargement initial**, avant toute interaction.
 * Le lecteur de tablature et l'accordeur chargent leur machinerie au premier
 * clic : c'est justement pourquoi ils sont paresseux, et les compter ici
 * punirait le bon comportement.
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
const PORT = 9490;

/**
 * Budget de chargement initial, en kilooctets transférés.
 *
 * Les valeurs sont calées sur le mesuré au moment de la tranche 7, avec une
 * marge d'environ 25 %. Elles ne décrivent pas un idéal : elles empêchent une
 * dérive silencieuse. Les relever demande de le vouloir.
 */
const BUDGET = {
  '/': 260,
  '/techniques': 290,
  '/techniques/tremolo': 280,
  '/accordeur': 290,
  '/arbre': 350,
  '/pratique': 350,
};

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = execFile(CHROME, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.TEMP ?? '/tmp'}/muse-audit-poids`,
  'about:blank',
]);
await attendre(2500);

const cibles = await (await fetch(`http://localhost:${PORT}/json/list`)).json();
const ws = new WebSocket(cibles.find((c) => c.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const attente = new Map();
let requetes = [];

ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && attente.has(m.id)) {
    attente.get(m.id)(m);
    attente.delete(m.id);
    return;
  }
  if (m.method === 'Network.responseReceived') {
    requetes.push({ url: m.params.response.url, octets: 0 });
  }
  if (m.method === 'Network.loadingFinished') {
    const derniere = requetes[requetes.length - 1];
    if (derniere) derniere.octets = m.params.encodedDataLength;
  }
};

const envoyer = (method, params = {}) =>
  new Promise((r) => {
    const n = ++id;
    attente.set(n, r);
    ws.send(JSON.stringify({ id: n, method, params }));
  });

await envoyer('Network.enable');
await envoyer('Page.enable');
await envoyer('Emulation.setDeviceMetricsOverride', {
  width: 1500,
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});
// Cache vide : on mesure ce que voit un visiteur qui arrive.
await envoyer('Network.setCacheDisabled', { cacheDisabled: true });

try {
  const sonde = await fetch(BASE + '/', { redirect: 'follow' });
  if (!sonde.ok) throw new Error(`HTTP ${sonde.status}`);
} catch (e) {
  console.error(`\n${BASE} ne répond pas (${e.message}).`);
  ws.close();
  chrome.kill();
  process.exit(2);
}

const origine = new URL(BASE).origin;
const problemes = [];
let total = 0;

console.log(`\nBudget de chargement initial · origine ${origine}\n`);

for (const [route, budget] of Object.entries(BUDGET)) {
  requetes = [];
  await envoyer('Page.navigate', { url: BASE + route });
  await attendre(2600);

  const octets = requetes.reduce((a, r) => a + r.octets, 0);
  const ko = Math.round(octets / 1024);
  total += octets;

  // Invariant 1 — rien ne sort de l'origine.
  const dehors = requetes
    .map((r) => r.url)
    .filter((u) => /^https?:/i.test(u) && new URL(u).origin !== origine);
  for (const u of [...new Set(dehors)]) {
    problemes.push(`${route} — appel hors origine : ${u}`);
  }

  // Invariant 2 — le budget.
  const verdict = ko > budget ? '✗' : 'ok';
  if (ko > budget) problemes.push(`${route} — ${ko} Ko pour un budget de ${budget} Ko`);

  console.log(
    `${verdict.padEnd(4)}${route.padEnd(24)} ${String(ko).padStart(4)} Ko` +
      ` / ${String(budget).padStart(4)} Ko · ${requetes.length} requête(s)`
  );
}

ws.close();
chrome.kill();

console.log(`\nTotal des routes mesurées : ${Math.round(total / 1024)} Ko`);

if (problemes.length) {
  console.log('\n✗ poids');
  for (const p of problemes) console.log(`    ${p}`);
  console.log(`\n${problemes.length} problème(s).`);
  process.exit(1);
}
console.log('Aucun appel hors origine, aucun budget dépassé.');
