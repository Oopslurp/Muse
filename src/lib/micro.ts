/**
 * Accordeur — capture micro et chaîne Web Audio.
 *
 * Séparé de [accordeur.ts](./accordeur.ts), qui ne connaît ni le navigateur ni
 * React : ici les API, là les décisions.
 *
 * Chaîne : getUserMedia → source → passe-haut 60 Hz → passe-bas → analyseur.
 * **Aucune connexion vers `destination`** — un accordeur qui se réécoute
 * lui-même dans les enceintes crée une boucle.
 */

import {
  REGLAGES,
  analyser,
  detecteurMpm,
  etatNeuf,
  rms,
  type Detecteur,
  type Mode,
  type OptionsAnalyse,
  type Resultat,
} from './accordeur';

export type CodePanne = 'indisponible' | 'refus' | 'absent' | 'occupe' | 'inconnu';

export interface PanneMicro {
  code: CodePanne;
  /** Ce qui s'est passé, en une phrase. */
  message: string;
  /** Ce que l'utilisateur peut faire. Un échec sans marche à suivre n'aide personne. */
  remede: string;
}

/**
 * Ce que le navigateur a **réellement** appliqué.
 *
 * Le risque n°1 du document de recherche : les navigateurs ne respectent pas
 * tous les contraintes de la même façon et certains les réappliquent
 * partiellement. On lit donc `track.getSettings()` après coup au lieu de
 * supposer, et l'écran le dit si l'un des trois traitements est resté actif.
 */
export interface ReglagesPiste {
  /** `undefined` = le navigateur ne dit rien, ce qui n'est pas la même chose que « désactivé ». */
  echoCancellation?: boolean | undefined;
  noiseSuppression?: boolean | undefined;
  autoGainControl?: boolean | undefined;
  frequenceEchantillonnage: number;
  peripherique: string;
}

/**
 * Un traitement est-il resté actif ?
 *
 * `getSettings()` renvoie parfois une chaîne plutôt qu'un booléen — Chrome
 * expose des modes d'annulation d'écho (`all`, `remote-only`, `none`). On
 * traite tout ce qui n'est ni faux ni « none » comme actif.
 */
function actif(valeur: boolean | string | undefined): boolean | undefined {
  if (valeur === undefined) return undefined;
  if (typeof valeur === 'boolean') return valeur;
  return valeur !== 'none' && valeur !== 'false';
}

export interface Ecoute {
  arreter(): void;
  /** Change la coupure du passe-bas sans reconstruire la chaîne. */
  changerMode(mode: Mode): void;
  reglagesPiste: ReglagesPiste;
}

export interface DemandeEcoute {
  mode: Mode;
  /**
   * Relu à chaque image : le choix de corde change sans couper le micro.
   * Le seuil de niveau n'en fait pas partie — il vient du calibrage.
   */
  options: () => Omit<OptionsAnalyse, 'seuilRms'>;
  surMesure: (r: Resultat) => void;
  /** Seuil retenu à l'issue du calibrage sur le bruit de la pièce. */
  surCalibrage: (seuilRms: number) => void;
  detecteur?: Detecteur;
}

function classer(e: unknown): PanneMicro {
  const nom = e instanceof Error ? e.name : '';
  switch (nom) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        code: 'refus',
        message: 'Le navigateur a refusé l’accès au microphone.',
        remede:
          'Autoriser le micro pour ce site — l’icône de caméra barrée dans la barre ' +
          'd’adresse, ou Réglages du site → Microphone — puis réessayer.',
      };
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return {
        code: 'absent',
        message: 'Aucun microphone détecté.',
        remede: 'Brancher un micro ou une interface audio, puis réessayer.',
      };
    case 'NotReadableError':
    case 'TrackStartError':
      return {
        code: 'occupe',
        message: 'Le microphone est déjà utilisé par une autre application.',
        remede: 'Fermer l’application qui l’occupe — visioconférence, enregistreur — puis réessayer.',
      };
    default:
      return {
        code: 'inconnu',
        message: e instanceof Error ? e.message : String(e),
        remede: 'Réessayer. Si le problème persiste, recharger la page.',
      };
  }
}

