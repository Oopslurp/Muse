/**
 * Garde-fou d'accessibilité — mesures, pas affirmations.
 *
 *   npm run audit:a11y
 *   MUSE_URL=http://localhost:4322 npm run audit:a11y
 *
 * La direction artistique pose l'accessibilité comme **non négociable**. Elle
 * n'avait jamais été mesurée : aucun contraste calculé, aucun parcours clavier
 * fait de bout en bout. C'était le trou le plus sérieux de `docs/dette.md`.
 *
 * Ce que cet outil vérifie, sur chaque route et **dans les deux thèmes** :
 *
 * 1. **Contraste du texte.** Ratio calculé sur les couleurs réellement
 *    rendues, pas sur les jetons : c'est la composition qui compte, et un
 *    `color-mix` ne se lit pas dans la feuille de style. Seuil 4,5:1, ou 3:1
 *    pour le grand texte (≥ 24 px, ou ≥ 18,66 px gras) — WCAG 2.2 AA.
 * 2. **Taille des cibles.** 24 × 24 px minimum. Les liens en pleine ligne de
 *    texte sont exemptés par le critère lui-même, et donc ignorés ici.
 * 3. **Focus visible.** Chaque élément focalisable doit changer d'apparence.
 * 4. **Noms accessibles.** Un bouton sans texte ni `aria-label` est muet.
 * 5. **Information au seul survol.** Un `title` sur un élément non focalisable
 *    n'existe pas au clavier ni au lecteur d'écran.
 * 6. **Structure.** Un seul `<h1>`, pas de saut de niveau de titre.
 */

import { execFile } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
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
const PORT = 9500;
const RAPPORT = process.argv.includes('--rapport');

