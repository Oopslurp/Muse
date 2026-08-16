/**
 * Positions de main gauche — la donnée, et les libellés qu'on en tire.
 *
 * CLAUDE.md décision 9 : **le contenu stocke la structure, le code produit la
 * chaîne affichée.** Une position ne porte donc que des couples corde/case,
 * un doigt, et éventuellement un barré `{ type, fret }`. Aucun nom de note,
 * aucun « CV » écrit à la main.
 *
 * Le test qui décide : *si je changeais d'avis sur la notation, combien de
 * fichiers de contenu devrais-je toucher ?* Zéro.
 *
 * C'est ici que le barré de la décision 9 est enfin implémenté. Il n'existait
 * jusqu'à la tranche 11 que comme décision écrite — l'exemple phare de la
 * règle, jamais livré.
 */

import { noteDe, nomDeClasse, type Accordage, type Notation } from './notes';

/** Doigts de la main qui frette. 0 = corde à vide, jamais un doigt. */
export type DoigtMG = 0 | 1 | 2 | 3 | 4;

export interface Barre {
  /** `complet` couvre toutes les cordes de la case, `demi` les aiguës. */
  type: 'complet' | 'demi';
  /** Case du barré, en chiffres arabes dans la donnée. */
  case: number;
}

export interface Frette {
  /** Corde 1 = la plus aiguë, comme partout dans le projet. */
  corde: number;
  /** 0 = corde à vide. `null` = corde étouffée, volontairement non jouée. */
  case: number | null;
  doigt?: DoigtMG | undefined;
}

export interface Position {
  titre: string;
  frettes: Frette[];
  barre?: Barre | undefined;
  /** Capo, en cases. Transpose sans toucher à l'accordage. */
  capo?: number | undefined;
}

/* ------------------------------------------------------- chiffres romains */

const ROMAINS = [
  '', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
] as const;

/**
 * Case en chiffres romains — la convention des méthodes de guitare classique
 * pour désigner une position, par opposition aux chiffres arabes des
 * tablatures. Au-delà de la table, on retombe sur l'arabe plutôt que de
 * produire un romain fantaisiste.
 */
export function caseRomaine(n: number): string {
  return ROMAINS[n] ?? String(n);
}

/**
 * Libellé du barré. **Rendu par défaut : `CV` / `½CV`** (CLAUDE.md décision 9),
 * le chiffre romain désignant la case.
 *
 * Changer d'avis sur cette notation se fait ici, et nulle part ailleurs.
 */
export function libelleBarre(b: Barre): string {
  return `${b.type === 'demi' ? '½' : ''}C${caseRomaine(b.case)}`;
}

/** Forme longue, pour une infobulle : le sigle ne s'explique pas tout seul. */
export function detailBarre(b: Barre): string {
  const quoi = b.type === 'demi' ? 'Demi-barré' : 'Barré complet';
  const combien =
    b.type === 'demi'
      ? 'index à plat sur les cordes aiguës'
      : 'index à plat sur les six cordes';
  return `${quoi} case ${b.case} — ${combien}.`;
}

/* ------------------------------------------------------------- géométrie */

