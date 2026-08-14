/**
 * Progression — état utilisateur, local et exportable.
 *
 * Deux choses distinctes vivent ici, et il ne faut pas les confondre :
 *
 *  · **l'avancement** — où j'en suis sur cette technique. Pédagogique.
 *  · **l'observation** — j'ai vérifié cette fiche guitare en main. Épistémique,
 *    c'est la promotion de CLAUDE.md décision 1. Elle **n'écrase pas**
 *    l'origine (`sourcé` / `déduit`) : ce sont deux champs, jamais un enum.
 *
 * Aucun compte, aucun serveur (décision 8). Tout est dans IndexedDB, et tout
 * s'exporte en JSON — une donnée locale sans porte de sortie est une donnée
 * qu'on perdra.
 *
 * ⚠️ La base n'est **jamais** instanciée à l'import. Astro rend les îlots React
 * en HTML au build, sous Node, où `indexedDB` n'existe pas : un `new Dexie()`
 * au niveau du module ferait échouer la construction du site. D'où le
 * singleton paresseux.
 */

import Dexie, { type Table } from 'dexie';

/** Où j'en suis. Trois états suffisent ; le détail des séances est tranche 6. */
export type Avancement = 'neuf' | 'en-cours' | 'acquis';

export const AVANCEMENTS: readonly Avancement[] = ['neuf', 'en-cours', 'acquis'];

export const AVANCEMENT_LABELS: Record<Avancement, string> = {
  neuf: 'Pas commencée',
  'en-cours': 'En travail',
  acquis: 'Tenue',
};

/** Ce qu'engage chaque état, formulé pour soi-même dans six mois. */
export const AVANCEMENT_SENS: Record<Avancement, string> = {
  neuf: 'Jamais travaillée, ou trop peu pour compter.',
  'en-cours': 'Au travail en ce moment. Le geste n’est pas encore fiable.',
  acquis: 'Tenue à froid, sans échauffement particulier, à tempo de travail.',
};

export interface Observation {
  /** ISO court, `2026-08-14`. */
  date: string;
  /** Commentaire libre — ce qu'on a constaté, y compris un désaccord. */
  note?: string | undefined;
}

export interface EtatTechnique {
  /** Identifiant de la fiche. */
  id: string;
  avancement: Avancement;
  observation?: Observation | undefined;
  /** Dernière modification, ISO complet. */
  maj: string;
}

class BaseMuse extends Dexie {
  techniques!: Table<EtatTechnique, string>;

  constructor() {
    super('muse');
    this.version(1).stores({ techniques: 'id' });
  }
}

let base: BaseMuse | null = null;

/** Ouvre la base à la première utilisation, jamais à l'import. */
function db(): BaseMuse {
  base ??= new BaseMuse();
  return base;
}

export const disponible = (): boolean =>
  typeof globalThis !== 'undefined' && 'indexedDB' in globalThis;

export async function lireTout(): Promise<Map<string, EtatTechnique>> {
  if (!disponible()) return new Map();
  const lignes = await db().techniques.toArray();
  return new Map(lignes.map((l) => [l.id, l]));
}

export async function ecrire(
  id: string,
  modif: Partial<Omit<EtatTechnique, 'id' | 'maj'>>
): Promise<EtatTechnique> {
  const actuel = (await db().techniques.get(id)) ?? {
    id,
    avancement: 'neuf' as Avancement,
    maj: '',
  };
  const suivant: EtatTechnique = {
    ...actuel,
    ...modif,
    id,
    maj: new Date().toISOString(),
  };
  await db().techniques.put(suivant);
  return suivant;
}

/** Retire complètement une technique du suivi — plus propre qu'un état « neuf ». */
export async function oublier(id: string): Promise<void> {
  await db().techniques.delete(id);
}

/* ------------------------------------------------------------ export JSON */

/** Enveloppe versionnée : un export sans version est illisible dans deux ans. */
export interface Sauvegarde {
  format: 'muse-progression';
  version: 1;
  exporteLe: string;
  techniques: EtatTechnique[];
}

export async function exporter(): Promise<Sauvegarde> {
  return {
    format: 'muse-progression',
    version: 1,
    exporteLe: new Date().toISOString(),
    techniques: await db().techniques.toArray(),
  };
}

export interface ResultatImport {
  reprises: number;
  ignorees: string[];
}

/**
 * Réinjecte une sauvegarde.
 *
 * Les identifiants inconnus sont **ignorés et signalés**, pas silencieusement
 * écrits : une sauvegarde plus ancienne que le corpus contient des fiches
 * renommées, et les avaler créerait des lignes orphelines invisibles.
 */
export async function importer(
  brut: unknown,
  idsConnus: ReadonlySet<string>
): Promise<ResultatImport> {
  const s = brut as Partial<Sauvegarde>;
  if (!s || s.format !== 'muse-progression' || !Array.isArray(s.techniques)) {
    throw new Error('Ce fichier n’est pas une sauvegarde de progression Muse.');
  }
  if (s.version !== 1) {
    throw new Error(`Version de sauvegarde inconnue : ${String(s.version)}.`);
  }

  const ignorees: string[] = [];
  const aEcrire: EtatTechnique[] = [];
  for (const t of s.techniques) {
    if (typeof t?.id !== 'string' || !idsConnus.has(t.id)) {
      ignorees.push(String(t?.id ?? '?'));
      continue;
    }
    aEcrire.push({
      id: t.id,
      avancement: AVANCEMENTS.includes(t.avancement) ? t.avancement : 'neuf',
      observation: t.observation,
      maj: typeof t.maj === 'string' ? t.maj : new Date().toISOString(),
    });
  }
  await db().techniques.bulkPut(aEcrire);
  return { reprises: aEcrire.length, ignorees };
}
