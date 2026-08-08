/**
 * Sonde alphaTex — Tranche 0 (CLAUDE.md, décision 4a)
 *
 * Ne devine pas : parse des extraits alphaTex avec alphaTab et dump le modèle
 * résultant (track > staff > bar > voice > beat > note).
 *
 * Questions à trancher :
 *   Q1 — ordre des cordes dans \tuning (aigu→grave ou grave→aigu ?)
 *   Q2 — mapping `rf 1-5` (doigté main droite) : 1 = pouce ?
 *   Q3 — mapping `lf 1-5` (doigté main gauche)
 *   Q4 — `ds`, `glpf`, `glpt` : s'appliquent-ils à un silence ?
 *   Q5 — syntaxe de `barre`
 *   Q6 — les tablatures écrites en phase de recherche parsent-elles ?
 *
 *   node tools/probe-alphatex.mjs
 *   node tools/probe-alphatex.mjs --json   (sortie machine)
 */

import * as at from '@coderline/alphatab';

const JSON_MODE = process.argv.includes('--json');

// ---------------------------------------------------------------- utilitaires

const FINGER_NAME = new Map([
  [at.model.Fingers.Unknown, 'Unknown'],
  [at.model.Fingers.NoOrDead, 'NoOrDead'],
  [at.model.Fingers.Thumb, 'Thumb (p)'],
  [at.model.Fingers.IndexFinger, 'IndexFinger (i)'],
  [at.model.Fingers.MiddleFinger, 'MiddleFinger (m)'],
  [at.model.Fingers.AnnularFinger, 'AnnularFinger (a)'],
  [at.model.Fingers.LittleFinger, 'LittleFinger (c)'],
]);

