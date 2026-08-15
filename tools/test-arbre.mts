/**
 * Vérifie la mise en page du graphe de prérequis — `src/lib/arbre.ts`.
 *
 * Le déterminisme passe en premier, et ce n'est pas un détail de confort :
 * la disposition est calculée **au build**, donc figée dans le HTML. Si deux
 * constructions du même contenu donnaient deux dessins, l'arbre changerait de
 * forme à chaque déploiement et deviendrait impossible à relire — on
 * mémorise la position d'un nœud, pas son nom.
 *
 * Les cas travaillent sur des graphes fabriqués à la main plutôt que sur le
 * corpus : `graph.ts` dépend d'`astro:content`, et un test qui exige un build
 * Astro ne se lance jamais.
 *
 *   npm run test:arbre
 */

import assert from 'node:assert/strict';
import { GRILLE, amont, aval, disposer } from '../src/lib/arbre.ts';
import type { Graphe, NoeudGraphe } from '../src/lib/graph.ts';

let n = 0;
const cas = (titre: string, fn: () => void) => {
  fn();
  n++;
  console.log(`  ok  ${titre}`);
};

/** Fabrique un nœud ; `debloque` est dérivé par `construire`, comme au build. */
const noeud = (
  id: string,
  couche: number,
  prerequis: string[],
  famille: NoeudGraphe['famille'] = 'main-droite',
  code = id.toUpperCase()
): Omit<NoeudGraphe, 'debloque'> => ({
  id,
  code,
  label: id,
  famille,
  difficulte: couche + 1,
  profondeur: 'courte',
  couche,
  entree: prerequis.length === 0,
  prerequis,
});

const construire = (bruts: Array<Omit<NoeudGraphe, 'debloque'>>): Graphe => {
  const debloque = new Map<string, string[]>(bruts.map((b) => [b.id, []]));
  for (const b of bruts) for (const p of b.prerequis) debloque.get(p)?.push(b.id);
  return {
    noeuds: bruts.map((b) => ({ ...b, debloque: (debloque.get(b.id) ?? []).sort() })),
    aretes: bruts.flatMap((b) => b.prerequis.map((p) => ({ de: p, vers: b.id }))),
  };
};

/** Un losange plus deux branches : de quoi faire travailler les barycentres. */
const CORPUS = () =>
  construire([
    noeud('a', 0, [], 'main-droite', 'MD-01'),
    noeud('b', 0, [], 'main-gauche', 'MG-01'),
    noeud('c', 1, ['a'], 'main-droite', 'MD-02'),
    noeud('d', 1, ['a', 'b'], 'main-gauche', 'MG-02'),
    noeud('e', 1, ['b'], 'transversal', 'TR-01'),
    noeud('f', 2, ['c', 'd'], 'main-droite', 'MD-03'),
    noeud('g', 2, ['e'], 'transversal', 'TR-02'),
    noeud('h', 3, ['f', 'g'], 'percussif', 'PM-01'),
  ]);

/**
 * Le cas qui met vraiment le déterminisme à l'épreuve : quatre sœurs qui ne
 * dépendent que du même parent. Leurs barycentres sont **égaux**, donc rien
 * ne les départage sinon la clé de rupture d'égalité. Un tri stable sans clé
 * conserverait l'ordre d'entrée — et le dessin suivrait le système de
 * fichiers.
 *
 * Il a fallu ce graphe-là : sur un graphe ordinaire, les barycentres sont
 * tous distincts et le cas précédent passe même en cassant l'algorithme.
 *
 * Vérifié en échec, et le résultat mérite d'être écrit : le déterminisme est
 * garanti **deux fois** — par le tri initial famille-puis-code de `disposer`,
 * et par la clé de rupture d'égalité de `ordonner`. Retirer l'une des deux ne
 * casse rien ; ce cas ne tombe (`entrée 1243`) qu'en retirant les deux. Ce
 * n'est pas un test faible, c'est une propriété doublement tenue — mais
 * quiconque touche à l'une des deux doit savoir que l'autre le rattrape.
 */
