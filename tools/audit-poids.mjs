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
 * ⚠️ Le budget initial porte sur ce qui arrive **avant toute interaction**. Le
 * lecteur de tablature charge sa machinerie au premier clic : c'est justement
 * pourquoi il est paresseux, et le compter au chargement punirait le bon
 * comportement.
 *
 * **3. Un second budget, pour ce qui arrive au clic.** Le poids d'alphaTab est
 * accepté — le curseur qui suit la lecture est le cœur de l'outil, et un rendu
 * statique ne le remplace pas. Mais accepté n'est pas ignoré : trois mégaoctets
 * qu'aucun chiffre ne consigne redeviennent invisibles à la tranche suivante.
 * Ce budget-là est séparé du premier parce qu'il répond à une autre question :
 * non pas « qu'est-ce que je paie pour lire une page ? », mais « qu'est-ce que
 * je paie pour entendre un exercice ? ».
 */

import { execFile } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
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

/**
 * Budget de **chargement différé**, en kilooctets, par geste.
 *
 * Ce qui descend au premier appui sur « lire » : le lecteur, le worker de
 * synthèse, le worklet audio — chacun embarque le cœur d'alphaTab — plus la
 * banque de sons. Le total est connu et assumé (décision de la tranche 8) ;
 * ce chiffre existe pour qu'il le reste.
 */
const DIFFERE = {
  '/techniques/tremolo': {
    geste: 'appui sur « lire »',
    clic: '#ex-a .lt .lt__jouer',
    ancre: '#ex-a',
    /** Ce que la **page** télécharge : la banque de sons, et elle seule. */
    budget: 600,
  },
};

/**
 * Poids des morceaux différés, lu dans `dist/` et non sur le réseau.
 *
 * ⚠️ Le worker de synthèse et le worklet audio sont chargés par le contexte du
 * worker, pas par celui de la page : leurs requêtes n'apparaissent **pas** dans
 * le domaine Network de la cible page, et la mesure au clic ne voit que la
 * banque de sons. Les compter demanderait de s'attacher à chaque worker.
 *
 * Le fichier construit dit la même chose, en plus simple et sans dépendre du
 * moment où on regarde. Budget en kilooctets **non compressés** : c'est la
 * grandeur qui a servi à décider, et la seule qui ne varie pas avec l'encodage
 * de l'hébergeur.
 */
const MORCEAUX_DIFFERES = [
  { motif: /^LecteurTab\..*\.js$/, quoi: 'lecteur' },
  { motif: /^alphaTab\.worker.*\.js$/, quoi: 'worker de synthèse' },
  { motif: /^alphaTab\.worklet.*\.js$/, quoi: 'worklet audio' },
];
/**
 * 4326 Ko mesurés. La marge est **serrée** — 6 %, contre 25 % pour le budget
 * initial : c'est déjà le poste le plus lourd du site, et le relever doit
 * demander de le vouloir. Le lecteur, le worker et le worklet embarquent
 * chacun le cœur d'alphaTab ; c'est là que se logerait une dérive.
 */
const BUDGET_DIFFERE_TOTAL = 4600;

/**
 * Temps jusqu'au premier rendu, en millisecondes, sur un serveur local.
 *
 * ⚠️ Ce n'est **pas** une mesure de performance perçue : pas de latence réseau,
 * pas de processeur bridé, une machine de développement. Ce chiffre ne dit rien
 * de ce que vit un visiteur sur un téléphone en 4G — il sert uniquement à
 * détecter une dérive entre deux tranches, à conditions identiques. Le
 * confondre avec un score Lighthouse serait se mentir.
 *
 * Médiane sur trois chargements : un premier rendu isolé varie de 30 % d'une
 * mesure à l'autre, et une valeur unique ferait échouer l'audit au hasard.
 */
const BUDGET_FCP = 900;
const CHARGEMENTS = 3;
const mesures = [];

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = execFile(CHROME, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.TEMP ?? '/tmp'}/muse-audit-poids`,
  'about:blank',
]);
const cibles = await attendreCiblesChrome(PORT);
const ws = new WebSocket(cibles.find((c) => c.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const attente = new Map();
let requetes = [];
/** `requestId` → entrée, pour attribuer les octets à la bonne requête. */
const parRequete = new Map();

ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && attente.has(m.id)) {
    attente.get(m.id)(m);
    attente.delete(m.id);
    return;
  }
  // ⚠️ On classe par `requestId`, jamais par ordre d'arrivée. Une version
  // antérieure attribuait chaque `loadingFinished` à la **dernière** requête
  // vue : juste tant que les chargements sont séquentiels, faux dès qu'ils
  // sont parallèles. Le premier appui sur « lire » en lance trois d'un coup,
  // et le total mesuré valait alors le dixième du réel.
  if (m.method === 'Network.responseReceived') {
    const e = { url: m.params.response.url, octets: 0 };
    requetes.push(e);
    parRequete.set(m.params.requestId, e);
  }
  if (m.method === 'Network.loadingFinished') {
    const e = parRequete.get(m.params.requestId);
    if (e) e.octets = m.params.encodedDataLength;
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

const envoyerBrut = envoyer;
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

  /* Temps de rendu, mesuré ici pour ne pas recharger chaque route deux fois. */
  const releves = [];
  let charge = 0;
  for (let i = 0; i < CHARGEMENTS; i++) {
    await envoyerBrut('Page.navigate', { url: BASE + route });
    await attendre(1800);
    const t = await envoyerBrut('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const fcp = performance.getEntriesByName('first-contentful-paint')[0];
        const nav = performance.getEntriesByType('navigation')[0];
        return JSON.stringify({
          fcp: fcp ? Math.round(fcp.startTime) : -1,
          charge: nav ? Math.round(nav.loadEventEnd - nav.startTime) : -1,
        });
      })()`,
    });
    const v = JSON.parse(t.result?.result?.value ?? '{}');
    if (v.fcp > 0) releves.push(v.fcp);
    charge = v.charge ?? 0;
  }
  if (releves.length) {
    releves.sort((a, b) => a - b);
    mesures.push({ route, fcp: releves[Math.floor(releves.length / 2)], charge });
  }
}

