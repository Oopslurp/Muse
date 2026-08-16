/**
 * Métronome — commandes.
 *
 * Le moteur est dans [metronome.ts](../../lib/metronome.ts) : ici on règle et
 * on affiche. Ce que ce métronome fait qu'un métronome ordinaire ne fait pas :
 * **taire des positions du cycle**. Plusieurs autodiagnostics du corpus en
 * dépendent — le clic sur les temps 2 et 4, ou sur la deuxième note d'un cycle
 * de doubles, force à tenir la pulsation soi-même au lieu de s'appuyer dessus.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BORNES_BPM,
  MOTIFS,
  creerMetronome,
  type Accent,
  type Metronome as MetronomeMoteur,
} from '~/lib/metronome';
import './Metronome.css';

const SUIVANT: Record<Accent, Accent> = { fort: 'faible', faible: 'muet', muet: 'fort' };
const TITRE: Record<Accent, string> = {
  fort: 'Appui — cliquer pour passer en clic simple',
  faible: 'Clic simple — cliquer pour taire',
  muet: 'Muet — cliquer pour mettre l’appui',
};

export interface MetronomeProps {
  /**
   * Tempo courant, **piloté par le parent**.
   *
   * Une version antérieure le prenait comme valeur initiale et remontait ses
   * changements : le tempo de départ du palier arrivait après le montage et
   * n'était jamais pris en compte, pendant que la remontée le réécrasait à
   * 72. Une seule source de vérité règle les deux d'un coup.
   */
  bpm: number;
  onBpm: (bpm: number) => void;
}

