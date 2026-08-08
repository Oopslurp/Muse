# 05 — Modèle de données : frontmatter MDX d'une fiche technique

> **Statut** : proposition de recherche. Rien n'est figé.

---

## Principe directeur : ce qui va dans le frontmatter et ce qui n'y va pas

**Règle** : le frontmatter contient ce qui doit être **requêtable, filtrable, ou rendu par un composant**. Le corps MDX contient la **prose**.

| Section de la fiche | Où | Pourquoi |
|---|---|---|
| 1. Identité | **Frontmatter** | Filtres, graphe, en-tête |
| 2. Son cible — références d'écoute | **Frontmatter** | Liste rendue par un composant, liens sortants |
| 2. Son cible — description | Corps MDX | Prose |
| 3. Anatomie du geste | Corps MDX | Prose longue, structurée en sous-titres |
| 4. Erreurs + autodiagnostic | **Frontmatter** | Tableau rendu par un composant, filtrable par symptôme |
| 5. Progression en paliers | **Frontmatter** | Composant de progression, réglage du lecteur, journal de pratique |
| 6. Exercices | **Frontmatter** (métadonnées + alphaTex) | Le lecteur alphaTab a besoin de données, pas de prose |
| 7. Répertoire | **Frontmatter** | Liste liable, statut juridique à afficher |
| 8. Protocole de séance | **Frontmatter** | Composant encadré, alertes santé |
| 9. Sources | **Frontmatter** | Liste normalisée, réutilisable entre fiches |

**Pourquoi les exercices sont en frontmatter et pas dans le corps** : ils portent un tempo de départ, un tempo cible, un rattachement à un palier et une source alphaTex. Le lecteur doit être initialisable depuis ces données (parti pris n°5 de `04-benchmark.md`). Le seul texte dans l'objet exercice est sa `description`, qui reste courte et peut contenir du Markdown inline.

---

## Le schéma

