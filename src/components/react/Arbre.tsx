/**
 * Arbre de compétences — îlot React.
 *
 * La disposition arrive toute faite du build ([arbre.ts](../../lib/arbre.ts)) :
 * l'îlot ne fait que réagir. Il apporte trois choses qu'une page statique ne
 * peut pas donner :
 *
 *  · **la chaîne complète des prérequis** d'une technique, pas seulement ses
 *    voisins immédiats — c'est la question que pose un arbre de compétences ;
 *  · **l'avancement**, lu et écrit dans IndexedDB, donc conservé d'une séance
 *    à l'autre et exportable ;
 *  · **ce qui est ouvert maintenant** : une technique dont tous les prérequis
 *    sont tenus. C'est l'information qu'on vient chercher.
 *
 * Les nœuds sont de vrais `<button>` posés au-dessus du SVG des arêtes : le
 * graphe se parcourt au clavier comme une liste, et les liens vers les fiches
 * restent des liens.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GRILLE, amont, aval, type Disposition, type NoeudPlace } from '~/lib/arbre';
import type { NoeudGraphe } from '~/lib/graph';
import {
  AVANCEMENTS,
  AVANCEMENT_LABELS,
  AVANCEMENT_SENS,
  disponible,
  ecrire,
  exporter,
  importer,
  lireTout,
  type Avancement,
  type EtatTechnique,
} from '~/lib/progression';
import './Arbre.css';

export interface ArbreProps {
  disposition: Disposition;
  /** Libellés de famille et variables de couleur, depuis la taxonomie. */
  familles: Array<{ id: string; label: string; colorVar: string }>;
}

/** État d'un nœud à l'écran : ce qui décide de sa couleur et de son anneau. */
type Etat = 'acquis' | 'en-cours' | 'ouvert' | 'verrouille';

