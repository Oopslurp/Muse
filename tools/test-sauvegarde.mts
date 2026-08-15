/**
 * Vérifie la lecture d'une sauvegarde — `src/lib/sauvegarde.ts`.
 *
 * C'est le module où une erreur coûte le plus cher : il écrit dans la seule
 * copie des données, à partir d'un fichier qui vient d'un disque. Un import
 * qui avale un champ douteux, qui duplique une séance ou qui perd une
 * observation ne se remarque pas — la page se recharge, tout a l'air normal.
 *
 * `analyser()` et `seancesNouvelles()` sont purs, donc testables ici sans
 * navigateur. L'écriture elle-même (`importer`, `toutEffacer`) passe par Dexie
 * et reste couverte par `npm run audit:pratique`.
 *
 *   npm run test:sauvegarde
 */

import assert from 'node:assert/strict';
import { analyser, seancesNouvelles } from '../src/lib/sauvegarde.ts';
import type { Seance } from '../src/lib/base.ts';

let n = 0;
const cas = (titre: string, fn: () => void) => {
  fn();
  n++;
  console.log(`  ok  ${titre}`);
};

const CONNUS = new Set(['tremolo', 'arpeges-pima', 'golpe']);

const fichier = (contenu: Record<string, unknown> = {}) => ({
  format: 'muse-sauvegarde',
  version: 3,
  exporteLe: '2026-08-15T10:00:00.000Z',
  techniques: [],
  seances: [],
  observations: [],
  ...contenu,
});

console.log('\nLecture d’une sauvegarde\n');

/* ------------------------------------------------------- enveloppe */

cas('un fichier étranger est refusé, avec un message lisible', () => {
  assert.throws(() => analyser({ format: 'autre-chose' }, CONNUS), /n’est pas une sauvegarde Muse/);
  assert.throws(() => analyser({}, CONNUS), /n’est pas une sauvegarde Muse/);
  assert.throws(() => analyser(null, CONNUS), /n’est pas une sauvegarde Muse/);
  assert.throws(() => analyser('{}', CONNUS), /n’est pas une sauvegarde Muse/);
});

cas('une version inconnue est refusée plutôt que devinée', () => {
  assert.throws(() => analyser(fichier({ version: 4 }), CONNUS), /Version de sauvegarde inconnue/);
  assert.throws(() => analyser(fichier({ version: 0 }), CONNUS), /Version de sauvegarde inconnue/);
});

cas('les versions 1, 2 et 3 se relisent toutes', () => {
  // Une sauvegarde qu'on ne peut plus ouvrir n'est pas une sauvegarde.
  for (const version of [2, 3]) {
    assert.equal(analyser(fichier({ version }), CONNUS).seances.length, 0);
  }
  const v1 = { format: 'muse-progression', techniques: [], seances: [] };
  assert.equal(analyser(v1, CONNUS).techniques.length, 0);
});

/* ------------------------------------------------------- techniques */

cas('une technique inconnue est écartée et nommée', () => {
  const a = analyser(
    fichier({
      techniques: [
        { id: 'tremolo', avancement: 'acquis', maj: '2026-08-01T10:00:00.000Z' },
        { id: 'fiche-renommee', avancement: 'acquis' },
      ],
    }),
    CONNUS
  );
  assert.equal(a.techniques.length, 1);
  assert.equal(a.techniques[0]!.id, 'tremolo');
  assert.deepEqual(a.ignorees, ['fiche-renommee']);
});

cas('un avancement fantaisiste retombe sur « neuf »', () => {
  const a = analyser(
    fichier({
      techniques: [
        { id: 'tremolo', avancement: 'expert' },
        { id: 'golpe', avancement: 'en-cours' },
      ],
    }),
    CONNUS
  );
  assert.equal(a.techniques.find((t) => t.id === 'tremolo')!.avancement, 'neuf');
  assert.equal(a.techniques.find((t) => t.id === 'golpe')!.avancement, 'en-cours');
});

cas('l’observation de fiche d’une v1 devient l’élément « fiche »', () => {
  // Décision 1, appliquée à rebours : l'ancienne promotion portait sur la
  // fiche entière, ce que la clé `id#fiche` dit exactement.
  const a = analyser(
    {
      format: 'muse-progression',
      techniques: [
        {
          id: 'tremolo',
          avancement: 'acquis',
          observation: { date: '2026-07-04', note: 'tenu à ♩ 60' },
        },
      ],
    },
    CONNUS
  );
  assert.equal(a.observations.length, 1);
  assert.deepEqual(
    { ...a.observations[0]!, maj: '—' },
    { cle: 'tremolo#fiche', fiche: 'tremolo', element: 'fiche', date: '2026-07-04', note: 'tenu à ♩ 60', maj: '—' }
  );
});

cas('une observation sans date valable ne passe pas', () => {
  const a = analyser(
    fichier({
      techniques: [
        { id: 'tremolo', observation: { date: '04/07/2026' } },
        { id: 'golpe', observation: { date: '2026-7-4' } },
      ],
    }),
    CONNUS
  );
  assert.equal(a.observations.length, 0);
  assert.equal(a.techniques.length, 2, 'l’avancement, lui, reste importé');
});

/* ----------------------------------------------------- observations */

cas('la clé d’observation est reconstruite, jamais reprise du fichier', () => {
  // Une clé recopiée telle quelle pourrait ne pas correspondre à ses propres
  // champs — et c'est la clé primaire de la table.
  const a = analyser(
    fichier({
      observations: [
        { cle: 'nimporte-quoi', fiche: 'tremolo', element: 'doute:2', date: '2026-08-01' },
      ],
    }),
    CONNUS
  );
  assert.equal(a.observations[0]!.cle, 'tremolo#doute:2');
});

