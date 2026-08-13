/**
 * Vérifie le moteur de l'accordeur — docs/research/06-accordeur.md.
 *
 *   npm run test:accordeur
 *
 * Un accordeur qu'on ne peut vérifier qu'une guitare à la main est un
 * accordeur qu'on ne vérifie jamais. Le moteur ne connaît ni le navigateur ni
 * React : on lui fabrique donc des sinusoïdes et on regarde ce qu'il en dit,
 * détection MPM comprise.
 *
 * Ce que ces cas couvrent, et pourquoi :
 *  · les six cordes de chaque accordage, jusqu'au si1 de BADGAD à 61,74 Hz,
 *    la note qui dimensionne la fenêtre d'analyse ;
 *  · l'erreur d'octave, défaut classique des cordes graves d'acoustique, et
 *    son rejet par la médiane ;
 *  · le gate de niveau, le sens de la correction, l'hystérésis sur le nom.
 */

import assert from 'node:assert/strict';
import {
  REGLAGES,
  analyser,
  centsEntre,
  detecteurMpm,
  etatNeuf,
  hzDeMidi,
  mediane,
  rms,
  sensCorrection,
  type Detecteur,
  type OptionsAnalyse,
} from '../src/lib/accordeur.ts';
import { ACCORDAGES, ACCORDAGE_LABELS, midiDepuisNom, nomAvecOctave } from '../src/lib/notes.ts';

let n = 0;
const cas = (titre: string, fn: () => void) => {
  fn();
  n++;
  console.log(`  ok  ${titre}`);
};

const FE = 48000;
const detecteur = detecteurMpm(REGLAGES.fenetre);

/**
 * Une corde pincée, en gros.
 *
 * Une sinusoïde pure serait plus facile à suivre qu'un vrai signal : on ajoute
 * donc les harmoniques 2 et 3, puisque c'est précisément leur présence qui
 * fait sauter les accordeurs à l'octave sur les cordes graves.
 */
function corde(hz: number, amplitude = 0.2, harmoniques: readonly number[] = [1, 0.5, 0.25]) {
  const buf = new Float32Array(REGLAGES.fenetre);
  for (let i = 0; i < buf.length; i++) {
    let v = 0;
    for (let h = 0; h < harmoniques.length; h++) {
      v += harmoniques[h]! * Math.sin((2 * Math.PI * hz * (h + 1) * i) / FE);
    }
    buf[i] = amplitude * v;
  }
  return buf;
}

const options = (p: Partial<OptionsAnalyse> = {}): OptionsAnalyse => ({
  diapason: 440,
  seuilRms: REGLAGES.seuilRmsDefaut,
  cibles: null,
  plage: REGLAGES.plage.accordage,
  ...p,
});

/** Fait tourner le moteur sur un signal stable, comme une note tenue. */
function tenir(hz: number, images = 8, opts = options(), amplitude = 0.2) {
  const etat = etatNeuf();
  const buf = corde(hz, amplitude);
  let dernier = analyser(etat, buf, FE, detecteur, opts);
  for (let i = 1; i < images; i++) dernier = analyser(etat, buf, FE, detecteur, opts);
  return { etat, resultat: dernier };
}

console.log('\nAccordeur — moteur d’analyse\n');

cas('la médiane écarte l’aberration que la moyenne dilue', () => {
  // Quatre mesures à 82 Hz et une erreur d'octave à 164 Hz.
  const avec = [82.4, 82.4, 164.8, 82.4, 82.4];
  assert.equal(mediane(avec), 82.4);
  const moyenne = avec.reduce((a, b) => a + b, 0) / avec.length;
  assert.ok(moyenne > 98, `une moyenne se ferait berner : ${moyenne.toFixed(1)} Hz`);
});

cas('le niveau efficace distingue le silence du signal', () => {
  assert.ok(rms(new Float32Array(1024)) === 0);
  // Une sinusoïde d'amplitude a a pour valeur efficace a/√2.
  const a = 0.4;
  assert.ok(Math.abs(rms(corde(220, a, [1])) - a / Math.SQRT2) < 0.01);
});

cas('sous le seuil, on passe en veille sans rien inventer', () => {
  const etat = etatNeuf();
  const r = analyser(etat, corde(110, 0.0005), FE, detecteur, options());
  assert.equal(r.type, 'veille');
  assert.equal(etat.gateOuvert, false);
});

cas('les six cordes de l’accordage standard sont reconnues', () => {
  for (let corde6to1 = 1; corde6to1 <= 6; corde6to1++) {
    const midi = ACCORDAGES.standard[corde6to1 - 1]!;
    const r = tenir(hzDeMidi(midi)).resultat;
    assert.equal(r.type, 'mesure', `corde ${corde6to1} non mesurée`);
    if (r.type !== 'mesure') return;
    assert.equal(r.midi, midi, `corde ${corde6to1} : ${r.midi} au lieu de ${midi}`);
    assert.ok(Math.abs(r.cents) < 2, `corde ${corde6to1} : ${r.cents.toFixed(1)} cents`);
  }
});