const GOLPE_NAME = new Map([
  [at.model.GolpeType.None, 'None'],
  [at.model.GolpeType.Thumb, 'Thumb'],
  [at.model.GolpeType.Finger, 'Finger'],
]);

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** MIDI -> nom scientifique. Sert UNIQUEMENT au diagnostic de la sonde. */
function midiToName(midi) {
  if (midi === null || midi === undefined || Number.isNaN(midi)) return '?';
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

/**
 * Parse en capturant l'erreur ET les diagnostics.
 * Le message de l'exception est inutilisable seul ("check diagnostics on inner
 * error") : les vrais détails sont sur l'importer, pas sur l'erreur.
 */
function tryParse(tex) {
  const importer = new at.importer.AlphaTexImporter();
  importer.initFromString(tex, new at.Settings());
  const collect = (bag) =>
    (bag?.items ?? []).map(
      (d) => `[${d.code}] ligne ${d.start.line}, col ${d.start.col} : ${d.message}`
    );
  try {
    const score = importer.readScore();
    return {
      ok: true,
      score,
      warnings: [...collect(importer.lexerDiagnostics), ...collect(importer.parserDiagnostics)],
    };
  } catch (e) {
    return {
      ok: false,
      error: `${e?.constructor?.name ?? 'Error'}: ${e?.message ?? e}`,
      diagnostics: [...collect(importer.lexerDiagnostics), ...collect(importer.parserDiagnostics)],
    };
  }
}

/** Aplatit le modèle en une liste de beats/notes exploitable. */
function dumpScore(score) {
  const out = { tracks: [] };
  for (const track of score.tracks) {
    const t = { name: track.name, staves: [] };
    for (const staff of track.staves) {
      const s = {
        // Tel quel : c'est exactement ce que la sonde doit révéler.
        tuning: Array.from(staff.tuning ?? []),
        tuningWithNames: Array.from(staff.tuning ?? []).map((m, i) => `[${i}] ${m} = ${midiToName(m)}`),
        stringCount: staff.tuning?.length ?? 0,
        capo: staff.capo,
        isPercussion: staff.isPercussion,
        bars: [],
      };
      staff.bars.forEach((bar, barIdx) => {
        const b = { index: barIdx, voices: [] };
        bar.voices.forEach((voice, voiceIdx) => {
          const v = { index: voiceIdx, beats: [] };
          for (const beat of voice.beats) {
            const be = {
              index: beat.index,
              duration: at.model.Duration[beat.duration] ?? beat.duration,
              isRest: beat.isRest,
              isEmpty: beat.isEmpty,
            };
            // effets de beat pertinents pour la Tranche 0
            if (beat.golpe !== undefined && beat.golpe !== at.model.GolpeType.None) {
              be.golpe = GOLPE_NAME.get(beat.golpe) ?? beat.golpe;
            }
            if (beat.deadSlapped) be.deadSlapped = true;
            if (beat.barreFret !== undefined && beat.barreFret > 0) {
              be.barreFret = beat.barreFret;
              be.barreShape = at.model.BarreShape?.[beat.barreShape] ?? beat.barreShape;
            }
            if (beat.rasgueado) be.rasgueado = at.model.Rasgueado[beat.rasgueado] ?? beat.rasgueado;
            if (beat.tap) be.tap = true;
            if (beat.slap) be.slap = true;
            if (beat.pop) be.pop = true;

            be.notes = beat.notes.map((n) => {
              const rec = {
                string: n.string,
                fret: n.fret,
                realValue: n.realValue,
                pitch: midiToName(n.realValue),
              };
              if (n.leftHandFinger !== at.model.Fingers.Unknown) {
                rec.leftHandFinger = FINGER_NAME.get(n.leftHandFinger) ?? n.leftHandFinger;
                rec.leftHandFingerRaw = n.leftHandFinger;
              }
              if (n.rightHandFinger !== at.model.Fingers.Unknown) {
                rec.rightHandFinger = FINGER_NAME.get(n.rightHandFinger) ?? n.rightHandFinger;
                rec.rightHandFingerRaw = n.rightHandFinger;
              }
              if (n.isDead) rec.isDead = true;
              if (n.isPalmMute) rec.isPalmMute = true;
              if (n.isLetRing) rec.isLetRing = true;
              if (n.isStaccato) rec.isStaccato = true;
              if (n.harmonicType !== at.model.HarmonicType.None) {
                rec.harmonic = at.model.HarmonicType[n.harmonicType] ?? n.harmonicType;
              }
              return rec;
            });
            v.beats.push(be);
          }
          b.voices.push(v);
        });
        s.bars.push(b);
      });
      t.staves.push(s);
    }
    out.tracks.push(t);
  }
  return out;
}

// ------------------------------------------------------------------- les cas

const CASES = [
  {
    id: 'Q1a',
    question: 'Ordre des cordes dans \\tuning — exemple "Dropped D" de la doc alphaTab',
    tex: `\\track "T"
\\staff {tabs}
\\tuning (E4 B3 G3 D3 A2 D2)
:4 0.1 0.6 |`,
    lookFor:
      'staff.tuning : quel index porte le ré grave (D2 = 38) ? ' +
      'Et corde 1 / corde 6 : `0.1` et `0.6` donnent quelles hauteurs ?',
  },
  {
    id: 'Q1b',
    question: 'Ordre des cordes — même accordage écrit dans l\'ordre inverse',
    tex: `\\track "T"
\\staff {tabs}
\\tuning (D2 A2 D3 G3 B3 E4)
:4 0.1 0.6 |`,
    lookFor: 'Si le résultat diffère de Q1a, l\'ordre est significatif. Comparer les hauteurs de 0.1 et 0.6.',
  },
  {
    id: 'Q1c',
    question: 'Accordage par défaut (aucun \\tuning) — la référence',
    tex: `\\track "T"
\\staff {tabs}
:4 0.1 0.2 0.3 0.4 | :4 0.5 0.6 r r |`,
    lookFor:
      'En standard, corde 1 = mi aigu (E4 = 64) et corde 6 = mi grave (E2 = 40). ' +
      'Ce cas fixe la convention de numérotation des cordes indépendamment de \\tuning.',
  },
  {
    id: 'Q1d',
    question: 'DADGAD écrit aigu→grave (hypothèse retenue en phase de recherche)',
    tex: `\\track "T"
\\staff {tabs}
\\tuning (D4 A3 G3 D3 A2 D2)
:4 0.1 0.2 0.3 0.4 | :4 0.5 0.6 r r |`,
    lookFor: 'Attendu si aigu→grave : 0.1 = D4 (62), 0.6 = D2 (38).',
  },

  {
    id: 'Q2',
    question: 'Mapping `rf 1-5` — doigté MAIN DROITE',
    tex: `\\track "T"
\\staff {tabs}
:4 0.1{rf 1} 0.1{rf 2} 0.1{rf 3} 0.1{rf 4} | :4 0.1{rf 5} r r r |`,
    lookFor:
      'HYPOTHÈSE DE LA RECHERCHE : rf 1 = pouce (p), 2 = i, 3 = m, 4 = a, 5 = auriculaire. ' +
      'Si rf 1 donne IndexFinger au lieu de Thumb, TOUT le corpus de tablatures est décalé.',
  },
  {
    id: 'Q2b',
    question: 'Mapping `rf 0` — le pouce est-il l\'index 0 ?',
    tex: `\\track "T"
\\staff {tabs}
:4 0.1{rf 0} r r r |`,
    lookFor: 'L\'enum interne Fingers a Thumb = 0. Le parseur alphaTex accepte-t-il 0 ?',
  },
  {
    id: 'Q3',
    question: 'Mapping `lf 1-5` — doigté MAIN GAUCHE',
    tex: `\\track "T"
\\staff {tabs}
:4 5.1{lf 1} 5.1{lf 2} 5.1{lf 3} 5.1{lf 4} | :4 5.1{lf 5} r r r |`,
    lookFor: 'Convention classique attendue : 1 = index, 2 = majeur, 3 = annulaire, 4 = auriculaire.',
  },

  {
    id: 'Q4a',
    question: '`ds` (dead slap) appliqué à un SILENCE',
    tex: `\\track "T"
\\staff {tabs}
:4 r { ds } r r r |`,
    lookFor: 'Parse-t-il ? beat.deadSlapped est-il vrai sur un beat isRest ?',
  },
  {
    id: 'Q4b',
    question: '`glpt` / `glpf` (golpe pouce / doigt) appliqués à un SILENCE',
    tex: `\\track "T"
\\staff {tabs}
:4 r { glpt } r { glpf } r r |`,
    lookFor: 'beat.golpe = Thumb / Finger sur un beat isRest ?',
  },
  {
    id: 'Q4c',
    question: '`ds` / `glpt` / `glpf` appliqués à une NOTE (solution de repli)',
    tex: `\\track "T"
\\staff {tabs}
:4 3.5 { ds } 3.5 { glpt } 3.5 { glpf } 3.5 |`,
    lookFor: 'Si Q4a/Q4b échouent, c\'est la voie à suivre. Vérifier que les trois effets sont bien portés.',
  },
  {
    id: 'Q4d',
    question: '`ds` / golpe sur note morte (`x`) — la forme la plus probable pour le percussif',
    tex: `\\track "T"
\\staff {tabs}
:4 x.6 { ds } x.6 { glpt } x.6 { glpf } r |`,
    lookFor: 'Combinaison note morte + effet percussif. isDead + deadSlapped/golpe.',
  },

  {
    id: 'Q5a',
    question: 'Syntaxe `barre` — paramètre numérique seul',
    tex: `\\track "T"
\\staff {tabs}
:1 (5.6 5.5 5.4 5.3 5.2 5.1) { barre 5 } |`,
    lookFor: 'beat.barreFret = 5 ? Quelle barreShape par défaut ?',
  },
  {
    id: 'Q5b',
    question: 'Syntaxe `barre` — avec une forme explicite',
    tex: `\\track "T"
\\staff {tabs}
:1 (5.3 5.2 5.1) { barre 5 half } |`,
    lookFor: 'Le demi-barré est-il exprimable ? Sinon quelle valeur accepte le 2e paramètre ?',
  },

  {
    id: 'Q6a',
    question: 'RECHERCHE — tremolo.md, Ex. A (cycle p-a-m-i)',
    tex: `\\title "Ex. A"
\\tempo 40
\\ts 4 4
\\track "Guitare"
\\staff {score tabs}
\\tuning (E4 B3 G3 D3 A2 E2)
\\ks C
:8 0.5{rf 1 lr} 0.1{rf 4} 0.1{rf 3} 0.1{rf 2} 0.5{rf 1 lr} 0.1{rf 4} 0.1{rf 3} 0.1{rf 2} |`,
    lookFor: 'Parse ? Doigtés MD corrects après réponse à Q2 ? Le `lr` (let ring) passe-t-il ?',
  },
  {
    id: 'Q6b',
    question: 'RECHERCHE — alternance-pouce.md, Ex. C (motif Travis, palm mute + pinch)',
    tex: `\\title "Ex. C"
\\tempo 55
\\ts 4 4
\\track "Guitare"
\\staff {score tabs}
\\tuning (E4 B3 G3 D3 A2 E2)
\\ks C
:8 (3.5{rf 1 pm} 1.2{rf 3}) 0.3{rf 2} 2.4{rf 1 pm} 1.2{rf 3} 3.5{rf 1 pm} 0.3{rf 2} 2.4{rf 1 pm} 1.2{rf 3} |`,
    lookFor: 'Accord (pinch) + palm mute + doigtés dans le même beat.',
  },
  {
    id: 'Q6c',
    question: 'RECHERCHE — percussion, Ex. C (basse + snare sur silence)',
    tex: `\\track "Guitare"
\\staff {tabs}
\\tuning (E4 B3 G3 D3 A2 E2)
:4 0.5{rf 1} r { ds } 2.4{rf 1} r { ds } |`,
    lookFor: 'Le cas le plus incertain de tout le corpus. Dépend de Q4a.',
  },
  {
    id: 'Q7',
    question: 'Piste de percussion séparée (solution de repli si Q4 échoue)',
    tex: `\\track "Guitare"
\\staff {tabs}
:4 3.5 3.5 3.5 3.5 |
\\track "Percussion"
\\instrument percussion
:4 35 38 35 38 |`,
    lookFor: 'Une piste percussion parallèle est-elle exploitable ? (35 = kick, 38 = snare en GM)',
  },
];

// -------------------------------------------------------------------- exécution

const results = [];

for (const c of CASES) {
  const r = tryParse(c.tex);
  results.push({
    id: c.id,
    question: c.question,
    tex: c.tex,
    lookFor: c.lookFor,
    ok: r.ok,
    error: r.error,
    diagnostics: r.diagnostics ?? r.warnings ?? [],
    model: r.ok ? dumpScore(r.score) : null,
  });
}

if (JSON_MODE) {
  console.log(JSON.stringify(results, null, 2));
} else {
  for (const r of results) {
    console.log('\n' + '='.repeat(78));
    console.log(`${r.id} — ${r.question}`);
    console.log('='.repeat(78));
    console.log('--- alphaTex ---');
    console.log(r.tex);
    console.log('--- à observer ---');
    console.log(r.lookFor);
    console.log('--- résultat ---');
    if (!r.ok) {
      console.log('ÉCHEC DE PARSE');
      for (const d of r.diagnostics) console.log(`  ${d}`);
      if (!r.diagnostics.length) console.log(`  ${r.error}`);
      continue;
    }
    for (const d of r.diagnostics) console.log(`  AVERTISSEMENT ${d}`);
    for (const t of r.model.tracks) {
      for (const s of t.staves) {
        console.log(`track "${t.name}" · ${s.stringCount} cordes · percussion=${s.isPercussion}`);
        if (s.tuningWithNames.length) {
          console.log('  staff.tuning :');
          for (const line of s.tuningWithNames) console.log(`    ${line}`);
        }
        for (const b of s.bars) {
          for (const v of b.voices) {
            for (const be of v.beats) {
              const flags = Object.entries(be)
                .filter(([k, val]) =>
                  !['index', 'duration', 'notes', 'isRest', 'isEmpty'].includes(k) && val)
                .map(([k, val]) => `${k}=${val}`)
                .join(' ');
              const head = `  m${b.index} v${v.index} b${be.index} [${be.duration}]` +
                (be.isRest ? ' REST' : '') + (flags ? ` {${flags}}` : '');
              console.log(head);
              for (const n of be.notes) {
                const parts = [`corde ${n.string}`, `case ${n.fret}`, `midi ${n.realValue} (${n.pitch})`];
                if (n.rightHandFinger) parts.push(`rf=${n.rightHandFinger} [raw ${n.rightHandFingerRaw}]`);
                if (n.leftHandFinger) parts.push(`lf=${n.leftHandFinger} [raw ${n.leftHandFingerRaw}]`);
                for (const k of ['isDead', 'isPalmMute', 'isLetRing', 'isStaccato', 'harmonic']) {
                  if (n[k]) parts.push(`${k}=${n[k]}`);
                }
                console.log(`      ${parts.join(' · ')}`);
              }
            }
          }
        }
      }
    }
  }
  console.log('\n' + '='.repeat(78));
  console.log(`${results.filter((r) => r.ok).length}/${results.length} cas parsés sans erreur.`);
  const failed = results.filter((r) => !r.ok).map((r) => r.id);
  if (failed.length) console.log(`Échecs : ${failed.join(', ')}`);
}
