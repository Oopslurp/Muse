/**
 * Vocabulaires contrôlés partagés — familles, difficulté, statut épistémique.
 *
 * Source de vérité pour le contenu : `docs/research/00-taxonomie.md`.
 * Les décomptes ci-dessous seront dérivés des content collections en
 * tranche 2 ; ils sont saisis à la main pour l'instant et doivent rester
 * cohérents avec le document de recherche.
 *
 * Conformément à CLAUDE.md (décision 9) : ce module stocke la donnée,
 * l'affichage produit le libellé. Aucune chaîne visible n'est écrite en dur
 * dans les composants.
 */

export type FamilyId = 'main-droite' | 'main-gauche' | 'percussif-moderne' | 'transversal';

export interface Family {
  id: FamilyId;
  /** Préfixe des identifiants de la taxonomie : MD-01, MG-02… */
  code: string;
  label: string;
  /** Ce que la famille recouvre, en une phrase. */
  blurb: string;
  /** Variable CSS d'accent. Injectée en style inline plutôt qu'en classe :
   *  Tailwind ne peut pas générer de classes à partir de valeurs dynamiques. */
  colorVar: string;
  count: number;
}

export const FAMILIES: readonly Family[] = [
  {
    id: 'main-droite',
    code: 'MD',
    label: 'Main droite',
    blurb:
      "Ce qui met la corde en mouvement : attaque, arpèges, pouce, trémolo, étouffements.",
    colorVar: '--c-md',
    count: 13,
  },
  {
    id: 'main-gauche',
    code: 'MG',
    label: 'Main gauche',
    blurb:
      'Ce qui définit la hauteur : placement, barré, liaisons, déplacements, vibrato.',
    colorVar: '--c-mg',
    count: 9,
  },
  {
    id: 'percussif-moderne',
    code: 'PM',
    label: 'Percussif & moderne',
    blurb:
      'Kick, caisse claire, golpe, tapping, harmoniques frappées, accordages ouverts.',
    colorVar: '--c-pm',
    count: 5,
  },
  {
    id: 'transversal',
    code: 'TR',
    label: 'Transversal',
    blurb:
      "Dimensions applicables partout : dynamiques, timbre, placement rythmique, relâchement.",
    colorVar: '--c-tr',
    count: 6,
  },
] as const;

export const familyById = (id: FamilyId): Family =>
  FAMILIES.find((f) => f.id === id) ?? FAMILIES[0]!;

/* -------------------------------------------------------------------------- */

export type Difficulty = 1 | 2 | 3 | 4 | 5;

/** Échelle relative au public visé — intermédiaire → expert, pas débutant. */
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'Acquis attendu, à raffiner',
  2: 'Quelques séances ; la difficulté est la constance',
  3: 'Plusieurs semaines de travail ciblé',
  4: 'Plusieurs mois, progression structurée',
  5: 'Travail au long cours, jamais « fini »',
};

/* -------------------------------------------------------------------------- */

/**
 * Statut épistémique — CLAUDE.md, décision 1.
 * Obligatoire sur chaque affirmation technique, affiché, filtrable.
 *
 * `observé` est une promotion manuelle : c'est l'utilisateur qui l'accorde,
 * guitare en main. Elle n'écrase pas l'origine (`sourcé` / `déduit`).
 */
export type EpistemicStatus = 'source' | 'deduit' | 'observe' | 'verifier';

export interface StatusMeta {
  id: EpistemicStatus;
  label: string;
  /** Ce que le statut engage, formulé pour l'utilisateur final. */
  meaning: string;
  colorVar: string;
  /** Le filet de la pastille : plein pour l'assuré, pointillé pour le supposé. */
  dashed: boolean;
}

export const STATUSES: readonly StatusMeta[] = [
  {
    id: 'source',
    label: 'Sourcé',
    meaning: 'Attribué à une méthode ou une source identifiée, citée en bas de fiche.',
    colorVar: '--c-source',
    dashed: false,
  },
  {
    id: 'deduit',
    label: 'Déduit',
    meaning: "Raisonnement mécanique cohérent, mais qu'aucune source ne formule ainsi.",
    colorVar: '--c-deduit',
    dashed: true,
  },
  {
    id: 'observe',
    label: 'Observé',
    meaning: 'Vérifié guitare en main. Le seul statut qui vaille vraiment.',
    colorVar: '--c-observe',
    dashed: false,
  },
  {
    id: 'verifier',
    label: 'À vérifier',
    meaning: "Doute explicite, avec sa raison. Conservé visible plutôt que lissé.",
    colorVar: '--c-verifier',
    dashed: true,
  },
] as const;

export const statusById = (id: EpistemicStatus): StatusMeta =>
  STATUSES.find((s) => s.id === id) ?? STATUSES[1]!;

/* -------------------------------------------------------------------------- */

export type Style = 'classique' | 'moderne' | 'les-deux';

export const STYLE_LABELS: Record<Style, string> = {
  classique: 'Classique',
  moderne: 'Moderne',
  'les-deux': 'Les deux',
};

/* -------------------------------------------------------------------------- */

/** Décomptes du corpus. À dériver des collections en tranche 2. */
export const CORPUS = {
  techniques: FAMILIES.reduce((n, f) => n + f.count, 0),
  fichesCompletes: 6,
  fichesCourtes: 27,
} as const;