export default function Metronome({ bpm, onBpm: setBpm }: MetronomeProps) {
  const [parPulsation, setParPulsation] = useState(1);
  const [motif, setMotif] = useState<Accent[]>(MOTIFS[0]!.motif);
  const [volume, setVolume] = useState(0.7);
  const [marche, setMarche] = useState(false);
  const [position, setPosition] = useState(-1);
  const [preset, setPreset] = useState<string>('temps');

  const moteur = useRef<MetronomeMoteur | null>(null);
  const positionRef = useRef(-1);

  // Un rendu React par clic ferait 16 rendus par seconde à 240 bpm en doubles.
  // On passe par une référence et on ne réveille React qu'à l'image suivante.
  useEffect(() => {
    let vivant = true;
    let image = 0;
    const boucle = () => {
      if (!vivant) return;
      setPosition(positionRef.current);
      image = requestAnimationFrame(boucle);
    };
    image = requestAnimationFrame(boucle);
    return () => {
      vivant = false;
      cancelAnimationFrame(image);
    };
  }, []);

  useEffect(() => {
    moteur.current = creerMetronome({
      bpm,
      parPulsation,
      motif,
      volume,
      surPosition: (p) => {
        positionRef.current = p;
      },
    });
    return () => {
      moteur.current?.detruire();
      moteur.current = null;
    };
    // Créé une seule fois : les réglages passent par `regler`, pas par une
    // reconstruction — recréer le contexte audio à chaque tour de molette
    // couperait le son.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    moteur.current?.regler({ bpm, parPulsation, motif, volume });
  }, [bpm, parPulsation, motif, volume]);

  const basculer = useCallback(async () => {
    const m = moteur.current;
    if (!m) return;
    if (m.enMarche()) {
      m.arreter();
      positionRef.current = -1;
      setMarche(false);
    } else {
      await m.demarrer();
      setMarche(true);
    }
  }, []);

  const appliquer = useCallback((id: string) => {
    const p = MOTIFS.find((m) => m.id === id);
    if (!p) return;
    setPreset(id);
    setParPulsation(p.parPulsation);
    setMotif([...p.motif]);
  }, []);

  /**
   * `?motif=<id>` — une fiche peut ouvrir l'atelier déjà réglé sur le clic
   * déplacé que son critère demande.
   *
   * ⚠️ Lu **dans l'îlot**, jamais dans le frontmatter Astro : le site est
   * construit en statique et `Astro.url.searchParams` y est vide. C'est
   * exactement le défaut trouvé en tranche 6 sur `?technique=`, où la
   * présélection ne marchait pour personne sans que rien ne le signale.
   */
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('motif');
    if (id) appliquer(id);
  }, [appliquer]);

  const basculerPosition = (i: number) => {
    setMotif((m) => m.map((a, j) => (j === i ? SUIVANT[a] : a)));
    setPreset('libre');
  };

  const redimensionner = (n: number) => {
    setMotif((m) =>
      Array.from({ length: n }, (_, i) => m[i] ?? (i === 0 ? 'fort' : 'faible'))
    );
    setPreset('libre');
  };

  const courant = MOTIFS.find((m) => m.id === preset);

  return (
    <section className="me">
      <header className="me__tete">
        <button
          type="button"
          className={`me__jouer${marche ? ' me__jouer--marche' : ''}`}
          onClick={basculer}
          aria-label={marche ? 'Arrêter le métronome' : 'Démarrer le métronome'}
        >
          {marche ? (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 2.6v10.8a.7.7 0 0 0 1.07.6l8.4-5.4a.7.7 0 0 0 0-1.2l-8.4-5.4A.7.7 0 0 0 4 2.6Z" />
            </svg>
          )}
        </button>

        <div className="me__tempo">
          <output className="me__bpm">
            {bpm}
            <span className="me__unite">bpm</span>
          </output>
          <input
            type="range"
            min={BORNES_BPM.min}
            max={BORNES_BPM.max}
            step={1}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            aria-label="Tempo, en pulsations par minute"
          />
          <div className="me__pas">
            {[-5, -1, +1, +5].map((d) => (
              <button
                key={d}
                type="button"
                className="me__pas-btn"
                onClick={() =>
                  setBpm(Math.min(BORNES_BPM.max, Math.max(BORNES_BPM.min, bpm + d)))
                }
              >
                {d > 0 ? `+${d}` : d}
              </button>
            ))}
          </div>
        </div>

        <label className="me__volume">
          <span className="me__k">Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume du métronome"
          />
        </label>
      </header>

      {/* Le cycle. Cliquer une position fait tourner appui → clic → muet. */}
      <div className="me__cycle" role="group" aria-label="Motif du cycle">
        {motif.map((a, i) => (
          <button
            key={i}
            type="button"
            className={[
              'me__pos',
              `me__pos--${a}`,
              marche && position === i ? 'me__pos--vive' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => basculerPosition(i)}
            title={TITRE[a]}
            aria-label={`Position ${i + 1} : ${a}`}
          />
        ))}
        <span className="me__taille">
          <button
            type="button"
            className="me__pas-btn"
            onClick={() => redimensionner(Math.max(2, motif.length - 1))}
            aria-label="Raccourcir le cycle"
          >
            −
          </button>
          <span className="me__taille-n">{motif.length}</span>
          <button
            type="button"
            className="me__pas-btn"
            onClick={() => redimensionner(Math.min(16, motif.length + 1))}
            aria-label="Allonger le cycle"
          >
            +
          </button>
        </span>
      </div>

      <div className="me__presets">
        {MOTIFS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`me__preset${preset === p.id ? ' me__preset--actif' : ''}`}
            aria-pressed={preset === p.id}
            onClick={() => appliquer(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="me__pourquoi">
        {courant
          ? courant.pourquoi
          : `Motif libre, ${motif.length} positions, ${parPulsation} par pulsation.`}
      </p>

      <label className="me__sub">
        <span className="me__k">Positions par pulsation</span>
        <select
          value={parPulsation}
          onChange={(e) => {
            setParPulsation(Number(e.target.value));
            setPreset('libre');
          }}
        >
          <option value={1}>1 — noires</option>
          <option value={2}>2 — croches</option>
          <option value={3}>3 — triolets</option>
          <option value={4}>4 — doubles</option>
        </select>
      </label>
    </section>
  );
}
