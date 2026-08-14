/**
 * Minuteur de séance.
 *
 * Adossé aux champs santé de la fiche, qui sont obligatoires (CLAUDE.md
 * décision 3) :
 *
 *  · `dureeMax` borne la séance — le minuteur le dit **avant** de le dépasser ;
 *  · `series` pilote l'alternance travail / repos quand la fiche en propose une ;
 *  · `signalArret` est affiché **près du chronomètre**, pas en bas de page. On
 *    le lit au moment où on décide de pousser, pas après.
 *
 * Le premier signal de la liste est l'alarme utile : elle est ordonnée du plus
 * précoce au plus tardif.
 *
 * Le décompte s'appuie sur l'horloge système à chaque image, jamais sur une
 * accumulation d'intervalles : un onglet en arrière-plan borne `setInterval` à
 * une seconde et un compteur incrémenté prendrait des minutes de retard.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import './Minuteur.css';

export interface Series {
  travailSecondes: number;
  reposSecondes: number;
  nombre: number;
}

export interface MinuteurProps {
  /** Minutes. Borne haute de la séance sur cette technique. */
  dureeMax?: number | undefined;
  /** Secondes de repos complet entre séries. */
  reposMin?: number | undefined;
  /** Du plus précoce au plus tardif. */
  signalArret?: readonly string[] | undefined;
  series?: Series | undefined;
  /** Remonte les minutes écoulées, pour préremplir le journal. */
  surMinutes?: (minutes: number) => void;
}

type Phase = 'arret' | 'travail' | 'repos';

