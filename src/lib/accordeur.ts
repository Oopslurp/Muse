/**
 * Accordeur — analyse.
 *
 * Tout ce qui décide vit ici : gates, plausibilité, lissage, conversion en
 * cents. Aucune API navigateur, aucun React. La plomberie Web Audio est dans
 * [micro.ts](./micro.ts), l'affichage dans le composant.
 *
 * Ce découpage n'est pas cosmétique : c'est le seul moyen de **tester** un
 * accordeur sans micro. `npm run test:accordeur` fabrique des sinusoïdes et
 * vérifie que la chaîne complète, détection comprise, retombe sur la bonne
 * note. Un accordeur qu'on ne peut vérifier qu'à la guitare est un accordeur
 * qu'on ne vérifie jamais.
 *
 * Spécification : docs/research/06-accordeur.md.
 */

import { PitchDetector } from 'pitchy';
// Extension explicite : ce module tourne aussi sous Node, sans bundler, pour
// `npm run test:accordeur`. `allowImportingTsExtensions` le permet côté types.
import { centsDepuisHz } from './notes.ts';

/**
 * Détection de hauteur, réduite à **une seule fonction**.
 *
 * CLAUDE.md, décision 5 : l'algorithme reste interchangeable. `pitchy` met en
 * œuvre la McLeod Pitch Method — pas YIN, contrairement à la prémisse initiale
 * du brief (06-accordeur.md §Correction préalable). Si MPM déçoit sur les
 * cordes graves, `pitchfinder` se glisse derrière cette signature sans que rien
 * d'autre ne bouge.
 */
export interface Detecteur {
  (echantillons: Float32Array, frequenceEchantillonnage: number): {
    hz: number;
    clarte: number;
  };
}

/** Détecteur MPM, dimensionné une fois pour éviter de réallouer à chaque image. */
export function detecteurMpm(taille: number): Detecteur {
  const moteur = PitchDetector.forFloat32Array(taille);
  return (echantillons, frequenceEchantillonnage) => {
    const [hz, clarte] = moteur.findPitch(echantillons, frequenceEchantillonnage);
    return { hz, clarte };
  };
}

export const REGLAGES = {
  /**
   * Fenêtre d'analyse. Une autocorrélation veut trois à quatre périodes ;
   * 4096 échantillons font 85 ms à 48 kHz, soit 5,2 périodes du si1 de
   * l'accordage BADGAD (61,74 Hz), la note la plus grave à gérer.
   * 8192 donnerait une aiguille molle, 2048 lâcherait dès le drop C.
   */
  fenetre: 4096,

  /** Coupures des filtres, en hertz. Le passe-bas force MPM sur le fondamental. */
  passeHaut: 60,
  passeBas: { accordage: 1000, chromatique: 2500 },

  /**
   * Plages de plausibilité.
   *
   * ⚠️ 06-accordeur.md se contredit : §2 restreint le mode accordage à
   * 60–350 Hz, §4 et §8 à 55–400 Hz. On retient 55–400. À 60 Hz de plancher,
   * un si1 détendu de 50 cents (59,99 Hz) serait rejeté — or c'est
   * précisément la note qui dimensionne tout le reste du document.
   */
  plage: { accordage: [55, 400], chromatique: [55, 1320] },

  /** Seuil de niveau par défaut, avant calibrage sur le bruit de la pièce. */
  seuilRmsDefaut: 0.01,
  /** Le calibrage place le seuil à ce multiple du bruit ambiant mesuré. */
  margeCalibrage: 3.5,
  /** Un seuil calibré ne descend pas plus bas : le silence numérique n'existe pas. */
  seuilRmsPlancher: 0.004,

  /** En deçà, on rejette. Au-delà de `clarteSure`, la mesure est fiable. */
  clarteMin: 0.8,
  clarteSure: 0.93,

  tailleMediane: 5,
  alphaEma: 0.25,
  imagesHysteresis: 3,

  /** ±3 cents = juste. En dessous on mesure le bruit, pas l'instrument. */
  toleranceCents: 3,
  /** Corde ciblée : au-delà, c'est une autre corde, pas un désaccord. */
  ecartCibleMaxCents: 350,
  /** Amplitude de l'aiguille. */
  aiguilleCents: 50,
} as const;

export type Mode = 'accordage' | 'chromatique';

