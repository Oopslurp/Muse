/**
 * Accordeur chromatique — îlot React.
 *
 * L'écran ne décide de rien : les seuils, le lissage et la plausibilité vivent
 * dans [accordeur.ts](../../lib/accordeur.ts), la capture dans
 * [micro.ts](../../lib/micro.ts). Ici, on affiche et on commande.
 *
 * Trois partis pris d'affichage, tirés de docs/research/06-accordeur.md §9 :
 *
 *  · **le sens de la correction s'écrit en toutes lettres.** « À gauche » n'a
 *    aucun sens univoque quand on a la tête dans les mécaniques ;
 *  · **la note porte son octave.** L'accordage à l'octave est l'erreur
 *    classique, et elle coûte des cordes ;
 *  · **la zone juste est franche, pas dégradée.** Il faut un moment de
 *    validation, pas un gradient qu'on interprète.
 *
 * Rien ne sort de la machine : le flux micro n'est ni enregistré, ni envoyé
 * nulle part, et la page ne fait aucun appel réseau.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  REGLAGES,
  sensCorrection,
  type Mode,
  type OptionsAnalyse,
  type Resultat,
} from '~/lib/accordeur';
import { ecouterMicro, type Ecoute, type PanneMicro, type ReglagesPiste } from '~/lib/micro';
import {
  ACCORDAGES,
  ACCORDAGE_FAMILLE,
  ACCORDAGE_LABELS,
  nomAvecOctave,
  noteDeMidi,
  type AccordageId,
  type FamilleAccordage,
} from '~/lib/notes';
import Manche from './Manche';
import './Accordeur.css';

const FAMILLES: Record<FamilleAccordage, string> = {
  standard: 'Standard',
  drop: 'Drop',
  ouvert: 'Ouverts',
  moderne: 'Fingerstyle moderne',
};

/** Diapasons proposés. 440 par défaut ; 415 baroque, 432 pour qui y tient. */
const DIAPASONS = [415, 432, 438, 440, 442, 444] as const;

const ids = Object.keys(ACCORDAGES) as AccordageId[];

