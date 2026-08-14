/**
 * Index de recherche — construit au build.
 *
 * Pas de moteur, pas de dépendance : 32 fiches et quelques centaines de
 * termes tiennent dans une poignée de kilooctets, et un filtre linéaire sur
 * 200 entrées coûte moins qu'une frappe au clavier. Ajouter Fuse.js ou Lunr
 * ici serait payer un index inversé pour un tableau qu'on peut lire en entier
 * à chaque touche.
 *
 * Ce qui entre dans l'index, et pourquoi :
 *
 *  · le nom français, mais aussi **l'anglais, l'espagnol et les alias** —
 *    on cherche « apoyando » ou « cejilla » aussi souvent que « butée » ;
 *  · les **titres de paliers et d'erreurs**, parce qu'on se souvient d'un
 *    symptôme (« corde qui frise ») avant de se souvenir de la fiche ;
 *  · le son cible, qui est la phrase la plus mémorable d'une fiche.
 */

export type TypeEntree = 'technique' | 'palier' | 'erreur' | 'outil';

export interface Entree {
  /** Ce qui s'affiche en gras. */
  titre: string;
  /** Où mène le résultat. */
  href: string;
  /** Ligne de contexte sous le titre. */
  contexte: string;
  type: TypeEntree;
  /** Termes de recherche, déjà normalisés et joints par des espaces. */
  cles: string;
}

/**
 * Normalisation : minuscules, accents retirés, ponctuation réduite.
 *
 * Sans le retrait des accents, « butee » ne trouve pas « butée » — et c'est
 * exactement ce qu'on tape quand on cherche vite.
 */
export function normaliser(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Filtre l'index. Tous les mots de la requête doivent apparaître — une
 * recherche à deux mots restreint, elle n'élargit pas.
 *
 * Le classement privilégie ce qui commence par la requête, puis les
 * techniques sur leurs sous-éléments : chercher « barré » doit donner la
 * fiche avant l'un de ses paliers.
 */
export function chercher(index: readonly Entree[], requete: string, limite = 12): Entree[] {
  const mots = normaliser(requete).split(' ').filter(Boolean);
  if (mots.length === 0) return [];

  const poids: Record<TypeEntree, number> = { technique: 0, outil: 1, palier: 2, erreur: 3 };

  return index
    .filter((e) => mots.every((m) => e.cles.includes(m)))
    .map((e) => {
      const debut = mots.every((m) => e.cles.split(' ').some((k) => k.startsWith(m)));
      const exact = normaliser(e.titre).startsWith(mots[0]!);
      return { e, score: (exact ? 0 : 4) + (debut ? 0 : 2) + poids[e.type] };
    })
    .sort((a, b) => a.score - b.score || a.e.titre.localeCompare(b.e.titre, 'fr'))
    .slice(0, limite)
    .map((x) => x.e);
}

/** Les pages qui ne sont pas des fiches, pour qu'elles soient trouvables aussi. */
export const OUTILS: readonly Omit<Entree, 'cles'>[] = [
  {
    titre: 'Accordeur',
    href: '/accordeur',
    contexte: 'Chromatique, 13 accordages, tout en local',
    type: 'outil',
  },
  {
    titre: 'Arbre de compétences',
    href: '/arbre',
    contexte: 'Graphe des prérequis et progression',
    type: 'outil',
  },
  {
    titre: 'Pratique',
    href: '/pratique',
    contexte: 'Métronome, minuteur de séance, journal',
    type: 'outil',
  },
  {
    titre: 'Techniques',
    href: '/techniques',
    contexte: 'La bibliothèque, filtrable',
    type: 'outil',
  },
];