```ts
// ============================================================
//  types/technique.ts
//  Frontmatter d'une fiche technique (docs → contenu MDX)
// ============================================================

// ------------------------------------------------------------
//  Primitives et vocabulaires contrôlés
// ------------------------------------------------------------

/** Slug kebab-case, unique. Sert d'identifiant dans le graphe de prérequis. */
export type TechniqueId = string & { readonly __brand: 'TechniqueId' };

/** Les quatre familles de la taxonomie (00-taxonomie.md). */
export type Family =
  | 'main-droite'
  | 'main-gauche'
  | 'percussif-moderne'
  | 'transversal';

/**
 * Style d'appartenance. Facette de filtrage principale.
 * `les-deux` n'est PAS l'union : c'est une valeur à part entière, qui signifie
 * « pertinent et pratiqué dans les deux mondes », ce qui n'est pas la même
 * chose que « on peut l'utiliser partout ». Le filtre `classique` doit
 * retourner `classique` + `les-deux`.
 */
export type Style = 'classique' | 'moderne' | 'les-deux';

/** 1 = acquis attendu chez un intermédiaire · 5 = travail au long cours. */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

/**
 * Niveau de fiabilité d'une affirmation ou d'un contenu.
 * Parti pris n°2 de 04-benchmark.md : affiché dans l'interface, jamais caché.
 */
export type Verification =
  | { status: 'sourced'; sourceIds: string[] }
  | { status: 'derived'; rationale: string }
  | { status: 'to-verify'; reason: string; blocking?: boolean };

/**
 * Unité de tempo. Indispensable : « 120 » ne veut rien dire seul.
 * - `bpm`        : pulsation (le métronome), avec la subdivision jouée en regard
 * - `notes-min`  : notes réellement jouées par minute (utile pour les gammes,
 *                  le trémolo, tout ce qui se compte en notes et non en temps)
 */
export type TempoUnit = 'bpm' | 'notes-min';

export interface Tempo {
  value: number;
  unit: TempoUnit;
  /** Subdivision jouée quand `unit === 'bpm'`. Ex. '8' = croches, '16' = doubles. */
  subdivision?: '1' | '2' | '4' | '8' | '16' | '32' | 'triolet-8' | 'triolet-16';
}

/** Main concernée. Le site doit rester utilisable par un gaucher. */
export type Hand = 'pince' | 'frette' | 'les-deux';

// ------------------------------------------------------------
//  Nomenclature multilingue
// ------------------------------------------------------------

export interface Names {
  fr: string;
  en: string;
  es: string;
  /** Autres appellations rencontrées, y compris fautives ou concurrentes.
   *  Indexées pour la recherche : quelqu'un qui cherche « rest stroke »
   *  ou « buté » doit tomber sur `apoyando-tirando`. */
  aliases?: string[];
  /** Abréviation de notation, si elle existe (ex. 'CV' pour barré case 5). */
  notation?: string;
}

// ------------------------------------------------------------
//  Sources
// ------------------------------------------------------------

export type SourceKind =
  | 'methode'        // livre de méthode (Tennant, Carlevaro, Pujol…)
  | 'partition'      // édition musicale
  | 'cours-ligne'    // plateforme payante
  | 'article'        // article web ou magazine
  | 'video'          // vidéo — voir `viewed`
  | 'academique'     // article à comité de lecture
  | 'medical'        // source santé
  | 'documentation'; // doc technique (alphaTab…)

export interface Source {
  /** Clé stable, réutilisable entre fiches. Ex. 'tennant-pumping-nylon'. */
  id: string;
  kind: SourceKind;
  author: string;
  title: string;
  year?: number;
  publisher?: string;
  url?: string;
  /** Ce qu'on y trouve précisément, pour cette fiche. */
  relevance: string;
  /** Payant / gratuit / emprunt. */
  access?: 'gratuit' | 'payant' | 'emprunt' | 'domaine-public';
  /**
   * UNIQUEMENT pour kind === 'video'.
   * `false` = le contenu a été qualifié d'après la description, pas visionné.
   * Doit être affiché. Voir règle 3 du brief de recherche.
   */
  viewed?: boolean;
}

// ------------------------------------------------------------
//  Références d'écoute
// ------------------------------------------------------------

export interface ListeningReference {
  work: string;
  composer?: string;
  performer?: string;
  url?: string;
  /** Ce qu'il faut écouter précisément. Pas « c'est beau » mais
   *  « l'intervalle entre la basse et la première note du trémolo ». */
  whatToListenFor: string;
  /** Toujours false pour l'instant : rien n'a été écouté dans la recherche. */
  verifiedByListening: boolean;
}

// ------------------------------------------------------------
//  Erreurs et autodiagnostic
// ------------------------------------------------------------

/** Comment l'utilisateur détecte l'erreur seul. */
export type DiagnosticChannel =
  | 'son'        // à l'oreille, en direct
  | 'sensation'  // proprioception
  | 'video'      // filmer, si possible au ralenti
  | 'audio'      // s'enregistrer et réécouter
  | 'visuel'     // regarder, miroir
  | 'metronome'; // test rythmique

export interface CommonError {
  id: string;
  /** Formulation courte, affichable en liste. */
  label: string;
  /** Ce qui se passe mécaniquement. */
  description?: string;
  autodiagnostic: {
    channels: DiagnosticChannel[];
    /** Le protocole exact du test. C'est le cœur de la valeur du site. */
    test: string;
    /** Ce qu'on observe si l'erreur est présente. */
    positiveSign: string;
  };
  /** Renvoi vers une autre technique quand l'erreur y trouve sa cause. */
  crossReference?: TechniqueId[];
  /** true = ce n'est pas un défaut à corriger mais un signal d'arrêt. */
  isHealthWarning?: boolean;
  verification?: Verification;
}

// ------------------------------------------------------------
//  Progression par paliers
// ------------------------------------------------------------

export interface Stage {
  /** 1-indexé. */
  index: number;
  label: string;
  /** Ce qu'on cherche à obtenir, en une phrase. */
  objective: string;
  /** Exercices rattachés (ids locaux à la fiche). */
  exerciseIds: string[];
  tempoStart?: Tempo;
  tempoTarget?: Tempo;
  /**
   * Le critère de passage. OBLIGATOIRE et non vide.
   * Parti pris n°3 de 04-benchmark.md : jamais « quand tu te sens prêt ».
   */
  passCriterion: string;
  /**
   * Le critère est-il vérifiable par l'utilisateur seul ?
   * Si false, la fiche doit dire ce qui manque (prof, enregistrement, oreille tierce).
   */
  selfVerifiable: boolean;
  /** Ordre de grandeur du temps de travail. Purement indicatif. */
  typicalDuration?: string;
  /** Note libre : pièges, priorités, « ne saute pas ce palier ». */
  note?: string;
}

// ------------------------------------------------------------
//  Exercices
// ------------------------------------------------------------

export type ExerciseOrigin =
  | 'original'         // écrit pour le site — pas de question de droits
  | 'domaine-public'   // extrait ou adaptation d'une œuvre libre
  | 'formule-commune'  // gamme, arpège élémentaire : non protégeable
  | 'consigne';        // pas de notation, seulement un protocole textuel

export interface Exercise {
  /** Id local à la fiche. Ex. 'ex-a'. */
  id: string;
  label: string;
  /** Description textuelle précise. Markdown inline autorisé. */
  description: string;
  origin: ExerciseOrigin;
  /** Source alphaTex. Absent si origin === 'consigne'. */
  alphaTex?: string;
  /** Accordage requis, en notation alphaTex (corde 1 → corde 6). */
  tuning?: string;
  /** Réglages initiaux du lecteur pour cet exercice. */
  player?: {
    tempoStart?: Tempo;
    tempoTarget?: Tempo;
    /** Boucle par défaut, en numéros de mesure 1-indexés. */
    loop?: { fromBar: number; toBar: number };
    /** Décalage du clic de métronome, pour les tests de régularité. */
    metronomeOffset?: 'temps-1' | 'temps-2-4' | 'contretemps' | 'note-2-du-cycle';
    /** Voix isolables (fiches polyphoniques). */
    isolatableVoices?: string[];
  };
  /**
   * Le rendu MIDI est-il fidèle ? false pour tout ce qui implique
   * étouffements percussifs, butée/pincé, timbre.
   * Déclenche un avertissement dans l'interface.
   */
  audioFaithful: boolean;
  verification: Verification;
}

// ------------------------------------------------------------
//  Répertoire
// ------------------------------------------------------------

export type CopyrightStatus =
  | 'domaine-public'
  | 'domaine-public-ue-seulement'
  | 'sous-droits'
  | 'edition-a-verifier'   // œuvre libre, édition potentiellement protégée
  | 'inconnu';

export interface RepertoireItem {
  work: string;
  composer: string;
  composerDeath?: number;
  copyright: CopyrightStatus;
  /** Note juridique quand `copyright !== 'domaine-public'`. */
  copyrightNote?: string;
  /** Ce que la technique y fait précisément. */
  techniqueRole: string;
  difficulty?: Difficulty;
  /** Lien vers une édition libre. Jamais un fichier hébergé si non libre. */
  scoreUrl?: string;
  /** Palier de la fiche à partir duquel la pièce devient abordable. */
  fromStage?: number;
}

// ------------------------------------------------------------
//  Protocole de séance
// ------------------------------------------------------------

export type SessionSlot =
  | 'echauffement'      // pendant l'échauffement
  | 'debut'             // juste après, main fraîche
  | 'milieu'
  | 'fin'
  | 'jamais-a-froid';   // contrainte négative

export interface SessionProtocol {
  slot: SessionSlot[];
  durationMinutes: { min: number; max: number };
  /** Ex. 'quotidien', '3-4x/semaine', 'quotidien pendant P1-P3 puis entretien'. */
  frequency: string;
  /** Travail en séries : utile pour les techniques à charge (barré). */
  sets?: { workSeconds: number; restSeconds: number; count: number };
  /** Signaux d'arrêt, du plus précoce au plus tardif. Le premier est l'alarme. */
  stopSignals: string[];
  /** Pauses recommandées. */
  breaks?: string;
  /**
   * Niveau de risque physique. Pilote l'affichage d'un encadré d'avertissement.
   * 'eleve' impose un `healthWarning` non vide.
   */
  riskLevel: 'faible' | 'modere' | 'eleve';
  healthWarning?: string;
  /** Le protocole est-il sourcé ou prudentiel ? */
  verification: Verification;
}

// ------------------------------------------------------------
//  Le frontmatter complet
// ------------------------------------------------------------

export interface TechniqueFrontmatter {
  // --- Identité -------------------------------------------------
  id: TechniqueId;
  /** Code de la taxonomie. Ex. 'MD-08'. Sert au tri et au graphe. */
  taxonomyCode: string;
  names: Names;
  family: Family;
  style: Style;
  difficulty: Difficulty;
  hand: Hand;

  /** Prérequis directs. Doivent exister et ne pas former de cycle. */
  prerequisites: TechniqueId[];
  /** Dérivé au build depuis `prerequisites` — ne pas saisir à la main. */
  unlocks?: TechniqueId[];

  /**
   * true pour les techniques transversales qui s'appliquent partout
   * (TR-05 relâchement). Affichées en bandeau plutôt qu'en prérequis,
   * pour éviter de connecter 30 nœuds dans le graphe.
   * Voir la note de 00-taxonomie.md.
   */
  alwaysApplies?: boolean;

  // --- Contenu structuré ---------------------------------------
  /** Description courte du son visé. La version longue est dans le corps MDX. */
  targetSoundSummary: string;
  listeningReferences: ListeningReference[];
  commonErrors: CommonError[];
  stages: Stage[];
  exercises: Exercise[];
  repertoire: RepertoireItem[];
  sessionProtocol: SessionProtocol;
  sources: Source[];

  // --- Méta -----------------------------------------------------
  /** Fiche approfondie (02-fiches) ou fiche courte (03-fiches-courtes). */
  depth: 'complete' | 'courte';
  /**
   * Fiabilité globale de la fiche.
   * Dérivable des `verification` internes, mais on la saisit aussi
   * à la main : une fiche peut être globalement fragile même si chaque
   * élément pris isolément semble solide (cas de la fiche percussion).
   */
  overallVerification: Verification;
  /** Tous les points de doute, agrégés. Alimente 07-synthese.md. */
  openQuestions?: string[];

  lastReviewed: string;   // ISO 8601
  version: number;
  /** Masque la fiche du listing sans la supprimer. */
  draft?: boolean;
}
```

