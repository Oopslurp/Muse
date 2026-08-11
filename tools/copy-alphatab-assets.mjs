/**
 * Copie les ressources d'alphaTab dans `public/alphatab/`.
 *
 * Le plugin Vite officiel du paquet est cassé dans la version 1.8.4 — son
 * point d'entrée réexporte `dist/vite/alphaTab.vite.mjs`, qui n'existe pas.
 * On copie donc à la main, ce qui a l'avantage d'être explicite sur ce qui
 * part dans le bundle.
 *
 * Deux ressources, servies depuis le site et jamais depuis un CDN
 * (CLAUDE.md, décision 8) :
 *   · Bravura.woff2 — la police de notation musicale, 306 Ko
 *   · sonivox.sf3   — la banque de sons, 954 Ko, chargée à la demande
 *
 * Lancé automatiquement avant `dev` et `build`.
 */

import fs from 'node:fs';
import path from 'node:path';

const SRC = 'node_modules/@coderline/alphatab/dist';
const DEST = 'public/alphatab';

/** Ce qui est réellement nécessaire. Le reste du paquet ne part pas. */
const RESSOURCES = [
  // Bravura en woff2 seulement : tous les navigateurs cibles le lisent, et les
  // variantes woff/otf/eot pèsent 1 Mo de plus pour rien.
  ['font/Bravura.woff2', 'font/Bravura.woff2'],
  ['font/Bravura-OFL.txt', 'font/Bravura-OFL.txt'],
  // sf3 plutôt que sf2 : 954 Ko contre 1,3 Mo, à contenu identique.
  ['soundfont/sonivox.sf3', 'soundfont/sonivox.sf3'],
  ['soundfont/LICENSE', 'soundfont/LICENSE'],
];

let copies = 0;
let octets = 0;

for (const [de, vers] of RESSOURCES) {
  const source = path.join(SRC, de);
  const cible = path.join(DEST, vers);

  if (!fs.existsSync(source)) {
    console.error(`introuvable : ${source}`);
    process.exitCode = 1;
    continue;
  }

  const tailleSource = fs.statSync(source).size;
  // Ne recopie que si nécessaire : évite de réécrire 1,2 Mo à chaque démarrage.
  if (fs.existsSync(cible) && fs.statSync(cible).size === tailleSource) continue;

  fs.mkdirSync(path.dirname(cible), { recursive: true });
  fs.copyFileSync(source, cible);
  copies++;
  octets += tailleSource;
}

if (copies) {
  console.log(
    `alphaTab : ${copies} ressource(s) copiée(s) dans ${DEST} (${(octets / 1024).toFixed(0)} Ko)`
  );
}
