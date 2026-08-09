/**
 * Décomptes dérivés du contenu réel.
 *
 * En tranche 1, ces chiffres étaient saisis à la main dans `taxonomy.ts`. Ils
 * viennent maintenant de la collection : un chiffre affiché qui ne se recalcule
 * pas devient faux à la première fiche ajoutée, et personne ne s'en aperçoit.
 */

import { getCollection } from 'astro:content';
import { FAMILIES, type FamilyId } from './taxonomy';

export interface Corpus {
  /** Nombre de fiches publiées. */
  fiches: number;
  /**
   * Nombre de techniques couvertes — supérieur au nombre de fiches, parce que
   * certaines fiches en traitent plusieurs : butée et pincé sont deux entrées
   * de la taxonomie et une seule fiche, puisque ce sont deux terminaisons du
   * même geste.
   */
  techniques: number;
  completes: number;
  courtes: number;
  doutes: number;
  /** Fiches dont la séance est classée à risque élevé. */
  risqueEleve: number;
  parFamille: Record<FamilyId, number>;
}

/**
 * Techniques de la taxonomie traitées dans une fiche qui en couvre plusieurs.
 * Une seule entrée aujourd'hui ; le champ existe pour que le décompte reste
 * honnête si le cas se reproduit.
 */
const TECHNIQUES_FUSIONNEES: Record<string, number> = {
  'apoyando-tirando': 2, // MD-01 butée + MD-02 pincé
};

export async function corpus(): Promise<Corpus> {
  const fiches = (await getCollection('techniques')).filter((f) => !f.data.brouillon);

  const parFamille = Object.fromEntries(
    FAMILIES.map((f) => [f.id, 0])
  ) as Record<FamilyId, number>;

  let techniques = 0;
  let completes = 0;
  let doutes = 0;
  let risqueEleve = 0;

  for (const f of fiches) {
    parFamille[f.data.famille] += 1;
    techniques += TECHNIQUES_FUSIONNEES[f.id] ?? 1;
    if (f.data.profondeur === 'complete') completes += 1;
    doutes += f.data.doutes.length;
    if (f.data.seance.risque === 'eleve') risqueEleve += 1;
  }

  return {
    fiches: fiches.length,
    techniques,
    completes,
    courtes: fiches.length - completes,
    doutes,
    risqueEleve,
    parFamille,
  };
}
