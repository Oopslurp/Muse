/**
 * Tête de manche de l'accordeur.
 *
 * Les cordes ne sont pas une rangée de boutons : elles sont posées là où sont
 * les mécaniques. On tourne la bonne clé sans avoir à traduire « corde 5 » en
 * position, ce qui est exactement le geste qu'on fait la tête dans les
 * chevilles.
 *
 * Disposition d'une tête 3+3, vue de face, sillet en bas — celle des
 * classiques et des folk à chevilles jumelées. La corde qui part du bord va à
 * la cheville la plus proche du sillet ; celle qui part du centre traverse
 * jusqu'à la plus lointaine, d'où le croisement caractéristique :
 *
 *   côté grave, du haut vers le bas : ré4 · la5 · mi6
 *   côté aigu,  du haut vers le bas : sol3 · si2 · mi1
 *
 * Les boutons sont de vrais `<button>`, positionnés en pourcentage sur les
 * chevilles : l'alignement tient à toutes les tailles, et la navigation
 * clavier reste celle d'un formulaire.
 */

import { nomAvecOctave, noteDeMidi, type Accordage } from '~/lib/notes';

/** Chevilles, dans le repère du dessin (viewBox 260 × 380). */
const CHEVILLES = { gauche: 90, droite: 170, rangs: [84, 172, 260] } as const;

/** Position verticale des boutons, en pourcentage — calée sur les chevilles. */
const RANGS_PCT = CHEVILLES.rangs.map((y) => `${((y / 380) * 100).toFixed(1)}%`);

/** Abscisse de chaque corde au sillet, de la 6ᵉ (grave, à gauche) à la 1ʳᵉ. */
const AU_SILLET = [94, 108, 121, 135, 148, 162];

/**
 * Index dans l'accordage (0 = corde 1, la plus aiguë) pour chaque cheville,
 * de haut en bas. Voir le croisement décrit plus haut.
 */
const GAUCHE = [3, 4, 5] as const; // cordes 4, 5, 6
const DROITE = [2, 1, 0] as const; // cordes 3, 2, 1

export interface MancheProps {
  accordage: Accordage;
  /** MIDI de la corde entendue en ce moment, ou `null`. */
  entendue: number | null;
  /** MIDI de la corde verrouillée, ou `null` en automatique. */
  verrou: number | null;
  /** Cordes amenées dans les ±3 cents pendant cette séance. */
  accordees: ReadonlySet<number>;
  onChoisir: (midi: number) => void;
}

export default function Manche({
  accordage,
  entendue,
  verrou,
  accordees,
  onChoisir,
}: MancheProps) {
  const bouton = (index: number, cote: 'gauche' | 'droite', rang: number) => {
    const midi = accordage[index]!;
    const numero = index + 1;
    const classes = [
      'ac__corde',
      `ac__corde--${cote}`,
      entendue === midi ? 'ac__corde--actif' : '',
      verrou === midi ? 'ac__corde--verrou' : '',
      accordees.has(midi) ? 'ac__corde--faite' : '',
    ].filter(Boolean);

    return (
      <button
        key={numero}
        type="button"
        className={classes.join(' ')}
        style={{ top: RANGS_PCT[rang] }}
        data-corde={numero}
        aria-pressed={verrou === midi}
        onClick={() => onChoisir(midi)}
        title={
          verrou === midi
            ? 'Déverrouiller — l’accordeur reprendra la corde la plus proche'
            : `Verrouiller sur la corde ${numero}`
        }
      >
        <span className="ac__corde-note">
          {nomAvecOctave(noteDeMidi(midi), 'internationale')}
        </span>
        <span className="ac__corde-n">{numero}</span>
      </button>
    );
  };

  /** Corde dessinée : de sa cheville au sillet, puis le long du manche. */
  const fil = (index: number, x: number, y: number, sillet: number) => {
    const midi = accordage[index]!;
    const evasement = 130 + (sillet - 130) * 1.16;
    return (
      <path
        key={index}
        className={`ac__fil${entendue === midi ? ' ac__fil--actif' : ''}`}
        d={`M ${x} ${y} L ${sillet} 316 L ${evasement} 380`}
      />
    );
  };

  return (
    <div className="ac__manche">
      {GAUCHE.map((i, r) => bouton(i, 'gauche', r))}
      {DROITE.map((i, r) => bouton(i, 'droite', r))}

      <svg
        className="ac__tete"
        viewBox="0 0 260 380"
        role="img"
        aria-label="Tête de manche : choisir la corde à accorder"
      >
        {/* Manche et touche, sous la tête. */}
        <path className="ac__touche" d="M 86 314 L 174 314 L 180 380 L 80 380 Z" />

        {/* Bois de la tête, puis son filet — un beau livre, pas une capture
            d'écran d'application. */}
        <path
          className="ac__bois"
          d="M 130 8 C 170 8 199 19 204 36 C 209 53 205 88 202 124
             C 198 172 193 236 189 290 C 187 304 179 313 167 315
             L 93 315 C 81 313 73 304 71 290 C 67 236 62 172 58 124
             C 55 88 51 53 56 36 C 61 19 90 8 130 8 Z"
        />
        <path
          className="ac__filet"
          d="M 130 18 C 166 18 191 27 196 42 C 200 57 196 89 193 124
             C 189 171 184 234 180 288 C 178 299 172 305 163 306
             L 97 306 C 88 305 82 299 80 288 C 76 234 71 171 67 124
             C 64 89 60 57 64 42 C 69 27 94 18 130 18 Z"
        />

        {/* Sillet. */}
        <rect className="ac__sillet" x="86" y="314" width="88" height="6" rx="1.5" />

        {/* Cordes. */}
        {GAUCHE.map((i, r) =>
          fil(i, CHEVILLES.gauche, CHEVILLES.rangs[r]!, AU_SILLET[5 - i]!)
        )}
        {DROITE.map((i, r) =>
          fil(i, CHEVILLES.droite, CHEVILLES.rangs[r]!, AU_SILLET[5 - i]!)
        )}

        {/* Mécaniques : axe dans le bois, tige, et clé qui dépasse. */}
        {CHEVILLES.rangs.map((y, r) => {
          const g = accordage[GAUCHE[r]!]!;
          const d = accordage[DROITE[r]!]!;
          const actifG = entendue === g;
          const actifD = entendue === d;
          return (
            <g key={y}>
              <line className="ac__tige" x1={CHEVILLES.gauche - 6} y1={y} x2="54" y2={y} />
              <rect className="ac__cle" x="34" y={y - 8} width="22" height="16" rx="4" />
              <circle
                className={`ac__axe${actifG ? ' ac__axe--actif' : ''}`}
                cx={CHEVILLES.gauche}
                cy={y}
                r="7"
              />

              <line className="ac__tige" x1={CHEVILLES.droite + 6} y1={y} x2="206" y2={y} />
              <rect className="ac__cle" x="204" y={y - 8} width="22" height="16" rx="4" />
              <circle
                className={`ac__axe${actifD ? ' ac__axe--actif' : ''}`}
                cx={CHEVILLES.droite}
                cy={y}
                r="7"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
