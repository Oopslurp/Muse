/**
 * Lecteur de tablature — îlot React autour d'alphaTab.
 *
 * Ce que ce composant apporte par rapport à un lecteur générique, et qui
 * justifie de l'écrire plutôt que d'intégrer Soundslice :
 *
 *  · le tempo démarre au **tempo de départ du palier**, pas au tempo d'écriture ;
 *  · la boucle s'aimante aux **frontières de mesure** — une boucle qui commence
 *    quarante millisecondes trop tôt est inutilisable, et personne ne la règle
 *    au pixel (emprunt assumé à Soundslice, voir 04-benchmark.md) ;
 *  · quand le rendu MIDI est infidèle, on **lit quand même** et on nomme
 *    précisément ce qui manque (CLAUDE.md, décision 10).
 *
 * Rien de la machinerie audio n'existe avant le premier appui sur « lire » :
 * ni worker de synthèse, ni contexte audio, ni banque de sons. Une fiche
 * compte jusqu'à quatre exercices et le simple défilement les hydrate tous ;
 * les navigateurs plafonnent le nombre de contextes audio par page, et chaque
 * worker analyse un mégaoctet de JavaScript. Voir `reveillerAudio`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as alphaTab from '@coderline/alphatab';
import './LecteurTab.css';
import { chemin } from '~/lib/chemins';

export interface LecteurTabProps {
  /** Source alphaTex de l'exercice. */
  alphaTex: string;
  /** Tempo de départ du palier, en pulsations par minute. */
  tempoDepart?: number | undefined;
  /** Tempo cible du palier, proposé comme raccourci. */
  tempoCible?: number | undefined;
  /** Ce que le rendu MIDI ne restitue pas. Vide si la lecture est fidèle. */
  reservesAudio?: string[];
  /** Rendu plus dense — pour les exercices d'une ou deux mesures. */
  compact?: boolean;
}

const CHEMIN = {
  police: chemin('/alphatab/font/'),
  soundfont: chemin('/alphatab/soundfont/sonivox.sf3'),
};

/** Durée d'une mesure 4/4 en tics alphaTab, repli quand on ne peut pas mieux. */
const TICS_MESURE_4_4 = 3840;
/** Un trente-deuxième de mesure : en deçà, on est encore au départ. */
const TOLERANCE_DEPART = TICS_MESURE_4_4 / 32;

/** Le lecteur est rendu en HTML au build, sous Node : `matchMedia` n'y existe pas. */
const mouvementReduit = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Lit un jeton du design system : alphaTab rend en SVG, il lui faut des couleurs. */
function jeton(nom: string, repli: string): string {
  if (typeof window === 'undefined') return repli;
  return getComputedStyle(document.documentElement).getPropertyValue(nom).trim() || repli;
}

/**
 * Couleurs de la partition, tirées du thème courant.
 *
 * La portée suit le thème plutôt que de rester sur un papier blanc fixe : le
 * site sert surtout le soir, et un rectangle blanc au milieu d'une page sombre
 * est agressif. Les lignes de portée prennent une encre atténuée plutôt qu'un
 * filet, qui serait trop pâle en sombre.
 */
const couleursPartition = () => ({
  staffLineColor: jeton('--c-ink-3', '#7c7062'),
  barSeparatorColor: jeton('--c-ink-3', '#7c7062'),
  barNumberColor: jeton('--c-brass', '#8a6a1b'),
  mainGlyphColor: jeton('--c-ink', '#1c1815'),
  secondaryGlyphColor: jeton('--c-ink-2', '#4e453b'),
  scoreInfoColor: jeton('--c-ink-3', '#7c7062'),
});

type PalettePartition = ReturnType<typeof couleursPartition>;

/**
 * Repeint des ressources déjà vivantes.
 *
 * À la construction, alphaTab accepte les couleurs sous forme de chaînes ; une
 * fois l'objet créé, ce sont des `Color`. On convertit donc, en gardant la
 * teinte précédente si le jeton CSS est illisible — une partition dans la
 * mauvaise couleur reste lisible, une partition transparente non.
 */
function repeindre(res: alphaTab.RenderingResources, palette: PalettePartition): void {
  for (const cle of Object.keys(palette) as (keyof PalettePartition)[]) {
    res[cle] = alphaTab.model.Color.fromJson(palette[cle]) ?? res[cle];
  }
}

