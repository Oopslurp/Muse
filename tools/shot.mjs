/**
 * Capture d'écran du site via Chrome headless.
 *
 * Comble le trou de vérification des tranches 0 à 2 : jusqu'ici le rendu
 * n'était contrôlé qu'à travers le HTML produit, jamais à l'œil. Une page
 * peut être parfaitement valide et parfaitement illisible.
 *
 *   npm run shot                        toutes les vues de référence
 *   npm run shot -- /techniques/tremolo  une route précise
 *   npm run shot -- /techniques dark     en forçant un thème
 *
 * Les images vont dans .captures/ (ignoré par git).
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const exec = promisify(execFile);

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

const BASE = process.env.MUSE_URL ?? 'http://localhost:4321';
const DOSSIER = '.captures';

/** Vues de référence : ce qu'il faut regarder après chaque tranche. */
const VUES = [
  { nom: 'accueil', route: '/' },
  { nom: 'accueil-clair', route: '/', theme: 'light' },
  { nom: 'liste', route: '/techniques' },
  { nom: 'fiche-longue', route: '/techniques/tremolo' },
  { nom: 'fiche-longue-clair', route: '/techniques/tremolo', theme: 'light' },
  { nom: 'fiche-courte', route: '/techniques/ongles' },
  { nom: 'fiche-a-risque', route: '/techniques/percussion-kick-snare-golpe' },
  { nom: 'design-system', route: '/style-guide' },
  // Chrome headless refuse une fenêtre sous ~485 px : en dessous, la capture
  // est plus étroite que la mise en page et paraît tronquée. Pour un vrai
  // viewport mobile, utiliser `npm run audit:layout`.
  { nom: 'liste-etroit', route: '/techniques', largeur: 500, hauteur: 1500 },
];

const args = process.argv.slice(2);
const vues = args.length
  ? [{ nom: 'ad-hoc', route: args[0], theme: args[1] }]
  : VUES;

mkdirSync(DOSSIER, { recursive: true });

for (const v of vues) {
  // Chrome résout un chemin relatif depuis son propre répertoire courant :
  // il faut lui donner un chemin absolu.
  const fichier = resolve(DOSSIER, `${v.nom}.png`);
  // `?__theme=` force le thème avant le premier rendu, comme le script inline
  // du layout — pas de clignotement, pas de dépendance à localStorage.
  const url = v.theme
    ? `${BASE}${v.route}${v.route.includes('?') ? '&' : '?'}__theme=${v.theme}`
    : `${BASE}${v.route}`;

  await exec(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
    '--virtual-time-budget=9000',
    `--window-size=${v.largeur ?? 1600},${v.hauteur ?? 1400}`,
    `--screenshot=${fichier}`,
    url,
  ]).catch((e) => {
    console.error(`échec sur ${v.route} :`, e.message);
  });

  const nom = `${DOSSIER}/${v.nom}.png`;
  console.log(
    `${existsSync(fichier) ? 'ok   ' : 'ÉCHEC'} ${nom.padEnd(34)} ` +
      `${v.route}${v.theme ? ` · ${v.theme}` : ''}`
  );
}
