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

import { db, disponible, type Seance, type TempoNote } from './base';

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

export async function ajouterSeance(s: Omit<Seance, 'id'>): Promise<number> {
  return db().seances.add(s as Seance);
}

export async function supprimerSeance(id: number): Promise<void> {
  await db().seances.delete(id);
}

export interface BilanTechnique {
  seances: number;
  minutes: number;
  /** Date de la dernière séance, ISO court. */
  derniere: string | null;
  /** Meilleur tempo atteint, unité comprise. */
  meilleurTempo: TempoNote | null;
  /** Signaux d'arrêt rencontrés, du plus récent au plus ancien. */
  arrets: Array<{ date: string; signal: string }>;
}

const BILAN_VIDE: BilanTechnique = {
  seances: 0,
  minutes: 0,
  derniere: null,
  meilleurTempo: null,
  arrets: [],
};

/** Agrégé à la lecture plutôt que tenu à jour : impossible à désynchroniser. */
export function bilan(seances: readonly Seance[], technique: string): BilanTechnique {
  const miennes = seances.filter((s) => s.technique === technique);
  if (miennes.length === 0) return BILAN_VIDE;

  let meilleur: TempoNote | null = null;
  for (const s of miennes) {
    if (!s.tempo) continue;
    // On ne compare que des tempos de même unité : un bpm et des notes par
    // minute ne se rangent pas sur la même échelle.
    if (!meilleur || (s.tempo.unite === meilleur.unite && s.tempo.valeur > meilleur.valeur)) {
      meilleur = s.tempo;
    }
  }

  return {
    seances: miennes.length,
    minutes: miennes.reduce((a, s) => a + s.minutes, 0),
    derniere: miennes.reduce((a, s) => (s.date > a ? s.date : a), miennes[0]!.date),
    meilleurTempo: meilleur,
    arrets: miennes
      .filter((s) => s.arret)
      .map((s) => ({ date: s.date, signal: s.arret! }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  };
}

/** Minutes par jour sur les `jours` derniers jours, du plus ancien au plus récent. */
export function parJour(seances: readonly Seance[], jours = 28): Array<{ date: string; minutes: number }> {
  const total = new Map<string, number>();
  for (const s of seances) total.set(s.date, (total.get(s.date) ?? 0) + s.minutes);

  const sortie: Array<{ date: string; minutes: number }> = [];
  const d = new Date(`${aujourdhui()}T12:00:00`);
  for (let i = jours - 1; i >= 0; i--) {
    const j = new Date(d.getTime() - i * 86400000).toISOString().slice(0, 10);
    sortie.push({ date: j, minutes: total.get(j) ?? 0 });
  }
  return sortie;
}