/* ------------------------------------------------- chargement différé */

const evaluer = async (expression) =>
  (
    await envoyer('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
  ).result?.result?.value;

await envoyer('Runtime.enable');
console.log('\nBudget de chargement différé · ce qui descend au premier geste\n');

for (const [route, { geste, clic, ancre, budget }] of Object.entries(DIFFERE)) {
  await envoyer('Page.navigate', { url: BASE + route });
  await attendre(2000);
  // L'îlot s'hydrate à la visibilité, puis alphaTab compose la partition.
  if (ancre) {
    await evaluer(
      `document.querySelector(${JSON.stringify(ancre)})?.scrollIntoView({block:'start',behavior:'instant'})`
    );
  }
  await attendre(4000);

  // Compteur remis à zéro **après** le chargement : on ne mesure que le geste.
  requetes = [];
  const clique = await evaluer(
    `(() => { const b = document.querySelector(${JSON.stringify(clic)});
      if (!b || b.disabled) return false; b.click(); return true; })()`
  );
  if (!clique) {
    problemes.push(`${route} — ${geste} : commande absente ou désactivée`);
    continue;
  }
  await attendre(9000);

  const ko = Math.round(requetes.reduce((a, r) => a + r.octets, 0) / 1024);
  if (ko === 0) {
    // Rien n'est descendu : soit la paresse a été retirée et tout arrivait
    // déjà au chargement, soit le geste n'a rien déclenché. Les deux méritent
    // qu'on regarde.
    problemes.push(`${route} — ${geste} n'a rien téléchargé du tout`);
  }
  if (ko > budget) problemes.push(`${route} — ${ko} Ko différés pour un budget de ${budget} Ko`);

  console.log(
    `${(ko > budget || ko === 0 ? '✗' : 'ok').padEnd(4)}${route.padEnd(24)} ` +
      `${String(ko).padStart(4)} Ko / ${String(budget).padStart(4)} Ko · ${geste}`
  );
}

ws.close();
chrome.kill();

/* --------------------------- morceaux différés, lus dans le build */

if (existsSync('dist/_astro')) {
  console.log('\nMorceaux différés, mesurés dans dist/ · non compressé\n');
  const fichiers = readdirSync('dist/_astro');
  let cumul = 0;

  for (const { motif, quoi } of MORCEAUX_DIFFERES) {
    const trouve = fichiers.filter((f) => motif.test(f));
    if (trouve.length === 0) {
      problemes.push(`morceau différé introuvable dans dist/ : ${quoi}`);
      console.log(`✗   ${quoi.padEnd(24)} absent`);
      continue;
    }
    for (const f of trouve) {
      const ko = Math.round(statSync(`dist/_astro/${f}`).size / 1024);
      cumul += ko;
      console.log(`    ${quoi.padEnd(24)} ${String(ko).padStart(4)} Ko  ${f}`);
    }
  }

  const sf = 'dist/alphatab/soundfont/sonivox.sf3';
  if (existsSync(sf)) {
    const ko = Math.round(statSync(sf).size / 1024);
    cumul += ko;
    console.log(`    ${'banque de sons'.padEnd(24)} ${String(ko).padStart(4)} Ko`);
  }

  const verdict = cumul > BUDGET_DIFFERE_TOTAL ? '✗' : 'ok';
  if (cumul > BUDGET_DIFFERE_TOTAL) {
    problemes.push(`différé : ${cumul} Ko pour un budget de ${BUDGET_DIFFERE_TOTAL} Ko`);
  }
  console.log(
    `${verdict.padEnd(4)}${'total différé'.padEnd(24)} ${String(cumul).padStart(4)} Ko` +
      ` / ${BUDGET_DIFFERE_TOTAL} Ko`
  );
} else {
  console.log('\n(dist/ absent : morceaux différés non mesurés — lancer npm run build)');
}

console.log(`\nTotal des routes mesurées : ${Math.round(total / 1024)} Ko au chargement`);

/* ------------------------------------------------------ temps de rendu */

if (mesures.length) {
  console.log(`\nPremier rendu · médiane sur ${CHARGEMENTS} chargements\n`);
  let pire = 0;
  for (const { route, fcp, charge } of mesures) {
    pire = Math.max(pire, fcp);
    const verdict = fcp > BUDGET_FCP ? '✗' : 'ok';
    if (fcp > BUDGET_FCP) {
      problemes.push(`${route} — premier rendu à ${fcp} ms pour un budget de ${BUDGET_FCP} ms`);
    }
    console.log(
      `${verdict.padEnd(4)}${route.padEnd(24)} ${String(fcp).padStart(4)} ms` +
        ` / ${BUDGET_FCP} ms · page complète ${charge} ms`
    );
  }
  console.log(`\nPire premier rendu : ${pire} ms — en local, sans latence ni bridage.`);
}

if (problemes.length) {
  console.log('\n✗ poids');
  for (const p of problemes) console.log(`    ${p}`);
  console.log(`\n${problemes.length} problème(s).`);
  process.exit(1);
}
console.log('Aucun appel hors origine, aucun budget dépassé.');
