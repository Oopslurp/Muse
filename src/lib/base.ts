/**
 * Base locale — le seul endroit qui ouvre IndexedDB.
 *
 * Deux magasins partagent la même base : la progression par technique
 * (tranche 5) et le journal de séances (tranche 6). Ouvrir deux instances
 * Dexie sur le même nom de base est une source de bugs silencieux — d'où ce
 * module unique dont les autres dépendent.
 *
 * Aucun compte, aucun serveur (CLAUDE.md décision 8). Tout est ici, et tout
 * ressort en JSON par [sauvegarde.ts](./sauvegarde.ts).
 *
 * ⚠️ La base n'est **jamais** instanciée à l'import. Astro rend les îlots
 * React en HTML au build, sous Node, où `indexedDB` n'existe pas : un
 * `new Dexie()` au niveau du module ferait échouer la construction du site.
 */

import Dexie, { type Table } from 'dexie';

/** Où j'en suis. Trois états suffisent. */
export type Avancement = 'neuf' | 'en-cours' | 'acquis';

export interface Observation {
  /** ISO court, `2026-08-14`. */
  date: string;
  /** Commentaire libre — ce qu'on a constaté, y compris un désaccord. */
  note?: string | undefined;
}

export interface EtatTechnique {
  id: string;
  avancement: Avancement;
  observation?: Observation | undefined;
  /** Dernière modification, ISO complet. */
  maj: string;
}

/** Un tempo sans unité ne veut rien dire (CLAUDE.md, conventions). */
export interface TempoNote {
  valeur: number;
  unite: 'bpm' | 'notes-min';
}

export interface Seance {
  /** Auto-incrémenté par Dexie. */
  id?: number;
  /** ISO court. Une séance appartient à un jour, pas à une milliseconde. */
  date: string;
  /** Identifiant de fiche, ou `null` pour une séance libre. */
  technique: string | null;
  minutes: number;
  tempo?: TempoNote | undefined;
  /**
   * Signal d'arrêt rencontré, s'il y en a eu un.
   *
   * C'est la donnée la plus utile du journal : les premiers signes d'une
   * blessure sont typiquement pris pour un défaut de technique, ce qui pousse
   * à travailler plus (CLAUDE.md décision 3). Les relire en série est le seul
   * moyen de voir une tendance.
   */
  arret?: string | undefined;
  note?: string | undefined;
}

class BaseMuse extends Dexie {
  techniques!: Table<EtatTechnique, string>;
  seances!: Table<Seance, number>;

  constructor() {
    super('muse');
    this.version(1).stores({ techniques: 'id' });
    // Le journal arrive en tranche 6 : Dexie migre tout seul, la progression
    // déjà enregistrée est conservée.
    this.version(2).stores({ techniques: 'id', seances: '++id, date, technique' });
  }
}

let instance: BaseMuse | null = null;

/** Ouvre la base à la première utilisation, jamais à l'import. */
export function db(): BaseMuse {
  instance ??= new BaseMuse();
  return instance;
}

export const disponible = (): boolean =>
  typeof globalThis !== 'undefined' && 'indexedDB' in globalThis;