export default function Arbre({ disposition, familles }: ArbreProps) {
  const [progression, setProgression] = useState<Map<string, EtatTechnique>>(new Map());
  const [choisi, setChoisi] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pret, setPret] = useState(false);

  const parId = useMemo(
    () => new Map<string, NoeudGraphe>(disposition.noeuds.map((n) => [n.id, n])),
    [disposition]
  );
  const place = useMemo(
    () => new Map<string, NoeudPlace>(disposition.noeuds.map((n) => [n.id, n])),
    [disposition]
  );

  useEffect(() => {
    if (!disponible()) {
      setMessage('Ce navigateur n’expose pas IndexedDB : la progression ne sera pas conservée.');
      setPret(true);
      return;
    }
    lireTout()
      .then((m) => setProgression(m))
      .catch((e) => setMessage(`Progression illisible : ${String(e)}`))
      .finally(() => setPret(true));
  }, []);

  const avancementDe = useCallback(
    (id: string): Avancement => progression.get(id)?.avancement ?? 'neuf',
    [progression]
  );

  /** Ouvert = tous les prérequis tenus. C'est ce qu'on vient chercher. */
  const etatDe = useCallback(
    (n: NoeudGraphe): Etat => {
      const a = avancementDe(n.id);
      if (a === 'acquis') return 'acquis';
      if (a === 'en-cours') return 'en-cours';
      return n.prerequis.every((p) => avancementDe(p) === 'acquis') ? 'ouvert' : 'verrouille';
    },
    [avancementDe]
  );

  const majAvancement = useCallback(async (id: string, a: Avancement) => {
    try {
      const ligne = await ecrire(id, { avancement: a });
      setProgression((m) => new Map(m).set(id, ligne));
    } catch (e) {
      setMessage(`Enregistrement impossible : ${String(e)}`);
    }
  }, []);

  /* --------------------------------------------------------- mise en avant */
  const enAmont = useMemo(() => (choisi ? amont(choisi, parId) : new Set<string>()), [choisi, parId]);
  const enAval = useMemo(() => (choisi ? aval(choisi, parId) : new Set<string>()), [choisi, parId]);

  const roleDe = (id: string): 'choisi' | 'amont' | 'aval' | 'autre' | null => {
    if (!choisi) return null;
    if (id === choisi) return 'choisi';
    if (enAmont.has(id)) return 'amont';
    if (enAval.has(id)) return 'aval';
    return 'autre';
  };

  const areteEnAvant = (de: string, vers: string): boolean => {
    if (!choisi) return false;
    const amontOuChoisi = (x: string) => x === choisi || enAmont.has(x);
    const avalOuChoisi = (x: string) => x === choisi || enAval.has(x);
    return (amontOuChoisi(de) && amontOuChoisi(vers)) || (avalOuChoisi(de) && avalOuChoisi(vers));
  };

  /* --------------------------------------------------------------- décompte */
  const bilan = useMemo(() => {
    let acquis = 0;
    let enCours = 0;
    let ouvert = 0;
    for (const n of disposition.noeuds) {
      const e = etatDe(n);
      if (e === 'acquis') acquis++;
      else if (e === 'en-cours') enCours++;
      else if (e === 'ouvert') ouvert++;
    }
    return { acquis, enCours, ouvert, total: disposition.noeuds.length };
  }, [disposition, etatDe]);

  /* --------------------------------------------------------- export/import */
  const telecharger = useCallback(async () => {
    try {
      const donnees = await exporter();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(donnees, null, 2)], { type: 'application/json' })
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `muse-progression-${donnees.exporteLe.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(`${donnees.techniques.length} technique(s) exportée(s).`);
    } catch (e) {
      setMessage(`Export impossible : ${String(e)}`);
    }
  }, []);

  const reprendre = useCallback(
    async (fichier: File) => {
      try {
        const r = await importer(JSON.parse(await fichier.text()), new Set(parId.keys()));
        setProgression(await lireTout());
        setMessage(
          `${r.reprises} technique(s) reprise(s).` +
            (r.ignorees.length ? ` ${r.ignorees.length} inconnue(s) ignorée(s) : ${r.ignorees.join(', ')}.` : '')
        );
      } catch (e) {
        setMessage(e instanceof Error ? e.message : String(e));
      }
    },
    [parId]
  );

  const noeudChoisi = choisi ? place.get(choisi) : null;

  return (
    <div className="ar">
      <div className="ar__bilan" role="status">
        <Compteur n={bilan.acquis} de={bilan.total} k="tenues" ton="acquis" />
        <Compteur n={bilan.enCours} de={bilan.total} k="en travail" ton="en-cours" />
        <Compteur n={bilan.ouvert} de={bilan.total} k="ouvertes maintenant" ton="ouvert" />
      </div>

      <div className="ar__cadre">
        <div
          className="ar__scene"
          style={{ width: `${disposition.largeur}px`, height: `${disposition.hauteur}px` }}
        >
          <svg
            className="ar__aretes"
            viewBox={`0 0 ${disposition.largeur} ${disposition.hauteur}`}
            aria-hidden="true"
          >
            {disposition.aretes.map((a) => (
              <path
                key={`${a.de}→${a.vers}`}
                className={`ar__arete${areteEnAvant(a.de, a.vers) ? ' ar__arete--vive' : ''}${
                  choisi && !areteEnAvant(a.de, a.vers) ? ' ar__arete--pale' : ''
                }`}
                d={a.d}
              />
            ))}
          </svg>

          {disposition.noeuds.map((n) => {
            const etat = etatDe(n);
            const role = roleDe(n.id);
            const fam = familles.find((f) => f.id === n.famille);
            return (
              <button
                key={n.id}
                type="button"
                className={[
                  'ar__noeud',
                  `ar__noeud--${etat}`,
                  role ? `ar__noeud--${role}` : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  left: `${n.x}px`,
                  top: `${n.y}px`,
                  width: `${GRILLE.largeurNoeud}px`,
                  height: `${GRILLE.hauteurNoeud}px`,
                  // Couleur passée par variable CSS : Tailwind ne voit pas les
                  // classes calculées, et une table en dur se désynchroniserait
                  // de la taxonomie.
                  ['--fam' as string]: `var(${fam?.colorVar ?? '--c-tr'})`,
                }}
                data-noeud={n.id}
                aria-pressed={choisi === n.id}
                onClick={() => setChoisi((c) => (c === n.id ? null : n.id))}
              >
                <span className="ar__noeud-code">{n.code}</span>
                <span className="ar__noeud-nom">{n.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {noeudChoisi ? (
        <Panneau
          noeud={noeudChoisi}
          parId={parId}
          amontIds={enAmont}
          avancement={avancementDe(noeudChoisi.id)}
          avancementDe={avancementDe}
          etat={etatDe(noeudChoisi)}
          onAvancement={(a) => majAvancement(noeudChoisi.id, a)}
          onAller={setChoisi}
          onFermer={() => setChoisi(null)}
          fige={!pret}
        />
      ) : (
        <p className="ar__invite">
          Choisir une technique pour voir tout ce qu’elle demande en amont, tout ce qu’elle
          ouvre en aval, et noter où on en est.
        </p>
      )}

      <div className="ar__pied">
        <ul className="ar__legende">
          {familles.map((f) => (
            <li key={f.id}>
              <span className="ar__pastille" style={{ background: `var(${f.colorVar})` }} />
              {f.label}
            </li>
          ))}
        </ul>

        <div className="ar__transfert">
          <button type="button" className="ar__btn" onClick={telecharger}>
            Exporter
          </button>
          <label className="ar__btn ar__btn--fichier">
            Importer
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void reprendre(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {message && (
        <p className="ar__message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}

function Compteur({
  n,
  de,
  k,
  ton,
}: {
  n: number;
  de: number;
  k: string;
  ton: string;
}) {
  return (
    <p className={`ar__compteur ar__compteur--${ton}`}>
      <span className="ar__compteur-n">{n}</span>
      <span className="ar__compteur-k">
        {k} <span className="ar__compteur-de">sur {de}</span>
      </span>
    </p>
  );
}

/* --------------------------------------------------------------- panneau */

interface PanneauProps {
  noeud: NoeudPlace;
  parId: Map<string, NoeudGraphe>;
  amontIds: ReadonlySet<string>;
  avancement: Avancement;
  avancementDe: (id: string) => Avancement;
  etat: Etat;
  onAvancement: (a: Avancement) => void;
  onAller: (id: string) => void;
  onFermer: () => void;
  fige: boolean;
}

function Panneau({
  noeud,
  parId,
  amontIds,
  avancement,
  avancementDe,
  etat,
  onAvancement,
  onAller,
  onFermer,
  fige,
}: PanneauProps) {
  /** Les prérequis qui manquent encore, tous niveaux confondus. */
  const manquants = [...amontIds].filter((id) => avancementDe(id) !== 'acquis');

  const puce = (id: string) => {
    const n = parId.get(id);
    if (!n) return null;
    return (
      <li key={id}>
        <button
          type="button"
          className={`ar__puce ar__puce--${avancementDe(id)}`}
          onClick={() => onAller(id)}
        >
          {n.label}
        </button>
      </li>
    );
  };

  return (
    <section className="ar__panneau" aria-live="polite">
      <header className="ar__panneau-tete">
        <div>
          <p className="ar__panneau-code">{noeud.code}</p>
          <h2 className="ar__panneau-nom">{noeud.label}</h2>
        </div>
        <button type="button" className="ar__fermer" onClick={onFermer} aria-label="Fermer">
          ×
        </button>
      </header>

      {etat === 'verrouille' && manquants.length > 0 && (
        <p className="ar__manque">
          {manquants.length === 1
            ? 'Une technique manque en amont.'
            : `${manquants.length} techniques manquent en amont.`}{' '}
          Rien n’interdit de s’y mettre — mais c’est là qu’on gagne du temps.
        </p>
      )}

      <div className="ar__etats" role="group" aria-label="Où j’en suis">
        {AVANCEMENTS.map((a) => (
          <button
            key={a}
            type="button"
            className={`ar__etat ar__etat--${a}${avancement === a ? ' ar__etat--actif' : ''}`}
            aria-pressed={avancement === a}
            disabled={fige}
            onClick={() => onAvancement(a)}
            title={AVANCEMENT_SENS[a]}
          >
            {AVANCEMENT_LABELS[a]}
          </button>
        ))}
      </div>
      <p className="ar__sens">{AVANCEMENT_SENS[avancement]}</p>

      <div className="ar__relations">
        <div>
          <p className="ar__k">Demande en amont</p>
          {noeud.prerequis.length === 0 ? (
            <p className="ar__rien">Aucun prérequis — point d’entrée.</p>
          ) : (
            <ul className="ar__puces">{noeud.prerequis.map(puce)}</ul>
          )}
          {amontIds.size > noeud.prerequis.length && (
            <p className="ar__chaine">
              {amontIds.size} en tout, en remontant toute la chaîne.
            </p>
          )}
        </div>

        <div>
          <p className="ar__k">Ouvre en aval</p>
          {noeud.debloque.length === 0 ? (
            <p className="ar__rien">Aucune technique n’en dépend.</p>
          ) : (
            <ul className="ar__puces">{noeud.debloque.map(puce)}</ul>
          )}
        </div>
      </div>

      <a className="ar__lien" href={`/techniques/${noeud.id}`}>
        Ouvrir la fiche →
      </a>
    </section>
  );
}