cas('toutes les cordes de tous les accordages, si1 de BADGAD compris', () => {
  let cordes = 0;
  for (const [id, accord] of Object.entries(ACCORDAGES)) {
    for (const midi of accord) {
      const r = tenir(hzDeMidi(midi)).resultat;
      assert.equal(r.type, 'mesure', `${ACCORDAGE_LABELS[id as never]} : rien détecté`);
      if (r.type !== 'mesure') return;
      assert.equal(
        r.midi,
        midi,
        `${ACCORDAGE_LABELS[id as never]} : ${nomAvecOctave(
          { midi: r.midi, classe: 0, octave: 0, hz: 0 },
          'internationale'
        )} au lieu du MIDI ${midi}`
      );
      cordes++;
    }
  }
  assert.equal(cordes, Object.keys(ACCORDAGES).length * 6);
});

cas('le si1 de BADGAD (61,74 Hz) tient dans la fenêtre de 4096', () => {
  const midi = midiDepuisNom('B1');
  const r = tenir(hzDeMidi(midi)).resultat;
  assert.equal(r.type, 'mesure');
  if (r.type !== 'mesure') return;
  assert.equal(r.midi, midi);
  assert.ok(r.clarte > 0.9, `clarté ${r.clarte.toFixed(3)}`);
});

cas('une corde détendue de 20 cents est mesurée comme telle', () => {
  const midi = midiDepuisNom('E2');
  const r = tenir(hzDeMidi(midi) * 2 ** (-20 / 1200)).resultat;
  assert.equal(r.type, 'mesure');
  if (r.type !== 'mesure') return;
  assert.equal(r.midi, midi);
  assert.ok(Math.abs(r.cents + 20) < 3, `${r.cents.toFixed(1)} cents au lieu de −20`);
  assert.equal(r.juste, false);
});

cas('le sens de la correction se lit en toutes lettres', () => {
  assert.equal(sensCorrection(-20), 'tends');
  assert.equal(sensCorrection(20), 'détends');
  assert.equal(sensCorrection(0), 'juste');
  assert.equal(sensCorrection(REGLAGES.toleranceCents), 'juste');
  assert.equal(sensCorrection(REGLAGES.toleranceCents + 0.5), 'détends');
});

cas('hors plage, rien n’est affiché', () => {
  const r = tenir(1500, 4, options({ plage: REGLAGES.plage.accordage })).resultat;
  assert.notEqual(r.type, 'mesure');
  // La même note passe en mode chromatique.
  const libre = tenir(1000, 8, options({ plage: REGLAGES.plage.chromatique })).resultat;
  assert.equal(libre.type, 'mesure');
});

cas('corde ciblée : une voisine à plus de 350 cents est rejetée', () => {
  const cible = midiDepuisNom('A2');
  // Le ré3 est cinq demi-tons plus haut : 500 cents.
  const r = tenir(hzDeMidi(midiDepuisNom('D3')), 4, options({ cibles: [cible] })).resultat;
  assert.equal(r.type, 'rejet');
  if (r.type === 'rejet') assert.equal(r.raison, 'cible');
});

cas('corde ciblée : l’écart se mesure sur la corde visée, pas sur le demi-ton voisin', () => {
  const cible = midiDepuisNom('D2'); // drop D
  // La corde est restée en mi2, un ton trop haut.
  const hz = hzDeMidi(midiDepuisNom('E2'));
  const r = tenir(hz, 8, options({ cibles: [cible] })).resultat;
  assert.equal(r.type, 'mesure');
  if (r.type !== 'mesure') return;
  assert.equal(r.midi, cible);
  // 200 cents à détendre, et surtout pas « juste » comme le dirait une
  // lecture au demi-ton le plus proche.
  assert.ok(Math.abs(r.cents - 200) < 5, `${r.cents.toFixed(1)} cents`);
  assert.equal(sensCorrection(r.cents), 'détends');
});

cas('accordage automatique : la référence est la corde, pas le demi-ton voisin', () => {
  // Un mi2 détendu de 70 cents. Le demi-ton le plus proche est le ré♯2, qui
  // ferait afficher « ré♯2, +30 » — exact, et parfaitement inutilisable.
  const mi2 = midiDepuisNom('E2');
  const hz = hzDeMidi(mi2) * 2 ** (-70 / 1200);
  const r = tenir(hz, 8, options({ cibles: ACCORDAGES.standard })).resultat;
  assert.equal(r.type, 'mesure');
  if (r.type !== 'mesure') return;
  assert.equal(r.midi, mi2, 'la corde reconnue n’est pas le mi2');
  assert.ok(Math.abs(r.cents + 70) < 4, `${r.cents.toFixed(1)} cents au lieu de −70`);
  assert.equal(sensCorrection(r.cents), 'tends');

  // Le même signal en chromatique libre retombe bien sur le demi-ton voisin.
  const libre = tenir(hz, 8, options()).resultat;
  assert.equal(libre.type, 'mesure');
  if (libre.type === 'mesure') assert.equal(libre.midi, mi2 - 1);
});