---

## Types dérivés au build

Ceux-ci ne sont **pas** saisis dans le frontmatter : ils sont calculés à la génération du site.

```ts
// ============================================================
//  types/derived.ts
// ============================================================

/** Nœud du graphe de prérequis, prêt pour le rendu Mermaid ou D3. */
export interface GraphNode {
  id: TechniqueId;
  taxonomyCode: string;
  label: string;
  family: Family;
  difficulty: Difficulty;
  depth: 'complete' | 'courte';
  /** Longueur du plus long chemin depuis un nœud racine. Sert au layout. */
  layer: number;
  /** Aucun prérequis : point d'entrée du parcours. */
  isEntryPoint: boolean;
}

export interface GraphEdge {
  from: TechniqueId;
  to: TechniqueId;
  /** `implicit` pour les arêtes ajoutées par transitivité, à masquer par défaut. */
  kind: 'direct' | 'implicit';
}

export interface PrerequisiteGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Facettes de l'interface de filtrage. */
export interface FilterFacets {
  family: Record<Family, number>;
  difficulty: Record<Difficulty, number>;
  style: Record<Style, number>;
  hand: Record<Hand, number>;
  depth: Record<'complete' | 'courte', number>;
  verification: Record<Verification['status'], number>;
  /** Filtre « ce que je peux aborder maintenant », calculé depuis la progression. */
  reachableNow: number;
}

/** État de progression de l'utilisateur — hors frontmatter, en stockage local. */
export interface UserProgress {
  techniqueId: TechniqueId;
  currentStage: number;
  /** Date de première ouverture et de dernière séance. */
  startedAt: string;
  lastPracticedAt: string;
  /** Minutes cumulées, par palier. Repris de JustinGuitar (04-benchmark.md). */
  minutesByStage: Record<number, number>;
  /** Paliers dont le critère a été coché par l'utilisateur. */
  clearedStages: number[];
}
```

