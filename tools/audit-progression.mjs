/**
 * Garde-fou de la progression : ce qu'on note survit-il à un rechargement ?
 *
 *   npm run audit:progression
 *   MUSE_URL=http://localhost:4322 npm run audit:progression   contre un build
 *
 * Pourquoi cet outil existe
 * -------------------------
 * Une progression locale qui ne se réécrit pas est le pire des défauts : tout
 * paraît fonctionner, les boutons répondent, les compteurs bougent — et au
 * rechargement suivant tout a disparu. Rien dans la console ne le dit.
 *
 * IndexedDB ajoute deux façons de casser silencieusement : une base ouverte au
 * moment du rendu serveur (Astro rend les îlots sous Node, où `indexedDB`
 * n'existe pas), et une écriture dont on n'attend pas la promesse.
 *
 * Le parcours vérifié :
 *  1. l'arbre s'affiche, les points d'entrée sont ouverts ;
 *  2. on marque une technique « tenue » → le compteur bouge ;
 *  3. on recharge → elle est toujours tenue, et ce qu'elle débloque s'ouvre ;
 *  4. la fiche correspondante montre le même état — même magasin ;
 *  5. on y note une observation, on recharge, elle est toujours là.
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
const PORT = 9486;

/** Un point d'entrée : aucun prérequis, donc « ouvert » dès le départ. */
const TECHNIQUE = 'ongles';
/** Sa seule dépendante, et qui n'a qu'elle comme prérequis : la marquer tenue
 *  doit donc ouvrir celle-ci, exactement. */
const DEBLOQUEE = 'apoyando-tirando';

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = execFile(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.TEMP ?? '/tmp'}/muse-audit-progression`,
  'about:blank',
]);
await attendre(2500);

const cibles = await (await fetch(`http://localhost:${PORT}/json/list`)).json();
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
  await attendre(400);
  return true;
};

const texte = (sel) =>
  evaluer(`document.querySelector(${JSON.stringify(sel)})?.textContent?.trim() ?? null`);

/** Clique le bouton d'un groupe d'états par son libellé. */
const choisirEtat = async (portee, libelle) => {
  const p = await evaluer(`(() => {
    const b = [...document.querySelectorAll(${JSON.stringify(portee)})]
      .find(e => e.textContent.trim() === ${JSON.stringify(libelle)});
    if (!b) return null;
    b.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = b.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  })()`);
  if (!p) return false;
  for (const type of ['mousePressed', 'mouseReleased'])
    await envoyer('Input.dispatchMouseEvent', { type, ...p, button: 'left', clickCount: 1 });
  await attendre(500);
  return true;
};

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

// Table rase : un profil Chrome réutilisé garderait la progression du run
// précédent et l'audit passerait sans rien avoir écrit.
await envoyer('Page.navigate', { url: BASE + '/arbre' });
await attendre(1500);
await envoyer('Storage.clearDataForOrigin', { origin: BASE, storageTypes: 'indexeddb' });
await envoyer('Page.reload', { ignoreCache: true });
await attendre(2500);
exceptions = [];

const problemes = [];
const compteurs = () =>
  evaluer(
    `[...document.querySelectorAll('.ar__compteur')].map(e => e.textContent.trim()).join(' | ')`
  );

/* ------------------------------------------------ 1. état de départ */
const depart = await evaluer(`(() => ({
  noeuds: document.querySelectorAll('.ar__noeud').length,
  ouverts: document.querySelectorAll('.ar__noeud--ouvert').length,
  acquis: document.querySelectorAll('.ar__noeud--acquis').length,
}))()`);
if (!depart || depart.noeuds < 30) problemes.push(`arbre : ${depart?.noeuds ?? 0} nœuds affichés`);
if (depart && depart.acquis !== 0) problemes.push(`arbre : ${depart.acquis} technique(s) déjà tenue(s) avant tout clic`);
if (depart && depart.ouverts === 0) problemes.push('arbre : aucun point d’entrée ouvert');
console.log(`ok  arbre affiché            ${depart?.noeuds} nœuds · ${depart?.ouverts} ouverts`);

/* ------------------------------------------------ 2. marquer « tenue » */
if (!(await cliquer(`[data-noeud="${TECHNIQUE}"]`))) {
  problemes.push(`nœud « ${TECHNIQUE} » introuvable`);
} else if (!(await choisirEtat('.ar__etat', 'Tenue'))) {
  problemes.push('bouton « Tenue » introuvable dans le panneau');
} else {
  // `textContent` colle les deux <span> du compteur : « 1tenues sur 32 ».
  const apres = await compteurs();
  if (!/^1\D/.test(apres ?? '')) problemes.push(`compteur inchangé après la note : « ${apres} »`);
  console.log(`ok  marquée tenue            ${apres}`);
}

/* ------------------------------------------------ 3. survit au rechargement */
await envoyer('Page.reload', { ignoreCache: true });
await attendre(2500);
const rechargee = await evaluer(`(() => {
  const n = document.querySelector('[data-noeud=${JSON.stringify(TECHNIQUE)}]');
  const d = document.querySelector('[data-noeud=${JSON.stringify(DEBLOQUEE)}]');
  return {
    acquis: n ? n.className.includes('ar__noeud--acquis') : null,
    debloquee: d ? d.className.includes('ar__noeud--ouvert') : null,
    compteur: document.querySelector('.ar__compteur')?.textContent?.trim() ?? null,
    ouverts: document.querySelectorAll('.ar__noeud--ouvert').length,
  };
})()`);
if (rechargee?.acquis !== true) {
  problemes.push('la technique n’est plus tenue après rechargement — rien n’a été écrit');
}
// Le décompte global ne bouge pas : la technique tenue cesse d'être ouverte
// pendant que sa dépendante s'ouvre. C'est celle-ci qu'il faut regarder.
if (rechargee?.debloquee !== true) {
  problemes.push(`« ${DEBLOQUEE} » ne s’est pas ouverte alors que son seul prérequis est tenu`);
}
console.log(`ok  survit au rechargement   ${rechargee?.compteur} · ${rechargee?.ouverts} ouverts`);

