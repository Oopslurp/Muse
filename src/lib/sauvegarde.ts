/**
 * Sauvegarde — tout ce qui est local ressort en JSON.
 *
 * CLAUDE.md décision 8 : aucun backend, aucun compte, **tout est exportable**.
 * Une donnée locale sans porte de sortie est une donnée qu'on perdra, et
 * IndexedDB s'efface avec les données de navigation sans prévenir.
 *
 * L'enveloppe est versionnée : un export sans version est illisible dans deux
 * ans.
 */

import { db, type EtatTechnique, type Seance } from './base';

export interface Fichier {
  format: 'muse-sauvegarde';
  version: 2;
  exporteLe: string;
  techniques: EtatTechnique[];
  seances: Seance[];
}

export async function exporter(): Promise<Fichier> {
  return {
    format: 'muse-sauvegarde',
    version: 2,
    exporteLe: new Date().toISOString(),
    techniques: await db().techniques.toArray(),
    seances: await db().seances.toArray(),
  };
}

export interface ResultatImport {
  techniques: number;
  seances: number;
  ignorees: string[];
}

/**
 * Réinjecte une sauvegarde.
 *
 * Les identifiants de technique inconnus sont **ignorés et signalés**, jamais
 * écrits en silence : une sauvegarde plus ancienne que le corpus contient des
 * fiches renommées, et les avaler créerait des lignes orphelines invisibles.
 *
 * Les séances, elles, sont **ajoutées** sans écraser : leur clé est
 * auto-incrémentée et rien ne garantit qu'un identifiant 7 désigne la même
 * séance d'une base à l'autre. Réimporter deux fois le même fichier duplique
 * donc les séances — c'est le moindre mal face à un écrasement silencieux.
 */
export async function importer(
  brut: unknown,
  idsConnus: ReadonlySet<string>
): Promise<ResultatImport> {
  const f = brut as Partial<Fichier> & { techniques?: unknown };

  // La tranche 5 exportait `muse-progression` v1, sans journal. On la relit.
  const ancien = (brut as { format?: string })?.format === 'muse-progression';
  if (!f || (f.format !== 'muse-sauvegarde' && !ancien)) {
    throw new Error('Ce fichier n’est pas une sauvegarde Muse.');
  }
  if (!ancien && f.version !== 2) {
    throw new Error(`Version de sauvegarde inconnue : ${String(f.version)}.`);
  }

  const ignorees: string[] = [];
  const techniques: EtatTechnique[] = [];
  for (const t of Array.isArray(f.techniques) ? (f.techniques as EtatTechnique[]) : []) {
    if (typeof t?.id !== 'string' || !idsConnus.has(t.id)) {
      ignorees.push(String(t?.id ?? '?'));
      continue;
    }
    techniques.push({
      id: t.id,
      avancement:
        t.avancement === 'acquis' || t.avancement === 'en-cours' ? t.avancement : 'neuf',
      observation: t.observation,
      maj: typeof t.maj === 'string' ? t.maj : new Date().toISOString(),
    });
  }

  const seances: Seance[] = [];
  for (const s of Array.isArray(f.seances) ? f.seances : []) {
    if (typeof s?.date !== 'string' || typeof s?.minutes !== 'number') continue;
    if (s.technique !== null && !idsConnus.has(String(s.technique))) {
      ignorees.push(String(s.technique));
      continue;
    }
    // `id` retiré : Dexie en attribue un neuf, et deux bases n'ont pas la même
    // numérotation.
    const { id: _ignore, ...reste } = s;
    seances.push(reste as Seance);
  }

  await db().techniques.bulkPut(techniques);
  if (seances.length) await db().seances.bulkAdd(seances as Seance[]);

  return { techniques: techniques.length, seances: seances.length, ignorees: [...new Set(ignorees)] };
}
