/**
 * Valide toutes les tablatures alphaTex du corpus (invariant de build n°9).
 *
 * Extrait chaque bloc ```alphatex des fichiers Markdown, le parse avec alphaTab,
 * et remonte les diagnostics — qui ne sont PAS sur l'exception mais sur
 * l'importer (voir docs/research/08-alphatab-verifie.md, R1).
 *
 *   node tools/validate-corpus-tabs.mjs
 *
 * Sort en code 1 si au moins un bloc échoue : utilisable tel quel en CI.
 */

import fs from 'node:fs';
import path from 'node:path';
import * as at from '@coderline/alphatab';

const ROOT = 'docs/research';
const FENCE = /```alphatex\r?\n([\s\S]*?)```/g;

/** Récupère tous les .md sous un répertoire. */
function markdownFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) return markdownFiles(full);
      return e.isFile() && e.name.endsWith('.md') ? [full] : [];
    });
}

/** Numéro de ligne d'un offset, pour pointer le bloc dans le fichier source. */
function lineOf(text, offset) {
  return text.slice(0, offset).split('\n').length;
}

const diagnosticsOf = (bag) =>
  (bag?.items ?? []).map((d) => ({
    code: d.code,
    severity: d.severity,
    line: d.start.line,
    col: d.start.col,
    message: d.message,
  }));

function check(tex) {
  const importer = new at.importer.AlphaTexImporter();
  importer.initFromString(tex, new at.Settings());
  let failed = false;
  try {
    importer.readScore();
  } catch {
    failed = true;
  }
  return {
    failed,
    diagnostics: [
      ...diagnosticsOf(importer.lexerDiagnostics),
      ...diagnosticsOf(importer.parserDiagnostics),
    ],
  };
}

let total = 0;
let bad = 0;
let warned = 0;

for (const file of markdownFiles(ROOT)) {
  const source = fs.readFileSync(file, 'utf8');
  for (const m of source.matchAll(FENCE)) {
    total++;
    const tex = m[1];
    const startLine = lineOf(source, m.index);
    const title = (tex.match(/\\title\s+"([^"]+)"/) ?? [])[1] ?? '(sans titre)';
    const { failed, diagnostics } = check(tex);

    if (failed) {
      bad++;
      console.log(`\n✗ ÉCHEC  ${file}:${startLine}  « ${title} »`);
      for (const d of diagnostics) {
        console.log(`     [${d.code}] ligne ${d.line}, col ${d.col} : ${d.message}`);
      }
      if (!diagnostics.length) console.log('     (aucun diagnostic renseigné)');
    } else if (diagnostics.length) {
      warned++;
      console.log(`\n⚠ AVERTISSEMENT  ${file}:${startLine}  « ${title} »`);
      for (const d of diagnostics) {
        console.log(`     [${d.code}] ligne ${d.line}, col ${d.col} : ${d.message}`);
      }
    }
  }
}

console.log(
  `\n${total} bloc(s) alphaTex — ${total - bad} valide(s), ${bad} en échec, ${warned} avec avertissement.`
);
process.exit(bad > 0 ? 1 : 0);