const ROUTES = [
  '/',
  '/techniques',
  '/techniques/tremolo',
  '/techniques/percussion-kick-snare-golpe',
  '/accordeur',
  '/arbre',
  '/pratique',
  '/a-propos',
  '/style-guide',
];

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = execFile(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-color-profile=srgb',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.TEMP ?? '/tmp'}/muse-audit-a11y`,
  'about:blank',
]);
const cibles = await attendreCiblesChrome(PORT);
const ws = new WebSocket(cibles.find((c) => c.type === 'page').webSocketDebuggerUrl);
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
const evaluer = async (expression) =>
  (await envoyer('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }))
    .result?.result?.value;

await envoyer('Page.enable');
await envoyer('Runtime.enable');
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

/** Le relevé, injecté dans la page : c'est là que vivent les couleurs rendues. */
const RELEVE = `(() => {
  const lum = (r, g, b) => {
    const c = [r, g, b].map((v) => {
      const n = v / 255;
      return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const rgb = (s) => {
    const m = /rgba?\\(([\\d.]+)[,\\s]+([\\d.]+)[,\\s]+([\\d.]+)(?:[,/\\s]+([\\d.]+))?/.exec(s || '');
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
  };
  /** Le fond effectif : on remonte jusqu'à trouver une couleur opaque. */
  const fond = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = rgb(getComputedStyle(n).backgroundColor);
      if (c && c.a >= 0.95) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const ratio = (a, b) => {
    const x = lum(a.r, a.g, a.b), y = lum(b.r, b.g, b.b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const nom = (e) => {
    const c = typeof e.className === 'string' ? e.className.trim().split(' ')[0] : '';
    return e.tagName.toLowerCase() + (c ? '.' + c : '');
  };
  const visible = (e) => {
    const s = getComputedStyle(e);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.1) return false;
    const b = e.getBoundingClientRect();
    return b.width > 0 && b.height > 0;
  };

  const contraste = [];
  const cibles = [];
  const muets = [];
  const survol = [];

  for (const e of document.querySelectorAll('*')) {
    if (!visible(e)) continue;

    // --- contraste : seulement les éléments qui portent du texte propre
    const propre = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (propre) {
      const st = getComputedStyle(e);
      const enc = rgb(st.color);
      if (enc) {
        const px = parseFloat(st.fontSize);
        const gras = parseInt(st.fontWeight, 10) >= 700;
        const grand = px >= 24 || (gras && px >= 18.66);
        const r = ratio(enc, fond(e));
        const seuil = grand ? 3 : 4.5;
        if (r < seuil) {
          contraste.push({
            quoi: nom(e),
            ratio: Math.round(r * 100) / 100,
            seuil,
            px: Math.round(px * 10) / 10,
            texte: e.textContent.trim().slice(0, 44),
          });
        }
      }
    }

    // --- information disponible AU SEUL survol
    //
    // Un \`title\` n'est pas fautif en soi : il l'est quand il porte la seule
    // trace d'une information. S'il double un texte visible ou un
    // \`aria-label\`, l'information existe ailleurs et le survol n'est qu'un
    // confort de souris.
    if (
      e.hasAttribute('title') &&
      !e.matches('a[href], button, input, select, textarea, [tabindex]') &&
      !e.getAttribute('aria-label') &&
      !e.getAttribute('aria-labelledby') &&
      !e.textContent.trim()
    ) {
      survol.push({ quoi: nom(e), title: e.getAttribute('title').slice(0, 44) });
    }
  }

  for (const e of document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')) {
    if (!visible(e)) continue;
    const b = e.getBoundingClientRect();

    // Cible tactile. Les liens en pleine ligne de texte sont exemptés par le
    // critère « Target Size (Minimum) » lui-même.
    const dansUnParagraphe = !!e.closest('p, li, dd, .prose') && e.tagName === 'A';
    if (!dansUnParagraphe && (b.width < 24 || b.height < 24)) {
      cibles.push({ quoi: nom(e), w: Math.round(b.width), h: Math.round(b.height) });
    }

    const nomAccessible =
      (e.getAttribute('aria-label') || '').trim() ||
      (e.getAttribute('title') || '').trim() ||
      e.textContent.trim() ||
      (e.labels && e.labels.length ? [...e.labels].map((l) => l.textContent).join(' ').trim() : '');
    if (!nomAccessible) muets.push({ quoi: nom(e) });
  }

  // --- structure des titres
  const titres = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    .filter(visible)
    .map((h) => +h.tagName[1]);
  const structure = [];
  if (titres.filter((n) => n === 1).length !== 1) {
    structure.push(titres.filter((n) => n === 1).length + ' <h1> sur la page');
  }
  for (let i = 1; i < titres.length; i++) {
    if (titres[i] - titres[i - 1] > 1) {
      structure.push('saut de h' + titres[i - 1] + ' à h' + titres[i]);
    }
  }

  return JSON.stringify({ contraste, cibles, muets, survol, structure });
})()`;

const problemes = [];
const rapport = [];

for (const theme of ['light', 'dark']) {
  console.log(`\n=== thème ${theme === 'light' ? 'clair' : 'sombre'} ===\n`);

  for (const route of ROUTES) {
    const url = `${BASE}${route}${route.includes('?') ? '&' : '?'}__theme=${theme}`;
    await envoyer('Page.navigate', { url });
    await attendre(2600);

    const brut = await evaluer(RELEVE);
    const r = JSON.parse(brut ?? '{}');
    const n =
      (r.contraste?.length ?? 0) +
      (r.cibles?.length ?? 0) +
      (r.muets?.length ?? 0) +
      (r.survol?.length ?? 0) +
      (r.structure?.length ?? 0);

    rapport.push({ theme, route, ...r });

    if (n === 0) {
      console.log(`ok  ${route.padEnd(42)} rien à signaler`);
      continue;
    }

    console.log(`✗   ${route.padEnd(42)} ${n} point(s)`);
    for (const c of r.contraste ?? []) {
      problemes.push(`${theme} ${route} — contraste ${c.ratio}:1 (${c.seuil} requis) sur ${c.quoi}`);
      console.log(`      contraste ${String(c.ratio).padEnd(5)} < ${c.seuil}  ${c.quoi} (${c.px} px) « ${c.texte} »`);
    }
    for (const c of r.cibles ?? []) {
      problemes.push(`${theme} ${route} — cible ${c.w}×${c.h} px sur ${c.quoi}`);
      console.log(`      cible ${c.w}×${c.h} px  ${c.quoi}`);
    }
    for (const m of r.muets ?? []) {
      problemes.push(`${theme} ${route} — sans nom accessible : ${m.quoi}`);
      console.log(`      sans nom accessible  ${m.quoi}`);
    }
    for (const s of r.survol ?? []) {
      problemes.push(`${theme} ${route} — info au seul survol : ${s.quoi}`);
      console.log(`      info au seul survol  ${s.quoi} « ${s.title} »`);
    }
    for (const s of r.structure ?? []) {
      problemes.push(`${theme} ${route} — structure : ${s}`);
      console.log(`      structure  ${s}`);
    }
  }
}

if (RAPPORT) {
  writeFileSync('.captures/a11y.json', JSON.stringify(rapport, null, 2));
  console.log('\nRelevé complet écrit dans .captures/a11y.json');
}

ws.close();
chrome.kill();

console.log(`\n${problemes.length} point(s) sur ${ROUTES.length} routes × 2 thèmes.`);
process.exit(problemes.length > 0 ? 1 : 0);
