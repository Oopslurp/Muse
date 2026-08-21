/**
 * Garde-fou de lecture : appuie réellement sur « lire » et vérifie que la
 * partition défile.
 *
 *   npm run audit:lecture
 *   MUSE_URL=http://localhost:4322 npm run audit:lecture   contre un build
 *   npm run audit:lecture -- /techniques/tremolo#ex-a       un lecteur précis
 *
 * Pourquoi cet outil existe
 * -------------------------
 * Toute la tranche 3 a été livrée avec un lecteur muet. alphaTab charge son
 * worker de synthèse par `new URL('./alphaTab.worker.mjs', import.meta.url)` ;
 * une fois le paquet pré-bundlé par Vite, cette URL pointe dans
 * `node_modules/.vite/deps/`, où le fichier n'existe pas.
 *
 * `new Worker()` ne lève pas sur une URL absente : le worker meurt en silence
 * à son chargement. Aucune exception, aucune erreur console, aucune requête en
 * échec visible côté page. `audit:console` voyait cinq routes parfaitement
 * saines, et les captures montraient de belles partitions.
 *
 * Charger la page ne prouve pas que le lecteur joue. Il faut appuyer.
 *
 * Ce que l'audit vérifie, lecteur par lecteur :
 *  1. aucun worker ni contexte audio avant le clic — le lecteur est paresseux ;
 *  2. la lecture démarre et le curseur avance ;
 *  3. rien n'est tombé en chemin (exception, message d'erreur du lecteur).
 *
 * Le premier lecteur garde son décompte, et l'audit vérifie en plus que le
 * compteur s'affiche et que le curseur reste masqué tant que les clics tournent.
 * alphaTab n'émet aucune position pendant le décompte : le curseur y glissait
 * d'une note par pure animation, ce qui donnait une lecture qui avance sans
 * rien jouer. Les lecteurs suivants coupent le décompte, qui coûte une mesure.
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
const PORT = 9482;

/**
 * Un lecteur ordinaire, et celui de la fiche percussion — la seule dont
 * `audioFidele` est faux, donc celle où la lecture reste active malgré des
 * réserves (CLAUDE.md, décision 10). Si un jour on la désactivait par erreur,
 * cet audit le dirait.
 */
const CIBLES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['/techniques/tremolo#ex-a', '/techniques/percussion-kick-snare-golpe#ex-b'];

