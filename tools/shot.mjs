/**
 * Captures de contrôle du site, via le protocole DevTools.
 *
 * Comble le trou de vérification des tranches 0 à 2 : jusque-là le rendu
 * n'était contrôlé qu'à travers le HTML produit, jamais à l'œil. Une page
 * peut être parfaitement valide et parfaitement illisible.
 *
 *   npm run shot                          toutes les vues de référence
 *   npm run shot -- /techniques/tremolo   une route précise
 *   npm run shot -- /techniques dark      en forçant un thème
 *
 * Passe par CDP plutôt que par `--screenshot` : Chrome headless refuse une
 * fenêtre sous ~485 px, ce qui rendait les captures étroites trompeuses — la
 * page était mise en page à 485 px puis rognée à la largeur demandée.
 * `Emulation.setDeviceMetricsOverride` donne un vrai viewport, à n'importe
 * quelle largeur.
 *
 * Les images vont dans .captures/, ignoré par git.
 */

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { drapeauxFauxMicro, fabriquerCorde } from './faux-micro.mjs';

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
const DOSSIER = '.captures';
const PORT = 9477;

/**
 * Vues de référence : ce qu'il faut regarder après chaque tranche.
 * `ancre` fait défiler jusqu'à un sélecteur avant la capture — indispensable
 * pour les îlots hydratés à la visibilité, qui ne s'initialisent pas tant
 * qu'ils sont hors écran.
 */
const VUES = [
  { nom: 'accueil', route: '/' },
  { nom: 'accueil-clair', route: '/', theme: 'light' },
  { nom: 'liste', route: '/techniques' },
  { nom: 'fiche-longue', route: '/techniques/tremolo' },
  { nom: 'fiche-longue-clair', route: '/techniques/tremolo', theme: 'light' },
  { nom: 'lecteur', route: '/techniques/tremolo', ancre: '#ex-a', pause: 4000 },
  { nom: 'lecteur-clair', route: '/techniques/tremolo', ancre: '#ex-a', theme: 'light', pause: 4000 },
  { nom: 'fiche-courte', route: '/techniques/ongles' },
  { nom: 'fiche-a-risque', route: '/techniques/percussion-kick-snare-golpe' },
  // Le cas de la décision 10 : lecture jamais désactivée, réserves nommées.
  {
    nom: 'lecteur-reserves',
    route: '/techniques/percussion-kick-snare-golpe',
    ancre: '#ex-b',
    pause: 4000,
  },
  { nom: 'design-system', route: '/style-guide' },
  { nom: 'liste-mobile', route: '/techniques', largeur: 390, hauteur: 1400 },
  { nom: 'arbre', route: '/arbre' },
  { nom: 'arbre-clair', route: '/arbre', theme: 'light' },
  // Une technique choisie : la chaîne de prérequis se dessine, le panneau
  // s'ouvre. C'est l'écran qui justifie l'îlot.
  { nom: 'arbre-choix', route: '/arbre', clic: '[data-noeud="tremolo"]', pause: 1200 },
  { nom: 'accordeur-repos', route: '/accordeur' },
  // Le cadran ne s'affiche qu'une fois le micro ouvert : on clique, et Chrome
  // écoute un fichier WAV à la place du micro (voir faux-micro.mjs). Le fichier
  // commence par trois secondes de silence, que l'accordeur passe à calibrer.
  { nom: 'accordeur', route: '/accordeur', clic: '.ac__demarrer', pause: 7000 },
  {
    nom: 'accordeur-clair',
    route: '/accordeur',
    theme: 'light',
    clic: '.ac__demarrer',
    pause: 7000,
  },
];

const args = process.argv.slice(2);
const vues = args.length ? [{ nom: 'ad-hoc', route: args[0], theme: args[1] }] : VUES;

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(DOSSIER, { recursive: true });

const chrome = execFile(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-color-profile=srgb',
  // Sans micro, l'accordeur ne montrerait jamais que son écran d'accueil.
  ...drapeauxFauxMicro(fabriquerCorde(82.4069, -30, 'mi2-detendu')),
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.TEMP ?? '/tmp'}/muse-shot`,
  'about:blank',
]);
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

for (const v of vues) {
  const largeur = v.largeur ?? 1500;
  const hauteur = v.hauteur ?? 1200;

  await envoyer('Emulation.setDeviceMetricsOverride', {
    width: largeur,
    height: hauteur,
    deviceScaleFactor: 1,
    mobile: largeur < 700,
  });

  // `?__theme=` force le thème avant le premier rendu, comme le script inline
  // du layout — pas de clignotement, pas de dépendance à localStorage.
  const url =
    BASE + v.route + (v.theme ? (v.route.includes('?') ? '&' : '?') + `__theme=${v.theme}` : '');

  await envoyer('Page.navigate', { url });
  await attendre(2200);

  if (v.clic) {
    // Autorisation accordée d'office : une capture ne peut pas répondre à une
    // demande de permission. `audit:accordeur` teste le refus, lui.
    await envoyer('Browser.setPermission', {
      origin: BASE,
      permission: { name: 'microphone' },
      setting: 'granted',
    });
    const p = await envoyer('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const e = document.querySelector(${JSON.stringify(v.clic)});
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
      })()`,
    });
    const pos = p.result?.result?.value;
    if (pos) {
      for (const type of ['mousePressed', 'mouseReleased'])
        await envoyer('Input.dispatchMouseEvent', { type, ...pos, button: 'left', clickCount: 1 });
    }
    await attendre(v.pause ?? 3000);
  }

  if (v.ancre) {
    await envoyer('Runtime.evaluate', {
      expression: `document.querySelector(${JSON.stringify(v.ancre)})
        ?.scrollIntoView({ block: 'start', behavior: 'instant' })`,
    });
    // L'îlot s'hydrate à l'entrée dans le viewport, puis alphaTab met un
    // moment à composer la partition.
    await attendre(v.pause ?? 1500);
  }

  const r = await envoyer('Page.captureScreenshot', { format: 'png' });
  const donnees = r.result?.data;
  const fichier = resolve(DOSSIER, `${v.nom}.png`);

  if (!donnees) {
    console.log(`ÉCHEC ${DOSSIER}/${v.nom}.png`);
    continue;
  }
  writeFileSync(fichier, Buffer.from(donnees, 'base64'));
  console.log(
    `ok    ${`${DOSSIER}/${v.nom}.png`.padEnd(34)} ${v.route}` +
      `${v.theme ? ` · ${v.theme}` : ''}${v.ancre ? ` · ${v.ancre}` : ''} · ${largeur}px`
  );
}

ws.close();
chrome.kill();