/**
 * Éléments d'en-tête à masquer.
 *
 * Titre, sous-titre et nom de piste sont déjà dans la fiche : les réafficher
 * dans la partition double l'information et gonfle la hauteur du bloc pour
 * rien. L'accordage, lui, reste — il change d'un exercice à l'autre et ne se
 * devine pas.
 */
const enTetesMasques = (): Map<alphaTab.NotationElement, boolean> =>
  new Map(
    [
      alphaTab.NotationElement.ScoreTitle,
      alphaTab.NotationElement.ScoreSubTitle,
      alphaTab.NotationElement.ScoreArtist,
      alphaTab.NotationElement.ScoreAlbum,
      alphaTab.NotationElement.ScoreWordsAndMusic,
      alphaTab.NotationElement.ScoreCopyright,
      alphaTab.NotationElement.TrackNames,
    ].map((e) => [e, false])
  );

const borner = (v: number, max: number): number =>
  Number.isFinite(v) ? Math.min(Math.max(1, Math.round(v)), Math.max(1, max)) : 1;

/**
 * Réveille le synthétiseur, jusque-là éteint.
 *
 * alphaTab crée son worker de synthèse **et son contexte audio** dès que le
 * lecteur existe, qu'on joue ou non. On le laisse donc désactivé à
 * l'initialisation et on ne l'allume qu'ici, au premier appui.
 *
 * `updateSettings()` reconstruit le lecteur. alphaTab lui reporte les volumes,
 * la vitesse et le bouclage, qu'il tient en cache — mais **pas** la plage de
 * lecture, seul réglage à rejouer après coup.
 */
function reveillerAudio(api: alphaTab.AlphaTabApi): void {
  if (api.settings.player.playerMode !== alphaTab.PlayerMode.Disabled) return;
  api.settings.player.playerMode = alphaTab.PlayerMode.EnabledAutomatic;
  api.updateSettings();
}

/**
 * Attend que le synthétiseur soit prêt à jouer.
 *
 * Ce délai n'est pas un filet qui laisse passer : c'est un diagnostic. Une
 * version précédente laissait jouer quand même à son expiration. Quand le
 * worker audio ne démarrait pas — ce qui fut le cas pendant toute la tranche 3,
 * faute du plugin Vite d'alphaTab — le bouton tournait dix secondes puis
 * s'arrêtait sans rien dire ni rien jouer. Un échec bruyant vaut mieux.
 */
function attendrePret(api: alphaTab.AlphaTabApi, ms = 20_000): Promise<void> {
  if (api.isReadyForPlayback) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    let clos = false;
    let minuteur: ReturnType<typeof setTimeout>;
    let desabonner: (() => void) | undefined;

    const terminer = (echec?: Error) => {
      if (clos) return;
      clos = true;
      clearTimeout(minuteur);
      desabonner?.();
      if (echec) reject(echec);
      else resolve();
    };

    minuteur = setTimeout(
      () =>
        terminer(
          new Error(
            `le synthétiseur n'a pas répondu en ${Math.round(ms / 1000)} s ` +
              `(son worker audio n'a probablement pas démarré)`
          )
        ),
      ms
    );
    desabonner = api.playerReady.on(() => terminer());
  });
}