---

## Invariants à vérifier au build

Ce sont des tests, pas des types. Ils doivent faire échouer la construction du site.

| # | Invariant | Pourquoi |
|---|---|---|
| 1 | Tout `prerequisites[i]` correspond à un `id` existant | Sinon le graphe casse silencieusement |
| 2 | Le graphe des prérequis est **acyclique** | Un cycle rend le parcours impossible et la mise en page indéterminée |
| 3 | `difficulty` ≥ max(`difficulty` des prérequis) | Une technique ne peut pas être plus facile que ses prérequis. **Attention : cette règle est discutable** — le vibrato (3) a pour prérequis MG-01 (1), c'est cohérent ; mais si un cas légitime apparaît, il faut une échappatoire explicite plutôt que d'assouplir la règle. |
| 4 | Chaque `Stage.passCriterion` est non vide et ne contient pas « quand tu te sens prêt » ou équivalent | Parti pris n°3 |
| 5 | Chaque `Stage.exerciseIds[i]` existe dans `exercises` | Liens morts |
| 6 | `sessionProtocol.riskLevel === 'eleve'` ⟹ `healthWarning` non vide | Parti pris n°4 |
| 7 | `sessionProtocol.stopSignals.length ≥ 1` | Aucune fiche sans signal d'arrêt |
| 8 | Tout `Source` avec `kind === 'video'` a `viewed` défini | Règle 3 du brief : ne jamais laisser croire qu'une vidéo a été vue |
| 9 | Tout `Exercise.alphaTex` compile sans erreur avec le parseur alphaTab | Une tab qui ne parse pas est pire que pas de tab |
| 10 | `repertoire[i].copyright !== 'sous-droits'` quand un `scoreUrl` pointe vers un fichier hébergé localement | Règle 4 du brief |
| 11 | `depth === 'complete'` ⟹ `stages.length ≥ 4` | Le brief impose 4-5 paliers |
| 12 | Toute `Verification` de statut `to-verify` apparaît dans `openQuestions` | Pour que `07-synthese.md` soit générable automatiquement |

