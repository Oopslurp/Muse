/**
 * Suivi d'une fiche — îlot React.
 *
 * Deux choses distinctes, volontairement côte à côte :
 *
 *  · **où j'en suis** — l'avancement, partagé avec l'arbre de compétences ;
 *  · **vérifié guitare en main** — la promotion `observé` de CLAUDE.md
 *    décision 1, avec sa date et son commentaire libre.
 *
 * La promotion **n'écrase pas l'origine**. La pastille de la fiche continue
 * d'afficher `sourcé` ou `déduit`, produite au build ; l'observation s'ajoute
 * à côté. Ce sont deux champs, jamais un enum unique — c'est écrit noir sur
 * blanc dans la décision, et c'est ce qui permet de dire « la source affirme
 * ceci, j'ai constaté cela ».
 *
 * L'état vit dans IndexedDB, donc il survit aux mises à jour du contenu : il
 * est indexé par identifiant de fiche, pas recopié dans le MDX.
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
import './SuiviFiche.css';

const aujourdhui = () => new Date().toISOString().slice(0, 10);

const enFrancais = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function SuiviFiche({ id }: { id: string }) {
  const [etat, setEtat] = useState<EtatTechnique | null>(null);
  const [pret, setPret] = useState(false);
  const [saisie, setSaisie] = useState(false);
  const [date, setDate] = useState(aujourdhui());
  const [note, setNote] = useState('');
  const [panne, setPanne] = useState<string | null>(null);

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
  }, [id]);

  const enregistrer = useCallback(
    async (modif: Partial<Omit<EtatTechnique, 'id' | 'maj'>>) => {
      try {
        setEtat(await ecrire(id, modif));
        setPanne(null);
      } catch (e) {
        setPanne(`Enregistrement impossible : ${String(e)}`);
      }
    },
    [id]
  );

  const avancement: Avancement = etat?.avancement ?? 'neuf';
  const obs = etat?.observation;

  const ouvrirSaisie = () => {
    setDate(obs?.date ?? aujourdhui());
    setNote(obs?.note ?? '');
    setSaisie(true);
  };

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
            onClick={() => enregistrer({ avancement: a })}
            title={AVANCEMENT_SENS[a]}
          >
            {AVANCEMENT_LABELS[a]}
          </button>
        ))}
      </div>

      <p className="sf__k sf__k--espace">Vérifié guitare en main</p>

      {obs && !saisie && (
        <div className="sf__obs">
          <p className="sf__obs-date">Observé le {enFrancais(obs.date)}</p>
          {obs.note && <p className="sf__obs-note">{obs.note}</p>}
          <p className="sf__obs-actions">
            <button type="button" className="sf__lien" onClick={ouvrirSaisie}>
              Modifier
            </button>
            <button
              type="button"
              className="sf__lien"
              onClick={() => enregistrer({ observation: undefined })}
            >
              Retirer
            </button>
          </p>
        </div>
      )}

      {!obs && !saisie && (
        <>
          <p className="sf__invite">
            Marquer une fiche observée ne remplace pas son origine&nbsp;: elle reste
            sourcée ou déduite. C’est ce qui permet d’écrire «&nbsp;la source affirme
            ceci, j’ai constaté cela&nbsp;».
          </p>
          <button type="button" className="sf__btn" disabled={!pret} onClick={ouvrirSaisie}>
            Je l’ai vérifiée
          </button>
        </>
      )}

      {saisie && (
        <form
          className="sf__form"
          onSubmit={(e) => {
            e.preventDefault();
            void enregistrer({
              observation: { date, note: note.trim() || undefined },
            });
            setSaisie(false);
          }}
        >
          <label className="sf__champ">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="sf__champ">
            <span>Ce que j’ai constaté</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Y compris un désaccord avec la fiche."
            />
          </label>
          <p className="sf__form-actions">
            <button type="submit" className="sf__btn">
              Enregistrer
            </button>
            <button type="button" className="sf__lien" onClick={() => setSaisie(false)}>
              Annuler
            </button>
          </p>
        </form>
      )}

      {panne && <p className="sf__panne">{panne}</p>}
    </section>
  );
}
