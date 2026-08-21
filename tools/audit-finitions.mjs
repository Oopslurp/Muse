/**
 * Garde-fou des finitions : recherche, impression, page introuvable.
 *
 *   npm run audit:finitions
 *   MUSE_URL=http://localhost:4322 npm run audit:finitions
 *
 * Trois choses qu'on ne voit jamais en développant.
 *
 * **La recherche** vit derrière une touche. Rien n'oblige à l'ouvrir, donc
 * rien ne dit qu'elle s'ouvre. Et son index est un fichier séparé : une faute
 * de chemin la rend muette sans un mot dans la console de la page d'accueil.
 *
 * **L'impression** ne se regarde pas non plus. Un bloc de commandes ou un
 * cadran d'accordeur imprimé au milieu d'une fiche ne se découvre qu'une fois
 * la feuille sortie. On force donc le média `print` et on vérifie ce qui reste
 * à l'écran.
 *
 * **Le 404** n'est visité que par accident, c'est-à-dire jamais pendant le
 * développement.
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { attendreCiblesChrome } from './chrome.mjs';

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
const PORT = 9496;

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = execFile(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.TEMP ?? '/tmp'}/muse-audit-finitions`,
  'about:blank',
]);
const cibles = await attendreCiblesChrome(PORT);
const ws = new WebSocket(cibles.find((c) => c.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const attente = new Map();
let exceptions = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && attente.has(m.id)) {
    attente.get(m.id)(m);
    attente.delete(m.id);
    return;
  }
  if (m.method === 'Runtime.exceptionThrown') {
    exceptions.push(m.params.exceptionDetails.exception?.description ?? '?');
  }
};
const envoyer = (method, params = {}) =>
  new Promise((r) => {
    const n = ++id;
    attente.set(n, r);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const evaluer = async (expression) =>
  (await envoyer('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }))
    .result?.result?.value;

const taper = async (texte) => {
  for (const c of texte) {
    await envoyer('Input.dispatchKeyEvent', { type: 'keyDown', text: c, key: c });
    await envoyer('Input.dispatchKeyEvent', { type: 'keyUp', key: c });
  }
};

await envoyer('Runtime.enable');
await envoyer('Page.enable');
await envoyer('Emulation.setDeviceMetricsOverride', {
  width: 1400,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

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

/* ------------------------------------------------ 1. la recherche s'ouvre */
await envoyer('Page.navigate', { url: BASE + '/' });
await attendre(2500);
exceptions = [];

// La touche `/` — c'est le raccourci annoncé partout, pas le bouton.
await envoyer('Input.dispatchKeyEvent', { type: 'keyDown', text: '/', key: '/' });
await envoyer('Input.dispatchKeyEvent', { type: 'keyUp', key: '/' });
await attendre(500);