cas('accordage automatique : chaque corde du DADGAD trouve la sienne', () => {
  for (const midi of ACCORDAGES.dadgad) {
    const r = tenir(hzDeMidi(midi) * 2 ** (25 / 1200), 8, options({ cibles: ACCORDAGES.dadgad }))
      .resultat;
    assert.equal(r.type, 'mesure');
    if (r.type !== 'mesure') return;
    assert.equal(r.midi, midi, `MIDI ${r.midi} au lieu de ${midi}`);
    assert.equal(sensCorrection(r.cents), 'détends');
  }
});

cas('le nom de note ne bascule qu’après cinq images, médiane et hystérésis cumulées', () => {
  // Les deux étages se composent, et c'est voulu : la médiane des cinq
  // dernières hauteurs doit d'abord pencher du côté de la nouvelle note — deux
  // images — avant que l'hystérésis ne compte ses trois. Soit cinq images,
  // ~85 ms à 60 Hz, bien en deçà des 250 ms visés. Sans cette inertie,
  // l'affichage clignote entre deux demi-tons quand on est pile entre les
  // deux : le moment où on a le plus besoin de stabilité.
  const etat = etatNeuf();
  const opts = options();
  const la = midiDepuisNom('A2');
  const sib = midiDepuisNom('A#2');
  for (let i = 0; i < 6; i++) analyser(etat, corde(hzDeMidi(la)), FE, detecteur, opts);
  assert.equal(etat.midiAffiche, la);

  for (let i = 1; i <= 4; i++) {
    analyser(etat, corde(hzDeMidi(sib)), FE, detecteur, opts);
    assert.equal(etat.midiAffiche, la, `a basculé dès l’image ${i}`);
  }
  analyser(etat, corde(hzDeMidi(sib)), FE, detecteur, opts);
  assert.equal(etat.midiAffiche, sib, 'n’a pas basculé à la 5e image');
});

cas('une nouvelle attaque repart sans traîner l’historique de la précédente', () => {
  const etat = etatNeuf();
  const opts = options();
  for (let i = 0; i < 6; i++) analyser(etat, corde(hzDeMidi(midiDepuisNom('E4'))), FE, detecteur, opts);
  assert.ok(etat.historique.length > 0);

  analyser(etat, corde(110, 0.0002), FE, detecteur, opts); // silence
  assert.equal(etat.gateOuvert, false);

  const r = analyser(etat, corde(hzDeMidi(midiDepuisNom('E2'))), FE, detecteur, opts);
  assert.equal(etat.historique.length, 1, 'l’historique n’a pas été vidé');
  assert.equal(r.type, 'mesure');
  if (r.type === 'mesure') assert.equal(r.midi, midiDepuisNom('E2'));
});

cas('le diapason est paramétrable', () => {
  const midi = midiDepuisNom('A2');
  // À 415 Hz, le la2 tombe à 103,8 Hz. Mesuré avec un diapason à 440, il
  // paraîtrait détendu de 100 cents ; avec le bon diapason, il est juste.
  const hz = hzDeMidi(midi, 415);
  const r = tenir(hz, 8, options({ diapason: 415 })).resultat;
  assert.equal(r.type, 'mesure');
  if (r.type !== 'mesure') return;
  assert.equal(r.midi, midi);
  assert.ok(Math.abs(r.cents) < 2, `${r.cents.toFixed(1)} cents`);
  assert.ok(Math.abs(centsEntre(hz, hzDeMidi(midi, 440)) + 101) < 2);
});

cas('le détecteur est interchangeable derrière une seule fonction', () => {
  // CLAUDE.md, décision 5 : on doit pouvoir remplacer MPM sans toucher au reste.
  const bidon: Detecteur = () => ({ hz: hzDeMidi(midiDepuisNom('G3')), clarte: 0.99 });
  const etat = etatNeuf();
  let r = analyser(etat, corde(440), FE, bidon, options());
  for (let i = 0; i < 5; i++) r = analyser(etat, corde(440), FE, bidon, options());
  assert.equal(r.type, 'mesure');
  if (r.type === 'mesure') assert.equal(r.midi, midiDepuisNom('G3'));
});

cas('une clarté insuffisante est rejetée, pas affichée pâle', () => {
  const flou: Detecteur = () => ({ hz: 110, clarte: REGLAGES.clarteMin - 0.01 });
  const r = analyser(etatNeuf(), corde(110), FE, flou, options());
  assert.equal(r.type, 'rejet');
  if (r.type === 'rejet') assert.equal(r.raison, 'clarte');
});

cas('entre les deux seuils, la mesure passe mais se déclare incertaine', () => {
  const moyen: Detecteur = () => ({ hz: hzDeMidi(40), clarte: 0.85 });
  const etat = etatNeuf();
  let r = analyser(etat, corde(82.41), FE, moyen, options());
  for (let i = 0; i < 5; i++) r = analyser(etat, corde(82.41), FE, moyen, options());
  assert.equal(r.type, 'mesure');
  if (r.type === 'mesure') assert.equal(r.sure, false);
});

console.log(`\n${n} cas, tous passés.\n`);
