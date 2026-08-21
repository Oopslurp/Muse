/**
 * Filtres de la bibliothèque — premier îlot React du site (CLAUDE.md, décision 8).
 *
 * Justifie son hydratation : quatre facettes combinables, une recherche
 * textuelle et un décompte en temps réel. En statique, il faudrait
 * pré-générer toutes les combinaisons.
 *
 * L'état est reflété dans l'URL. Une vue filtrée doit pouvoir se mettre en
 * favori et se recharger telle quelle — c'est aussi ce qui permet aux liens
 * « famille » des fiches de retomber sur la bonne sélection.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { chemin } from '~/lib/chemins';
import './FiltreTechniques.css';

export interface FicheResume {
  id: string;
  code: string;
  nom: string;
  nomEn: string;
  nomEs: string;
  alias: string[];
  famille: string;
  familleLabel: string;
  familleColorVar: string;
  style: string;
  styleLabel: string;
  difficulte: number;
  profondeur: 'complete' | 'courte';
  statut: string;
  statutLabel: string;
  statutColorVar: string;
  statutPointille: boolean;
  sonCible: string;
  nbDoutes: number;
  risque: 'faible' | 'modere' | 'eleve';
}

interface Facette<T extends string | number> {
  cle: T;
  label: string;
  colorVar?: string;
}

interface Props {
  fiches: FicheResume[];
  familles: Array<Facette<string>>;
  styles: Array<Facette<string>>;
  statuts: Array<Facette<string>>;
  difficultes: Array<Facette<number>>;
}

type Selection = {
  famille: Set<string>;
  style: Set<string>;
  statut: Set<string>;
  difficulte: Set<number>;
  profondeur: Set<string>;
};

const CLES = ['famille', 'style', 'statut', 'difficulte', 'profondeur'] as const;

function selectionVide(): Selection {
  return {
    famille: new Set(),
    style: new Set(),
    statut: new Set(),
    difficulte: new Set(),
    profondeur: new Set(),
  };
}

/** Lit la sélection depuis l'URL, pour qu'un lien filtré s'ouvre filtré. */
function depuisUrl(): { sel: Selection; q: string } {
  const sel = selectionVide();
  let q = '';
  if (typeof window === 'undefined') return { sel, q };
  const p = new URLSearchParams(window.location.search);
  q = p.get('q') ?? '';
  for (const cle of CLES) {
    const brut = p.get(cle);
    if (!brut) continue;
    for (const v of brut.split(',').filter(Boolean)) {
      if (cle === 'difficulte') sel.difficulte.add(Number(v));
      else sel[cle].add(v);
    }
  }
  return { sel, q };
}