const JUMELLES = () =>
  construire([
    noeud('mere', 0, [], 'main-droite', 'MD-01'),
    noeud('w', 1, ['mere'], 'main-droite', 'MD-04'),
    noeud('x', 1, ['mere'], 'main-gauche', 'MG-04'),
    noeud('y', 1, ['mere'], 'percussif', 'PM-04'),
    noeud('z', 1, ['mere'], 'transversal', 'TR-04'),
  ]);

console.log('\nMise en page de l’arbre de compétences\n');

cas('deux appels sur le même graphe donnent le même dessin', () => {
  assert.deepEqual(disposer(CORPUS()), disposer(CORPUS()));
});

cas('l’ordre d’entrée des fiches ne change pas le dessin', () => {
  // C'est le vrai risque : `getCollection` ne promet aucun ordre, et un
  // système de fichiers peut en changer. Le tri initial famille-puis-code doit
  // absorber n'importe quelle permutation d'entrée.
  const attendu = disposer(CORPUS());

  const melange = (graine: number) => {
    const g = CORPUS();
    // Permutation déterministe, pour qu'un échec soit reproductible.
    g.noeuds.sort((x, y) => {
      const h = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0) + graine) % 997, 7);
      return h(x.id) - h(y.id);
    });
    return disposer(g);
  };

  for (const graine of [0, 1, 2, 17, 101]) {
    assert.deepEqual(melange(graine), attendu, `permutation ${graine}`);
  }
});

cas('des sœurs à barycentres égaux gardent le même ordre', () => {
  const attendu = disposer(JUMELLES());

  // Les 24 permutations des quatre sœurs, exhaustivement.
  const permuter = <T,>(t: T[]): T[][] =>
    t.length <= 1
      ? [t]
      : t.flatMap((v, i) => permuter([...t.slice(0, i), ...t.slice(i + 1)]).map((r) => [v, ...r]));

  for (const ordre of permuter([1, 2, 3, 4])) {
    const g = JUMELLES();
    g.noeuds = [g.noeuds[0]!, ...ordre.map((i) => g.noeuds[i]!)];
    assert.deepEqual(disposer(g), attendu, `entrée ${ordre.join('')}`);
  }

  // Et l'ordre obtenu est bien celui de la clé de rupture d'égalité — le code,
  // pas le hasard du système de fichiers.
  const colonne = attendu.noeuds
    .filter((nd) => nd.couche === 1)
    .sort((p, q) => p.y - q.y)
    .map((nd) => nd.code);
  assert.deepEqual(colonne, ['MD-04', 'MG-04', 'PM-04', 'TR-04']);
});

cas('les couches se lisent de gauche à droite, sans chevauchement', () => {
  const d = disposer(CORPUS());
  const xParCouche = new Map<number, number>();
  for (const nd of d.noeuds) {
    const vu = xParCouche.get(nd.couche);
    if (vu === undefined) xParCouche.set(nd.couche, nd.x);
    else assert.equal(nd.x, vu, `${nd.id} n'est pas aligné sur sa couche`);
  }

  const xs = [...xParCouche.entries()].sort((a, b) => a[0] - b[0]).map(([, x]) => x);
  for (let i = 1; i < xs.length; i++) {
    assert.ok(xs[i]! > xs[i - 1]!, 'une couche plus profonde doit être plus à droite');
    assert.equal(xs[i]! - xs[i - 1]!, GRILLE.largeurNoeud + GRILLE.ecartColonne);
  }
});

cas('deux nœuds d’une même colonne ne se recouvrent jamais', () => {
  const d = disposer(CORPUS());
  const parColonne = new Map<number, number[]>();
  for (const nd of d.noeuds) {
    parColonne.set(nd.couche, [...(parColonne.get(nd.couche) ?? []), nd.y]);
  }
  for (const [couche, ys] of parColonne) {
    ys.sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) {
      assert.ok(
        ys[i]! - ys[i - 1]! >= GRILLE.hauteurNoeud,
        `couche ${couche} : deux nœuds à ${ys[i - 1]} et ${ys[i]}`
      );
    }
  }
});