const ouverte = await evaluer(`!!document.querySelector('.re__palette')?.open`);
if (!ouverte) problemes.push('recherche : la touche « / » n’ouvre pas la palette');
else {
  await taper('cejilla');
  await attendre(900);

  const r = await evaluer(`(() => {
    const items = [...document.querySelectorAll('.re__item')];
    return JSON.stringify({
      n: items.length,
      premier: items[0]?.querySelector('.re__titre')?.textContent ?? null,
      href: items[0]?.getAttribute('href') ?? null,
      message: document.querySelector('.re__rien:not([hidden])')?.textContent ?? null,
    });
  })()`);
  const { n, premier, href, message } = JSON.parse(r ?? '{}');

  // « cejilla » est un alias espagnol du barré : s'il ne sort rien, l'index
  // n'indexe pas les alias, ou n'a pas été chargé du tout.
  if (n === 0) problemes.push(`recherche : « cejilla » ne donne rien (${message ?? 'sans message'})`);
  else if (!/barr/i.test(premier ?? '')) {
    problemes.push(`recherche : « cejilla » donne « ${premier} » en premier`);
  }
  if (href && !href.startsWith('/techniques/')) {
    problemes.push(`recherche : le premier résultat pointe vers ${href}`);
  }
  console.log(`ok  la recherche répond      « cejilla » → ${premier} (${n} résultats)`);

  // Échap ferme — comportement natif de <dialog>, qu'on vérifie quand même.
  // ⚠️ Une touche non textuelle veut `rawKeyDown` et ses codes natifs :
  // sans eux Chrome reçoit l'événement mais n'exécute pas l'action par défaut.
  const echap = {
    key: 'Escape',
    code: 'Escape',
    windowsVirtualKeyCode: 27,
    nativeVirtualKeyCode: 27,
  };
  await envoyer('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...echap });
  await envoyer('Input.dispatchKeyEvent', { type: 'keyUp', ...echap });
  await attendre(400);
  if (await evaluer(`!!document.querySelector('.re__palette')?.open`)) {
    problemes.push('recherche : Échap ne referme pas la palette');
  }
}

/* --------------------------------------------- 2. l'impression d'une fiche */
await envoyer('Page.navigate', { url: BASE + '/techniques/tremolo' });
await attendre(2500);
await envoyer('Emulation.setEmulatedMedia', { media: 'print' });
await attendre(600);

const impression = await evaluer(`(() => {
  const visible = (s) => {
    const e = document.querySelector(s);
    if (!e) return false;
    const st = getComputedStyle(e);
    return st.display !== 'none' && st.visibility !== 'hidden' && e.getBoundingClientRect().height > 0;
  };
  return JSON.stringify({
    entete: visible('.header'),
    pied: visible('.footer'),
    suivi: visible('.sf'),
    commandes: visible('.lt__barre'),
    // Ce qui doit rester : le contenu, les paliers, la séance, la source.
    paliers: visible('.palier'),
    seance: document.querySelectorAll('[class*="seance"], .colle').length > 0,
    source: (() => {
      const p = document.querySelector('.source pre');
      return p ? getComputedStyle(p).display !== 'none' : null;
    })(),
  });
})()`);
const imp = JSON.parse(impression ?? '{}');

if (imp.entete) problemes.push('impression : l’en-tête de navigation s’imprime');
if (imp.pied) problemes.push('impression : le pied de page s’imprime');
if (imp.suivi) problemes.push('impression : le bloc de suivi s’imprime');
if (imp.commandes) problemes.push('impression : les commandes du lecteur s’impriment');
if (!imp.paliers) problemes.push('impression : les paliers ne s’impriment pas');
if (imp.source === false) problemes.push('impression : la source alphaTex reste repliée');
console.log(
  `ok  l’impression est propre  nav ${imp.entete ? '✗' : 'masquée'} · ` +
    `paliers ${imp.paliers ? 'gardés' : '✗'} · source ${imp.source ? 'dépliée' : '—'}`
);

await envoyer('Emulation.setEmulatedMedia', { media: '' });

/* ------------------------------------------------------ 3. page introuvable */
await envoyer('Page.navigate', { url: BASE + '/cette-page-nexiste-pas' });
await attendre(2000);
const p404 = await evaluer(`(() => JSON.stringify({
  titre: document.querySelector('h1')?.textContent?.trim() ?? null,
  sorties: document.querySelectorAll('.sorties a').length,
}))()`);
const q = JSON.parse(p404 ?? '{}');
if (!q.titre) problemes.push('404 : aucune page servie pour une adresse inconnue');
if ((q.sorties ?? 0) < 3) problemes.push(`404 : ${q.sorties} sortie(s) proposée(s)`);
console.log(`ok  le 404 oriente           « ${q.titre} » · ${q.sorties} sorties`);

for (const e of exceptions) problemes.push(`exception — ${e}`);

ws.close();
chrome.kill();

if (problemes.length) {
  console.log('\n✗ finitions');
  for (const p of problemes) console.log(`    ${p.slice(0, 400)}`);
  console.log(`\n${problemes.length} problème(s).`);
  process.exit(1);
}
console.log('\nFinitions : la recherche répond, la fiche s’imprime, le 404 oriente.');