export interface OptionsAnalyse {
  /** Hauteur du la de référence. 415 pour le baroque, 432 pour qui y tient. */
  diapason: number;
  seuilRms: number;
  /**
   * Notes de référence candidates, en MIDI.
   *
   * · une seule → corde verrouillée, la fenêtre de plausibilité se referme ;
   * · les six de l'accordage → la plus proche l'emporte ;
   * · `null` → chromatique libre, référence = demi-ton le plus proche.
   *
   * Pourquoi pas simplement le demi-ton le plus proche en mode accordage : un
   * mi2 détendu de 70 cents s'afficherait « ré♯2, +30 », ce qui est exact et
   * inutilisable. On veut lire « mi2, −70 » et savoir qu'il faut tendre.
   */
  cibles: readonly number[] | null;
  plage: readonly [number, number];
}

export interface EtatAnalyse {
  /** Cinq dernières hauteurs retenues — étage médian. */
  historique: number[];
  centsLisses: number | null;
  midiAffiche: number | null;
  imagesNoteCandidate: number;
  gateOuvert: boolean;
}

export const etatNeuf = (): EtatAnalyse => ({
  historique: [],
  centsLisses: null,
  midiAffiche: null,
  imagesNoteCandidate: 0,
  gateOuvert: false,
});

export type RaisonRejet = 'clarte' | 'plage' | 'cible';

export type Resultat =
  | { type: 'veille'; rms: number }
  | { type: 'rejet'; raison: RaisonRejet; rms: number; clarte: number }
  | {
      type: 'mesure';
      /** Note de référence : la corde visée, ou le demi-ton le plus proche. */
      midi: number;
      /** Écart à cette référence. Peut dépasser ±50 en mode corde ciblée. */
      cents: number;
      hz: number;
      clarte: number;
      /** `clarte` au-dessus du seuil de confiance. */
      sure: boolean;
      juste: boolean;
    };

/** Niveau efficace de la fenêtre. Première barrière, avant toute détection. */
export function rms(echantillons: Float32Array): number {
  let somme = 0;
  for (let i = 0; i < echantillons.length; i++) {
    const v = echantillons[i]!;
    somme += v * v;
  }
  return Math.sqrt(somme / echantillons.length);
}

/**
 * Médiane — **pas** moyenne.
 *
 * C'est l'étage de lissage le plus important. Une erreur d'octave isolée, le
 * défaut classique sur une corde grave d'acoustique où le fondamental est plus
 * faible que son deuxième harmonique, est purement et simplement écartée par
 * une médiane, là qu'une moyenne la dilue dans le résultat.
 */
export function mediane(valeurs: readonly number[]): number {
  const trie = [...valeurs].sort((a, b) => a - b);
  const milieu = trie.length >> 1;
  if (trie.length === 0) return Number.NaN;
  return trie.length % 2 ? trie[milieu]! : (trie[milieu - 1]! + trie[milieu]!) / 2;
}

/** Fréquence tempérée d'un numéro MIDI. */
export const hzDeMidi = (midi: number, diapason = 440): number =>
  diapason * 2 ** ((midi - 69) / 12);

/** Écart en cents entre une fréquence et une note de référence. */
export const centsEntre = (hz: number, hzReference: number): number =>
  1200 * Math.log2(hz / hzReference);

/** Celle des candidates dont on est le plus près, en cents. */
export function cibleLaPlusProche(
  cibles: readonly number[],
  hz: number,
  diapason: number
): { midi: number; cents: number } {
  let meilleure = cibles[0]!;
  let meilleurEcart = Number.POSITIVE_INFINITY;
  for (const midi of cibles) {
    const ecart = centsEntre(hz, hzDeMidi(midi, diapason));
    if (Math.abs(ecart) < Math.abs(meilleurEcart)) {
      meilleure = midi;
      meilleurEcart = ecart;
    }
  }
  return { midi: meilleure, cents: meilleurEcart };
}

/**
 * Sens de la correction, en toutes lettres.
 *
 * « À gauche » ne veut rien dire quand on a la tête dans les mécaniques. Un
 * écart positif signifie que la corde sonne trop haut : il faut la détendre.
 */
export function sensCorrection(cents: number): 'tends' | 'détends' | 'juste' {
  if (Math.abs(cents) <= REGLAGES.toleranceCents) return 'juste';
  return cents < 0 ? 'tends' : 'détends';
}