L'invariant 9 est le plus important à mettre en place tôt : **il transforme mes tablatures douteuses en erreurs de build** au lieu de bugs silencieux. Il ne garantit pas qu'une tab soit *musicalement* juste, seulement qu'elle est *syntaxiquement* valide — mais c'est déjà la moitié du risque écarté.

---

## Exemple de frontmatter rempli

Extrait volontairement partiel, pour montrer la forme. Basé sur `02-fiches/tremolo.md`.

```yaml
---
id: tremolo
taxonomyCode: MD-08
names:
  fr: Trémolo
  en: Tremolo
  es: Trémolo
  aliases: [tremolo classique, p-a-m-i]
family: main-droite
style: classique
difficulty: 5
hand: pince
prerequisites: [tirando, arpeges-pima, appui-prepare]
alwaysApplies: false
depth: complete

targetSoundSummary: >
  Une seule note tenue, pas quatre notes rapides. Si l'auditeur peut compter
  les notes, ce n'est pas encore du trémolo.

listeningReferences:
  - work: Recuerdos de la Alhambra
    composer: Francisco Tárrega
    whatToListenFor: >
      L'intervalle entre la note de basse (p) et la première note du trémolo (a).
      C'est là que se loge le galop, y compris chez les professionnels.
    verifiedByListening: false

commonErrors:
  - id: galop
    label: Le galop — écart p→a trop grand
    description: >
      `a` attend que le pouce ait dégagé sa corde, ce qui allonge le premier
      intervalle du cycle et produit un « ta-ta-ta … ta-ta-ta ».
    autodiagnostic:
      channels: [audio, metronome]
      test: >
        Enregistrer 4 mesures, réécouter au ralenti. Sans matériel : compter
        « un-deux-trois-quatre » à voix haute sur chaque note.
      positiveSign: >
        Impossible de caler la voix sur les notes ; regroupement audible par trois.
    verification:
      status: sourced
      sourceIds: [tennant-pumping-nylon]

stages:
  - index: 2
    label: Égalité en doubles-croches
    objective: Le vrai trémolo, lent
    exerciseIds: [ex-a-bis]
    tempoStart:  { value: 40, unit: bpm, subdivision: '16' }
    tempoTarget: { value: 60, unit: bpm, subdivision: '16' }
    passCriterion: >
      Test du décalage : métronome placé sur la 2ᵉ note du cycle (a) au lieu
      de la 1re (p). Tenir 8 mesures.
    selfVerifiable: true
    note: Le test le plus important de la fiche. Impossible à tricher.

exercises:
  - id: ex-a-bis
    label: Cycle p-a-m-i, doubles-croches
    origin: original
    description: >
      La mineur. p sur corde 5 à vide, a/m/i répètent la corde 1 à vide.
    tuning: E4 B3 G3 D3 A2 E2
    alphaTex: |
      \tempo 40
      \ts 4 4
      :16 0.5{rf 1 lr} 0.1{rf 4} 0.1{rf 3} 0.1{rf 2} ...
    player:
      tempoStart: { value: 40, unit: bpm, subdivision: '16' }
      metronomeOffset: note-2-du-cycle
      isolatableVoices: [basse, tremolo]
    audioFaithful: false
    verification:
      status: to-verify
      reason: >
        Le mapping rf 1-5 (1 = pouce ?) n'est pas confirmé dans la doc alphaTex.
      blocking: true

sessionProtocol:
  slot: [milieu]
  durationMinutes: { min: 8, max: 10 }
  frequency: quotidien, court
  stopSignals:
    - Réapparition du galop (alarme précoce)
    - Tension dans le dos de la main
  riskLevel: modere
  verification:
    status: derived
    rationale: >
      Aucune source ne chiffre une durée pour le trémolo. Valeur prudentielle
      déduite du caractère très répétitif du geste.

overallVerification:
  status: sourced
  sourceIds: [tennant-pumping-nylon, giuliani-op1, carlevaro-cuaderno-2]

openQuestions:
  - Mapping rf 1-5 en alphaTex — bloquant, à tester dans le playground
  - Formule du trémolo flamenco p-i-a-m-i non confirmée
  - Tárrega Sueño contient-il vraiment du trémolo ?

lastReviewed: '2026-08-07'
version: 1
---
```