function versUrl(sel: Selection, q: string): void {
  const p = new URLSearchParams();
  for (const cle of CLES) {
    const s = sel[cle];
    if (s.size) p.set(cle, [...s].join(','));
  }
  if (q.trim()) p.set('q', q.trim());
  const url = p.toString() ? `?${p}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}

function normaliser(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export default function FiltreTechniques({
  fiches,
  familles,
  styles,
  statuts,
  difficultes,
}: Props) {
  const [sel, setSel] = useState<Selection>(selectionVide);
  const [q, setQ] = useState('');
  const [pret, setPret] = useState(false);

  // La lecture de l'URL attend le montage : le composant est rendu côté
  // serveur, où `window` n'existe pas.
  useEffect(() => {
    const { sel: s, q: texte } = depuisUrl();
    setSel(s);
    setQ(texte);
    setPret(true);
  }, []);

  useEffect(() => {
    if (pret) versUrl(sel, q);
  }, [sel, q, pret]);

  const basculer = useCallback(
    <K extends keyof Selection>(cle: K, valeur: Selection[K] extends Set<infer V> ? V : never) => {
      setSel((prev) => {
        const suivant = { ...prev, [cle]: new Set(prev[cle] as Set<unknown>) } as Selection;
        const ens = suivant[cle] as Set<unknown>;
        if (ens.has(valeur)) ens.delete(valeur);
        else ens.add(valeur);
        return suivant;
      });
    },
    []
  );

  const reinitialiser = useCallback(() => {
    setSel(selectionVide());
    setQ('');
  }, []);

  const recherche = useMemo(() => normaliser(q.trim()), [q]);

  const visibles = useMemo(() => {
    return fiches.filter((f) => {
      if (sel.famille.size && !sel.famille.has(f.famille)) return false;

      // « les-deux » appartient réellement aux deux mondes : filtrer sur
      // « classique » doit le remonter, sinon le filtre ment par omission.
      if (sel.style.size) {
        const correspond =
          sel.style.has(f.style) ||
          (f.style === 'les-deux' &&
            (sel.style.has('classique') || sel.style.has('moderne')));
        if (!correspond) return false;
      }

      if (sel.statut.size && !sel.statut.has(f.statut)) return false;
      if (sel.difficulte.size && !sel.difficulte.has(f.difficulte)) return false;
      if (sel.profondeur.size && !sel.profondeur.has(f.profondeur)) return false;
      if (recherche) {
        const foin = normaliser(
          [f.nom, f.nomEn, f.nomEs, f.code, f.sonCible, ...f.alias].join(' ')
        );
        if (!foin.includes(recherche)) return false;
      }
      return true;
    });
  }, [fiches, sel, recherche]);

  const nbActifs =
    CLES.reduce((n, c) => n + (sel[c] as Set<unknown>).size, 0) + (recherche ? 1 : 0);

  return (
    <div className="ft">
      <div className="ft__barre">
        <label className="ft__rech">
          <span className="ft__sr">Rechercher une technique</span>
          <svg viewBox="0 0 20 20" aria-hidden="true" className="ft__loupe">
            <circle cx="8.6" cy="8.6" r="5.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="m12.7 12.7 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="butée, tremolo, cejilla, MD-08…"
            autoComplete="off"
          />
        </label>

        <p className="ft__compte" aria-live="polite">
          <strong>{visibles.length}</strong> sur {fiches.length}
        </p>

        {nbActifs > 0 && (
          <button type="button" className="ft__reset" onClick={reinitialiser}>
            Tout effacer
          </button>
        )}
      </div>

      <div className="ft__facettes">
        <Groupe titre="Famille">
          {familles.map((f) => (
            <Puce
              key={f.cle}
              actif={sel.famille.has(f.cle)}
              colorVar={f.colorVar}
              onClick={() => basculer('famille', f.cle)}
            >
              {f.label}
            </Puce>
          ))}
        </Groupe>

        <Groupe titre="Difficulté">
          {difficultes.map((d) => (
            <Puce
              key={d.cle}
              actif={sel.difficulte.has(d.cle)}
              onClick={() => basculer('difficulte', d.cle)}
              titre={d.label}
            >
              {d.cle}
            </Puce>
          ))}
        </Groupe>

        <Groupe titre="Style">
          {styles.map((s) => (
            <Puce key={s.cle} actif={sel.style.has(s.cle)} onClick={() => basculer('style', s.cle)}>
              {s.label}
            </Puce>
          ))}
        </Groupe>

        <Groupe titre="Statut">
          {statuts.map((s) => (
            <Puce
              key={s.cle}
              actif={sel.statut.has(s.cle)}
              colorVar={s.colorVar}
              onClick={() => basculer('statut', s.cle)}
            >
              {s.label}
            </Puce>
          ))}
        </Groupe>

        <Groupe titre="Profondeur">
          <Puce
            actif={sel.profondeur.has('complete')}
            onClick={() => basculer('profondeur', 'complete')}
          >
            Approfondie
          </Puce>
          <Puce
            actif={sel.profondeur.has('courte')}
            onClick={() => basculer('profondeur', 'courte')}
          >
            Courte
          </Puce>
        </Groupe>
      </div>

      {visibles.length === 0 ? (
        <p className="ft__vide">
          Aucune technique ne correspond. <button type="button" onClick={reinitialiser}>Effacer les filtres</button>
        </p>
      ) : (
        <ul className="ft__grille">
          {visibles.map((f) => (
            <li key={f.id}>
              <a
                className="fiche"
                href={chemin(`/techniques/${f.id}`)}
                style={{ ['--accent' as string]: `var(${f.familleColorVar})` }}
              >
                <span className="fiche__edge" aria-hidden="true" />
                <span className="fiche__tete">
                  <span className="fiche__code">{f.code}</span>
                  <span className="fiche__pips" aria-label={`Difficulté ${f.difficulte} sur 5`}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className={i <= f.difficulte ? 'pip pip--on' : 'pip'} />
                    ))}
                  </span>
                </span>

                <span className="fiche__nom">{f.nom}</span>
                <span className="fiche__son">{f.sonCible}</span>

                <span className="fiche__pied">
                  <span
                    className={f.statutPointille ? 'statut statut--pointille' : 'statut'}
                    style={{ ['--sc' as string]: `var(${f.statutColorVar})` }}
                  >
                    <span className="statut__dot" />
                    {f.statutLabel}
                  </span>
                  {f.profondeur === 'complete' && <span className="fiche__tag">approfondie</span>}
                  {f.nbDoutes > 0 && (
                    <span className="fiche__doutes" title={`${f.nbDoutes} point(s) à vérifier`}>
                      {f.nbDoutes} à vérifier
                    </span>
                  )}
                  {f.risque === 'eleve' && (
                    <span className="fiche__risque" title="Technique à risque physique élevé">
                      risque élevé
                    </span>
                  )}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <fieldset className="grp">
      <legend>{titre}</legend>
      <div className="grp__puces">{children}</div>
    </fieldset>
  );
}

function Puce({
  actif,
  colorVar,
  titre,
  onClick,
  children,
}: {
  actif: boolean;
  colorVar?: string | undefined;
  titre?: string | undefined;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={actif ? 'puce puce--on' : 'puce'}
      aria-pressed={actif}
      title={titre}
      onClick={onClick}
      style={colorVar ? ({ ['--pc' as string]: `var(${colorVar})` } as React.CSSProperties) : undefined}
    >
      {children}
    </button>
  );
}
