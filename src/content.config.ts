import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// Zod importé directement : le ré-export par `astro:content` est déprécié
// depuis Astro 7 et produit un avertissement par usage.
import { z } from 'zod';

/**
 * Schéma des fiches techniques.
 *
 * Dérivé de `docs/research/05-modele-donnees.md`, révisé par les décisions
 * de CLAUDE.md. Trois écarts assumés par rapport au document de recherche :
 *
 *  1. Le statut épistémique n'est plus un enum à quatre valeurs. `origine`
 *     dit d'où vient l'affirmation, `observe` est une promotion manuelle qui
 *     n'écrase pas l'origine, `doute` porte un [À VÉRIFIER] avec sa raison.
 *     Le statut affiché est calculé — voir `src/lib/provenance.ts`.
 *  2. Les sources vivent dans un catalogue global (`src/data/sources.ts`) ;
 *     la fiche n'en garde que l'identifiant et une phrase de pertinence.
 *  3. Les champs santé sont obligatoires et le build échoue sans eux.
 *
 * Zod valide à la construction : le frontmatter est du contenu, pas du code,
 * et les types TypeScript ne vérifient rien à l'exécution.
 */

/* ------------------------------------------------------------------ atomes */

const familleSchema = z.enum([
  'main-droite',
  'main-gauche',
  'percussif-moderne',
  'transversal',
]);

const styleSchema = z.enum(['classique', 'moderne', 'les-deux']);
const mainSchema = z.enum(['pince', 'frette', 'les-deux']);
const difficulteSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

/** « 120 » seul ne veut rien dire : l'unité est obligatoire. */
const tempoSchema = z.object({
  valeur: z.number().positive(),
  unite: z.enum(['bpm', 'notes-min']),
  /** Subdivision jouée quand l'unité est le bpm. */
  subdivision: z.enum(['1', '2', '4', '8', '16', 'triolet-8', 'triolet-16']).optional(),
});

/**
 * Provenance d'une affirmation. Attachable à la fiche entière ou à un
 * élément précis (une erreur, un exercice, le protocole de séance).
 */
const provenanceSchema = z.object({
  origine: z.enum(['source', 'deduit']),
  /** Identifiants du catalogue global. Requis si `origine === 'source'`. */
  sourceIds: z.array(z.string()).default([]),
  /** Promotion manuelle après vérification à la guitare. N'écrase pas l'origine. */
  observe: z
    .object({
      date: z.string(),
      note: z.string().optional(),
    })
    .optional(),
  /** [À VÉRIFIER] — le doute et sa raison, conservés visibles. */
  doute: z.string().optional(),
}).refine((p) => p.origine !== 'source' || p.sourceIds.length > 0, {
  message: "origine « source » exige au moins un sourceId",
});

/* ---------------------------------------------------------------- éléments */

const ecouteSchema = z.object({
  oeuvre: z.string(),
  compositeur: z.string().optional(),
  interprete: z.string().optional(),
  url: z.url().optional(),
  /** Ce qu'il faut écouter précisément, pas « c'est beau ». */
  quoiEcouter: z.string(),
  /** Faux tant que personne n'a réellement écouté. Affiché. */
  ecoute: z.boolean().default(false),
});

const erreurSchema = z.object({
  titre: z.string(),
  description: z.string().optional(),
  diagnostic: z.object({
    /** Par quel canal on repère l'erreur seul. */
    canaux: z
      .array(z.enum(['son', 'sensation', 'video', 'audio', 'visuel', 'metronome']))
      .min(1),
    /** Le protocole exact du test. C'est le cœur de la valeur du site. */
    test: z.string(),
    /** Ce qu'on observe si l'erreur est présente. */
    signe: z.string(),
  }),
  /** Renvoi vers une technique où l'erreur trouve sa cause. */
  renvoi: z.array(z.string()).default([]),
  /** Signal d'arrêt, pas défaut à corriger. */
  sante: z.boolean().default(false),
});

const palierSchema = z.object({
  titre: z.string(),
  objectif: z.string(),
  /** Identifiants locaux d'exercices. */
  exercices: z.array(z.string()).default([]),
  tempoDepart: tempoSchema.optional(),
  tempoCible: tempoSchema.optional(),
  /** Jamais « quand tu te sens prêt ». Vérifié par l'invariant plus bas. */
  critere: z.string().min(12),
  /** Si faux, la fiche doit dire ce qui manque : prof, oreille tierce… */
  autoVerifiable: z.boolean().default(true),
  note: z.string().optional(),
});

const exerciceSchema = z.object({
  /** Identifiant local à la fiche, référencé par les paliers. */
  id: z.string(),
  titre: z.string(),
  description: z.string(),
  origine: z.enum(['original', 'domaine-public', 'formule-commune', 'consigne']),
  /** Source alphaTex. Absente pour les exercices de type « consigne ». */
  alphaTex: z.string().optional(),
  tempoDepart: tempoSchema.optional(),
  tempoCible: tempoSchema.optional(),
  /**
   * Le rendu MIDI est-il fidèle ? Faux pour tout ce qui implique butée/pincé,
   * timbre, ou étouffements percussifs. Ne désactive jamais la lecture —
   * déclenche un badge nommant ce qui manque (CLAUDE.md, décision 10).
   */
  audioFidele: z.boolean().default(true),
  /** Ce que l'audio ne restitue pas, en clair. */
  reservesAudio: z.array(z.string()).default([]),
  provenance: provenanceSchema.optional(),
});

