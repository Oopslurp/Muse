/**
 * Journal de séances.
 *
 * Ce qu'on enregistre est volontairement court : une date, une technique, des
 * minutes, éventuellement un tempo atteint, un signal d'arrêt rencontré et une
 * note. Un journal qui demande dix champs ne se remplit pas.
 *
 * Le champ `arret` est le plus important du lot. Jusqu'à 89 % des musiciens
 * rapportent une blessure professionnelle, et **les premiers signes sont
 * typiquement pris pour un défaut de technique, ce qui pousse à travailler
 * plus** (CLAUDE.md décision 3). Un signal isolé ne dit rien ; trois en deux
 * semaines sur la même technique, si.
 */

import { db, disponible, identifiant, type Seance, type TempoNote } from './base';

export type { Seance, TempoNote } from './base';

/** Aujourd'hui en ISO court, dans le fuseau local — pas en UTC. */
export function aujourdhui(): string {
  const d = new Date();
  const decalage = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - decalage).toISOString().slice(0, 10);
}

export async function lireSeances(limite = 200): Promise<Seance[]> {
  if (!disponible()) return [];
  // Tri décroissant sur la date, puis sur l'identifiant : deux séances du même
  // jour se lisent dans l'ordre où elles ont été saisies.
  const lignes = await db().seances.orderBy('date').reverse().limit(limite).toArray();
  return lignes.sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0));
}

export async function ajouterSeance(s: Omit<Seance, 'id' | 'uid'>): Promise<number> {
  // L'identifiant stable est attribué ici, à la création : c'est lui qui rend
  // le réimport idempotent, et il doit exister avant tout export.
  return db().seances.add({ ...s, uid: identifiant() } as Seance);
}

export async function supprimerSeance(id: number): Promise<void> {
  await db().seances.delete(id);
}

export interface BilanTechnique {
  seances: number;
  minutes: number;
  /** Date de la dernière séance, ISO court. */
  derniere: string | null;
  /**
   * Meilleur tempo atteint, **une entrée par unité**, bpm d'abord.
   *
   * Pas un tempo unique : des pulsations par minute et des notes par minute
   * ne se rangent pas sur la même échelle, et l'une ne se convertit pas dans
   * l'autre sans connaître la subdivision, qui n'est pas enregistrée. Les
   * garder côte à côte est la seule réponse honnête.
   */
  meilleursTempos: TempoNote[];
  /** Signaux d'arrêt rencontrés, du plus récent au plus ancien. */
  arrets: Array<{ date: string; signal: string }>;
}

const BILAN_VIDE: BilanTechnique = {
  seances: 0,
  minutes: 0,
  derniere: null,
  meilleursTempos: [],
  arrets: [],
};

/** bpm avant notes/min : l'unité ordinaire d'abord, quel que soit l'ordre de saisie. */
const ORDRE_UNITE: ReadonlyArray<TempoNote['unite']> = ['bpm', 'notes-min'];

/** Agrégé à la lecture plutôt que tenu à jour : impossible à désynchroniser. */
export function bilan(seances: readonly Seance[], technique: string): BilanTechnique {
  const miennes = seances.filter((s) => s.technique === technique);
  if (miennes.length === 0) return BILAN_VIDE;

  // Un maximum **par unité**. Une version antérieure gardait un seul tempo et
  // se verrouillait sur l'unité du premier rencontré : tous les autres étaient
  // jetés en silence, et le meilleur tempo dépendait de l'ordre de saisie.
  const parUnite = new Map<TempoNote['unite'], TempoNote>();
  for (const s of miennes) {
    if (!s.tempo) continue;
    const vu = parUnite.get(s.tempo.unite);
    if (!vu || s.tempo.valeur > vu.valeur) parUnite.set(s.tempo.unite, s.tempo);
  }
  const meilleurs = ORDRE_UNITE.flatMap((u) => {
    const t = parUnite.get(u);
    return t ? [t] : [];
  });

  return {
    seances: miennes.length,
    minutes: miennes.reduce((a, s) => a + s.minutes, 0),
    derniere: miennes.reduce((a, s) => (s.date > a ? s.date : a), miennes[0]!.date),
    meilleursTempos: meilleurs,
    arrets: miennes
      .filter((s) => s.arret)
      .map((s) => ({ date: s.date, signal: s.arret! }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  };
}