cas('une observation incomplète est sautée sans faire tomber le lot', () => {
  const a = analyser(
    fichier({
      observations: [
        { fiche: 'tremolo', element: 'doute:0', date: '2026-08-01' },
        { fiche: 'tremolo', date: '2026-08-01' },
        { element: 'doute:1', date: '2026-08-01' },
        { fiche: 'tremolo', element: 'doute:2' },
        null,
        'texte',
      ],
    }),
    CONNUS
  );
  assert.equal(a.observations.length, 1);
});

cas('une observation sur une fiche inconnue est écartée et nommée', () => {
  const a = analyser(
    fichier({
      observations: [{ fiche: 'disparue', element: 'fiche', date: '2026-08-01' }],
    }),
    CONNUS
  );
  assert.equal(a.observations.length, 0);
  assert.deepEqual(a.ignorees, ['disparue']);
});

/* --------------------------------------------------------- séances */

cas('une séance sans date ou sans minutes est sautée', () => {
  const a = analyser(
    fichier({
      seances: [
        { date: '2026-08-01', minutes: 10, technique: 'tremolo', uid: 'a' },
        { minutes: 10, technique: 'tremolo', uid: 'b' },
        { date: '2026-08-01', technique: 'tremolo', uid: 'c' },
        { date: '2026-08-01', minutes: 0, uid: 'd' },
        { date: '2026-08-01', minutes: 5000, uid: 'e' },
      ],
    }),
    CONNUS
  );
  assert.deepEqual(a.seances.map((s) => s.uid), ['a']);
});

cas('une séance libre garde technique nulle et passe', () => {
  const a = analyser(
    fichier({ seances: [{ date: '2026-08-01', minutes: 30, technique: null, uid: 'libre' }] }),
    CONNUS
  );
  assert.equal(a.seances.length, 1);
  assert.equal(a.seances[0]!.technique, null);
});

cas('un tempo mal formé est retiré, la séance reste', () => {
  const a = analyser(
    fichier({
      seances: [
        { date: '2026-08-01', minutes: 10, uid: 'a', tempo: { valeur: 72, unite: 'bpm' } },
        { date: '2026-08-01', minutes: 10, uid: 'b', tempo: { valeur: 72, unite: 'tours/min' } },
        { date: '2026-08-01', minutes: 10, uid: 'c', tempo: { valeur: 'vite', unite: 'bpm' } },
        { date: '2026-08-01', minutes: 10, uid: 'd', tempo: 'rapide' },
      ],
    }),
    CONNUS
  );
  assert.equal(a.seances.length, 4);
  assert.deepEqual(a.seances[0]!.tempo, { valeur: 72, unite: 'bpm' });
  for (const s of a.seances.slice(1)) assert.equal(s.tempo, undefined);
});

cas('les deux unités de tempo sont acceptées', () => {
  const a = analyser(
    fichier({
      seances: [{ date: '2026-08-01', minutes: 10, uid: 'a', tempo: { valeur: 96, unite: 'notes-min' } }],
    }),
    CONNUS
  );
  assert.deepEqual(a.seances[0]!.tempo, { valeur: 96, unite: 'notes-min' });
});

cas('une séance d’avant la v3 reçoit un identifiant stable', () => {
  const a = analyser(fichier({ version: 2, seances: [{ date: '2026-08-01', minutes: 10 }] }), CONNUS);
  assert.equal(typeof a.seances[0]!.uid, 'string');
  assert.ok(a.seances[0]!.uid.length >= 8, a.seances[0]!.uid);
});

cas('un champ libre trop long est tronqué, pas refusé', () => {
  const a = analyser(
    fichier({
      seances: [{ date: '2026-08-01', minutes: 10, uid: 'a', note: 'x'.repeat(9000) }],
    }),
    CONNUS
  );
  assert.equal(a.seances[0]!.note!.length, 4000);
});

cas('les tableaux absents ou du mauvais type ne font pas tomber la lecture', () => {
  const a = analyser(
    { format: 'muse-sauvegarde', version: 3, techniques: 'oui', seances: null },
    CONNUS
  );
  assert.deepEqual([a.techniques.length, a.seances.length, a.observations.length], [0, 0, 0]);
});

/* ---------------------------------------------------- idempotence */

const seance = (uid: string): Seance => ({
  uid,
  date: '2026-08-01',
  technique: 'tremolo',
  minutes: 10,
});

cas('réimporter le même fichier n’ajoute rien', () => {
  const lot = [seance('a'), seance('b')];
  assert.equal(seancesNouvelles(lot, new Set()).length, 2);
  assert.equal(seancesNouvelles(lot, new Set(['a', 'b'])).length, 0);
  assert.deepEqual(seancesNouvelles(lot, new Set(['a'])).map((s) => s.uid), ['b']);
});

cas('un fichier qui se contredit lui-même ne duplique pas non plus', () => {
  // Deux fois la même séance dans un seul fichier : `bulkAdd` en écrirait deux
  // sans ce dédoublonnage interne.
  assert.deepEqual(
    seancesNouvelles([seance('a'), seance('a'), seance('b')], new Set()).map((s) => s.uid),
    ['a', 'b']
  );
});

cas('une séance sans identifiant n’est jamais écrite à l’aveugle', () => {
  assert.equal(seancesNouvelles([{ ...seance('x'), uid: '' }], new Set()).length, 0);
});

console.log(`\n${n} cas, tous passés.\n`);