const repertoireSchema = z.object({
  oeuvre: z.string(),
  compositeur: z.string(),
  mort: z.number().optional(),
  droits: z.enum([
    'domaine-public',
    'domaine-public-ue',
    'sous-droits',
    'edition-a-verifier',
    'inconnu',
  ]),
  noteDroits: z.string().optional(),
  /** Ce que la technique y fait précisément. */
  role: z.string(),
  difficulte: difficulteSchema.optional(),
  url: z.url().optional(),
  /** Palier à partir duquel la pièce devient abordable. */
  aPartirDuPalier: z.number().int().positive().optional(),
});

/**
 * Protocole de séance. Les trois champs de la décision 3 sont obligatoires :
 * sans eux, la fiche ne dit que quoi viser, jamais quand s'arrêter.
 */
const seanceSchema = z.object({
  moment: z
    .array(z.enum(['echauffement', 'debut', 'milieu', 'fin', 'jamais-a-froid']))
    .min(1),
  dureeMin: z.number().int().positive().optional(),
  /** Minutes. Obligatoire. */
  dureeMax: z.number().int().positive(),
  frequence: z.string(),
  series: z
    .object({
      travailSecondes: z.number().int().positive(),
      reposSecondes: z.number().int().positive(),
      nombre: z.number().int().positive(),
    })
    .optional(),
  /** Du plus précoce au plus tardif. Le premier est l'alarme utile. */
  signalArret: z.array(z.string()).min(1),
  /** Secondes de repos complet entre séries. Obligatoire. */
  reposMin: z.number().int().positive(),
  risque: z.enum(['faible', 'modere', 'eleve']),
  avertissementSante: z.string().optional(),
  provenance: provenanceSchema,
});

/* ------------------------------------------------------------------ fiche */

const techniqueSchema = z
  .object({
    /** Code de la taxonomie : MD-08, MG-02… */
    code: z.string().regex(/^(MD|MG|PM|TR)-\d{2}$/),
    nom: z.object({
      fr: z.string(),
      en: z.string(),
      es: z.string(),
      /** Synonymes et appellations concurrentes, indexés pour la recherche. */
      alias: z.array(z.string()).default([]),
    }),
    famille: familleSchema,
    style: styleSchema,
    difficulte: difficulteSchema,
    main: mainSchema,

    /** Identifiants d'autres fiches. Existence et acyclicité vérifiées au build. */
    prerequis: z.array(z.string()).default([]),
    /** Transversal permanent : affiché en bandeau plutôt qu'en prérequis. */
    permanent: z.boolean().default(false),

    profondeur: z.enum(['complete', 'courte']),
    provenance: provenanceSchema,

    /** Résumé du son visé. La version longue vit dans le corps MDX. */
    sonCible: z.string(),
    /** Fiches courtes : le geste en une phrase. */
    gesteCle: z.string().optional(),

    ecoutes: z.array(ecouteSchema).default([]),
    erreurs: z.array(erreurSchema).default([]),
    paliers: z.array(palierSchema).default([]),
    exercices: z.array(exerciceSchema).default([]),
    repertoire: z.array(repertoireSchema).default([]),
    seance: seanceSchema,

    /** Identifiant du catalogue + pertinence locale à cette fiche. */
    sources: z
      .array(z.object({ id: z.string(), pertinence: z.string() }))
      .default([]),

    /** Les [À VÉRIFIER] agrégés de la fiche. Rendus visibles, jamais lissés. */
    doutes: z.array(z.string()).default([]),

    revuLe: z.string(),
    version: z.number().int().positive().default(1),
    brouillon: z.boolean().default(false),
  })
  /* --------------------------- invariants de construction --------------- */
  .refine((t) => t.seance.risque !== 'eleve' || !!t.seance.avertissementSante, {
    message: 'un risque « eleve » exige un avertissementSante',
    path: ['seance', 'avertissementSante'],
  })
  .refine(
    (t) =>
      t.paliers.every(
        (p) => !/quand tu te sens|quand tu sens que|lorsque tu te sens/i.test(p.critere)
      ),
    {
      message:
        'un critère de passage ne peut pas être « quand tu te sens prêt » (CLAUDE.md, parti pris 3)',
      path: ['paliers'],
    }
  )
  .refine(
    (t) => {
      const ids = new Set(t.exercices.map((e) => e.id));
      return t.paliers.every((p) => p.exercices.every((x) => ids.has(x)));
    },
    { message: 'un palier référence un exercice inexistant', path: ['paliers'] }
  )
  .refine((t) => t.profondeur !== 'complete' || t.paliers.length >= 4, {
    message: 'une fiche approfondie doit compter au moins 4 paliers',
    path: ['paliers'],
  })
  .refine(
    (t) => t.exercices.every((e) => e.origine === 'consigne' || !!e.alphaTex),
    { message: 'un exercice non « consigne » doit porter une source alphaTex', path: ['exercices'] }
  )
  .refine((t) => t.exercices.every((e) => e.audioFidele || e.reservesAudio.length > 0), {
    message:
      'audioFidele: false exige de nommer ce qui manque (CLAUDE.md, décision 10)',
    path: ['exercices'],
  });

const techniques = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/techniques' }),
  schema: techniqueSchema,
});

export const collections = { techniques };
