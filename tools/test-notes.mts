/**
 * Vérifie la dérivation des noms de notes — CLAUDE.md, décision 2.
 *
 * Cette fonction est le seul rempart contre la classe d'erreur qui s'est
 * produite deux fois pendant la phase de recherche : une tablature juste,
 * un nom de note faux. Elle mérite donc un test, même minuscule.
 *
 *   npm run test:notes
 */

import assert from 'node:assert/strict';
import {
  ACCORDAGES,
  accordage,
  midiDepuisNom,
  noteDe,
  nomAvecOctave,
  nomDeFrette,
  centsDepuisHz,
} from '../src/lib/notes.ts';

let n = 0;
const cas = (titre: string, fn: () => void) => {
  fn();
  n++;
  console.log(`  ok  ${titre}`);
};

console.log('\nDérivation des noms de notes\n');

cas('midiDepuisNom couvre le diapason et les altérations', () => {
  assert.equal(midiDepuisNom('A4'), 69);
  assert.equal(midiDepuisNom('C4'), 60);
  assert.equal(midiDepuisNom('E2'), 40);
  assert.equal(midiDepuisNom('F#3'), 54);
  assert.equal(midiDepuisNom('Bb3'), 58);
});

cas('la corde 1 est la plus aiguë, la 6 la plus grave', () => {
  const std = ACCORDAGES.standard;
  assert.equal(noteDe(std, 1, 0).midi, 64, 'corde 1 à vide = mi aigu');
  assert.equal(noteDe(std, 6, 0).midi, 40, 'corde 6 à vide = mi grave');
  assert.ok(noteDe(std, 1, 0).midi > noteDe(std, 6, 0).midi);
});

cas('la gamme de do en position ouverte tombe juste', () => {
  // L'exercice C de la fiche apoyando-tirando. Vérifié aussi par la sonde
  // alphaTab, qui produit les mêmes valeurs MIDI (08-alphatab-verifie.md, R11).
  const std = ACCORDAGES.standard;
  const gamme: Array<[number, number]> = [
    [5, 3], [4, 0], [4, 2], [4, 3], [3, 0], [3, 2], [2, 0], [2, 1],
  ];
  const midis = gamme.map(([c, f]) => noteDe(std, c, f).midi);
  assert.deepEqual(midis, [48, 50, 52, 53, 55, 57, 59, 60]);
  assert.deepEqual(
    gamme.map(([c, f]) => nomDeFrette(std, c, f)),
    ['do', 'ré', 'mi', 'fa', 'sol', 'la', 'si', 'do']
  );
});

cas("l'erreur trouvée en recherche est bien attrapée", () => {
  // Un commentaire de la fiche arpeges-pima nommait « ré » la corde 1 case 3.
  const std = ACCORDAGES.standard;
  assert.equal(nomDeFrette(std, 1, 3), 'sol');
  assert.notEqual(nomDeFrette(std, 1, 3), 'ré');
});

cas('DADGAD descend bien la 6, la 2 et la 1', () => {
  const d = ACCORDAGES.dadgad;
  assert.equal(nomAvecOctave(noteDe(d, 1, 0), 'internationale'), 'D4');
  assert.equal(nomAvecOctave(noteDe(d, 2, 0), 'internationale'), 'A3');
  assert.equal(nomAvecOctave(noteDe(d, 6, 0), 'internationale'), 'D2');
  // Les cordes 3, 4 et 5 sont identiques au standard.
  for (const c of [3, 4, 5]) {
    assert.equal(noteDe(d, c, 0).midi, noteDe(ACCORDAGES.standard, c, 0).midi);
  }
});

cas('le capo transpose sans toucher à l’accordage', () => {
  const std = ACCORDAGES.standard;
  assert.equal(noteDe(std, 1, 0, 2).midi, noteDe(std, 1, 2).midi);
});

cas('une corde hors accordage lève, avec un message utile', () => {
  assert.throws(() => noteDe(ACCORDAGES.standard, 7, 0), /Corde 7 hors de l'accordage/);
  assert.throws(() => noteDe(ACCORDAGES.standard, 0, 0), /corde 1 = la plus aiguë/);
});

cas('les fréquences correspondent aux valeurs de 06-accordeur.md', () => {
  const std = ACCORDAGES.standard;
  const hz = (c: number) => Math.round(noteDe(std, c, 0).hz * 100) / 100;
  assert.equal(hz(6), 82.41);
  assert.equal(hz(5), 110);
  assert.equal(hz(4), 146.83);
  assert.equal(hz(3), 196);
  assert.equal(hz(2), 246.94);
  assert.equal(hz(1), 329.63);
  // La note la plus grave à gérer par l'accordeur (BADGAD).
  assert.equal(Math.round(noteDe(accordage('B1'), 1, 0).hz * 100) / 100, 61.74);
});

cas('centsDepuisHz mesure l’écart au tempérament', () => {
  assert.equal(centsDepuisHz(440).midi, 69);
  assert.ok(Math.abs(centsDepuisHz(440).cents) < 1e-9);

  const haut = centsDepuisHz(440 * 2 ** (0.4 / 12));
  assert.equal(haut.midi, 69);
  assert.ok(Math.abs(haut.cents - 40) < 0.001, `attendu ~+40, obtenu ${haut.cents}`);

  const bas = centsDepuisHz(440 * 2 ** (-0.4 / 12));
  assert.equal(bas.midi, 69);
  assert.ok(Math.abs(bas.cents + 40) < 0.001, `attendu ~−40, obtenu ${bas.cents}`);
});

cas('la frontière à ±50 cents bascule vers le haut', () => {
  // Pile au quart de ton, la hauteur est équidistante de deux notes. L'arrondi
  // choisit la supérieure, donc l'écart s'affiche à −50 et jamais à +50 :
  // la plage utile est [−50, +50[. L'accordeur (tranche 4) doit en tenir
  // compte pour que l'aiguille ne saute pas d'un demi-ton en butée.
  const pile = centsDepuisHz(440 * 2 ** (0.5 / 12));
  assert.equal(pile.midi, 70);
  assert.ok(Math.abs(pile.cents + 50) < 1e-9, `attendu −50, obtenu ${pile.cents}`);
});

console.log(`\n${n} cas, tous passés.\n`);
