/**
 * Garde-fou de l'atelier de pratique.
 *
 *   npm run audit:pratique
 *   MUSE_URL=http://localhost:4322 npm run audit:pratique   contre un build
 *
 * Pourquoi cet outil existe
 * -------------------------
 * Trois façons de casser en silence, une par outil :
 *
 *  · **le métronome** peut tourner sans jamais programmer un son — le bouton
 *    passe en « marche », le cycle s'allume, et rien ne sort. On mesure donc
 *    les clics réellement programmés sur le contexte audio, pas l'état du
 *    bouton ;
 *  · **le minuteur** peut compter sur une accumulation d'intervalles et
 *    dériver. On vérifie qu'il suit l'horloge système ;
 *  · **le journal** peut afficher une séance sans jamais l'écrire. On recharge
 *    et on regarde si elle est toujours là.
 *
 * Le son est capté en branchant un compteur sur `AudioContext.prototype`
 * avant que la page ne le crée : chaque `createOscillator` incrémente. C'est
 * la seule façon de savoir qu'un métronome sonne dans un navigateur muet.
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
const PORT = 9488;

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = execFile(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--autoplay-policy=no-user-gesture-required',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.TEMP ?? '/tmp'}/muse-audit-pratique`,
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

const cliquer = async (sel) => {
  const p = await evaluer(`(() => {
    const e = document.querySelector(${JSON.stringify(sel)});
    if (!e || e.disabled) return null;
    e.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = e.getBoundingClientRect();
    if (r.width === 0) return null;
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  })()`);
  if (!p) return false;
  for (const type of ['mousePressed', 'mouseReleased'])
    await envoyer('Input.dispatchMouseEvent', { type, ...p, button: 'left', clickCount: 1 });
  await attendre(300);
  return true;
};

const texte = (sel) =>
  evaluer(`document.querySelector(${JSON.stringify(sel)})?.textContent?.trim() ?? null`);

/** Écrit une valeur dans un champ contrôlé par React. */
const saisir = (sel, valeur, prototype = 'HTMLInputElement') =>
  evaluer(`(() => {
    const e = document.querySelector(${JSON.stringify(sel)});
    if (!e) return false;
    const set = Object.getOwnPropertyDescriptor(window.${prototype}.prototype, 'value').set;
    set.call(e, ${JSON.stringify(valeur)});
    e.dispatchEvent(new Event('input', { bubbles: true }));
    e.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);

await envoyer('Runtime.enable');
await envoyer('Page.enable');
await envoyer('Emulation.setDeviceMetricsOverride', {
  width: 1500,
  height: 1400,
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

/**
 * Compteur d'oscillateurs, posé avant tout script de la page.
 *
 * Un navigateur sans carte son ne dit rien de ce qu'il « joue ». En revanche
 * on peut compter les nœuds que le métronome fabrique : s'il n'en fabrique
 * aucun, il ne sonne pas, quelle que soit l'allure du bouton.
 */
await envoyer('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    window.__clics = 0;
    const brut = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (...a) {
      window.__clics++;
      return brut.apply(this, a);
    };
  `,
});

const problemes = [];
await envoyer('Page.navigate', { url: BASE + '/pratique' });
await attendre(2800);
await envoyer('Storage.clearDataForOrigin', { origin: BASE, storageTypes: 'indexeddb' });
await envoyer('Page.reload', { ignoreCache: true });
await attendre(2800);
exceptions = [];

/* ------------------------------------------------ 1. le métronome sonne */
await saisir('.me__tempo input[type="range"]', '120');
if (!(await cliquer('.me__jouer'))) problemes.push('métronome : bouton introuvable');
else {
  await attendre(2500);
  const clics = await evaluer('window.__clics');
  await cliquer('.me__jouer');
  // 120 bpm en noires ≈ 2 clics par seconde. On en attend au moins 3 en 2,5 s ;
  // en dessous, le programmateur ne tourne pas.
  if (typeof clics !== 'number' || clics < 3) {
    problemes.push(`métronome : ${clics} oscillateur(s) programmé(s) en 2,5 s — il ne sonne pas`);
  }
  console.log(`ok  le métronome sonne       ${clics} clics en 2,5 s à 120 bpm`);
}