export async function ecouterMicro(demande: DemandeEcoute): Promise<Ecoute> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw {
      code: 'indisponible',
      message: 'Ce navigateur n’expose pas le microphone à la page.',
      // getUserMedia n'existe qu'en contexte sécurisé. En développement,
      // localhost compte comme tel ; une IP de réseau local, non.
      remede: window.isSecureContext
        ? 'Essayer un navigateur récent (Chrome, Firefox, Safari).'
        : 'Ouvrir le site en HTTPS, ou depuis localhost.',
    } satisfies PanneMicro;
  }

  let flux: MediaStream;
  try {
    flux = await navigator.mediaDevices.getUserMedia({
      audio: {
        // Les trois traitements par défaut du navigateur sont conçus pour la
        // voix en visioconférence et détruisent la détection de hauteur :
        //  - noiseSuppression identifie une note tenue comme du bruit stationnaire
        //    et l'atténue : la note « disparaît » au bout d'une seconde ;
        //  - autoGainControl modifie l'amplitude en continu, ce qui ruine le gate
        //    RMS et fait remonter le bruit de fond entre les notes ;
        //  - echoCancellation applique des traitements non linéaires qui déforment
        //    la forme d'onde.
        // C'est la cause n°1 des accordeurs web qui « marchent mal sans raison ».
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });
  } catch (e) {
    throw classer(e);
  }

  const piste = flux.getAudioTracks()[0];
  const appliques = piste?.getSettings() ?? {};

  const ctx = new AudioContext();
  // Un contexte créé hors geste utilisateur naît suspendu. L'appel vient d'un
  // clic, mais Safari veut parfois qu'on le réveille explicitement.
  if (ctx.state === 'suspended') await ctx.resume();

  const source = ctx.createMediaStreamSource(flux);

  const passeHaut = ctx.createBiquadFilter();
  passeHaut.type = 'highpass';
  passeHaut.frequency.value = REGLAGES.passeHaut; // ronflette, clim, pas dans la pièce
  passeHaut.Q.value = 0.7;

  const passeBas = ctx.createBiquadFilter();
  passeBas.type = 'lowpass';
  passeBas.frequency.value = REGLAGES.passeBas[demande.mode];

  const analyseur = ctx.createAnalyser();
  analyseur.fftSize = REGLAGES.fenetre;
  // `smoothingTimeConstant` ne concerne QUE les données fréquentielles. Il n'a
  // aucun effet sur `getFloatTimeDomainData`, seul utilisé ici — la référence
  // @chordbook/tuner le règle à 0,8 sans que cela change quoi que ce soit.

  source.connect(passeHaut);
  passeHaut.connect(passeBas);
  passeBas.connect(analyseur);

  const detecteur = demande.detecteur ?? detecteurMpm(REGLAGES.fenetre);
  const tampon = new Float32Array(REGLAGES.fenetre);
  const etat = etatNeuf();

  let seuilRms: number = REGLAGES.seuilRmsDefaut;
  let vivant = true;
  let image = 0;

  /**
   * Calibrage : deux secondes de pièce vide, puis seuil placé au-dessus.
   *
   * Un seuil fixe suppose un micro et une pièce ; celui d'un portable dans un
   * salon n'a rien à voir avec un statique dans une chambre traitée.
   */
  const finCalibrage = performance.now() + 2000;
  let ambiantMax = 0;

  const boucle = () => {
    if (!vivant) return;
    requestAnimationFrame(boucle);
    analyseur.getFloatTimeDomainData(tampon);

    if (performance.now() < finCalibrage) {
      ambiantMax = Math.max(ambiantMax, rms(tampon));
      return;
    }
    if (image === 0) {
      seuilRms = Math.max(ambiantMax * REGLAGES.margeCalibrage, REGLAGES.seuilRmsPlancher);
      demande.surCalibrage(seuilRms);
    }
    image++;

    demande.surMesure(
      analyser(etat, tampon, ctx.sampleRate, detecteur, {
        ...demande.options(),
        seuilRms,
      })
    );
  };
  requestAnimationFrame(boucle);

  return {
    arreter() {
      vivant = false;
      for (const p of flux.getTracks()) p.stop();
      void ctx.close();
    },
    changerMode(mode) {
      passeBas.frequency.value = REGLAGES.passeBas[mode];
    },
    reglagesPiste: {
      echoCancellation: actif(appliques.echoCancellation),
      noiseSuppression: actif(appliques.noiseSuppression),
      autoGainControl: actif(appliques.autoGainControl),
      frequenceEchantillonnage: ctx.sampleRate,
      peripherique: piste?.label ?? 'micro',
    },
  };
}