/** Secondes d'observation du curseur avant de conclure à l'immobilité. */
const OBSERVATION = 12;

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = execFile(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.TEMP ?? '/tmp'}/muse-audit-lecture`,
  'about:blank',
]);
const cibles = await attendreCiblesChrome(PORT);
const ws = new WebSocket(cibles.find((c) => c.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const attente = new Map();
let exceptions = [];
let requetes = [];

ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && attente.has(m.id)) {
    attente.get(m.id)(m);
    attente.delete(m.id);
    return;
  }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    exceptions.push(d.exception?.description ?? d.text);
  }
  if (m.method === 'Network.requestWillBeSent') requetes.push(m.params.request.url);
};

const envoyer = (method, params = {}) =>
  new Promise((r) => {
    const n = ++id;
    attente.set(n, r);
    ws.send(JSON.stringify({ id: n, method, params }));
  });

const evaluer = async (expression) =>
  (
    await envoyer('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  ).result?.result?.value;

/** Clic à la position réelle de l'élément : `Input.*` accorde l'activation
 *  utilisateur, sans laquelle aucun contexte audio ne démarre. */
const cliquer = async (sel) => {
  const p = await evaluer(`(() => {
    const e = document.querySelector(${JSON.stringify(sel)});
    if (!e || e.disabled) return null;
    const r = e.getBoundingClientRect();
    if (r.width === 0) return null;
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  })()`);
  if (!p) return false;
  for (const type of ['mousePressed', 'mouseReleased'])
    await envoyer('Input.dispatchMouseEvent', { type, ...p, button: 'left', clickCount: 1 });
  return true;
};

/** Abscisse du curseur de temps. alphaTab l'anime en `transform`, jamais en `left`. */
const abscisseCurseur = async (portee) =>
  evaluer(`(() => {
    const b = document.querySelector(${JSON.stringify(portee + ' .at-cursor-beat')});
    const m = /translate\\(([\\d.]+)px/.exec(b?.style?.transform ?? '');
    return m ? Math.round(parseFloat(m[1])) : -1;
  })()`);

await envoyer('Runtime.enable');
await envoyer('Page.enable');
await envoyer('Network.enable');
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
  console.error('Démarrer `npm run dev`, ou pointer MUSE_URL sur un serveur actif.');
  ws.close();
  chrome.kill();
  process.exit(2);
}

let echecs = 0;

for (const [rang, cible] of CIBLES.entries()) {
  const [route, ancre] = cible.split('#');
  const portee = ancre ? `#${ancre} .lt` : '.lt';
  const avecDecompte = rang === 0;
  const problemes = [];
  exceptions = [];

  await envoyer('Page.navigate', { url: BASE + route });
  await attendre(2500);

  requetes = [];
  if (ancre) {
    await evaluer(`document.querySelector('#${ancre}')
      ?.scrollIntoView({ block: 'start', behavior: 'instant' })`);
  }
  // L'îlot s'hydrate à l'entrée dans le viewport, puis alphaTab compose.
  await attendre(4000);

  // 1. Paresse : rien d'audio ne doit avoir été demandé avant le clic.
  const premature = requetes.filter((u) => /alphaTab\.worker|alphaTab\.worklet|\.sf3/i.test(u));
  if (premature.length) {
    problemes.push(`machinerie audio chargée avant tout appui : ${premature[0]}`);
  }

  const bouton = `${portee} .lt__jouer`;
  if (!(await evaluer(`!!document.querySelector(${JSON.stringify(bouton)})`))) {
    problemes.push(`aucun lecteur trouvé sous ${portee}`);
  } else {
    // Décompte coupé sauf sur le premier : une mesure à ♩40 fait six secondes.
    if (!avecDecompte) await cliquer(`${portee} .lt__case:nth-of-type(2) input`);

    if (!(await cliquer(bouton))) problemes.push('bouton de lecture désactivé');
    else {
      if (avecDecompte) {
        // On attend le **deuxième** clic : un compteur figé sur « 1 » prouverait
        // seulement que le voile s'affiche, pas qu'il suit le métronome. Entre
        // l'apparition du voile et le premier clic, il montre un point.
        let vu = null;
        for (let i = 0; i < 24 && !vu; i++) {
          await attendre(400);
          vu = await evaluer(`(() => {
            const l = document.querySelector(${JSON.stringify(portee)});
            const n = l?.querySelector('.lt__decompte-n');
            const t = n?.textContent?.trim() ?? '';
            if (!/^[2-9]\\d*\\/\\d+$/.test(t)) return null;
            const c = l.querySelector('.at-cursor-beat');
            return JSON.stringify({
              compte: t,
              curseur: c ? getComputedStyle(c).opacity : '0',
            });
          })()`);
        }
        if (!vu) problemes.push("le décompte ne s'affiche pas, ou son compteur n'avance pas");
        else if (JSON.parse(vu).curseur !== '0') {
          problemes.push('le curseur reste visible pendant le décompte — il avance sans son');
        }
      }

      // 2. Le curseur avance-t-il ?
      let depart = -1;
      let bouge = false;
      for (let i = 0; i < OBSERVATION; i++) {
        await attendre(1000);
        const x = await abscisseCurseur(portee);
        if (x >= 0 && depart < 0) depart = x;
        // Une boucle ou un passage à la ligne ramène l'abscisse en arrière :
        // c'est un mouvement, pas une immobilité.
        if (depart >= 0 && x >= 0 && Math.abs(x - depart) > 20) bouge = true;
        if (bouge) break;
      }
      if (!bouge) {
        problemes.push(
          `le curseur n'a pas bougé en ${OBSERVATION} s (x=${depart}) — ` +
            'la lecture ne démarre pas'
        );
      }

      const etat = await evaluer(`(() => {
        const l = document.querySelector(${JSON.stringify(portee)});
        return JSON.stringify({
          erreur: l?.querySelector('.lt__erreur')?.textContent?.trim() ?? null,
          tourne: !!l?.querySelector('.lt__spin'),
          aria: l?.querySelector('.lt__jouer')?.getAttribute('aria-label'),
        });
      })()`);
      const { erreur, tourne, aria } = JSON.parse(etat ?? '{}');
      if (erreur) problemes.push(`le lecteur signale : ${erreur}`);
      if (tourne) problemes.push('le disque de chargement tourne toujours');
      if (aria !== 'Pause') problemes.push(`le bouton n'est pas passé en pause (${aria})`);
    }
  }

  for (const e of exceptions) problemes.push(`exception — ${e}`);

  if (problemes.length) {
    echecs++;
    console.log(`\n✗ ${cible}`);
    for (const p of problemes) console.log(`    ${p.slice(0, 400)}`);
  } else {
    console.log(`ok  ${cible.padEnd(46)} lecture confirmée`);
  }
}

ws.close();
chrome.kill();

console.log(`\n${CIBLES.length} lecteur(s) — ${CIBLES.length - echecs} qui joue(nt), ${echecs} muet(s).`);
process.exit(echecs > 0 ? 1 : 0);
