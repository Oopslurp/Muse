/**
 * Métronome — Web Audio.
 *
 * Pourquoi un métronome de plus, alors qu'alphaTab en a un
 * -------------------------------------------------------
 * Celui d'alphaTab ne clique que sur les temps. Or plusieurs autodiagnostics
 * du corpus reposent sur un **clic déplacé** : « place le clic sur la 2ᵉ note
 * du cycle » pour le trémolo, « sur les temps 2 et 4 » pour le placement
 * rythmique. Un clic sur le temps rend ces tests impossibles — on s'appuie
 * dessus au lieu de tenir la pulsation soi-même, ce qu'ils cherchent
 * précisément à mesurer.
 *
 * D'où le motif : chaque position du cycle est **forte**, **faible** ou
 * **muette**. Le déplacement se fait en taisant des positions, pas en
 * décalant une horloge.
 *
 * Ordonnancement
 * --------------
 * ⚠️ Un `setInterval` qui joue un son à chaque tour dérive de plusieurs
 * dizaines de millisecondes : les minuteurs JavaScript ne sont pas
 * ordonnancés à l'échantillon près. On programme donc les clics **à l'avance**
 * sur l'horloge audio (`ctx.currentTime`), qui elle est exacte, et le minuteur
 * ne sert qu'à réveiller le programmateur.
 *
 * L'horizon s'élargit quand l'onglet passe en arrière-plan : les navigateurs
 * y bornent `setTimeout` à une seconde, et un horizon de 150 ms produirait des
 * trous. Deux secondes d'avance couvrent largement ce bornage, au prix d'une
 * latence de réglage qu'on ne perçoit pas puisqu'on ne regarde pas l'écran.
 */

export type Accent = 'fort' | 'faible' | 'muet';

export interface ReglagesMetronome {
  bpm: number;
  /** Positions par pulsation : 1 = noires, 2 = croches, 3 = triolets, 4 = doubles. */
  parPulsation: number;
  /** Un accent par position du cycle. Sa longueur définit le cycle. */
  motif: Accent[];
  /** 0 à 1. */
  volume: number;
}

export const BORNES_BPM = { min: 30, max: 240 } as const;

/** Motif par défaut pour un cycle de `n` positions : appui sur la première. */
export const motifSimple = (n: number): Accent[] =>
  Array.from({ length: n }, (_, i) => (i === 0 ? 'fort' : 'faible'));

/**
 * Motifs prêts à l'emploi, ceux que le corpus demande nommément.
 * Le libellé est produit ici ; le contenu ne stocke que la structure.
 */
export const MOTIFS: ReadonlyArray<{
  id: string;
  label: string;
  pourquoi: string;
  parPulsation: number;
  motif: Accent[];
}> = [
  {
    id: 'temps',
    label: 'Sur les temps',
    pourquoi: 'Le réglage ordinaire, quatre noires.',
    parPulsation: 1,
    motif: ['fort', 'faible', 'faible', 'faible'],
  },
  {
    id: 'contretemps',
    label: 'Temps 2 et 4',
    pourquoi:
      'Le clic ne tombe plus sur l’appui : c’est vous qui tenez le 1. Test de placement rythmique.',
    parPulsation: 1,
    motif: ['muet', 'fort', 'muet', 'fort'],
  },
  {
    id: 'deuxieme-double',
    label: '2ᵉ note du cycle de doubles',
    pourquoi:
      'Le clic tombe entre deux appuis. Autodiagnostic du trémolo : si le cycle n’est pas régulier, le clic se déplace à l’oreille.',
    parPulsation: 4,
    motif: ['muet', 'fort', 'muet', 'muet'],
  },
  {
    id: 'croches',
    label: 'Croches',
    pourquoi: 'Subdivision entendue, appui sur le temps.',
    parPulsation: 2,
    motif: ['fort', 'faible', 'faible', 'faible', 'faible', 'faible', 'faible', 'faible'],
  },
  {
    id: 'premiere-seulement',
    label: 'Une fois par mesure',
    pourquoi:
      'Un seul repère toutes les quatre pulsations. L’étape d’après : on tient la mesure entière.',
    parPulsation: 1,
    motif: ['fort', 'muet', 'muet', 'muet'],
  },
];

export interface Metronome {
  demarrer: () => Promise<void>;
  arreter: () => void;
  regler: (r: Partial<ReglagesMetronome>) => void;
  enMarche: () => boolean;
  /** Libère le contexte audio. À appeler quand le composant disparaît. */
  detruire: () => void;
}

export interface OptionsMetronome extends ReglagesMetronome {
  /** Appelé à chaque clic programmé, avec la position dans le cycle. */
  surPosition?: (position: number, accent: Accent) => void;
}

/** Un clic : attaque immédiate, extinction courte. Rien à télécharger. */
function clic(ctx: AudioContext, quand: number, accent: Accent, volume: number): void {
  if (accent === 'muet') return;
  const fort = accent === 'fort';

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(fort ? 1560 : 990, quand);

  const crete = volume * (fort ? 1 : 0.55);
  gain.gain.setValueAtTime(0.0001, quand);
  gain.gain.exponentialRampToValueAtTime(Math.max(crete, 0.0002), quand + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, quand + 0.045);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(quand);
  osc.stop(quand + 0.06);
}

export function creerMetronome(options: OptionsMetronome): Metronome {
  let reglages: ReglagesMetronome = {
    bpm: options.bpm,
    parPulsation: options.parPulsation,
    motif: options.motif,
    volume: options.volume,
  };

  let ctx: AudioContext | null = null;
  let minuteur: ReturnType<typeof setTimeout> | null = null;
  let prochain = 0;
  let position = 0;

  const cache = () => typeof document !== 'undefined' && document.hidden;
  /** Avance de programmation, en secondes. */
  const horizon = () => (cache() ? 2 : 0.15);
  /** Période de réveil du programmateur, en millisecondes. */
  const reveil = () => (cache() ? 400 : 25);

  const intervalle = () => 60 / reglages.bpm / Math.max(1, reglages.parPulsation);

  const programmer = () => {
    if (!ctx) return;
    while (prochain < ctx.currentTime + horizon()) {
      const accent = reglages.motif[position % reglages.motif.length] ?? 'faible';
      clic(ctx, prochain, accent, reglages.volume);
      options.surPosition?.(position % reglages.motif.length, accent);
      prochain += intervalle();
      position = (position + 1) % reglages.motif.length;
    }
    minuteur = setTimeout(programmer, reveil());
  };

  return {
    async demarrer() {
      if (minuteur !== null) return;
      ctx ??= new AudioContext();
      // Un contexte créé hors geste utilisateur naît suspendu.
      if (ctx.state === 'suspended') await ctx.resume();
      position = 0;
      // Une marge : programmer dans le passé immédiat ferait sauter le premier clic.
      prochain = ctx.currentTime + 0.06;
      programmer();
    },

    arreter() {
      if (minuteur !== null) clearTimeout(minuteur);
      minuteur = null;
      position = 0;
    },

    regler(r) {
      reglages = { ...reglages, ...r };
      // Le motif peut raccourcir : sans cette borne, la position sortirait du
      // tableau et le cycle recommencerait au mauvais endroit.
      if (position >= reglages.motif.length) position = 0;
    },

    enMarche: () => minuteur !== null,

    detruire() {
      if (minuteur !== null) clearTimeout(minuteur);
      minuteur = null;
      void ctx?.close();
      ctx = null;
    },
  };
}
