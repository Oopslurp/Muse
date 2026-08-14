/**
 * Suivi d'une fiche — îlot React.
 *
 * Deux choses distinctes, volontairement côte à côte :
 *
 *  · **où j'en suis** — l'avancement, partagé avec l'arbre de compétences ;
 *  · **ce que j'ai vérifié** — les promotions `observé` de CLAUDE.md
 *    décision 1, qui portent désormais sur **chaque affirmation** et non sur
 *    la fiche entière.
 *
 * Ce bloc n'en porte donc plus qu'une : celle de la fiche dans son ensemble.
 * Les autres vivent là où l'affirmation est écrite — sous chaque doute, chaque
 * exercice, chaque erreur, et sous le protocole de séance. Il ne reste ici
 * qu'un décompte, pour savoir où en est la fiche sans la parcourir.
 *
 * La promotion **n'écrase pas l'origine** : la pastille produite au build
 * continue d'afficher `sourcé` ou `déduit`. Deux champs, jamais un enum.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AVANCEMENTS,
  AVANCEMENT_LABELS,
  AVANCEMENT_SENS,
  disponible,
  ecrire,
  lireTout,
  type Avancement,
  type EtatTechnique,
} from '~/lib/progression';
import { lirePourFiche } from '~/lib/observations';
import Observer from './Observer';
import './SuiviFiche.css';

export interface SuiviFicheProps {
  id: string;
  /** Nombre d'affirmations promouvables sur cette fiche, calculé au build. */
  promouvables: number;
}

export default function SuiviFiche({ id, promouvables }: SuiviFicheProps) {
  const [etat, setEtat] = useState<EtatTechnique | null>(null);
  const [observees, setObservees] = useState(0);
  const [pret, setPret] = useState(false);
  const [panne, setPanne] = useState<string | null>(null);

  const recharger = useCallback(() => {
    lirePourFiche(id)
      .then((m) => setObservees(m.size))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!disponible()) {
      setPanne('Ce navigateur n’expose pas IndexedDB : rien ne sera conservé.');
      setPret(true);
      return;
    }
    lireTout()
      .then((m) => setEtat(m.get(id) ?? null))
      .catch((e) => setPanne(String(e)))
      .finally(() => setPret(true));
    recharger();
  }, [id, recharger]);

  // Les promotions vivent dans d'autres îlots : on rafraîchit le décompte au
  // retour sur l'onglet plutôt que d'inventer un canal entre composants.
  useEffect(() => {
    const surRetour = () => {
      if (!document.hidden) recharger();
    };
    document.addEventListener('visibilitychange', surRetour);
    return () => document.removeEventListener('visibilitychange', surRetour);
  }, [recharger]);

  const enregistrer = useCallback(
    async (a: Avancement) => {
      try {
        setEtat(await ecrire(id, { avancement: a }));
        setPanne(null);
      } catch (e) {
        setPanne(`Enregistrement impossible : ${String(e)}`);
      }
    },
    [id]
  );

  const avancement: Avancement = etat?.avancement ?? 'neuf';

  return (
    <section className="sf">
      <p className="sf__k">Travailler</p>
      <a className="sf__atelier" href={`/pratique?technique=${encodeURIComponent(id)}`}>
        Ouvrir l’atelier →
        <span>métronome, minuteur et journal, réglés sur cette fiche</span>
      </a>

      <p className="sf__k sf__k--espace">Où j’en suis</p>
      <div className="sf__etats" role="group" aria-label="Où j’en suis">
        {AVANCEMENTS.map((a) => (
          <button
            key={a}
            type="button"
            className={`sf__etat${avancement === a ? ' sf__etat--actif' : ''}${
              a === 'acquis' ? ' sf__etat--acquis' : ''
            }`}
            aria-pressed={avancement === a}
            disabled={!pret}
            onClick={() => enregistrer(a)}
            title={AVANCEMENT_SENS[a]}
          >
            {AVANCEMENT_LABELS[a]}
          </button>
        ))}
      </div>

      <p className="sf__k sf__k--espace">Vérifié guitare en main</p>

      <p className="sf__decompte">
        <strong>
          {observees} sur {promouvables}
        </strong>{' '}
        affirmation{promouvables > 1 ? 's' : ''} de cette fiche
        {observees > 1 ? ' ont' : ' a'} été vérifiée{observees > 1 ? 's' : ''}.
      </p>
      <p className="sf__aide">
        Chaque point à vérifier, chaque exercice, chaque erreur et le protocole se
        promeuvent séparément, là où ils sont écrits. Marquer une affirmation observée
        n’efface ni son origine ni son doute&nbsp;: on ajoute une ligne, on n’en retire
        aucune.
      </p>

      {/* La fiche dans son ensemble : « j'ai lu, j'ai essayé, ça tient ». */}
      <Observer fiche={id} element="fiche" />

      {panne && <p className="sf__panne">{panne}</p>}
    </section>
  );
}
