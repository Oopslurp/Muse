/**
 * Garde-fou d'exécution : charge les pages clés dans un vrai navigateur et
 * échoue si une exception, une erreur console ou un îlot vide apparaît.
 *
 *   npm run audit:console                        contre le serveur de dev
 *   MUSE_URL=http://localhost:4442 npm run audit:console   contre un build
 *   npm run audit:console -- /techniques/tremolo une route précise
 *
 * Pourquoi cet outil existe
 * -------------------------
 * La page « Techniques » a servi pendant des heures un HTML parfaitement
 * valide de 29 Ko tout en s'affichant vide : le pré-bundling Vite de
 * `react/jsx-dev-runtime` renvoyait `jsxDEV === undefined`, le composant
 * levait à sa première balise, et React vidait l'îlot après le premier
 * rendu. Rien de tout cela n'est visible dans la réponse du serveur.
 *
 * Vérifier le HTML servi ne prouve rien. Il faut exécuter le JS.
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
const PORT = 9466;

const ROUTES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['/', '/techniques', '/techniques/tremolo', '/techniques/ongles', '/accordeur', '/arbre', '/pratique', '/a-propos', '/style-guide'];

/** Bruit de fond dont on ne veut pas faire échouer l'audit. */
const IGNORER = [/favicon/i, /DevTools/i, /Autofill\./i];

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = execFile(CHROME, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.TEMP ?? '/tmp'}/muse-audit`,
  'about:blank',
]);
await attendre(2500);

const cibles = await (await fetch(`http://localhost:${PORT}/json/list`)).json();
const page = cibles.find((c) => c.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const attente = new Map();
let incidents = [];

ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && attente.has(m.id)) {
    attente.get(m.id)(m);
    attente.delete(m.id);
    return;
  }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    incidents.push(`exception — ${d.exception?.description ?? d.text}`);
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    incidents.push(
      `console.error — ${m.params.args.map((a) => a.description ?? a.value).join(' ')}`
    );
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    incidents.push(`réseau — ${m.params.entry.text} ${m.params.entry.url ?? ''}`);
  }
};

const envoyer = (method, params = {}) =>
  new Promise((r) => {
    const n = ++id;
    attente.set(n, r);
    ws.send(JSON.stringify({ id: n, method, params }));
  });

await envoyer('Runtime.enable');
await envoyer('Log.enable');
await envoyer('Page.enable');

let echecs = 0;

// Vérifie que la cible répond avant d'accuser les pages d'être vides :
// un serveur éteint produit exactement le même symptôme.
try {
  const sonde = await fetch(BASE + '/', { redirect: 'follow' });
  if (!sonde.ok) throw new Error(`HTTP ${sonde.status}`);
} catch (e) {
  console.error(`\n${BASE} ne répond pas (${e.message}).`);
  console.error("Démarrer `npm run dev`, ou pointer MUSE_URL sur un serveur actif.");
  ws.close();
  chrome.kill();
  process.exit(2);
}

for (const route of ROUTES) {
  incidents = [];
  await envoyer('Page.navigate', { url: BASE + route });
  // Laisse le temps à l'hydratation et aux effets de s'exécuter : la
  // destruction de l'îlot survient après le premier rendu, pas pendant.
  await attendre(2500);

  const r = await envoyer('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const iles = [...document.querySelectorAll('astro-island')];
      return JSON.stringify({
        titre: document.title,
        corps: document.body.innerText.trim().length,
        iles: iles.map((i) => ({
          composant: i.getAttribute('component-export') ?? '?',
          contenu: i.innerHTML.length,
        })),
        debordement:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        colles: motsColles(),
      });

      /**
       * Mots collés à une balise voisine — « porte44 », « spectacle,42 ».
       *
       * Astro supprime l'espace quand un saut de ligne sépare du texte d'un
       * élément : \`… porte\\n<strong>44</strong>\` rend « porte44 ». Le code
       * source paraît juste, le HTML est valide, et rien ne le signale — on ne
       * le voit qu'en lisant la page. Quatre occurrences ont été trouvées à
       * l'œil avant que ce contrôle n'existe.
       *
       * On ne regarde que les frontières **à l'intérieur d'un bloc**, entre un
       * nœud de texte et un élément en ligne voisin. Les apostrophes et les
       * traits d'union sont des collages légitimes (\`l'<em>\`, \`mi-<em>\`).
       */
      function motsColles() {
        const EN_LIGNE = new Set(['STRONG', 'EM', 'B', 'I', 'A', 'SPAN', 'CODE', 'ABBR']);
        const trouves = [];

        for (const el of document.querySelectorAll('p, li, dd, dt, h1, h2, h3, figcaption')) {
          for (const noeud of el.childNodes) {
            if (noeud.nodeType !== Node.ELEMENT_NODE) continue;
            if (!EN_LIGNE.has(noeud.tagName)) continue;

            const avant = noeud.previousSibling;
            if (!avant || avant.nodeType !== Node.TEXT_NODE) continue;

            const gauche = avant.textContent;
            const droite = noeud.textContent;
            if (!gauche || !droite) continue;

            const fin = gauche.slice(-1);
            const debut = droite.slice(0, 1);
            // Collage légitime : espace, apostrophe, trait d'union, ouvrante.
            if (/[\\s'’\\-–(«"]/.test(fin) || /[\\s'’\\-–).,;:!?»"]/.test(debut)) continue;

            trouves.push((gauche.slice(-14) + droite.slice(0, 12)).trim());
          }
        }
        return trouves.slice(0, 6);
      }
    })()`,
  });

  const etat = JSON.parse(r.result?.result?.value ?? '{}');
  const problemes = incidents.filter((i) => !IGNORER.some((re) => re.test(i)));

  // Un îlot vide après hydratation est le symptôme qui a motivé cet outil.
  for (const ile of etat.iles ?? []) {
    if (ile.contenu === 0) problemes.push(`îlot vide — ${ile.composant}`);
  }
  for (const colle of etat.colles ?? []) {
    problemes.push(`mot collé à une balise : « ${colle} » — manque un {' '}`);
  }
  if ((etat.corps ?? 0) < 200) problemes.push(`page quasi vide (${etat.corps} caractères)`);
  if ((etat.debordement ?? 0) > 1) problemes.push(`débordement horizontal de ${etat.debordement} px`);

  if (problemes.length) {
    echecs++;
    console.log(`\n✗ ${route}`);
    for (const p of problemes) console.log(`    ${p.slice(0, 600)}`);
  } else {
    const n = etat.iles?.length ?? 0;
    console.log(`ok  ${route.padEnd(28)} ${etat.corps} car.${n ? ` · ${n} îlot(s)` : ''}`);
  }
}

ws.close();
chrome.kill();

console.log(
  `\n${ROUTES.length} route(s) — ${ROUTES.length - echecs} saine(s), ${echecs} en échec.`
);
process.exit(echecs > 0 ? 1 : 0);