/**
 * Une image d'analyse.
 *
 * Mute `etat` — c'est une machine à états qui tourne soixante fois par seconde,
 * la recréer à chaque image ne rendrait rien plus clair.
 */
export function analyser(
  etat: EtatAnalyse,
  echantillons: Float32Array,
  frequenceEchantillonnage: number,
  detecteur: Detecteur,
  options: OptionsAnalyse
): Resultat {
  const niveau = rms(echantillons);

  // Barrière 1 — niveau. Afficher une hauteur détectée dans le silence est ce
  // qui rend les accordeurs web insupportables.
  if (niveau < options.seuilRms) {
    etat.gateOuvert = false;
    return { type: 'veille', rms: niveau };
  }

  // Nouvelle attaque : on repart propre, sinon la première mesure d'une corde
  // traîne encore l'historique de la précédente.
  //
  // `midiAffiche` en fait partie, et ce n'est pas un détail : le garder ferait
  // afficher la corde d'avant pendant les trois images que met l'hystérésis à
  // céder. Après un silence il n'y a rien à stabiliser — la note qu'on vient
  // de pincer est la bonne dès la première mesure.
  if (!etat.gateOuvert) {
    etat.gateOuvert = true;
    etat.historique = [];
    etat.centsLisses = null;
    etat.midiAffiche = null;
    etat.imagesNoteCandidate = 0;
  }

  const { hz, clarte } = detecteur(echantillons, frequenceEchantillonnage);

  // Barrière 2 — clarté.
  if (hz <= 0 || clarte < REGLAGES.clarteMin) {
    return { type: 'rejet', raison: 'clarte', rms: niveau, clarte };
  }

  // Barrière 3 — plausibilité.
  const [bas, haut] = options.plage;
  if (hz < bas || hz > haut) {
    return { type: 'rejet', raison: 'plage', rms: niveau, clarte };
  }
  if (options.cibles) {
    const { cents } = cibleLaPlusProche(options.cibles, hz, options.diapason);
    if (Math.abs(cents) > REGLAGES.ecartCibleMaxCents) {
      return { type: 'rejet', raison: 'cible', rms: niveau, clarte };
    }
  }

  // Étage 1 — médiane.
  etat.historique.push(hz);
  if (etat.historique.length > REGLAGES.tailleMediane) etat.historique.shift();
  const hzRobuste = mediane(etat.historique);

  // Référence : la corde la plus proche parmi les candidates, ou à défaut le
  // demi-ton le plus proche.
  const candidat = options.cibles
    ? cibleLaPlusProche(options.cibles, hzRobuste, options.diapason).midi
    : centsDepuisHz(hzRobuste, options.diapason).midi;

  // Étage 3 — hystérésis sur le nom de note. Sans elle, l'affichage clignote
  // entre deux demi-tons — ou entre deux cordes — quand on est pile entre les
  // deux : le moment où on a le plus besoin de stabilité.
  if (etat.midiAffiche === null) {
    etat.midiAffiche = candidat;
    etat.imagesNoteCandidate = 0;
  } else if (candidat !== etat.midiAffiche) {
    etat.imagesNoteCandidate += 1;
    if (etat.imagesNoteCandidate >= REGLAGES.imagesHysteresis) {
      etat.midiAffiche = candidat;
      etat.imagesNoteCandidate = 0;
      etat.centsLisses = null; // pas de traînée d'une note à l'autre
    }
  } else {
    etat.imagesNoteCandidate = 0;
  }

  const midi = etat.midiAffiche;
  const cents = centsEntre(hzRobuste, hzDeMidi(midi, options.diapason));

  // Étage 2 — moyenne exponentielle, **sur les cents**. Un écart d'un hertz ne
  // vaut pas la même chose à 82 Hz et à 330 Hz ; un écart en cents, si.
  etat.centsLisses =
    etat.centsLisses === null
      ? cents
      : REGLAGES.alphaEma * cents + (1 - REGLAGES.alphaEma) * etat.centsLisses;

  return {
    type: 'mesure',
    midi,
    cents: etat.centsLisses,
    hz: hzRobuste,
    clarte,
    sure: clarte >= REGLAGES.clarteSure,
    juste: Math.abs(etat.centsLisses) <= REGLAGES.toleranceCents,
  };
}
