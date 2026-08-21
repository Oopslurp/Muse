/**
 * Décomptes dérivés du contenu réel.
 *
 * En tranche 1, ces chiffres étaient saisis à la main dans `taxonomy.ts`. Ils
 * viennent maintenant de la collection : un chiffre affiché qui ne se recalcule
 * pas devient faux à la première fiche ajoutée, et personne ne s'en aperçoit.
 */

import { getCollection, type CollectionEntry } from 'astro:content';
import { FAMILIES, type FamilyId } from './taxonomy';
import { OUTILS, normaliser, type Entree } from './recherche';
import { chemin } from './chemins';

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

/**
 * Tous les doutes d'une fiche, y compris ceux qui ne sont pas au premier
 * niveau.
 *
 * Le décompte ne portait que sur `doutes[]` et ratait ceux logés dans la
 * provenance d'un exercice ou du protocole de séance : **30 annoncés pour 41
 * réels**. Sous-déclarer le doute est l'inverse exact de ce que le projet
 * promet — et c'est d'autant plus gênant que ces doutes-là sont bien affichés
 * sur les fiches, juste pas comptés.
 */
function comptDoutes(d: TechniqueData): number {
  let n = d.doutes.length;
  if (d.provenance.doute) n += 1;
  if (d.seance.provenance.doute) n += 1;
  for (const e of d.exercices) if (e.provenance?.doute) n += 1;
  // Un lien de prérequis douteux est affiché comme tel sur la fiche : il se
  // compte, sans quoi on retomberait exactement dans le défaut ci-dessus.
  for (const p of Object.values(d.lienProvenance)) if (p.doute) n += 1;
  return n;
}

type TechniqueData = CollectionEntry<'techniques'>['data'];

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
    doutes += comptDoutes(f.data);
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

/* -------------------------------------------------------------- recherche */

/**
 * Index de recherche, construit au build.
 *
 * On indexe plus que les noms français : l'anglais, l'espagnol et les alias,
 * parce qu'on cherche « apoyando » ou « cejilla » aussi souvent que « butée ».
 * Et les titres de paliers et d'erreurs, parce qu'on se souvient d'un symptôme
 * — « corde qui frise » — avant de se souvenir de quelle fiche le traite.
 */
export async function indexRecherche(): Promise<Entree[]> {
  const fiches = (await getCollection('techniques')).filter((f) => !f.data.brouillon);
  const entrees: Entree[] = [];

  for (const f of fiches) {
    const d = f.data;
    const href = chemin(`/techniques/${f.id}`);
    const noms = [d.nom.fr, d.nom.en, d.nom.es, ...(d.nom.alias ?? [])].filter(Boolean);

    entrees.push({
      titre: d.nom.fr,
      href,
      contexte: d.sonCible.replace(/\s+/g, ' ').slice(0, 120),
      type: 'technique',
      cles: normaliser([d.code, ...noms, d.sonCible].join(' ')),
    });

    for (const p of d.paliers) {
      entrees.push({
        titre: p.titre,
        href: `${href}#progression`,
        contexte: `${d.nom.fr} · ${p.objectif}`,
        type: 'palier',
        cles: normaliser([p.titre, p.objectif, d.nom.fr].join(' ')),
      });
    }

    for (const e of d.erreurs) {
      // Le signe observable vaut mieux que la description : c'est par lui
      // qu'on reconnaît son propre défaut, et donc par lui qu'on cherche.
      const signe = e.diagnostic.signe;
      entrees.push({
        titre: e.titre,
        href: `${href}#erreurs`,
        contexte: `${d.nom.fr} · ${signe}`,
        type: 'erreur',
        cles: normaliser([e.titre, signe, e.diagnostic.test, d.nom.fr].join(' ')),
      });
    }
  }

  for (const o of OUTILS) {
    entrees.push({ ...o, href: chemin(o.href), cles: normaliser(`${o.titre} ${o.contexte}`) });
  }

  return entrees;
}