---

## Décisions ouvertes

Cinq points que je n'ai pas tranchés, parce qu'ils dépendent de choix d'implémentation que tu n'as pas encore faits.

| # | Question | Options | Mon avis |
|---|---|---|---|
| 1 | **alphaTex inline dans le frontmatter, ou fichiers `.atex` séparés ?** | (a) Inline en YAML block scalar · (b) `exerciseFile: './ex-a.atex'` | **(b)**, dès que les exercices dépassent 4 mesures. Le YAML multiligne est fragile (indentation, échappement des `\`) et on perd la coloration syntaxique. Garde (a) pour les tout petits exemples. |
| 2 | **Sources locales ou catalogue global ?** | (a) Répétées dans chaque fiche · (b) `sourceIds` pointant vers un `sources.yaml` unique | **(b)**. *Pumping Nylon* apparaît dans 15 fiches ; le dupliquer garantit des divergences. Le champ `relevance` reste local à la fiche, lui. |
| 3 | **Latéralité** | (a) Champ `hand: 'pince' \| 'frette'` + réécriture à l'affichage · (b) Tout écrire en « droite/gauche » | **(a)**, c'est ce que propose le schéma. Coût quasi nul maintenant, impossible à rattraper plus tard. |
| 4 | **Progression utilisateur** | (a) localStorage · (b) fichier JSON versionné dans le repo · (c) backend | **(b)** pour un utilisateur unique : c'est sauvegardé, diffable, et ça survit à un changement de navigateur. (a) en complément pour le confort. |
| 5 | **Validation du schéma** | (a) Types TS seuls · (b) Zod / Valibot au build | **(b)**. Les types TypeScript ne valident rien à l'exécution, et le frontmatter YAML est du contenu, pas du code. Les invariants 1 à 12 ci-dessus ne sont vérifiables qu'à l'exécution. |

---

## `[À VÉRIFIER]` de ce document

| Point | Raison |
|---|---|
| Format de `tuning` dans `Exercise` | Je suppose l'ordre **corde 1 → corde 6** (aigu → grave), d'après l'exemple `\tuning (E4 B3 G3 D3 A2 D2) { label "Dropped D Tuning" }` de la doc alphaTab. **Mais un autre exemple de la même doc, `\tuning (A1 D2 A2 D3 G3 B3 E4)`, semble aller dans l'ordre inverse.** Contradiction non résolue — à tester. |
| Faisabilité de `metronomeOffset` et `isolatableVoices` avec alphaTab | Le schéma les prévoit ; **rien ne garantit que l'API alphaTab les permette**. À valider avant de s'engager. Voir `04-benchmark.md`, parti pris n°5. |
| Invariant 3 (difficulté monotone) | Règle plausible mais je ne l'ai pas testée contre les 33 techniques de la taxonomie. Il y a peut-être des contre-exemples légitimes. |
| Champ `layer` du graphe | Suppose un layout en couches. Si tu pars sur un rendu Mermaid pur, Mermaid gère lui-même le placement et le champ est inutile. |
