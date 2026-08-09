/**
 * Libellés produits à partir des données — CLAUDE.md, décision 9.
 *
 * Rien de ce qui est écrit ici n'existe dans le contenu. Si une convention
 * d'affichage change, on la change à un seul endroit.
 */

export interface Tempo {
  valeur: number;
  unite: 'bpm' | 'notes-min';
  subdivision?: '1' | '2' | '4' | '8' | '16' | 'triolet-8' | 'triolet-16' | undefined;
}

const SUBDIVISION: Record<string, string> = {
  '1': 'à la ronde',
  '2': 'à la blanche',
  '4': 'à la noire',
  '8': 'en croches',
  '16': 'en doubles-croches',
  'triolet-8': 'en triolets de croches',
  'triolet-16': 'en triolets de doubles',
};

/** Forme courte, pour un tableau : « ♩ 60 · doubles » ou « 96 notes/min ». */
export function tempoCourt(t: Tempo): string {
  if (t.unite === 'notes-min') return `${t.valeur} notes/min`;
  const sub = t.subdivision ? ` · ${SUBDIVISION[t.subdivision]?.replace(/^en |^à la /, '')}` : '';
  return `♩ ${t.valeur}${sub}`;
}

/** Forme longue, pour une infobulle ou une phrase. */
export function tempoLong(t: Tempo): string {
  if (t.unite === 'notes-min') {
    return `${t.valeur} notes par minute — on compte les notes jouées, pas les pulsations`;
  }
  const sub = t.subdivision ? `, ${SUBDIVISION[t.subdivision] ?? ''}` : '';
  return `${t.valeur} pulsations par minute${sub}`;
}

/** « ♩ 40 → 60 ». Tolère qu'un des deux manque. */
export function plageTempo(depart?: Tempo, cible?: Tempo): string | null {
  if (!depart && !cible) return null;
  if (depart && cible) return `${tempoCourt(depart)} → ${tempoCourt(cible)}`;
  return tempoCourt((depart ?? cible)!);
}

/* -------------------------------------------------------------------------- */

const CANAL: Record<string, string> = {
  son: 'à l’oreille',
  sensation: 'à la sensation',
  video: 'en se filmant',
  audio: 'en s’enregistrant',
  visuel: 'à l’œil',
  metronome: 'au métronome',
};

export const nomCanal = (c: string): string => CANAL[c] ?? c;

/* -------------------------------------------------------------------------- */

const DROITS: Record<string, { label: string; libre: boolean }> = {
  'domaine-public': { label: 'Domaine public', libre: true },
  'domaine-public-ue': { label: 'Domaine public (UE)', libre: true },
  'sous-droits': { label: 'Sous droits', libre: false },
  'edition-a-verifier': { label: 'Édition à vérifier', libre: false },
  inconnu: { label: 'Statut inconnu', libre: false },
};

export const droitsMeta = (d: string) => DROITS[d] ?? DROITS['inconnu']!;

/* -------------------------------------------------------------------------- */

const MOMENT: Record<string, string> = {
  echauffement: 'pendant l’échauffement',
  debut: 'en début de séance, main fraîche',
  milieu: 'en milieu de séance',
  fin: 'en fin de séance',
  'jamais-a-froid': 'jamais à froid',
};

export const nomMoment = (m: string): string => MOMENT[m] ?? m;

/** « 8 à 12 min » ou « 10 min max ». */
export function dureeSeance(min: number | undefined, max: number): string {
  return min && min !== max ? `${min} à ${max} min` : `${max} min max`;
}

/** « 60 s » / « 1 min 30 ». */
export function duree(secondes: number): string {
  if (secondes < 60) return `${secondes} s`;
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  return s ? `${m} min ${s}` : `${m} min`;
}

/* -------------------------------------------------------------------------- */

const ORIGINE_EXERCICE: Record<string, string> = {
  original: 'Exercice original',
  'domaine-public': 'Domaine public',
  'formule-commune': 'Formule commune, non protégeable',
  consigne: 'Consigne, sans tablature',
};

export const nomOrigineExercice = (o: string): string => ORIGINE_EXERCICE[o] ?? o;
