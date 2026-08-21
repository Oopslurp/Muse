/**
 * Garde-fou de l'accordeur : joue une note connue dans un faux micro et
 * vérifie que l'écran affiche la bonne.
 *
 *   npm run audit:accordeur
 *   MUSE_URL=http://localhost:4322 npm run audit:accordeur   contre un build
 *
 * Pourquoi cet outil existe
 * -------------------------
 * `npm run test:accordeur` vérifie le moteur, qui ne connaît ni le navigateur
 * ni React. Il ne dit rien de la chaîne réelle : contraintes `getUserMedia`,
 * filtres Web Audio, calibrage, câblage de l'îlot. Un accordeur peut être
 * juste au hertz près et n'afficher rien du tout.
 *
 * Chrome sait remplacer le microphone par un fichier WAV
 * (`--use-file-for-fake-audio-capture`). On lui donne un mi2 détendu de
 * 30 cents et on demande à la page ce qu'elle en dit.
 *
 * Deux cas, dans cet ordre :
 *  1. **micro refusé** — l'écran doit nommer la panne ET la marche à suivre.
 *     C'est la première cause de « ça ne marche pas » ;
 *  2. **micro accordé** — la note, le sens de la correction et l'écart.
 *
 * ⚠️ Le fichier commence par trois secondes de silence : l'accordeur calibre
 * le bruit de la pièce pendant les deux premières. Une note tenue pendant le
 * calibrage placerait le seuil au-dessus d'elle, et le gate ne s'ouvrirait
 * jamais.
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { attendreCiblesChrome } from './chrome.mjs';
import { drapeauxFauxMicro, fabriquerCorde } from './faux-micro.mjs';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => existsSync(p));

if (!CHROME) {
  console.error('Aucun navigateur Chromium trouvé. Chrome est requis : Edge n’a pas les');
  console.error('drapeaux de faux périphérique audio.');
  process.exit(1);
}

const BASE = (process.env.MUSE_URL ?? 'http://localhost:4321').replace(/\/$/, '');
const PORT = 9484;

/** Ce qu'on joue, et ce qu'on doit lire à l'écran. */
const NOTE = { nom: 'E2', hz: 82.4069, ecartCents: -30 };

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/* --------------------------------------------------------------- pilote */

const wav = fabriquerCorde(NOTE.hz, NOTE.ecartCents, 'mi2-detendu');

const chrome = execFile(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  ...drapeauxFauxMicro(wav),
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.TEMP ?? '/tmp'}/muse-audit-accordeur`,
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
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  })()`);
  if (!p) return false;
  for (const type of ['mousePressed', 'mouseReleased'])
    await envoyer('Input.dispatchMouseEvent', { type, ...p, button: 'left', clickCount: 1 });
  return true;
};

const texte = (sel) =>
  evaluer(`document.querySelector(${JSON.stringify(sel)})?.textContent?.trim() ?? null`);

