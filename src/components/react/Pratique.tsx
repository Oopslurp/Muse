/**
 * Atelier de pratique — îlot React.
 *
 * Assemble trois outils qui se parlent : le métronome donne le tempo, le
 * minuteur donne les minutes, et le journal reprend les deux sans qu'on ait à
 * les recopier. Un journal qu'il faut remplir de mémoire ne se remplit pas.
 *
 * Choisir une technique charge ses champs santé — durée maximale, séries,
 * signal d'arrêt — qui sont obligatoires sur chaque fiche (CLAUDE.md
 * décision 3). Le signal d'arrêt s'affiche **près du chronomètre**.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Metronome from './Metronome';
import Minuteur from './Minuteur';
import Journal, { type FicheBreve } from './Journal';
import {
  ajouterSeance,
  bilan,
  lireSeances,
  supprimerSeance,
  type Seance,
} from '~/lib/journal';
import { disponible } from '~/lib/base';
import './Pratique.css';

export interface FichePratique extends FicheBreve {
  dureeMax: number;
  reposMin: number;
  risque: 'faible' | 'modere' | 'eleve';
  avertissementSante?: string | undefined;
  series?: { travailSecondes: number; reposSecondes: number; nombre: number } | undefined;
  /** Tempo de départ d'un palier, s'il y en a un en bpm. */
  tempoDepart?: number | undefined;
}

export interface PratiqueProps {
  fiches: FichePratique[];
}

export default function Pratique({ fiches }: PratiqueProps) {
  const [choisie, setChoisie] = useState<string | null>(null);
  const [seances, setSeances] = useState<Seance[]>([]);
  const [minutes, setMinutes] = useState(0);
  const [tempo, setTempo] = useState(72);
  const [message, setMessage] = useState<string | null>(null);

  const fiche = useMemo(
    () => fiches.find((f) => f.id === choisie) ?? null,
    [fiches, choisie]
  );

  /**
   * `?technique=<id>` — lu ici, pas dans le frontmatter Astro.
   *
   * ⚠️ Le site est construit en statique : `Astro.url.searchParams` est vide
   * au build et le restera pour tous les visiteurs. Une présélection venue de
   * l'URL ne peut se faire que dans le navigateur. Défaut attrapé par
   * `audit:pratique`, pas à l'usage.
   */
  useEffect(() => {
    const demandee = new URLSearchParams(window.location.search).get('technique');
    if (demandee && fiches.some((f) => f.id === demandee)) setChoisie(demandee);
  }, [fiches]);

  useEffect(() => {
    if (!disponible()) {
      setMessage('Ce navigateur n’expose pas IndexedDB : le journal ne sera pas conservé.');
      return;
    }
    lireSeances()
      .then(setSeances)
      .catch((e) => setMessage(`Journal illisible : ${String(e)}`));
  }, []);

  // Le tempo de départ du palier vaut mieux que 72 par défaut : c'est celui
  // auquel la fiche dit de commencer.
  useEffect(() => {
    if (fiche?.tempoDepart) setTempo(fiche.tempoDepart);
  }, [fiche]);

  const ajouter = useCallback(async (s: Omit<Seance, 'id'>) => {
    try {
      await ajouterSeance(s);
      setSeances(await lireSeances());
      setMessage(null);
    } catch (e) {
      setMessage(`Enregistrement impossible : ${String(e)}`);
    }
  }, []);

  const supprimer = useCallback(async (id: number) => {
    try {
      await supprimerSeance(id);
      setSeances(await lireSeances());
    } catch (e) {
      setMessage(`Suppression impossible : ${String(e)}`);
    }
  }, []);

  const b = useMemo(() => (choisie ? bilan(seances, choisie) : null), [seances, choisie]);

  return (
    <div className="pr">
      <div className="pr__barre">
        <label className="pr__pilule">
          <span className="pr__hors-ecran">Technique travaillée</span>
          <select value={choisie ?? ''} onChange={(e) => setChoisie(e.target.value || null)}>
            <option value="">Séance libre — sans technique</option>
            {fiches.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>
        </label>

        {fiche && (
          <a className="pr__lien" href={`/techniques/${fiche.id}`}>
            Ouvrir la fiche →
          </a>
        )}
      </div>

      {fiche?.risque === 'eleve' && fiche.avertissementSante && (
        <p className="pr__avertissement" role="alert">
          <strong>Risque élevé.</strong> {fiche.avertissementSante}
        </p>
      )}

      <div className="pr__outils">
        <Metronome bpm={tempo} onBpm={setTempo} />
        <Minuteur
          dureeMax={fiche?.dureeMax}
          reposMin={fiche?.reposMin}
          signalArret={fiche?.signalArret}
          series={fiche?.series}
          surMinutes={setMinutes}
        />
      </div>

      {b && b.seances > 0 && (
        <section className="pr__bilan">
          <h2 className="pr__bilan-titre">Sur cette technique</h2>
          <div className="pr__chiffres">
            <p>
              <span>{b.seances}</span> séance{b.seances > 1 ? 's' : ''}
            </p>
            <p>
              <span>{Math.round(b.minutes)}</span> minutes cumulées
            </p>
            {b.meilleurTempo && (
              <p>
                <span>♩ {b.meilleurTempo.valeur}</span> atteint
              </p>
            )}
          </div>
          {b.arrets.length > 0 && (
            <p className="pr__arrets">
              <strong>
                {b.arrets.length} signal{b.arrets.length > 1 ? 'ux' : ''} d’arrêt
              </strong>{' '}
              noté{b.arrets.length > 1 ? 's' : ''} sur cette technique, le dernier le{' '}
              {b.arrets[0]!.date}. Une série de signaux se lit comme une charge trop
              élevée, pas comme une suite de mauvais jours.
            </p>
          )}
        </section>
      )}

      <Journal
        seances={seances}
        fiches={fiches}
        techniqueParDefaut={choisie}
        minutesParDefaut={minutes}
        tempoParDefaut={tempo}
        onAjouter={ajouter}
        onSupprimer={supprimer}
      />

      {message && <p className="pr__message">{message}</p>}
    </div>
  );
}
