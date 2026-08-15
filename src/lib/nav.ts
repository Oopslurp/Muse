/**
 * Navigation principale.
 *
 * `ready: false` = la section n'existe pas encore. On l'affiche quand même,
 * désactivée et étiquetée : c'est la même honnêteté que le statut épistémique
 * appliquée à l'état du chantier. Un menu qui cache ce qui manque ment sur
 * l'avancement.
 *
 * Passer à `ready: true` au fil des tranches — voir le découpage dans CLAUDE.md.
 */
export interface NavItem {
  href: string;
  label: string;
  ready: boolean;
  /** Tranche du découpage qui livre la section. */
  tranche: number;
}

export const NAV: readonly NavItem[] = [
  { href: '/techniques', label: 'Techniques', ready: true, tranche: 2 },
  { href: '/arbre', label: 'Arbre', ready: true, tranche: 5 },
  { href: '/accordeur', label: 'Accordeur', ready: true, tranche: 4 },
  { href: '/pratique', label: 'Pratique', ready: true, tranche: 6 },
  // Publier le site rend cette page nécessaire : un lecteur qui n'est pas
  // l'auteur arrive sans le contexte, et deux promesses du site — le statut
  // « observé », les consignes de santé — ne veulent pas dire pour lui ce
  // qu'elles veulent dire pour l'auteur.
  { href: '/a-propos', label: 'À propos', ready: true, tranche: 9 },
] as const;

export interface Tranche {
  n: number;
  label: string;
  detail: string;
  done: boolean;
}

export const TRANCHES: readonly Tranche[] = [
  {
    n: 0,
    label: 'Recherche & sonde alphaTex',
    detail:
      '33 techniques documentées, 6 fiches approfondies, format de tablature vérifié en parsant plutôt qu’en lisant la doc.',
    done: true,
  },
  {
    n: 1,
    label: 'Fondations',
    detail: 'Design system, layout, mode sombre, cette page.',
    done: true,
  },
  {
    n: 2,
    label: 'Contenu',
    detail: 'Migration des fiches en MDX typé, liste filtrable, page de détail.',
    done: true,
  },
  {
    n: 3,
    label: 'Tablatures',
    detail: 'alphaTab : rendu, lecture, curseur, boucle par mesure, métronome.',
    done: true,
  },
  {
    n: 4,
    label: 'Accordeur',
    detail: 'Chromatique, aiguille lissée, 13 accordages, tout en local.',
    done: true,
  },
  {
    n: 5,
    label: 'Arbre de compétences',
    detail: 'Graphe de prérequis cliquable, progression locale et exportable.',
    done: true,
  },
  {
    n: 6,
    label: 'Pratique',
    detail: 'Métronome à clic déplaçable, minuteur santé, journal local.',
    done: true,
  },
  {
    n: 7,
    label: 'Finitions',
    detail: 'Recherche, budget de poids, responsive, impression, déploiement.',
    done: true,
  },
  {
    n: 8,
    label: 'Reprise',
    detail: 'Dette, défauts connus et décisions en attente — voir docs/dette.md.',
    done: false,
  },
] as const;
