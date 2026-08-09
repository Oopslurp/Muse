/**
 * Dérivation des noms de notes — CLAUDE.md, décision 2.
 *
 * Aucun nom de note n'est écrit en dur dans le contenu. Ils se calculent
 * tous ici, à partir de `(accordage, corde, case)`.
 *
 * Deux erreurs ont été introduites pendant la phase de recherche par la voie
 * inverse : une tablature mécaniquement juste, accompagnée d'un commentaire
 * qui nommait la mauvaise note. Le numéro de case est vérifiable d'un coup
 * d'œil ; le nom recopié à la main est une faute en attente.
 *
 * Convention de numérotation
 * --------------------------
 * On suit alphaTex : **corde 1 = la plus aiguë**, `\tuning` s'écrit de l'aiguë
 * vers la grave. Vérifié par la sonde, voir docs/research/08-alphatab-verifie.md
 * (R2, R3).
 *
 * ⚠️ Le modèle interne d'alphaTab, lui, inverse la numérotation : la note
 * écrite `0.1` y porte `note.string === 6`. Pour lire une hauteur depuis un
 * document alphaTab parsé, utiliser `note.realValue` — surtout pas
 * `(string, fret)`. Voir R4.
 */

/** Noms internationaux, index = classe de hauteur (0 = do). */
const NOMS_INTERNATIONAUX = [
  'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B',
] as const;

/** Noms latins, usage francophone. */
const NOMS_LATINS = [
  'do', 'do♯', 'ré', 'mi♭', 'mi', 'fa', 'fa♯', 'sol', 'la♭', 'la', 'si♭', 'si',
] as const;

export type Notation = 'latine' | 'internationale';

export interface Note {
  /** Numéro MIDI. 69 = la du diapason. */
  midi: number;
  /** Classe de hauteur, 0 = do. */
  classe: number;
  /** Octave en notation scientifique : le la du diapason est en octave 4. */
  octave: number;
  /** Fréquence en hertz, tempérament égal. */
  hz: number;
}

/**
 * Accordage : suite de numéros MIDI, **corde 1 (aiguë) en premier**.
 * Les valeurs sont calculées à partir des noms, jamais recopiées — un nombre
 * saisi à la main est une coquille en attente.
 */
export type Accordage = readonly number[];

/** Nom scientifique (`E4`, `A2`, `F♯3`) → MIDI. Sert à définir les accordages. */
export function midiDepuisNom(nom: string): number {
  const m = /^([A-Ga-g])([#♯b♭]?)(-?\d+)$/.exec(nom.trim());
  if (!m) throw new Error(`Nom de note invalide : « ${nom} »`);
  const [, lettre, alteration, octave] = m as unknown as [string, string, string, string];
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const semi = base[lettre.toUpperCase()];
  if (semi === undefined) throw new Error(`Lettre inconnue : « ${lettre} »`);
  const delta = alteration === '#' || alteration === '♯' ? 1 : alteration ? -1 : 0;
  return (Number(octave) + 1) * 12 + semi + delta;
}

/** Construit un accordage depuis des noms scientifiques, aigu → grave. */
export const accordage = (...noms: string[]): Accordage => noms.map(midiDepuisNom);

/** Accordages de référence. L'accordeur (tranche 4) réutilisera cette table. */
export const ACCORDAGES = {
  standard: accordage('E4', 'B3', 'G3', 'D3', 'A2', 'E2'),
  'drop-d': accordage('E4', 'B3', 'G3', 'D3', 'A2', 'D2'),
  dadgad: accordage('D4', 'A3', 'G3', 'D3', 'A2', 'D2'),
  'open-g': accordage('D4', 'B3', 'G3', 'D3', 'G2', 'D2'),
  'open-d': accordage('D4', 'A3', 'F#3', 'D3', 'A2', 'D2'),
  'open-c': accordage('E4', 'C4', 'G3', 'C3', 'G2', 'C2'),
  cgdgad: accordage('D4', 'A3', 'G3', 'D3', 'G2', 'C2'),
  'demi-ton-bas': accordage('E4', 'B3', 'G3', 'D3', 'A2', 'E2').map((m) => m - 1),
} as const satisfies Record<string, Accordage>;

export type AccordageId = keyof typeof ACCORDAGES;

/** Étiquettes lisibles. Le contenu stocke l'identifiant, pas le libellé. */
export const ACCORDAGE_LABELS: Record<AccordageId, string> = {
  standard: 'Standard',
  'drop-d': 'Drop D',
  dadgad: 'DADGAD',
  'open-g': 'Open G',
  'open-d': 'Open D',
  'open-c': 'Open C',
  cgdgad: 'CGDGAD',
  'demi-ton-bas': 'Un demi-ton plus bas',
};

/**
 * Note produite par une corde et une case.
 *
 * @param corde 1 = corde la plus aiguë (convention alphaTex).
 * @param frette 0 = corde à vide.
 */
export function noteDe(
  accord: Accordage,
  corde: number,
  frette: number,
  capo = 0
): Note {
  const base = accord[corde - 1];
  if (base === undefined) {
    throw new Error(
      `Corde ${corde} hors de l'accordage (${accord.length} cordes). ` +
        `Rappel : corde 1 = la plus aiguë.`
    );
  }
  if (frette < 0) throw new Error(`Case négative : ${frette}`);
  const midi = base + capo + frette;
  return {
    midi,
    classe: ((midi % 12) + 12) % 12,
    octave: Math.floor(midi / 12) - 1,
    hz: 440 * 2 ** ((midi - 69) / 12),
  };
}

/** Nom de la classe de hauteur, sans octave. */
export function nomDeClasse(classe: number, notation: Notation = 'latine'): string {
  const table = notation === 'latine' ? NOMS_LATINS : NOMS_INTERNATIONAUX;
  return table[((classe % 12) + 12) % 12]!;
}

/** Nom complet avec octave : `la2`, `A2`. */
export function nomAvecOctave(note: Note, notation: Notation = 'latine'): string {
  return `${nomDeClasse(note.classe, notation)}${note.octave}`;
}

/** Raccourci le plus courant : corde + case → nom lisible. */
export function nomDeFrette(
  accord: Accordage,
  corde: number,
  frette: number,
  notation: Notation = 'latine'
): string {
  return nomDeClasse(noteDe(accord, corde, frette).classe, notation);
}

/**
 * Écart en cents entre une fréquence mesurée et la note tempérée la plus
 * proche. Utilisé par l'accordeur en tranche 4 ; posé ici pour que la théorie
 * des hauteurs vive à un seul endroit.
 */
export function centsDepuisHz(hz: number, diapason = 440): { midi: number; cents: number } {
  const exact = 69 + 12 * Math.log2(hz / diapason);
  const midi = Math.round(exact);
  return { midi, cents: (exact - midi) * 100 };
}
