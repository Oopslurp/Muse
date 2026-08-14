/**
 * Valide toutes les tablatures alphaTex du projet — invariant de build n°9
 * de `docs/research/05-modele-donnees.md`.
 *
 * Deux gisements :
 *   · les blocs ```alphatex des documents de recherche ;
 *   · les champs `alphaTex: |` du frontmatter des fiches MDX, qui sont la
 *     source réelle du site.
 *
 * Les diagnostics ne sont PAS portés par l'exception mais par l'importer —
 * `error.inner` est undefined et le message seul est inexploitable. Voir
 * docs/research/08-alphatab-verifie.md (R1).
 *
 *   npm run validate
 *
 * Sort en code 1 si au moins un bloc échoue : utilisable tel quel en CI.
 *
 * ⚠️ Ce validateur garantit la validité *syntaxique*, pas la justesse
 * musicale. Il n'aurait attrapé aucune des deux erreurs de contenu de la
 * phase de recherche : les deux tablatures parsaient parfaitement.
 */

import fs from 'node:fs';
import path from 'node:path';
import * as at from '@coderline/alphatab';

const CIBLES = [
  { racine: 'docs/research', ext: '.md', mode: 'fence' },
  { racine: 'src/content/techniques', ext: '.mdx', mode: 'frontmatter' },
];

const FENCE = /```alphatex\r?\n([\s\S]*?)```/g;
/** `    alphaTex: |` suivi d'un bloc indenté. */
const YAML_BLOCK = /^([ \t]*)alphaTex:[ \t]*\|[ \t]*\r?\n((?:\1[ \t]+.*(?:\r?\n|$))+)/gm;

function fichiers(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return fichiers(full, ext);
    return e.isFile() && e.name.endsWith(ext) ? [full] : [];
  });
}

const ligneDe = (texte, offset) => texte.slice(0, offset).split('\n').length;

/** Retire l'indentation YAML commune pour retrouver l'alphaTex d'origine. */
function desindenter(bloc) {
  const lignes = bloc.replace(/\s+$/, '').split('\n');
  const marges = lignes
    .filter((l) => l.trim())
    .map((l) => (/^\s*/.exec(l) ?? [''])[0].length);
  const marge = marges.length ? Math.min(...marges) : 0;
  return lignes.map((l) => l.slice(marge)).join('\n');
}

const diagnostics = (bag) =>
  (bag?.items ?? []).map(
    (d) => `[${d.code}] ligne ${d.start.line}, col ${d.start.col} : ${d.message}`
  );

/**
 * Invariant musical : **une corde ne sonne qu'une hauteur à la fois.**
 *
 * alphaTab accepte sans broncher un accord qui pose deux cases sur la même
 * corde — la plus haute neutralise l'autre, et la tablature affichée notate
 * alors quelque chose qui ne peut pas se produire. C'est exactement la classe
 * d'erreur que la décision 2 existe pour empêcher, et le contrôle syntaxique
 * ne la voit pas : le corpus en portait une, trouvée par l'audit Codex.
 *
 * ⚠️ Le modèle alphaTab **inverse** la numérotation des cordes par rapport au
 * texte source (voir 08-alphatab-verifie.md, R4). On n'a pas besoin de la
 * convertir ici : on compare des numéros entre eux, pas à une écriture.
 */
function cordesDoublees(score) {
  const fautes = [];
  for (const track of score.tracks ?? []) {
    for (const staff of track.staves ?? []) {
      for (const bar of staff.bars ?? []) {
        for (const voice of bar.voices ?? []) {
          for (const beat of voice.beats ?? []) {
            const vues = new Map();
            for (const note of beat.notes ?? []) {
              const dejaLa = vues.get(note.string);
              if (dejaLa !== undefined) {
                fautes.push(
                  `mesure ${bar.index + 1} : deux notes sur la même corde ` +
                    `(cases ${dejaLa} et ${note.fret}) dans un même temps`
                );
              } else {
                vues.set(note.string, note.fret);
              }
            }
          }
        }
      }
    }
  }
  return fautes;
}

function verifier(tex) {
  const importer = new at.importer.AlphaTexImporter();
  importer.initFromString(tex, new at.Settings());
  let echoue = false;
  let musique = [];
  try {
    musique = cordesDoublees(importer.readScore());
  } catch {
    echoue = true;
  }
  return {
    echoue: echoue || musique.length > 0,
    messages: [
      ...diagnostics(importer.lexerDiagnostics),
      ...diagnostics(importer.parserDiagnostics),
      ...musique,
    ],
  };
}

let total = 0;
let echecs = 0;
let avertis = 0;

for (const { racine, ext, mode } of CIBLES) {
  for (const fichier of fichiers(racine, ext)) {
    const source = fs.readFileSync(fichier, 'utf8');
    const motif = mode === 'fence' ? FENCE : YAML_BLOCK;
    motif.lastIndex = 0;

    for (const m of source.matchAll(motif)) {
      total++;
      const tex = mode === 'fence' ? m[1] : desindenter(m[2]);
      const ligne = ligneDe(source, m.index);
      const titre = (tex.match(/\\title\s+"([^"]+)"/) ?? [])[1] ?? '(sans titre)';
      const { echoue, messages } = verifier(tex);

      if (echoue) {
        echecs++;
        console.log(`\n✗ ÉCHEC  ${fichier}:${ligne}  « ${titre} »`);
        for (const d of messages) console.log(`     ${d}`);
        if (!messages.length) console.log('     (aucun diagnostic renseigné)');
      } else if (messages.length) {
        avertis++;
        console.log(`\n⚠ AVERTISSEMENT  ${fichier}:${ligne}  « ${titre} »`);
        for (const d of messages) console.log(`     ${d}`);
      }
    }
  }
}

console.log(
  `\n${total} bloc(s) alphaTex — ${total - echecs} valide(s), ${echecs} en échec, ` +
    `${avertis} avec avertissement.`
);
process.exit(echecs > 0 ? 1 : 0);