/* ------------------------------------------------ 4. la fiche voit le même état */
await envoyer('Page.navigate', { url: `${BASE}/techniques/${TECHNIQUE}` });
await attendre(2500);
await evaluer(`document.querySelector('.sf')?.scrollIntoView({ block: 'center', behavior: 'instant' })`);
await attendre(800);
const surFiche = await texte('.sf__etat--actif');
if (surFiche !== 'Tenue') {
  problemes.push(`fiche : état « ${surFiche} » au lieu de « Tenue » — magasins désynchronisés`);
}
console.log(`ok  la fiche suit            ${surFiche}`);

/* ------------------------------------------------ 5. observation persistante */
if (!(await cliquer('.sf .ob__declencheur'))) problemes.push('fiche : bouton d’observation introuvable');
else {
  await evaluer(`(() => {
    const t = document.querySelector('.sf .ob--saisie textarea');
    const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    set.call(t, 'Vérifié par la sonde.');
    t.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await attendre(300);
  if (!(await cliquer('.sf .ob__btn'))) problemes.push('fiche : bouton d’enregistrement introuvable');
  await attendre(600);

  await envoyer('Page.reload', { ignoreCache: true });
  await attendre(2500);
  await evaluer(`document.querySelector('.sf')?.scrollIntoView({ block: 'center', behavior: 'instant' })`);
  await attendre(800);
  const date = await texte('.sf .ob__date');
  const note = await texte('.sf .ob__note');
  if (!date || !/Observé le/.test(date)) problemes.push(`observation perdue au rechargement (« ${date} »)`);
  if (note !== 'Vérifié par la sonde.') problemes.push(`note perdue : « ${note} »`);
  console.log(`ok  observation conservée    ${date}`);
}

for (const e of exceptions) problemes.push(`exception — ${e}`);

/* ------------- 6. promotion d'UN doute, séparément de la fiche (A3) */
/**
 * Le cœur de la décision 1 : la promotion porte sur une affirmation, pas sur
 * une fiche. La fiche percussion porte neuf points douteux qui se lèvent un
 * par un — si un seul bouton les levait tous, on aurait retrouvé le défaut
 * qu'on venait de corriger.
 */
await envoyer('Page.navigate', { url: `${BASE}/techniques/percussion-kick-snare-golpe` });
await attendre(2800);
await evaluer(`document.querySelector('.doutes')?.setAttribute('open','')`);
await evaluer(`document.querySelector('.doutes')?.scrollIntoView({ block: 'center', behavior: 'instant' })`);
await attendre(1200);

const nbDoutes = await evaluer(`document.querySelectorAll('.doutes__liste > li').length`);
const nbBoutons = await evaluer(
  `document.querySelectorAll('.doutes__liste .ob__declencheur').length`
);
if (nbDoutes < 7) problemes.push(`doutes : ${nbDoutes} affiché(s), 7 attendus`);
if (nbBoutons !== nbDoutes) {
  problemes.push(`doutes : ${nbBoutons} bouton(s) de promotion pour ${nbDoutes} doute(s)`);
}

if (!(await cliquer('.doutes__liste li:nth-child(2) .ob__declencheur'))) {
  problemes.push('doutes : impossible de promouvoir le deuxième point');
} else {
  await evaluer(`(() => {
    const t = document.querySelector('.doutes__liste li:nth-child(2) .ob--saisie textarea');
    if (!t) return false;
    const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    set.call(t, 'Levé par la sonde.');
    t.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  await attendre(300);
  await cliquer('.doutes__liste li:nth-child(2) .ob__btn');
  await attendre(700);

  await envoyer('Page.reload', { ignoreCache: true });
  await attendre(2800);
  await evaluer(`document.querySelector('.doutes')?.setAttribute('open','')`);
  await attendre(1000);

  const etat = await evaluer(`(() => {
    const lis = [...document.querySelectorAll('.doutes__liste > li')];
    return JSON.stringify({
      faits: document.querySelectorAll('.doutes__liste .ob--fait').length,
      deuxieme: lis[1]?.querySelector('.ob__note')?.textContent?.trim() ?? null,
      // Le texte du doute doit rester écrit : on ajoute, on ne retire pas.
      texte: (lis[1]?.querySelector('.doutes__texte')?.textContent ?? '').length,
    });
  })()`);
  const { faits, deuxieme, texte: longueur } = JSON.parse(etat ?? '{}');

  if (faits !== 1) problemes.push(`doutes : ${faits} point(s) levé(s) au lieu d’un seul`);
  if (deuxieme !== 'Levé par la sonde.') problemes.push(`doutes : note perdue (« ${deuxieme} »)`);
  if (!longueur) problemes.push('doutes : le texte du doute a disparu une fois levé');
  console.log(`ok  un doute levé, un seul   ${faits} sur ${nbDoutes} · « ${deuxieme} »`);
}

if (problemes.length) {
  console.log('\n✗ progression');
  for (const p of problemes) console.log(`    ${p.slice(0, 400)}`);
  console.log(`\n${problemes.length} problème(s).`);
  ws.close();
  chrome.kill();
  process.exit(1);
}
ws.close();
chrome.kill();
console.log('\nProgression : écrite, relue, et chaque affirmation se promeut seule.');
