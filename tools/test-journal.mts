/**
 * Vérifie l'agrégation du journal — `src/lib/journal.ts`.
 *
 * Seule la partie pure est testée : `bilan()` et `aujourdhui()`. Les fonctions
 * de lecture et d'écriture passent par Dexie et n'ont pas d'IndexedDB sous
 * Node ; elles sont couvertes au navigateur par `npm run audit:pratique`.
 *
 * `bilan()` est agrégé à la lecture plutôt que tenu à jour — donc il ne peut
 * pas se désynchroniser, mais il peut se tromper. C'est ce qu'on vérifie.
 *
 *   npm run test:journal
 */

import assert from 'node:assert/strict';
import { aujourdhui, bilan, type Seance } from '../src/lib/journal.ts';

let n = 0;
const cas = (titre: string, fn: () => void) => {
  fn();
  n++;
  console.log(`  ok  ${titre}`);
};

let prochain = 1;
const seance = (s: Partial<Seance> & { date: string }): Seance => ({
  id: prochain++,
  uid: `u${prochain}`,
  technique: 'tremolo',
  minutes: 10,
  ...s,
});

console.log('\nAgrégation du journal\n');

cas('un journal vide rend un bilan vide, pas une exception', () => {
  const b = bilan([], 'tremolo');
  assert.equal(b.seances, 0);
  assert.equal(b.minutes, 0);
  assert.equal(b.derniere, null);
  assert.deepEqual(b.meilleursTempos, []);
  assert.deepEqual(b.arrets, []);
});

cas('une technique sans séance ne récupère pas celles des autres', () => {
  const seances = [seance({ date: '2026-08-01' }), seance({ date: '2026-08-02' })];
  assert.equal(bilan(seances, 'arpeges-pima').seances, 0);
  assert.equal(bilan(seances, 'tremolo').seances, 2);
});

cas('les séances libres ne se rangent sous aucune technique', () => {
  const seances = [seance({ date: '2026-08-01', technique: null, minutes: 45 })];
  assert.equal(bilan(seances, 'tremolo').seances, 0);
});

cas('minutes et séances se cumulent', () => {
  const b = bilan(
    [
      seance({ date: '2026-08-01', minutes: 8 }),
      seance({ date: '2026-08-03', minutes: 12 }),
      seance({ date: '2026-08-02', minutes: 10 }),
    ],
    'tremolo'
  );
  assert.equal(b.seances, 3);
  assert.equal(b.minutes, 30);
});

cas('la dernière date ne dépend pas de l’ordre des séances', () => {
  const trois = [
    seance({ date: '2026-08-03' }),
    seance({ date: '2026-08-01' }),
    seance({ date: '2026-08-02' }),
  ];
  assert.equal(bilan(trois, 'tremolo').derniere, '2026-08-03');
  assert.equal(bilan([...trois].reverse(), 'tremolo').derniere, '2026-08-03');
});

cas('le meilleur tempo est le plus élevé, pas le plus récent', () => {
  const b = bilan(
    [
      seance({ date: '2026-08-01', tempo: { valeur: 72, unite: 'bpm' } }),
      seance({ date: '2026-08-05', tempo: { valeur: 60, unite: 'bpm' } }),
      seance({ date: '2026-08-03', tempo: { valeur: 88, unite: 'bpm' } }),
    ],
    'tremolo'
  );
  assert.deepEqual(b.meilleursTempos, [{ valeur: 88, unite: 'bpm' }]);
});

cas('une séance sans tempo n’efface pas le meilleur', () => {
  const b = bilan(
    [
      seance({ date: '2026-08-01', tempo: { valeur: 72, unite: 'bpm' } }),
      seance({ date: '2026-08-02' }),
    ],
    'tremolo'
  );
  assert.deepEqual(b.meilleursTempos, [{ valeur: 72, unite: 'bpm' }]);
});

cas('les deux unités de tempo sont tenues séparément', () => {
  // Le défaut trouvé par ce test : l'ancienne version verrouillait l'unité sur
  // le **premier** tempo rencontré et jetait silencieusement tous ceux de
  // l'autre unité. Un bpm et des notes par minute ne se comparent pas — mais
  // ne pas les comparer ne veut pas dire en perdre un.
  const b = bilan(
    [
      seance({ date: '2026-08-01', tempo: { valeur: 96, unite: 'notes-min' } }),
      seance({ date: '2026-08-02', tempo: { valeur: 72, unite: 'bpm' } }),
      seance({ date: '2026-08-03', tempo: { valeur: 120, unite: 'notes-min' } }),
      seance({ date: '2026-08-04', tempo: { valeur: 80, unite: 'bpm' } }),
    ],
    'tremolo'
  );
  assert.deepEqual(b.meilleursTempos, [
    { valeur: 80, unite: 'bpm' },
    { valeur: 120, unite: 'notes-min' },
  ]);
});

cas('l’ordre des unités ne dépend pas de l’ordre de saisie', () => {
  const deux: Seance[] = [
    seance({ date: '2026-08-01', tempo: { valeur: 96, unite: 'notes-min' } }),
    seance({ date: '2026-08-02', tempo: { valeur: 72, unite: 'bpm' } }),
  ];
  assert.deepEqual(bilan(deux, 'tremolo').meilleursTempos, bilan([...deux].reverse(), 'tremolo').meilleursTempos);
});

cas('les signaux d’arrêt remontent du plus récent au plus ancien', () => {
  const b = bilan(
    [
      seance({ date: '2026-08-01', arret: 'picotement' }),
      seance({ date: '2026-08-04' }),
      seance({ date: '2026-08-03', arret: 'crispation' }),
    ],
    'tremolo'
  );
  assert.deepEqual(b.arrets, [
    { date: '2026-08-03', signal: 'crispation' },
    { date: '2026-08-01', signal: 'picotement' },
  ]);
});

cas('trois signaux sur la même technique se voient d’un coup d’œil', () => {
  // C'est la raison d'être du champ : un signal isolé ne dit rien, une série
  // sur la même technique, si.
  const b = bilan(
    ['2026-08-01', '2026-08-04', '2026-08-08'].map((date) =>
      seance({ date, arret: 'tension à l’avant-bras' })
    ),
    'tremolo'
  );
  assert.equal(b.arrets.length, 3);
});

cas('aujourdhui rend une date locale, jamais UTC', () => {
  const a = aujourdhui();
  assert.match(a, /^\d{4}-\d{2}-\d{2}$/);
  const d = new Date();
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // Le piège : `toISOString()` seul décale d'un jour le soir en Europe, et le
  // journal daterait la séance du lendemain.
  assert.equal(a, local);
});

console.log(`\n${n} cas, tous passés.\n`);