export default function LecteurTab({
  alphaTex,
  tempoDepart,
  tempoCible,
  reservesAudio = [],
  compact = false,
}: LecteurTabProps) {
  const hote = useRef<HTMLDivElement>(null);
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null);
  /** Début de chaque mesure, en tics. C'est ce qui rend la boucle aimantée. */
  const bornesRef = useRef<number[]>([]);

  const [pret, setPret] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [joue, setJoue] = useState(false);
  /** Les curseurs restent cachés tant qu'on n'a pas lancé la lecture : au
   *  repos, une barre rouge sur la mesure 1 ressemble à une erreur. */
  const [aDemarre, setADemarre] = useState(false);

  /**
   * Décompte en cours, et numéro du clic entendu.
   *
   * Pendant le décompte, alphaTab n'émet **aucun** `positionChanged` : le
   * curseur ne progresse donc pas au rythme des clics, il glisse une fois vers
   * la note suivante par pure animation, puis s'y fige. On voit alors la barre
   * avancer sans rien entendre — ce qui se lit comme une panne. On masque donc
   * le curseur tant que le décompte tourne, et on montre le compte à la place.
   */
  const [enDecompte, setEnDecompte] = useState(false);
  const [clicDecompte, setClicDecompte] = useState(0);
  const decompteEnCours = useRef(false);

  const [nbMesures, setNbMesures] = useState(0);
  const [pulsationsMesure, setPulsationsMesure] = useState(0);
  const [tempoEcrit, setTempoEcrit] = useState(0);
  const [tempo, setTempo] = useState(tempoDepart ?? 0);

  const [metronome, setMetronome] = useState(false);
  const [decompte, setDecompte] = useState(true);
  const [boucle, setBoucle] = useState(false);
  const [mesureDe, setMesureDe] = useState(1);
  const [mesureA, setMesureA] = useState(1);

  /* ---------------------------------------------------- initialisation */
  useEffect(() => {
    const conteneur = hote.current;
    if (!conteneur) return;

    let vivant = true;
    let instance: alphaTab.AlphaTabApi;

    try {
      instance = new alphaTab.AlphaTabApi(conteneur, {
        core: {
          tex: true,
          fontDirectory: CHEMIN.police,
          logLevel: alphaTab.LogLevel.Error,
          /**
           * Mise en page sur le fil principal.
           *
           * Le plugin `@coderline/alphatab-vite` sait désormais résoudre les
           * workers d'alphaTab (voir astro.config.mjs), donc ce réglage n'est
           * plus un contournement : c'est un choix. Nos partitions font deux à
           * quatre mesures et une fiche en affiche jusqu'à quatre ; les
           * composer ici coûte quelques millisecondes, contre autant de
           * workers à démarrer et un mégaoctet de JavaScript à analyser chacun.
           *
           * Ce réglage ne concerne **que** la mise en page. Le synthétiseur
           * audio exige un worker dans tous les cas, quoi qu'on mette ici.
           */
          useWorkers: false,
        },
        notation: { elements: enTetesMasques() },
        display: {
          scale: compact ? 0.85 : 0.95,
          stretchForce: 0.9,
          layoutMode: alphaTab.LayoutMode.Page,
          resources: couleursPartition(),
        },
        player: {
          // Éteint jusqu'au premier appui sur « lire » — voir `reveillerAudio`.
          playerMode: alphaTab.PlayerMode.Disabled,
          outputMode: alphaTab.PlayerOutputMode.WebAudioAudioWorklets,
          enableCursor: true,
          enableAnimatedBeatCursor: true,
          enableElementHighlighting: true,
          // Deuxième chemin vers la boucle : sélectionner une plage à la souris
          // directement sur la partition.
          enableUserInteraction: true,
          /**
           * La partition suit le curseur — **dans son cadre**, pas en faisant
           * défiler la page.
           *
           * Une fiche compte jusqu'à quatre exercices : sur une fiche longue
           * ouverte en petit, le curseur sortait du champ et on suivait une
           * lecture qu'on ne voyait plus.
           *
           * ⚠️ Faire défiler `html` a été essayé et abandonné. alphaTab amène
           * la mesure courante en haut du conteneur ; la page remontait alors
           * de toute la hauteur du bloc de commandes, qui passait **sous
           * l'en-tête collant** — on ne pouvait plus mettre en pause sans
           * remonter à la main. `scrollOffsetY` ne suffit pas à corriger ça :
           * la hauteur du bloc varie avec la largeur de l'écran. Attrapé par
           * `npm run audit:lecture`, dont le clic aux coordonnées tombait sur
           * l'en-tête au lieu du bouton.
           *
           * Le cadre ne défile que s'il est trop court pour la partition
           * (`max-height` dans la feuille) : un exercice de deux mesures ne
           * bouge pas d'un pixel.
           */
          scrollMode: alphaTab.ScrollMode.Continuous,
          // `hote.current` est posé : l'effet ne s'exécute qu'après le montage,
          // et il retourne plus haut si l'élément manque.
          scrollElement: hote.current ?? undefined,
          // Une portée de marge : voir arriver la mesure suivante vaut mieux
          // que la voir tout juste.
          scrollOffsetY: -40,
          // `prefers-reduced-motion` est non négociable (direction artistique).
          // Le saut reste net, il n'est simplement plus animé.
          nativeBrowserSmoothScroll: !mouvementReduit(),
        },
      });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
      return;
    }

    apiRef.current = instance;

    instance.error.on((e) => {
      if (vivant) setErreur(e instanceof Error ? e.message : String(e));
    });

    instance.scoreLoaded.on((score) => {
      if (!vivant) return;
      bornesRef.current = score.masterBars.map((mb) => mb.start);
      setNbMesures(score.masterBars.length);
      setMesureA(score.masterBars.length);
      // Le décompte d'alphaTab dure une mesure. Aucun exercice du corpus ne
      // change de métrique en route : la première mesure fait donc foi.
      setPulsationsMesure(score.masterBars[0]?.timeSignatureNumerator ?? 0);
      const ecrit = Math.round(score.tempo);
      setTempoEcrit(ecrit);
      setTempo((t) => (t > 0 ? t : ecrit));
      setPret(true);
    });

    const finDecompte = () => {
      decompteEnCours.current = false;
      setEnDecompte(false);
      setClicDecompte(0);
    };

    instance.playerStateChanged.on((e) => {
      if (!vivant) return;
      const enLecture = e.state === alphaTab.synth.PlayerState.Playing;
      setJoue(enLecture);
      // `countInVolume` est fixé juste avant chaque `playPause` par
      // `reglerDecompte` : le lire ici dit exactement si un décompte va sonner
      // pour cet appui-là. Le suivre depuis l'état plutôt que d'attendre un
      // premier clic évite un affichage en retard d'une pulsation.
      if (enLecture && instance.countInVolume > 0) {
        decompteEnCours.current = true;
        setEnDecompte(true);
        setClicDecompte(0);
      } else finDecompte();
    });

    /**
     * Le décompte, tel qu'alphaTab l'entend.
     *
     * Le compteur vient des événements de métronome eux-mêmes plutôt que d'un
     * minuteur de notre côté : recalculer la durée d'un clic à partir du tempo
     * et de la métrique donnerait un affichage qui dérive de ce qu'on entend.
     */
    instance.midiEventsPlayedFilter = [alphaTab.midi.MidiEventType.AlphaTabMetronome];
    instance.midiEventsPlayed.on((e) => {
      if (!vivant || !decompteEnCours.current) return;
      for (const ev of e.events) {
        if (ev instanceof alphaTab.midi.AlphaTabMetronomeEvent && ev.isMetronome) {
          setClicDecompte(ev.metronomeNumerator + 1);
        }
      }
    });

    // `positionChanged` n'est émis que pendant la lecture principale : sa
    // première venue marque exactement la fin du décompte.
    instance.playerPositionChanged.on(() => {
      if (vivant && decompteEnCours.current) finDecompte();
    });

    instance.tex(alphaTex);

    return () => {
      vivant = false;
      apiRef.current = null;
      try {
        instance.destroy();
      } catch {
        /* le composant disparaît de toute façon */
      }
    };
  }, [alphaTex, compact]);

  /**
   * Recolore la partition quand le thème change.
   *
   * alphaTab fige ses couleurs à l'initialisation et rend en SVG : sans ce
   * recalcul, une partition composée en clair reste en encre sombre après
   * bascule en sombre, et devient illisible sur son propre fond.
   */
  useEffect(() => {
    const recolorer = () => {
      const api = apiRef.current;
      if (!api) return;
      repeindre(api.settings.display.resources, couleursPartition());
      api.updateSettings();
      api.render();
    };

    const surHtml = new MutationObserver(recolorer);
    surHtml.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Le thème « système » ne touche pas à l'attribut : il faut aussi écouter
    // la préférence du système elle-même.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', recolorer);

    return () => {
      surHtml.disconnect();
      media.removeEventListener('change', recolorer);
    };
  }, []);

  /* --------------------------------------------------- réglages en direct */
  useEffect(() => {
    const api = apiRef.current;
    // alphaTab n'expose pas un tempo absolu mais un facteur de vitesse.
    if (api && tempoEcrit > 0) api.playbackSpeed = tempo / tempoEcrit;
  }, [tempo, tempoEcrit]);

  useEffect(() => {
    if (apiRef.current) apiRef.current.metronomeVolume = metronome ? 1 : 0;
  }, [metronome]);

  /**
   * Le décompte se joue au départ, pas à la reprise.
   *
   * alphaTab le rejoue à **chaque** `play()` dès que `countInVolume > 0` :
   * reprendre au milieu d'un exercice imposait une mesure de clics avant de
   * réentendre la note où on s'était arrêté. C'est le contraire de ce à quoi
   * sert un décompte — il prépare un départ, il ne ponctue pas une pause.
   *
   * Le réglage est donc décidé **au moment de l'appui**, pas tenu à jour dans
   * un effet : c'est la seule façon d'avoir une source de vérité unique quand
   * la valeur dépend à la fois d'une préférence et de la position courante.
   */
  const reglerDecompte = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const debut = api.playbackRange?.startTick ?? 0;
    // `stop()` ramène exactement au début de la plage ; la tolérance absorbe
    // l'arrondi d'un positionnement à la souris sur la première note.
    const auDepart = api.tickPosition <= debut + TOLERANCE_DEPART;
    api.countInVolume = decompte && auDepart ? 1 : 0;
  }, [decompte]);

  /**
   * Boucle en tics, alignée sur les frontières de mesure.
   *
   * Isolée de son effet : il faut aussi la rejouer à la création du lecteur,
   * `playbackRange` étant le seul réglage qu'alphaTab ne met pas en cache pour
   * le reporter sur un nouveau synthétiseur.
   */
  const appliquerBoucle = useCallback(() => {
    const api = apiRef.current;
    const bornes = bornesRef.current;
    if (!api || bornes.length === 0) return;

    if (!boucle) {
      api.isLooping = false;
      api.playbackRange = null;
      return;
    }

    const premier = Math.min(mesureDe, mesureA) - 1;
    const dernier = Math.max(mesureDe, mesureA) - 1;
    const debut = bornes[premier] ?? 0;
    // La dernière mesure n'a pas de borne suivante : on prolonge d'une durée
    // de mesure, déduite de l'écart entre les deux dernières.
    const derniereDuree =
      bornes.length >= 2
        ? (bornes[bornes.length - 1] ?? 0) - (bornes[bornes.length - 2] ?? 0)
        : TICS_MESURE_4_4;
    const fin = bornes[dernier + 1] ?? (bornes[dernier] ?? 0) + derniereDuree;

    api.isLooping = true;
    api.playbackRange = { startTick: debut, endTick: fin };
    if (api.tickPosition < debut || api.tickPosition >= fin) api.tickPosition = debut;
  }, [boucle, mesureDe, mesureA]);

  useEffect(appliquerBoucle, [appliquerBoucle]);

  /* -------------------------------------------------------------- actions */
  const basculerLecture = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;

    if (!api.isReadyForPlayback) {
      setChargement(true);
      setErreur(null);
      try {
        reveillerAudio(api);

        // La banque de sons pèse presque un mégaoctet : elle n'arrive qu'ici,
        // jamais à l'affichage de la partition.
        const rep = await fetch(CHEMIN.soundfont);
        if (!rep.ok) throw new Error(`banque de sons indisponible (HTTP ${rep.status})`);
        api.loadSoundFont(new Uint8Array(await rep.arrayBuffer()), false);

        await attendrePret(api);
        appliquerBoucle();
      } catch (e) {
        setErreur(e instanceof Error ? e.message : String(e));
        setChargement(false);
        return;
      }
      setChargement(false);
    }
    setADemarre(true);
    reglerDecompte();
    api.playPause();
  }, [appliquerBoucle, reglerDecompte]);

  const arreter = useCallback(() => apiRef.current?.stop(), []);

  const pourcent = tempoEcrit > 0 ? Math.round((tempo / tempoEcrit) * 100) : 100;

  const plage = useMemo(() => {
    const ancre = tempoDepart ?? tempoEcrit ?? 60;
    const haut = Math.max(Math.round((tempoCible ?? tempoEcrit ?? 120) * 1.6), 80);
    return { bas: Math.max(20, Math.round(ancre * 0.5)), haut };
  }, [tempoDepart, tempoCible, tempoEcrit]);

  /**
   * Une erreur de lecture n'éteint pas les commandes : elle s'affiche et on
   * peut réessayer. Seul un échec au chargement de la partition les désactive
   * — dans ce cas `pret` reste faux et il n'y a rien à commander.
   */
  const enPanne = erreur !== null;

  return (
    <div
      className={[
        'lt',
        compact ? 'lt--compact' : '',
        aDemarre ? '' : 'lt--repos',
        enDecompte ? 'lt--decompte' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="lt__barre">
        <button
          type="button"
          className="lt__jouer"
          onClick={basculerLecture}
          disabled={chargement || !pret}
          aria-label={joue ? 'Pause' : 'Lire'}
        >
          {chargement ? (
            <span className="lt__spin" aria-hidden="true" />
          ) : joue ? (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="3.5" y="2.5" width="3.5" height="11" rx="1" />
              <rect x="9" y="2.5" width="3.5" height="11" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 2.6v10.8a.7.7 0 0 0 1.07.6l8.4-5.4a.7.7 0 0 0 0-1.2l-8.4-5.4A.7.7 0 0 0 4 2.6Z" />
            </svg>
          )}
        </button>

        <button type="button" className="lt__btn" onClick={arreter} disabled={!pret}>
          Stop
        </button>

        <label className="lt__tempo">
          <span className="lt__k">Tempo</span>
          <input
            type="range"
            min={plage.bas}
            max={plage.haut}
            step={1}
            value={tempo}
            disabled={tempoEcrit === 0}
            onChange={(e) => setTempo(Number(e.target.value))}
            aria-label="Tempo, en pulsations par minute"
          />
          <output className="lt__bpm">
            ♩&nbsp;{tempo}
            <span className="lt__pct">{pourcent}&nbsp;%</span>
          </output>
        </label>

        {tempoDepart !== undefined && tempoDepart !== tempo && (
          <button
            type="button"
            className="lt__lien"
            onClick={() => setTempo(tempoDepart)}
            title="Revenir au tempo de départ du palier"
          >
            départ ♩&nbsp;{tempoDepart}
          </button>
        )}
        {tempoCible !== undefined && tempoCible !== tempo && (
          <button
            type="button"
            className="lt__lien"
            onClick={() => setTempo(tempoCible)}
            title="Passer au tempo cible du palier"
          >
            cible ♩&nbsp;{tempoCible}
          </button>
        )}
      </div>

      <div className="lt__barre lt__barre--bas">
        <label className="lt__case">
          <input
            type="checkbox"
            checked={metronome}
            onChange={(e) => setMetronome(e.target.checked)}
            disabled={!pret}
          />
          Métronome
        </label>
        <label className="lt__case" title="Une mesure de clics au départ. Une reprise après pause n’en rejoue pas.">
          <input
            type="checkbox"
            checked={decompte}
            onChange={(e) => setDecompte(e.target.checked)}
            disabled={!pret}
          />
          Décompte au départ
        </label>

        <label className="lt__case">
          <input
            type="checkbox"
            checked={boucle}
            onChange={(e) => setBoucle(e.target.checked)}
            disabled={!pret || nbMesures === 0}
          />
          Boucler
        </label>

        <span className={boucle ? 'lt__mesures' : 'lt__mesures lt__mesures--off'}>
          <input
            type="number"
            min={1}
            max={Math.max(nbMesures, 1)}
            value={mesureDe}
            disabled={!boucle || !pret}
            onChange={(e) => setMesureDe(borner(Number(e.target.value), nbMesures))}
            aria-label="Première mesure de la boucle"
          />
          <span aria-hidden="true">→</span>
          <input
            type="number"
            min={1}
            max={Math.max(nbMesures, 1)}
            value={mesureA}
            disabled={!boucle || !pret}
            onChange={(e) => setMesureA(borner(Number(e.target.value), nbMesures))}
            aria-label="Dernière mesure de la boucle"
          />
          <span className="lt__sur">sur {nbMesures || '—'}</span>
        </span>
      </div>

      {reservesAudio.length > 0 && (
        <div className="lt__reserves">
          <p className="lt__reserves-k">Ce que la lecture ne restitue pas</p>
          <ul>
            {reservesAudio.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {enPanne && (
        <p className="lt__erreur">
          Lecture impossible&nbsp;: {erreur}.{' '}
          {pret
            ? 'Le bouton reste actif, une nouvelle tentative est possible.'
            : 'La source alphaTex reste lisible sous la partition.'}
        </p>
      )}

      <div className="lt__scene">
        <div className="lt__partition" ref={hote} />

        {/* Annoncé une fois, pas à chaque clic : une synthèse vocale qui
            récite « 1, 2, 3, 4 » couvrirait le décompte qu'on écoute. */}
        {enDecompte && (
          <div className="lt__decompte" role="status" aria-live="polite">
            <p>
              <span className="lt__decompte-k">Décompte</span>
              <span className="lt__decompte-n" aria-hidden="true">
                {clicDecompte || '·'}
                {pulsationsMesure > 0 && <em>/{pulsationsMesure}</em>}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