/** Bornes utiles pour dessiner : la fenêtre de cases que la position occupe. */
export function fenetre(p: Position): { premiere: number; derniere: number } {
  const cases = p.frettes
    .map((f) => f.case)
    .filter((c): c is number => c !== null && c > 0);
  if (p.barre) cases.push(p.barre.case);

  if (cases.length === 0) return { premiere: 1, derniere: 4 };

  const min = Math.min(...cases);
  const max = Math.max(...cases);

  /**
   * Le sillet s'affiche quand la **main** est en première position, pas dès
   * qu'une corde est à vide.
   *
   * Deux essais avant celui-ci, tous deux faux d'une manière différente :
   *
   *  · sans règle du tout, un mi mineur — cases 2, quatre cordes à vide —
   *    s'affichait en « position 2 » avec des ronds de corde à vide au-dessus :
   *    deux repères qui se contredisent ;
   *  · avec « une corde à vide impose le sillet », un demi-barré case 5 dont la
   *    corde 6 sonne à vide se dessinait sur cinq rangées depuis le sillet. Exact,
   *    et illisible : ça se lit comme un écartement en première position.
   *
   * Le seuil est donc celui de la main, pas celui des cordes. Au-delà, le
   * numéro de case fait le repère et le rond garde son sens habituel des
   * diagrammes d'accord : cette corde-là sonne à vide, où que soit la main.
   */
  const PREMIERE_POSITION = 3;
  const premiere = min <= PREMIERE_POSITION ? 1 : min;

  // Toujours au moins quatre cases : un diagramme d'une seule case ne se lit
  // pas comme un manche, il se lit comme une erreur de rendu.
  const etendue = Math.max(4, max - premiere + 1);
  return { premiere, derniere: premiere + etendue - 1 };
}

/* ---------------------------------------------------------- description */

/**
 * La position dite en toutes lettres, pour `aria-label`.
 *
 * Un diagramme est une image : sans ce texte, il n'existe pas pour un lecteur
 * d'écran. Les noms de notes y sont **dérivés**, jamais écrits dans le contenu
 * (décision 2).
 */
export function decrirePosition(
  p: Position,
  accord: Accordage,
  notation: Notation = 'latine'
): string {
  const bouts: string[] = [];
  if (p.barre) bouts.push(detailBarre(p.barre));

  const parCorde = [...p.frettes].sort((a, b) => b.corde - a.corde);
  for (const f of parCorde) {
    if (f.case === null) {
      bouts.push(`corde ${f.corde} étouffée`);
      continue;
    }
    const nom = nomDeClasse(noteDe(accord, f.corde, f.case, p.capo ?? 0).classe, notation);
    const ou = f.case === 0 ? 'à vide' : `case ${f.case}`;
    const doigt = f.doigt ? `, doigt ${f.doigt}` : '';
    bouts.push(`corde ${f.corde} ${ou} — ${nom}${doigt}`);
  }
  return bouts.join(' ; ') + '.';
}

/* ---------------------------------------------------------- invariants */

/**
 * Vérifie une position et **lève** — appelée depuis le schéma de contenu, elle
 * fait échouer le build.
 *
 * La règle des deux notes sur une même corde est la même que celle de
 * `npm run validate` pour les tablatures : une position qui pose deux doigts
 * sur une corde ne peut pas sonner, et c'est exactement le genre d'erreur
 * qu'un diagramme rend crédible au lieu de la trahir.
 */
export function verifierPosition(p: Position, cordes: number): void {
  const vues = new Set<number>();
  for (const f of p.frettes) {
    if (f.corde < 1 || f.corde > cordes) {
      throw new Error(
        `Position « ${p.titre} » : corde ${f.corde} hors de l'accordage ` +
          `(${cordes} cordes ; corde 1 = la plus aiguë).`
      );
    }
    if (vues.has(f.corde)) {
      throw new Error(
        `Position « ${p.titre} » : deux entrées sur la corde ${f.corde}. ` +
          `Une corde ne sonne qu'une hauteur à la fois.`
      );
    }
    vues.add(f.corde);

    if (f.case !== null && f.case < 0) {
      throw new Error(`Position « ${p.titre} » : case négative sur la corde ${f.corde}.`);
    }
    if (f.case === 0 && f.doigt) {
      throw new Error(
        `Position « ${p.titre} » : corde ${f.corde} à vide mais un doigt lui est ` +
          `attribué. Une corde à vide ne se frette pas.`
      );
    }
  }

  if (p.barre && p.barre.case < 1) {
    throw new Error(`Position « ${p.titre} » : un barré ne peut pas être à la case 0.`);
  }
}