/* ------------------------------ 2. les positions muettes ne sonnent pas */
await evaluer('window.__clics = 0');
// « Une fois par mesure » : une seule position sonore sur quatre.
const applique = await evaluer(`(() => {
  const b = [...document.querySelectorAll('.me__preset')]
    .find(e => /Une fois par mesure/.test(e.textContent));
  if (!b) return false;
  b.click();
  return true;
})()`);
if (!applique) problemes.push('métronome : motif « une fois par mesure » introuvable');
else {
  const muettes = await evaluer(`document.querySelectorAll('.me__pos--muet').length`);
  if (muettes !== 3) problemes.push(`motif : ${muettes} position(s) muette(s) au lieu de 3`);
  await cliquer('.me__jouer');
  await attendre(2500);
  const clics = await evaluer('window.__clics');
  await cliquer('.me__jouer');
  // Une position sur quatre à 120 bpm : ~1 clic toutes les 2 s. Sûrement
  // moins que les 5 d'un cycle plein sur la même durée.
  if (typeof clics !== 'number' || clics > 3) {
    problemes.push(`motif : ${clics} clics alors que trois positions sur quatre sont muettes`);
  }
  console.log(`ok  les muettes se taisent   ${clics} clics au lieu de ~5`);
}

/* --------------------------------------- 3. le minuteur suit l'horloge */
if (!(await cliquer('.mi__btn--fort'))) problemes.push('minuteur : bouton introuvable');
else {
  await attendre(3200);
  const affiche = await texte('.mi__temps');
  await cliquer('.mi__btn--fort'); // pause
  const secondes = (() => {
    const m = /^(\d+):(\d{2})$/.exec(affiche ?? '');
    return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
  })();
  if (secondes < 2 || secondes > 5) {
    problemes.push(`minuteur : ${affiche} après ~3 s — il ne suit pas l’horloge`);
  }
  console.log(`ok  le minuteur compte       ${affiche} après 3 s`);
}

/* ----------------------------------- 4. une séance notée survit au rechargement */
if (!(await cliquer('.jo__btn'))) problemes.push('journal : bouton de saisie introuvable');
else {
  await saisir('.jo__champ--court input', '25');
  await saisir('.jo__champ textarea', 'Séance de la sonde.', 'HTMLTextAreaElement');
  if (!(await cliquer('.jo__btn--fort'))) problemes.push('journal : bouton d’enregistrement introuvable');
  await attendre(800);

  const avant = await evaluer(`document.querySelectorAll('.jo__seance').length`);
  if (avant !== 1) problemes.push(`journal : ${avant} séance(s) affichée(s) après saisie`);

  await envoyer('Page.reload', { ignoreCache: true });
  await attendre(2800);
  const apres = await evaluer(`document.querySelectorAll('.jo__seance').length`);
  const note = await texte('.jo__note');
  if (apres !== 1) problemes.push(`journal : ${apres} séance(s) après rechargement — rien n’a été écrit`);
  if (note !== 'Séance de la sonde.') problemes.push(`journal : note perdue (« ${note} »)`);
  console.log(`ok  la séance a tenu         ${apres} séance · « ${note} »`);
}

/* ------------------------- 5. les champs santé de la fiche pilotent le minuteur */
await envoyer('Page.navigate', { url: `${BASE}/pratique?technique=tremolo` });
await attendre(2800);
const sante = await evaluer(`(() => ({
  choisie: document.querySelector('.pr__pilule select')?.value ?? null,
  arret: document.querySelector('.mi__arret-premier')?.textContent?.trim() ?? null,
  max: document.querySelector('.mi__sous')?.textContent?.trim() ?? null,
  bpm: document.querySelector('.me__bpm')?.textContent?.trim() ?? null,
}))()`);
if (sante?.choisie !== 'tremolo') problemes.push(`fiche : « ${sante?.choisie} » présélectionnée`);
if (!sante?.arret) problemes.push('santé : aucun signal d’arrêt affiché près du chronomètre');
if (!/max/.test(sante?.max ?? '')) problemes.push(`santé : durée maximale absente (« ${sante?.max} »)`);
// Le trémolo démarre à ♩40 dans ses paliers : le métronome doit s'y caler,
// pas rester sur son défaut. Le tempo est piloté par le parent, sans quoi la
// valeur du palier arrive après le montage et se fait écraser.
if (!/^40/.test(sante?.bpm ?? '')) {
  problemes.push(`tempo : le métronome affiche « ${sante?.bpm} » au lieu du ♩40 du palier`);
}
console.log(`ok  les champs santé suivent ${sante?.max} · ♩${String(sante?.bpm).replace(/\\D/g, '')}`);

for (const e of exceptions) problemes.push(`exception — ${e}`);

ws.close();
chrome.kill();

if (problemes.length) {
  console.log('\n✗ pratique');
  for (const p of problemes) console.log(`    ${p.slice(0, 400)}`);
  console.log(`\n${problemes.length} problème(s).`);
  process.exit(1);
}
console.log('\nPratique : le métronome sonne, le minuteur compte, le journal tient.');
