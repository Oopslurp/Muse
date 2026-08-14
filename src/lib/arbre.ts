/**
 * Mise en page du graphe de prérequis.
 *
 * Calculée **au build** : la disposition ne dépend que du contenu, la
 * recalculer à chaque chargement ferait payer au navigateur un travail qui ne
 * change jamais. L'îlot ne reçoit que des coordonnées.
 *
 * Couches en colonnes, de gauche à droite : la colonne 0 porte les points
 * d'entrée, la dernière les techniques les plus dépendantes. Le corpus compte
 * six couches et huit nœuds au plus par couche — lu de gauche à droite, ça se
 * parcourt comme une progression. En lignes, il faudrait huit colonnes de
 * large et le graphe deviendrait illisible.
 */

import type { Graphe, NoeudGraphe } from './graph';

/** Géométrie, en unités du dessin. Les mêmes valeurs servent au CSS. */
export const GRILLE = {
  largeurNoeud: 152,
  /** De quoi tenir le code plus deux lignes de nom sans rogner un mot. */
  hauteurNoeud: 62,
  /** Serré pour que les six colonnes tiennent dans le cadre à largeur de
   *  bureau. En dessous, le graphe défile — c'est prévu, mais mieux vaut ne
   *  pas y contraindre l'écran le plus courant. */
  ecartColonne: 42,
  ecartLigne: 14,
  marge: 8,
} as const;

export interface NoeudPlace extends NoeudGraphe {
  x: number;
  y: number;
  /** Rang dans sa colonne, après réduction des croisements. */
  rang: number;
}

export interface AretePlacee {
  de: string;
  vers: string;
  /** Courbe de Bézier, du bord droit de la source au bord gauche de la cible. */
  d: string;
}

export interface Disposition {
  noeuds: NoeudPlace[];
  aretes: AretePlacee[];
  largeur: number;
  hauteur: number;
  /** Nombre de nœuds par couche, pour la légende. */
  couches: number[];
}

/**
 * Réduction des croisements par barycentres.
 *
 * Quatre passes alternées suffisent largement à 32 nœuds : on ordonne chaque
 * colonne par la position moyenne de ses voisines, une fois vers l'aval, une
 * fois vers l'amont. L'ordre de départ est déterministe (famille puis code)
 * pour que deux builds donnent le même dessin — un graphe qui bouge à chaque
 * construction est impossible à relire.
 */
function ordonner(colonnes: NoeudGraphe[][]): void {
  const rang = new Map<string, number>();
  const noter = () => {
    for (const col of colonnes) col.forEach((n, i) => rang.set(n.id, i));
  };
  noter();

  const moyenne = (ids: readonly string[], repli: number) => {
    const rangs = ids.map((id) => rang.get(id)).filter((r): r is number => r !== undefined);
    return rangs.length ? rangs.reduce((a, b) => a + b, 0) / rangs.length : repli;
  };

  for (let passe = 0; passe < 4; passe++) {
    const versAval = passe % 2 === 0;
    const indices = versAval
      ? colonnes.map((_, i) => i).slice(1)
      : colonnes.map((_, i) => i).slice(0, -1).reverse();

    for (const i of indices) {
      const col = colonnes[i]!;
      const cle = new Map(
        col.map((n, j) => [
          n.id,
          moyenne(versAval ? n.prerequis : n.debloque, j),
        ])
      );
      col.sort((a, b) => (cle.get(a.id)! - cle.get(b.id)!) || a.code.localeCompare(b.code, 'fr'));
      noter();
    }
  }
}

export function disposer(graphe: Graphe): Disposition {
  const profondeurMax = Math.max(...graphe.noeuds.map((n) => n.couche));
  const colonnes: NoeudGraphe[][] = Array.from({ length: profondeurMax + 1 }, () => []);
  for (const n of graphe.noeuds) colonnes[n.couche]!.push(n);

  // Ordre de départ déterministe.
  for (const col of colonnes) {
    col.sort((a, b) => a.famille.localeCompare(b.famille) || a.code.localeCompare(b.code, 'fr'));
  }
  ordonner(colonnes);

  const hauteurMax = Math.max(...colonnes.map((c) => c.length));
  const pas = GRILLE.hauteurNoeud + GRILLE.ecartLigne;
  const hauteur = hauteurMax * pas - GRILLE.ecartLigne + GRILLE.marge * 2;

  const noeuds: NoeudPlace[] = [];
  colonnes.forEach((col, c) => {
    // Colonnes courtes centrées verticalement : une colonne de deux nœuds
    // collée en haut se lit comme une erreur de calcul.
    const offset = (hauteurMax - col.length) / 2;
    col.forEach((n, r) => {
      noeuds.push({
        ...n,
        rang: r,
        x: GRILLE.marge + c * (GRILLE.largeurNoeud + GRILLE.ecartColonne),
        y: GRILLE.marge + (offset + r) * pas,
      });
    });
  });

  const parId = new Map(noeuds.map((n) => [n.id, n]));
  const aretes: AretePlacee[] = graphe.aretes.flatMap(({ de, vers }) => {
    const a = parId.get(de);
    const b = parId.get(vers);
    if (!a || !b) return [];
    const x1 = a.x + GRILLE.largeurNoeud;
    const y1 = a.y + GRILLE.hauteurNoeud / 2;
    const x2 = b.x;
    const y2 = b.y + GRILLE.hauteurNoeud / 2;
    const dx = Math.max(24, (x2 - x1) * 0.5);
    return [{ de, vers, d: `M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}` }];
  });

  return {
    noeuds,
    aretes,
    largeur:
      GRILLE.marge * 2 +
      (profondeurMax + 1) * GRILLE.largeurNoeud +
      profondeurMax * GRILLE.ecartColonne,
    hauteur,
    couches: colonnes.map((c) => c.length),
  };
}

/**
 * Tout l'amont d'une technique : ses prérequis, et les leurs.
 *
 * C'est la question que pose un arbre de compétences — « qu'est-ce qu'il me
 * faut avant celle-là ? » — et elle ne se répond pas à un niveau.
 */
export function amont(id: string, parId: Map<string, NoeudGraphe>): Set<string> {
  const vus = new Set<string>();
  const pile = [...(parId.get(id)?.prerequis ?? [])];
  while (pile.length) {
    const p = pile.pop()!;
    if (vus.has(p)) continue;
    vus.add(p);
    pile.push(...(parId.get(p)?.prerequis ?? []));
  }
  return vus;
}

/** Tout l'aval : ce que cette technique débloque, directement ou non. */
export function aval(id: string, parId: Map<string, NoeudGraphe>): Set<string> {
  const vus = new Set<string>();
  const pile = [...(parId.get(id)?.debloque ?? [])];
  while (pile.length) {
    const s = pile.pop()!;
    if (vus.has(s)) continue;
    vus.add(s);
    pile.push(...(parId.get(s)?.debloque ?? []));
  }
  return vus;
}