cas('une colonne courte est centrée, pas collée en haut', () => {
  const d = disposer(CORPUS());
  const centre = (couche: number) => {
    const ys = d.noeuds.filter((nd) => nd.couche === couche).map((nd) => nd.y);
    return (Math.min(...ys) + Math.max(...ys)) / 2;
  };
  // La couche 1 en compte trois, la couche 3 un seul : leurs centres coïncident.
  assert.ok(Math.abs(centre(1) - centre(3)) < 0.001, `${centre(1)} contre ${centre(3)}`);
});

cas('le cadre contient tout le dessin', () => {
  const d = disposer(CORPUS());
  for (const nd of d.noeuds) {
    assert.ok(nd.x >= 0 && nd.x + GRILLE.largeurNoeud <= d.largeur, `${nd.id} déborde en x`);
    assert.ok(nd.y >= 0 && nd.y + GRILLE.hauteurNoeud <= d.hauteur, `${nd.id} déborde en y`);
  }
  assert.deepEqual(d.couches, [2, 3, 2, 1]);
});

cas('chaque arête part du bord droit et arrive au bord gauche', () => {
  const d = disposer(CORPUS());
  const parId = new Map(d.noeuds.map((nd) => [nd.id, nd]));
  assert.equal(d.aretes.length, 9);

  for (const a of d.aretes) {
    const de = parId.get(a.de)!;
    const vers = parId.get(a.vers)!;
    const [, x1, y1] = /^M (\S+) (\S+) C/.exec(a.d)!.map(Number);
    assert.equal(x1, de.x + GRILLE.largeurNoeud);
    assert.equal(y1, de.y + GRILLE.hauteurNoeud / 2);
    assert.ok(a.d.endsWith(`${vers.x} ${vers.y + GRILLE.hauteurNoeud / 2}`), a.d);
  }
});

cas('une arête vers un nœud absent est ignorée, pas fatale', () => {
  const g = CORPUS();
  g.aretes.push({ de: 'a', vers: 'fantome' });
  const d = disposer(g);
  assert.equal(d.aretes.length, 9);
});

cas('amont remonte toute la chaîne, pas un seul niveau', () => {
  const parId = new Map(CORPUS().noeuds.map((nd) => [nd.id, nd]));
  assert.deepEqual([...amont('h', parId)].sort(), ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  assert.deepEqual([...amont('c', parId)].sort(), ['a']);
  assert.deepEqual([...amont('a', parId)], []);
});

cas('aval descend toute la chaîne', () => {
  const parId = new Map(CORPUS().noeuds.map((nd) => [nd.id, nd]));
  assert.deepEqual([...aval('a', parId)].sort(), ['c', 'd', 'f', 'h']);
  assert.deepEqual([...aval('h', parId)], []);
});

cas('un losange ne compte pas deux fois, et ne boucle pas', () => {
  // `d` a deux chemins vers `h` (par f) et deux parents. Les parcours sont
  // itératifs avec un ensemble de vus : ni doublon, ni pile infinie.
  const parId = new Map(CORPUS().noeuds.map((nd) => [nd.id, nd]));
  const a = amont('h', parId);
  assert.equal(a.size, 7);
  assert.ok(a.has('a') && a.has('b'));
});

cas('un graphe d’un seul nœud tient debout', () => {
  const d = disposer(construire([noeud('seul', 0, [])]));
  assert.equal(d.noeuds.length, 1);
  assert.deepEqual(d.couches, [1]);
  assert.equal(d.largeur, GRILLE.marge * 2 + GRILLE.largeurNoeud);
  assert.equal(d.hauteur, GRILLE.marge * 2 + GRILLE.hauteurNoeud);
});

console.log(`\n${n} cas, tous passés.\n`);
