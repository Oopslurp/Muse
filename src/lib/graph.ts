/**
 * Graphe de prérequis — validation au build.
 *
 * Implémente les invariants 1, 2 et 3 de `docs/research/05-modele-donnees.md`.
 * Les fonctions lèvent : appelées depuis le frontmatter d'une page Astro,
 * elles font échouer la construction du site. Un prérequis mort ou un cycle
 * casse le parcours d'apprentissage sans qu'aucune page ne plante — donc
 * personne ne s'en apercevrait à l'exécution.
 */

import type { CollectionEntry } from 'astro:content';

type Technique = CollectionEntry<'techniques'>;

export interface NoeudGraphe {
  id: string;
  code: string;
  label: string;
  famille: Technique['data']['famille'];
  difficulte: number;
  profondeur: 'complete' | 'courte';
  /** Plus long chemin depuis une racine. Sert à la mise en page en couches. */
  couche: number;
  /** Aucun prérequis : point d'entrée du parcours. */
  entree: boolean;
  prerequis: string[];
  /** Techniques que celle-ci débloque. Dérivé, jamais saisi. */
  debloque: string[];
}

export interface Graphe {
  noeuds: NoeudGraphe[];
  aretes: Array<{ de: string; vers: string }>;
}

/** Invariant 1 — tout prérequis désigne une fiche existante. */
function verifierExistence(fiches: Technique[]): void {
  const ids = new Set(fiches.map((f) => f.id));
  const morts: string[] = [];
  for (const f of fiches) {
    for (const p of f.data.prerequis) {
      if (!ids.has(p)) morts.push(`${f.id} → ${p}`);
    }
  }
  if (morts.length) {
    throw new Error(
      `Prérequis inexistants :\n  ${morts.join('\n  ')}\n` +
        `Fiches connues : ${[...ids].sort().join(', ')}`
    );
  }
}

/** Invariant 2 — le graphe est acyclique. Un cycle rend le parcours impossible. */
function verifierAcyclicite(fiches: Technique[]): void {
  const parId = new Map(fiches.map((f) => [f.id, f.data.prerequis]));
  const etat = new Map<string, 'ouvert' | 'clos'>();
  const pile: string[] = [];

  const descendre = (id: string): void => {
    const marque = etat.get(id);
    if (marque === 'clos') return;
    if (marque === 'ouvert') {
      const debut = pile.indexOf(id);
      throw new Error(
        `Cycle dans les prérequis : ${[...pile.slice(debut), id].join(' → ')}`
      );
    }
    etat.set(id, 'ouvert');
    pile.push(id);
    for (const p of parId.get(id) ?? []) descendre(p);
    pile.pop();
    etat.set(id, 'clos');
  };

  for (const f of fiches) descendre(f.id);
}

/**
 * Invariant 3 — une technique n'est pas plus facile que ses prérequis.
 *
 * Règle discutable, gardée volontairement stricte : si un contre-exemple
 * légitime apparaît, il vaut mieux une échappatoire explicite dans la fiche
 * qu'un assouplissement silencieux de la règle.
 */
function verifierMonotonie(fiches: Technique[]): void {
  const parId = new Map(fiches.map((f) => [f.id, f.data]));
  const fautes: string[] = [];
  for (const f of fiches) {
    for (const p of f.data.prerequis) {
      const amont = parId.get(p);
      if (amont && amont.difficulte > f.data.difficulte) {
        fautes.push(
          `${f.id} (${f.data.difficulte}) a pour prérequis ${p} (${amont.difficulte})`
        );
      }
    }
  }
  if (fautes.length) {
    throw new Error(`Difficulté non monotone :\n  ${fautes.join('\n  ')}`);
  }
}

/** Profondeur en couches, pour une mise en page lisible du graphe. */
function couches(fiches: Technique[]): Map<string, number> {
  const parId = new Map(fiches.map((f) => [f.id, f.data.prerequis]));
  const memo = new Map<string, number>();

  const profondeur = (id: string): number => {
    const vu = memo.get(id);
    if (vu !== undefined) return vu;
    const amont = parId.get(id) ?? [];
    const n = amont.length === 0 ? 0 : 1 + Math.max(...amont.map(profondeur));
    memo.set(id, n);
    return n;
  };

  for (const f of fiches) profondeur(f.id);
  return memo;
}

/**
 * Valide et construit le graphe. Lève à la première violation.
 * À appeler depuis au moins une page pour que le build en dépende.
 */
export function construireGraphe(fiches: Technique[]): Graphe {
  verifierExistence(fiches);
  verifierAcyclicite(fiches);
  verifierMonotonie(fiches);

  const profondeurs = couches(fiches);
  const debloque = new Map<string, string[]>(fiches.map((f) => [f.id, []]));
  for (const f of fiches) {
    for (const p of f.data.prerequis) debloque.get(p)?.push(f.id);
  }

  const noeuds: NoeudGraphe[] = fiches.map((f) => ({
    id: f.id,
    code: f.data.code,
    label: f.data.nom.fr,
    famille: f.data.famille,
    difficulte: f.data.difficulte,
    profondeur: f.data.profondeur,
    couche: profondeurs.get(f.id) ?? 0,
    entree: f.data.prerequis.length === 0,
    prerequis: f.data.prerequis,
    debloque: (debloque.get(f.id) ?? []).sort(),
  }));

  const aretes = fiches.flatMap((f) =>
    f.data.prerequis.map((p) => ({ de: p, vers: f.id }))
  );

  return { noeuds, aretes };
}