await envoyer('Runtime.enable');
await envoyer('Page.enable');
await envoyer('Emulation.setDeviceMetricsOverride', {
  width: 1500,
  height: 1200,
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
const url = BASE + '/accordeur';

/* ------------------------------------------ 1. micro refusé */
await envoyer('Browser.setPermission', {
  origin: BASE,
  permission: { name: 'microphone' },
  setting: 'denied',
});
await envoyer('Page.navigate', { url });
await attendre(2500);
exceptions = [];

if (!(await cliquer('.ac__demarrer'))) problemes.push('refus : bouton d’activation introuvable');
else {
  await attendre(1500);
  const message = await texte('.ac__panne-titre');
  const remede = await texte('.ac__panne-remede');
  if (!message) problemes.push('refus : aucune panne affichée — l’échec est silencieux');
  if (!remede) problemes.push('refus : la panne ne dit pas quoi faire');
  const bouton = await texte('.ac__demarrer');
  if (bouton !== 'Réessayer') problemes.push(`refus : le bouton dit « ${bouton} » au lieu de « Réessayer »`);
  console.log(`ok  micro refusé            ${message ? `« ${message} »` : '—'}`);
}

/* ------------------------------------------ 2. micro accordé, note connue */
await envoyer('Browser.setPermission', {
  origin: BASE,
  permission: { name: 'microphone' },
  setting: 'granted',
});
await envoyer('Page.navigate', { url });
await attendre(2500);
exceptions = [];

if (!(await cliquer('.ac__demarrer'))) problemes.push('signal : bouton d’activation introuvable');
else {
  // Trois secondes de silence dans le fichier, deux de calibrage, puis la note.
  let vu = null;
  for (let i = 0; i < 30 && !vu; i++) {
    await attendre(500);
    const n = await texte('.ac__note');
    if (n && n !== '—') {
      vu = {
        note: n,
        sens: await texte('.ac__sens'),
        cents: await texte('.ac__cents'),
      };
    }
  }

  if (!vu) problemes.push('signal : aucune note affichée après 15 s');
  else {
    if (vu.note !== NOTE.nom) problemes.push(`signal : « ${vu.note} » au lieu de « ${NOTE.nom} »`);
    // Détendue de 30 cents : il faut tendre.
    if (!/tends/i.test(vu.sens ?? '') || /détends/i.test(vu.sens ?? '')) {
      problemes.push(`signal : sens « ${vu.sens} » au lieu de « tends »`);
    }
    const cents = Number.parseFloat((vu.cents ?? '').replace(',', '.'));
    if (!Number.isFinite(cents) || Math.abs(cents - NOTE.ecartCents) > 10) {
      problemes.push(`signal : ${vu.cents} au lieu de ${NOTE.ecartCents} cents environ`);
    }
    console.log(`ok  micro accordé          ${vu.note} · ${vu.sens} · ${vu.cents}`);
  }

  // La corde entendue doit s'allumer dans la rangée.
  const actives = await evaluer(`document.querySelectorAll('.ac__corde--actif').length`);
  if (actives !== 1) problemes.push(`signal : ${actives} corde(s) mise(s) en évidence au lieu d’une`);

  // Verrouiller la corde : c'est le réglage sûr sur les graves, celui qui
  // referme la fenêtre de plausibilité et interdit l'erreur d'octave.
  if (await cliquer('[data-corde="6"]')) {
    await attendre(1200);
    const verrous = await evaluer(`document.querySelectorAll('.ac__corde--verrou').length`);
    if (verrous !== 1) problemes.push(`verrou : ${verrous} corde(s) verrouillée(s) au lieu d’une`);
    const note = await texte('.ac__note');
    if (note !== NOTE.nom) problemes.push(`verrou : la note passe à « ${note} »`);
    console.log(`ok  corde verrouillée       ${note}`);
  } else problemes.push('verrou : bouton de corde introuvable');

  // Mode chromatique : plus de cordes, la référence redevient le demi-ton.
  const onglets = await evaluer(`(() => {
    const b = [...document.querySelectorAll('.ac__onglet')].find(e => /Chromatique/.test(e.textContent));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  })()`);
  if (!onglets) problemes.push('chromatique : onglet introuvable');
  else {
    for (const type of ['mousePressed', 'mouseReleased'])
      await envoyer('Input.dispatchMouseEvent', { type, ...onglets, button: 'left', clickCount: 1 });
    await attendre(1500);
    const cordes = await evaluer(`!!document.querySelector('.ac__manche')`);
    if (cordes) problemes.push('chromatique : la tête de manche est restée affichée');
    const note = await texte('.ac__note');
    if (!note || note === '—') problemes.push('chromatique : plus rien n’est détecté');
    console.log(`ok  chromatique libre       ${note}`);
  }

  // Et le micro doit se couper proprement.
  if (await cliquer('.ac__stop')) {
    await attendre(600);
    const revenu = await evaluer(`!!document.querySelector('.ac__demarrer')`);
    if (!revenu) problemes.push('l’arrêt ne ramène pas l’écran d’activation');
  } else problemes.push('bouton d’arrêt introuvable');
}

for (const e of exceptions) problemes.push(`exception — ${e}`);

ws.close();
chrome.kill();

if (problemes.length) {
  console.log('\n✗ /accordeur');
  for (const p of problemes) console.log(`    ${p.slice(0, 400)}`);
  console.log(`\n${problemes.length} problème(s).`);
  process.exit(1);
}
console.log('\nAccordeur : refus et détection vérifiés au navigateur.');
