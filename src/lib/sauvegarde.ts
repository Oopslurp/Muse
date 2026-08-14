/**
 * Sauvegarde — tout ce qui est local ressort en JSON.
 *
 * CLAUDE.md décision 8 : aucun backend, aucun compte, **tout est exportable**.
 * Une donnée locale sans porte de sortie est une donnée qu'on perdra, et
 * IndexedDB s'efface avec les données de navigation sans prévenir.
 *
 * Trois propriétés tenues ici, chacune apprise d'un défaut :
 *
 * 1. **L'enveloppe est versionnée.** Un export sans version est illisible dans
 *    deux ans. Les versions 1 et 2 sont relues.
 * 2. **Le réimport est idempotent.** Chaque séance porte un identifiant stable
 *    attribué à sa création ; réimporter deux fois le même fichier ne crée
 *    plus de doublons. La clé auto-incrémentée ne pouvait pas servir à ça :
 *    elle ne désigne pas la même séance d'une base à l'autre.
 * 3. **Tout s'écrit dans une transaction unique.** Une erreur au milieu
 *    laissait auparavant une base à moitié importée, sans que rien ne le dise.
 *
 * Et le fichier est validé **champ par champ** avant d'entrer. Ce qui vient
 * d'un disque n'est pas de confiance, même quand c'est nous qui l'avons écrit.
 */

import {
  db,
  identifiant,
  type EtatTechnique,
  type EtatTechniqueHerite,
  type ObservationLigne,
  type Seance,
  type TempoNote,
} from './base';

export interface Fichier {
  format: 'muse-sauvegarde';
  version: 3;
  exporteLe: string;
  techniques: EtatTechnique[];
  seances: Seance[];
  observations: ObservationLigne[];
}

export async function exporter(): Promise<Fichier> {
  return {
    format: 'muse-sauvegarde',
    version: 3,
    exporteLe: new Date().toISOString(),
    techniques: await db().techniques.toArray(),
    seances: await db().seances.toArray(),
    observations: await db().observations.toArray(),
  };
}

export interface ResultatImport {
  techniques: number;
  seances: number;
  seancesDejaLa: number;
  observations: number;
  ignorees: string[];
}

/* --------------------------------------------------------- validation */

const texte = (v: unknown, max = 4000): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;

/** Une date ISO courte, et rien d'autre. */
const dateCourte = (v: unknown): string | undefined =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;

const entier = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
    ? Math.round(v)
    : undefined;

function tempo(v: unknown): TempoNote | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const t = v as Partial<TempoNote>;
  const valeur = entier(t.valeur, 1, 1000);
  if (valeur === undefined) return undefined;
  if (t.unite !== 'bpm' && t.unite !== 'notes-min') return undefined;
  return { valeur, unite: t.unite };
}

/* ------------------------------------------------------------- import */

/**
 * Réinjecte une sauvegarde.
 *
 * Les identifiants de technique inconnus sont **ignorés et signalés**, jamais
 * écrits en silence : une sauvegarde plus ancienne que le corpus contient des
 * fiches renommées, et les avaler créerait des lignes orphelines invisibles.
 */
