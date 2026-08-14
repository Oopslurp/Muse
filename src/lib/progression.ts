/**
 * Progression par technique.
 *
 * Deux choses distinctes, et il ne faut pas les confondre :
 *
 *  · **l'avancement** — où j'en suis sur cette technique. Pédagogique.
 *  · **l'observation** — j'ai vérifié cette fiche guitare en main. Épistémique,
 *    c'est la promotion de CLAUDE.md décision 1. Elle **n'écrase pas**
 *    l'origine (`sourcé` / `déduit`) : ce sont deux champs, jamais un enum.
 *
 * Le magasin lui-même vit dans [base.ts](./base.ts), partagé avec le journal.
 */

import { db, disponible, type Avancement, type EtatTechnique } from './base';

export { disponible };
export type { Avancement, EtatTechnique, Observation } from './base';

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
