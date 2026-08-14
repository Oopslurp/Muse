/**
 * Promotion « observé » d'une affirmation — CLAUDE.md décision 1.
 *
 * Un bouton, une date, un commentaire libre. Posé partout où le contenu
 * avance quelque chose de vérifiable : la fiche, chaque `[À VÉRIFIER]`, chaque
 * exercice, chaque erreur typique, le protocole de séance.
 *
 * **La promotion n'écrase rien.** Le texte du doute reste écrit en toutes
 * lettres une fois levé, la pastille d'origine ne bouge pas. On ajoute une
 * ligne, on n'en retire aucune — c'est ce qui permet d'écrire « la source
 * affirme ceci, j'ai constaté cela ».
 *
 * Volontairement discret au repos : une fiche à neuf doutes afficherait sinon
 * neuf blocs de formulaire, et le contenu disparaîtrait sous l'outillage.
 */

import { useCallback, useEffect, useState, type SubmitEvent } from 'react';
import {
  aujourdhui,
  disponible,
  lirePourFiche,
  nommerElement,
  observer,
  retirer,
  type ObservationLigne,
} from '~/lib/observations';
import './Observer.css';

export interface ObserverProps {
  fiche: string;
  /** `fiche`, `seance`, `doute:0`, `erreur:2`, `exercice:a`… */
  element: string;
  /** Rendu compact, pour les listes denses de doutes et d'erreurs. */
  compact?: boolean;
}

const enFrancais = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function Observer({ fiche, element, compact = false }: ObserverProps) {
  const [ligne, setLigne] = useState<ObservationLigne | null>(null);
  const [pret, setPret] = useState(false);
  const [saisie, setSaisie] = useState(false);
  const [date, setDate] = useState(aujourdhui());
  const [note, setNote] = useState('');
  const [panne, setPanne] = useState<string | null>(null);

  useEffect(() => {
    if (!disponible()) {
      setPret(true);
      return;
    }
    lirePourFiche(fiche)
      .then((m) => setLigne(m.get(element) ?? null))
      .catch((e) => setPanne(String(e)))
      .finally(() => setPret(true));
  }, [fiche, element]);

  const enregistrer = useCallback(
    async (e: SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      try {
        setLigne(await observer(fiche, element, date, note));
        setSaisie(false);
        setPanne(null);
      } catch (err) {
        setPanne(`Enregistrement impossible : ${String(err)}`);
      }
    },
    [fiche, element, date, note]
  );

  const effacer = useCallback(async () => {
    try {
      await retirer(fiche, element);
      setLigne(null);
    } catch (err) {
      setPanne(`Suppression impossible : ${String(err)}`);
    }
  }, [fiche, element]);

  const ouvrir = () => {
    setDate(ligne?.date ?? aujourdhui());
    setNote(ligne?.note ?? '');
    setSaisie(true);
  };

  const quoi = nommerElement(element);

  if (saisie) {
    return (
      <form className="ob ob--saisie" onSubmit={enregistrer}>
        <label className="ob__champ">
          <span>Vérifié le</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="ob__champ">
          <span>Ce que j’ai constaté</span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Y compris un désaccord avec ce qui est écrit."
          />
        </label>
        <p className="ob__actions">
          <button type="submit" className="ob__btn">
            Enregistrer
          </button>
          <button type="button" className="ob__lien" onClick={() => setSaisie(false)}>
            Annuler
          </button>
        </p>
      </form>
    );
  }

  if (ligne) {
    return (
      <div className={`ob ob--fait${compact ? ' ob--compact' : ''}`}>
        <p className="ob__date">
          <span className="ob__marque" aria-hidden="true" />
          Observé le {enFrancais(ligne.date)}
        </p>
        {ligne.note && <p className="ob__note">{ligne.note}</p>}
        <p className="ob__actions">
          <button type="button" className="ob__lien" onClick={ouvrir}>
            Modifier
          </button>
          <button type="button" className="ob__lien" onClick={effacer}>
            Retirer
          </button>
        </p>
        {panne && <p className="ob__panne">{panne}</p>}
      </div>
    );
  }

  return (
    <div className={`ob${compact ? ' ob--compact' : ''}`}>
      <button
        type="button"
        className="ob__declencheur"
        disabled={!pret}
        onClick={ouvrir}
        aria-label={`Marquer ${quoi} comme vérifié guitare en main`}
      >
        Je l’ai vérifié
      </button>
      {panne && <p className="ob__panne">{panne}</p>}
    </div>
  );
}