export async function importer(
  brut: unknown,
  idsConnus: ReadonlySet<string>
): Promise<ResultatImport> {
  const f = brut as Partial<Fichier>;
  const format = (brut as { format?: string })?.format;

  // La tranche 5 exportait `muse-progression` v1, la tranche 6 `muse-sauvegarde`
  // v2. Les deux se relisent : une sauvegarde qu'on ne peut plus ouvrir n'est
  // pas une sauvegarde.
  const ancienFormat = format === 'muse-progression';
  if (format !== 'muse-sauvegarde' && !ancienFormat) {
    throw new Error('Ce fichier n’est pas une sauvegarde Muse.');
  }
  const version = ancienFormat ? 1 : Number(f.version);
  if (![1, 2, 3].includes(version)) {
    throw new Error(`Version de sauvegarde inconnue : ${String(f.version)}.`);
  }

  const ignorees = new Set<string>();

  /* --- techniques : avancement, et l'ancienne observation de fiche --- */
  const techniques: EtatTechnique[] = [];
  const observations: ObservationLigne[] = [];

  for (const brute of Array.isArray(f.techniques) ? f.techniques : []) {
    const t = brute as Partial<EtatTechniqueHerite>;
    if (typeof t?.id !== 'string' || !idsConnus.has(t.id)) {
      ignorees.add(String(t?.id ?? '?'));
      continue;
    }
    techniques.push({
      id: t.id,
      avancement:
        t.avancement === 'acquis' || t.avancement === 'en-cours' ? t.avancement : 'neuf',
      maj: texte(t.maj, 40) ?? new Date().toISOString(),
    });

    // Sauvegardes v1 et v2 : l'observation portait sur la fiche entière. Elle
    // devient l'observation de l'élément `fiche`, ce qu'elle signifiait déjà.
    const date = dateCourte(t.observation?.date);
    if (date) {
      observations.push({
        cle: `${t.id}#fiche`,
        fiche: t.id,
        element: 'fiche',
        date,
        note: texte(t.observation?.note),
        maj: new Date().toISOString(),
      });
    }
  }

  /* --- observations, depuis la version 3 --- */
  for (const brute of Array.isArray(f.observations) ? f.observations : []) {
    const o = brute as Partial<ObservationLigne>;
    const fiche = typeof o?.fiche === 'string' ? o.fiche : '';
    const element = texte(o?.element, 60);
    const date = dateCourte(o?.date);
    if (!fiche || !element || !date) continue;
    if (!idsConnus.has(fiche)) {
      ignorees.add(fiche);
      continue;
    }
    observations.push({
      cle: `${fiche}#${element}`,
      fiche,
      element,
      date,
      note: texte(o?.note),
      maj: texte(o?.maj, 40) ?? new Date().toISOString(),
    });
  }

  /* --- séances --- */
  const seances: Seance[] = [];
  for (const brute of Array.isArray(f.seances) ? f.seances : []) {
    const s = brute as Partial<Seance>;
    const date = dateCourte(s?.date);
    const minutes = entier(s?.minutes, 1, 1440);
    if (!date || minutes === undefined) continue;

    const technique = typeof s.technique === 'string' ? s.technique : null;
    if (technique !== null && !idsConnus.has(technique)) {
      ignorees.add(technique);
      continue;
    }

    seances.push({
      // Une sauvegarde d'avant la version 3 n'a pas d'identifiant stable : on
      // lui en donne un ici. Conséquence assumée — réimporter deux fois un
      // vieux fichier duplique encore, faute de quoi le dédupliquer demanderait
      // de deviner.
      uid: texte(s.uid, 64) ?? identifiant(),
      date,
      technique,
      minutes,
      tempo: tempo(s.tempo),
      arret: texte(s.arret),
      note: texte(s.note),
    });
  }

  /* --- écriture, en une seule transaction --- */
  let ajoutees = 0;
  let dejaLa = 0;

  await db().transaction('rw', db().techniques, db().seances, db().observations, async () => {
    if (techniques.length) await db().techniques.bulkPut(techniques);
    if (observations.length) await db().observations.bulkPut(observations);

    if (seances.length) {
      const connus = new Set(
        (await db().seances.toArray()).map((s) => s.uid).filter(Boolean)
      );
      const neuves = seances.filter((s) => !connus.has(s.uid));
      dejaLa = seances.length - neuves.length;
      if (neuves.length) await db().seances.bulkAdd(neuves);
      ajoutees = neuves.length;
    }
  });

  return {
    techniques: techniques.length,
    seances: ajoutees,
    seancesDejaLa: dejaLa,
    observations: observations.length,
    ignorees: [...ignorees],
  };
}

/* ------------------------------------------------------- remise à zéro */

/**
 * Efface tout : progression, observations, journal.
 *
 * Irréversible et sans corbeille — d'où la confirmation explicite exigée par
 * l'appelant. On ne peut pas repartir de zéro autrement qu'en passant par les
 * outils de développement du navigateur, ce qui n'est pas une réponse.
 */
export async function toutEffacer(): Promise<void> {
  await db().transaction('rw', db().techniques, db().seances, db().observations, async () => {
    await db().techniques.clear();
    await db().seances.clear();
    await db().observations.clear();
  });
}

/** Combien de lignes la base contient, pour l'annoncer avant d'effacer. */
export async function compter(): Promise<{ techniques: number; seances: number; observations: number }> {
  return {
    techniques: await db().techniques.count(),
    seances: await db().seances.count(),
    observations: await db().observations.count(),
  };
}

/* --------------------------------------------------- rappel d'export */

const CLE_EXPORT = 'muse:dernier-export';
/** Au-delà, on rappelle. Assez pour ne pas harceler, assez peu pour protéger. */
const SEUIL_RAPPEL = 10;

export function marquerExport(total: number): void {
  try {
    localStorage.setItem(CLE_EXPORT, JSON.stringify({ le: Date.now(), total }));
  } catch {
    /* mode privé : le rappel réapparaîtra, ce n'est pas grave */
  }
}

/**
 * Faut-il rappeler d'exporter ?
 *
 * IndexedDB s'efface avec les données de navigation, **sans prévenir**. La
 * page le dit en toutes lettres, mais un texte lu une fois ne remplace pas un
 * rappel au moment où il y a quelque chose à perdre.
 */
export function rappelExport(seancesActuelles: number): number {
  try {
    const brut = localStorage.getItem(CLE_EXPORT);
    const depuis = brut ? (JSON.parse(brut) as { total?: number }).total ?? 0 : 0;
    const nouvelles = seancesActuelles - depuis;
    return nouvelles >= SEUIL_RAPPEL ? nouvelles : 0;
  } catch {
    return 0;
  }
}