export default function Accordeur() {
  const [phase, setPhase] = useState<'repos' | 'demarrage' | 'ecoute'>('repos');
  const [panne, setPanne] = useState<PanneMicro | null>(null);
  const [piste, setPiste] = useState<ReglagesPiste | null>(null);

  const [mode, setMode] = useState<Mode>('accordage');
  const [accordageId, setAccordageId] = useState<AccordageId>('standard');
  /** MIDI de la corde verrouillée, ou `null` : la plus proche l'emporte. */
  const [verrou, setVerrou] = useState<number | null>(null);
  const [diapason, setDiapason] = useState(440);

  const [mesure, setMesure] = useState<Resultat | null>(null);
  /** Dernière mesure valide, gelée pendant les silences. */
  const [derniere, setDerniere] = useState<Extract<Resultat, { type: 'mesure' }> | null>(null);
  const [accordees, setAccordees] = useState<ReadonlySet<number>>(new Set());

  const ecouteRef = useRef<Ecoute | null>(null);
  const accordage = ACCORDAGES[accordageId];

  /**
   * Les options sont relues à chaque image par la boucle d'analyse. Elles
   * passent par une référence pour que changer de corde ou de diapason ne
   * coupe pas le micro — redemander l'autorisation à chaque clic serait
   * intolérable.
   */
  const optionsRef = useRef<Omit<OptionsAnalyse, 'seuilRms'>>({
    diapason: 440,
    cibles: ACCORDAGES.standard,
    plage: REGLAGES.plage.accordage,
  });
  useEffect(() => {
    optionsRef.current = {
      diapason,
      cibles: mode === 'chromatique' ? null : verrou !== null ? [verrou] : accordage,
      plage: REGLAGES.plage[mode],
    };
  }, [diapason, mode, verrou, accordage]);

  useEffect(() => {
    ecouteRef.current?.changerMode(mode);
  }, [mode]);

  /** Changer d'accordage remet les cordes validées et le verrou à zéro. */
  useEffect(() => {
    setVerrou(null);
    setAccordees(new Set());
  }, [accordageId]);

  const demarrer = useCallback(async () => {
    setPanne(null);
    setPhase('demarrage');
    try {
      const ecoute = await ecouterMicro({
        mode,
        options: () => optionsRef.current,
        surMesure: (r) => {
          setMesure(r);
          if (r.type === 'mesure') {
            setDerniere(r);
            if (r.juste && r.sure) {
              setAccordees((s) => (s.has(r.midi) ? s : new Set(s).add(r.midi)));
            }
          }
        },
        surCalibrage: () => {},
      });
      ecouteRef.current = ecoute;
      setPiste(ecoute.reglagesPiste);
      setPhase('ecoute');
    } catch (e) {
      setPanne(e as PanneMicro);
      setPhase('repos');
    }
  }, [mode]);

  const arreter = useCallback(() => {
    ecouteRef.current?.arreter();
    ecouteRef.current = null;
    setPhase('repos');
    setMesure(null);
    setDerniere(null);
  }, []);

  // Le micro se coupe quand la page disparaît : un onglet qui garde la pastille
  // d'enregistrement allumée après qu'on l'a quitté est un manquement.
  useEffect(() => () => ecouteRef.current?.arreter(), []);

  /** Le navigateur a-t-il vraiment désactivé les trois traitements ? */
  const traitementsActifs = useMemo(() => {
    if (!piste) return [];
    return (
      [
        ['réduction de bruit', piste.noiseSuppression],
        ['gain automatique', piste.autoGainControl],
        ['annulation d’écho', piste.echoCancellation],
      ] as const
    )
      .filter(([, actif]) => actif === true)
      .map(([nom]) => nom);
  }, [piste]);

  const enVeille = mesure?.type !== 'mesure';
  const vue = mesure?.type === 'mesure' ? mesure : derniere;
  const sens = vue ? sensCorrection(vue.cents) : null;

  return (
    <div className="ac">
      {phase !== 'ecoute' ? (
        <section className="ac__accueil">
          <h2 className="ac__titre">Accordeur chromatique</h2>
          <p className="ac__intro">
            Le son du microphone est analysé dans la page et n’en sort jamais&nbsp;: rien
            n’est enregistré, rien n’est envoyé. Deux secondes de silence au démarrage
            servent à mesurer le bruit de la pièce.
          </p>

          {panne && (
            <div className="ac__panne" role="alert">
              <p className="ac__panne-titre">{panne.message}</p>
              <p className="ac__panne-remede">{panne.remede}</p>
            </div>
          )}

          <button
            type="button"
            className="ac__demarrer"
            onClick={demarrer}
            disabled={phase === 'demarrage'}
          >
            {phase === 'demarrage'
              ? 'Autorisation en attente…'
              : panne
                ? 'Réessayer'
                : 'Activer le microphone'}
          </button>
        </section>
      ) : (
        <>
          {mode === 'accordage' && (
            <div className="ac__barre">
              {/* L'accordage se choisit d'abord : il commande le nom des six
                  cordes et la fenêtre dans laquelle on cherche. */}
              <label className="ac__pilule">
                <span className="ac__hors-ecran">Accordage</span>
                <select
                  value={accordageId}
                  onChange={(e) => setAccordageId(e.target.value as AccordageId)}
                >
                  {(Object.keys(FAMILLES) as FamilleAccordage[]).map((f) => (
                    <optgroup key={f} label={FAMILLES[f]}>
                      {ids
                        .filter((id) => ACCORDAGE_FAMILLE[id] === f)
                        .map((id) => (
                          <option key={id} value={id}>
                            {ACCORDAGE_LABELS[id]}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              {/* AUTO = aucune corde verrouillée. L'éteindre fige la corde
                  entendue, ou la 6ᵉ à défaut : c'est le réglage sûr sur les
                  graves, celui qui interdit l'erreur d'octave. */}
              <label className={`ac__auto${verrou === null ? ' ac__auto--on' : ''}`}>
                <span className="ac__auto-k">Auto</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={verrou === null}
                  onChange={(e) =>
                    setVerrou(e.target.checked ? null : (vue?.midi ?? accordage[5] ?? null))
                  }
                />
                <span className="ac__auto-piste" aria-hidden="true" />
              </label>
            </div>
          )}

          <div className={`ac__cadran${enVeille ? ' ac__cadran--veille' : ''}`}>
            <Aiguille cents={vue?.cents ?? 0} sure={vue?.sure ?? false} muet={enVeille} />

            <div className="ac__lecture">
              <p className="ac__note">
                {vue ? nomAvecOctave(noteDeMidi(vue.midi), 'internationale') : '—'}
              </p>
              <p className="ac__note-fr">
                {vue ? nomAvecOctave(noteDeMidi(vue.midi), 'latine') : 'aucun son'}
              </p>
            </div>

            <p className={`ac__sens ac__sens--${sens ?? 'rien'}`}>
              {enVeille ? 'En attente d’une note' : sens === 'juste' ? 'Juste' : sens}
            </p>

            <p className="ac__cents">
              {vue ? `${vue.cents > 0 ? '+' : ''}${vue.cents.toFixed(1)} cents` : ''}
              {vue && !vue.sure && <span className="ac__doute"> · signal incertain</span>}
            </p>
          </div>

          {mode === 'accordage' && (
            <Manche
              accordage={accordage}
              entendue={enVeille ? null : (vue?.midi ?? null)}
              verrou={verrou}
              accordees={accordees}
              onChoisir={(midi) => setVerrou((v) => (v === midi ? null : midi))}
            />
          )}

          <p className="ac__aide">
            {mode === 'chromatique'
              ? 'Chromatique libre : toute note entre 55 et 1320 Hz, harmoniques et notes frettées comprises.'
              : verrou !== null
                ? 'Corde verrouillée. C’est le réglage sûr sur les graves : l’accordeur ne peut plus partir à l’octave.'
                : 'La corde la plus proche est choisie automatiquement. En cas d’hésitation sur les graves, verrouiller la corde visée.'}
          </p>

          <div className="ac__reglages">
            <div className="ac__groupe" role="group" aria-label="Mode">
              {(['accordage', 'chromatique'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`ac__onglet${mode === m ? ' ac__onglet--actif' : ''}`}
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                >
                  {m === 'accordage' ? 'Accordage' : 'Chromatique'}
                </button>
              ))}
            </div>

            <label className="ac__champ">
              <span className="ac__k">La de référence</span>
              <select value={diapason} onChange={(e) => setDiapason(Number(e.target.value))}>
                {DIAPASONS.map((d) => (
                  <option key={d} value={d}>
                    {d} Hz
                  </option>
                ))}
              </select>
            </label>

            <button type="button" className="ac__stop" onClick={arreter}>
              Couper le micro
            </button>
          </div>

          {traitementsActifs.length > 0 && (
            <p className="ac__avertissement" role="status">
              <strong>Le navigateur a gardé {traitementsActifs.join(', ')} malgré la demande.</strong>{' '}
              Ces traitements sont conçus pour la voix en visioconférence&nbsp;: une note tenue
              peut s’atténuer au bout d’une seconde, ou le niveau varier tout seul. La détection
              peut en souffrir.
            </p>
          )}

          {piste && (
            <p className="ac__piste">
              {piste.peripherique || 'micro'} · {Math.round(piste.frequenceEchantillonnage / 100) / 10}
              &nbsp;kHz · fenêtre {REGLAGES.fenetre}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * L'aiguille.
 *
 * Plage ±50 cents, la moitié d'un demi-ton : au-delà, la note affichée
 * changerait. En corde verrouillée l'écart peut dépasser cette plage — on
 * plaque alors l'aiguille en butée plutôt que de la laisser sortir du cadran,
 * et le chiffre en cents continue de dire la vérité.
 */
function Aiguille({ cents, sure, muet }: { cents: number; sure: boolean; muet: boolean }) {
  const borne = REGLAGES.aiguilleCents;
  const clampe = Math.max(-borne, Math.min(borne, cents));
  const juste = Math.abs(cents) <= REGLAGES.toleranceCents;
  const butee = Math.abs(cents) > borne;

  return (
    <div
      className={`ac__jauge${juste && !muet ? ' ac__jauge--juste' : ''}`}
      role="meter"
      aria-valuemin={-borne}
      aria-valuemax={borne}
      aria-valuenow={Math.round(clampe)}
      aria-valuetext={`${Math.round(cents)} cents`}
      aria-label="Écart à la note de référence, en cents"
    >
      {/* Trop bas à gauche, trop haut à droite. Les deux signes disent le sens
          sans qu'on ait à lire le chiffre. */}
      <span className="ac__signe" aria-hidden="true">
        ♭
      </span>

      <div className="ac__piste">
        <div className="ac__zone" />
        {[-25, 0, 25].map((g) => (
          <span
            key={g}
            className={`ac__grad${g === 0 ? ' ac__grad--centre' : ''}`}
            style={{ left: `${((g + borne) / (2 * borne)) * 100}%` }}
          />
        ))}
        <div
          className={[
            'ac__aiguille',
            muet ? 'ac__aiguille--muette' : '',
            butee ? 'ac__aiguille--butee' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            left: `${((clampe + borne) / (2 * borne)) * 100}%`,
            // La confiance se lit à l'opacité : on doit pouvoir distinguer
            // « c'est juste » de « je ne sais pas ».
            opacity: muet ? 0.25 : sure ? 1 : 0.55,
          }}
        />
      </div>

      <span className="ac__signe" aria-hidden="true">
        ♯
      </span>
    </div>
  );
}