const mmss = (s: number) => {
  const m = Math.floor(Math.max(0, s) / 60);
  const r = Math.floor(Math.max(0, s) % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
};

export default function Minuteur({
  dureeMax,
  reposMin,
  signalArret,
  series,
  surMinutes,
}: MinuteurProps) {
  const [phase, setPhase] = useState<Phase>('arret');
  const [ecoule, setEcoule] = useState(0);
  const [serie, setSerie] = useState(1);
  const [modeSeries, setModeSeries] = useState(false);

  /** Horodatage du début de la phase courante, sur l'horloge système. */
  const depart = useRef(0);
  /** Cumul des phases de travail déjà closes, en secondes. */
  const cumul = useRef(0);

  const dureeRepos = series?.reposSecondes ?? reposMin ?? 60;
  const dureeTravail = series?.travailSecondes ?? 0;
  const nbSeries = series?.nombre ?? 0;

  const minutesTotal = Math.floor((cumul.current + (phase === 'travail' ? ecoule : 0)) / 60);

  useEffect(() => {
    if (phase === 'arret') return;
    let image = 0;
    const tic = () => {
      setEcoule((Date.now() - depart.current) / 1000);
      image = requestAnimationFrame(tic);
    };
    image = requestAnimationFrame(tic);
    return () => cancelAnimationFrame(image);
  }, [phase]);

  /** Passage automatique travail → repos → travail en mode séries. */
  useEffect(() => {
    if (!modeSeries || phase === 'arret') return;
    if (phase === 'travail' && dureeTravail > 0 && ecoule >= dureeTravail) {
      cumul.current += dureeTravail;
      depart.current = Date.now();
      setEcoule(0);
      setPhase('repos');
    } else if (phase === 'repos' && ecoule >= dureeRepos) {
      if (serie >= nbSeries) {
        setPhase('arret');
        setEcoule(0);
      } else {
        setSerie((s) => s + 1);
        depart.current = Date.now();
        setEcoule(0);
        setPhase('travail');
      }
    }
  }, [modeSeries, phase, ecoule, dureeTravail, dureeRepos, serie, nbSeries]);

  useEffect(() => surMinutes?.(minutesTotal), [minutesTotal, surMinutes]);

  const demarrer = useCallback(() => {
    depart.current = Date.now();
    setEcoule(0);
    setPhase('travail');
  }, []);

  const arreter = useCallback(() => {
    if (phase === 'travail') cumul.current += ecoule;
    setPhase('arret');
    setEcoule(0);
  }, [phase, ecoule]);

  const remettre = useCallback(() => {
    cumul.current = 0;
    setSerie(1);
    setEcoule(0);
    setPhase('arret');
  }, []);

  const secondesMax = (dureeMax ?? 0) * 60;
  const totalCourant = cumul.current + (phase === 'travail' ? ecoule : 0);
  const depasse = secondesMax > 0 && totalCourant >= secondesMax;
  const proche = secondesMax > 0 && !depasse && totalCourant >= secondesMax * 0.8;

  const restant =
    phase === 'repos'
      ? dureeRepos - ecoule
      : modeSeries && dureeTravail > 0
        ? dureeTravail - ecoule
        : null;

  return (
    <section className={`mi${depasse ? ' mi--depasse' : ''}`}>
      <div className="mi__cadran">
        <p className="mi__phase">
          {phase === 'arret'
            ? 'À l’arrêt'
            : phase === 'repos'
              ? `Repos${nbSeries ? ` · série ${serie} sur ${nbSeries}` : ''}`
              : `Travail${modeSeries && nbSeries ? ` · série ${serie} sur ${nbSeries}` : ''}`}
        </p>

        <p className="mi__temps">
          {restant !== null && phase !== 'arret' ? mmss(restant) : mmss(totalCourant)}
        </p>

        <p className="mi__sous">
          {restant !== null && phase !== 'arret'
            ? `${mmss(totalCourant)} de travail au total`
            : dureeMax
              ? `sur ${dureeMax} min au maximum`
              : 'temps de travail cumulé'}
        </p>
      </div>

      <div className="mi__commandes">
        {phase === 'arret' ? (
          <button type="button" className="mi__btn mi__btn--fort" onClick={demarrer}>
            {cumul.current > 0 ? 'Reprendre' : 'Démarrer'}
          </button>
        ) : (
          <button type="button" className="mi__btn mi__btn--fort" onClick={arreter}>
            Pause
          </button>
        )}
        <button type="button" className="mi__btn" onClick={remettre}>
          Remettre à zéro
        </button>

        {series && (
          <label className="mi__case">
            <input
              type="checkbox"
              checked={modeSeries}
              onChange={(e) => {
                setModeSeries(e.target.checked);
                remettre();
              }}
            />
            Séries {series.nombre} × {mmss(series.travailSecondes)} /{' '}
            {mmss(series.reposSecondes)}
          </label>
        )}
      </div>

      {/* Décision 3 : le signal d'arrêt se lit au moment où on décide de
          pousser, pas en bas de page. Il est donc collé au chronomètre. */}
      {signalArret && signalArret.length > 0 && (
        <div className={`mi__arret${depasse || proche ? ' mi__arret--vif' : ''}`}>
          <p className="mi__arret-k">On s’arrête si</p>
          <ul>
            {signalArret.map((s, i) => (
              <li key={s} className={i === 0 ? 'mi__arret-premier' : undefined}>
                {s}
              </li>
            ))}
          </ul>
          {signalArret.length > 1 && (
            <p className="mi__arret-note">
              Du plus précoce au plus tardif&nbsp;: le premier est l’alarme utile.
            </p>
          )}
        </div>
      )}

      {depasse && (
        <p className="mi__alerte" role="alert">
          Durée maximale atteinte pour cette technique ({dureeMax} min). Continuer au-delà
          n’ajoute pas de progrès&nbsp;: c’est là que le geste se dégrade et que les
          premiers signes passent pour un défaut de technique.
        </p>
      )}
      {proche && !depasse && (
        <p className="mi__alerte mi__alerte--douce">
          Il reste moins de {Math.ceil((secondesMax - totalCourant) / 60)} min sur cette
          technique.
        </p>
      )}

      {reposMin !== undefined && !modeSeries && (
        <p className="mi__repos">
          Repos minimal entre séries&nbsp;: {reposMin} s, mains complètement relâchées.
        </p>
      )}
    </section>
  );
}
