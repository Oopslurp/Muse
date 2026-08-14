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
  /** Dernière modification, ISO complet. */
  maj: string;
}

/**
 * Forme des lignes écrites **avant la version 3**, quand l'observation portait
 * sur la fiche entière. Lue par la migration et par l'import d'une vieille
 * sauvegarde ; jamais écrite.
 */
export interface EtatTechniqueHerite extends EtatTechnique {
  observation?: Observation | undefined;
}

/**
 * Une observation porte sur **une affirmation**, pas sur une fiche entière.
 *
 * C'était l'intention de la décision 1 : « faire passer **un item** de sourcé
 * ou déduit à observé ». La fiche percussion porte neuf points douteux qui se
 * lèvent un par un, sur des semaines — une promotion globale ne permet pas ça.
 *
 * La clé est `fiche#element`, où `element` désigne :
 *
 * | Forme | Ce que c'est |
 * |---|---|
 * | `fiche` | La fiche dans son ensemble |
 * | `doute:<n>` | Le n-ième `[À VÉRIFIER]` de la fiche |
 * | `exercice:<id>` | Un exercice |
 * | `erreur:<n>` | Une erreur typique |
 * | `seance` | Le protocole de séance |
 */
export interface ObservationLigne {
  /** `fiche#element`. */
  cle: string;
  /** Indexé, pour compter et purger par fiche. */
  fiche: string;
  element: string;
  /** ISO court, `2026-08-14`. */
  date: string;
  note?: string | undefined;
  maj: string;
}

export const cleObservation = (fiche: string, element: string): string =>
  `${fiche}#${element}`;

/** Un tempo sans unité ne veut rien dire (CLAUDE.md, conventions). */
export interface TempoNote {
  valeur: number;
  unite: 'bpm' | 'notes-min';
}

export interface Seance {
  /** Auto-incrémenté par Dexie. Local à cette base, jamais exporté tel quel. */
  id?: number;
  /**
   * Identifiant stable, attribué **à la création** et conservé à l'export.
   *
   * C'est lui qui rend le réimport idempotent : la clé auto-incrémentée ne
   * désigne pas la même séance d'une base à l'autre, et dédupliquer sur elle
   * écraserait des séances étrangères. Réimporter deux fois le même fichier
   * ne crée donc plus de doublons.
   */
  uid: string;
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
  observations!: Table<ObservationLigne, string>;

  constructor() {
    super('muse');
    this.version(1).stores({ techniques: 'id' });
    // Le journal arrive en tranche 6 : Dexie migre tout seul, la progression
    // déjà enregistrée est conservée.
    this.version(2).stores({ techniques: 'id', seances: '++id, date, technique' });

    /**
     * Version 3 — l'observation quitte la fiche pour l'affirmation.
     *
     * Les observations déjà enregistrées portaient sur la fiche entière : on
     * les déplace vers l'élément `fiche`, qui est exactement ce qu'elles
     * signifiaient. Rien n'est perdu, rien n'est réinterprété.
     */
    this.version(3)
      .stores({
        techniques: 'id',
        seances: '++id, date, technique, uid',
        observations: 'cle, fiche',
      })
      .upgrade(async (tx) => {
        const anciennes = await tx.table('techniques').toArray();
        const reprises: ObservationLigne[] = [];
        for (const t of anciennes as EtatTechniqueHerite[]) {
          if (!t.observation) continue;
          reprises.push({
            cle: cleObservation(t.id, 'fiche'),
            fiche: t.id,
            element: 'fiche',
            date: t.observation.date,
            note: t.observation.note,
            maj: t.maj || new Date().toISOString(),
          });
        }
        if (reprises.length) await tx.table('observations').bulkPut(reprises);
        // Le champ reste dans les lignes migrées : le retirer demanderait une
        // réécriture complète pour aucun gain, et il n'est plus lu.

        // Les séances déjà enregistrées n'ont pas d'identifiant stable. On leur
        // en attribue un : sans lui, elles se dupliqueraient au premier
        // réimport d'une sauvegarde qui les contient.
        await tx
          .table('seances')
          .toCollection()
          .modify((s: Seance) => {
            s.uid ??= identifiant();
          });
      });
  }
}

/**
 * Identifiant stable.
 *
 * `crypto.randomUUID` n'existe qu'en contexte sécurisé — le même prérequis que
 * l'accordeur. Le repli couvre le cas où le site serait servi en HTTP simple :
 * il vaut mieux un identifiant moins solide qu'une exception au premier
 * enregistrement.
 */
export function identifiant(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

let instance: BaseMuse | null = null;

/** Ouvre la base à la première utilisation, jamais à l'import. */
export function db(): BaseMuse {
  instance ??= new BaseMuse();
  return instance;
}

export const disponible = (): boolean =>
  typeof globalThis !== 'undefined' && 'indexedDB' in globalThis;
