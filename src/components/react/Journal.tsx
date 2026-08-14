/**
 * Journal de séances — saisie et historique.
 *
 * Six champs, dont quatre facultatifs. Un journal qui en demande dix ne se
 * remplit pas, et un journal vide ne sert à rien.
 *
 * Le champ « signal d'arrêt rencontré » n'est pas décoratif : les premiers
 * signes d'une blessure sont typiquement pris pour un défaut de technique, ce
 * qui pousse à travailler plus (CLAUDE.md décision 3). Un signal isolé ne dit
 * rien ; trois en deux semaines sur la même technique, si — et c'est le seul
 * endroit où ça se verra.
 */

import { useMemo, useState, type SubmitEvent } from 'react';
import { aujourdhui, type Seance } from '~/lib/journal';
import './Journal.css';

export interface FicheBreve {
  id: string;
  nom: string;
  signalArret: readonly string[];
}

export interface JournalProps {
  seances: readonly Seance[];
  fiches: readonly FicheBreve[];
  /** Présélection venue du minuteur et du métronome. */
  techniqueParDefaut: string | null;
  minutesParDefaut: number;
  tempoParDefaut: number;
  onAjouter: (s: Omit<Seance, 'id' | 'uid'>) => void | Promise<void>;
  onSupprimer: (id: number) => void | Promise<void>;
}

const enFrancais = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function Journal({
  seances,
  fiches,
  techniqueParDefaut,
  minutesParDefaut,
  tempoParDefaut,
  onAjouter,
  onSupprimer,
}: JournalProps) {
  const [date, setDate] = useState(aujourdhui());
  const [technique, setTechnique] = useState<string>(techniqueParDefaut ?? '');
  const [minutes, setMinutes] = useState<string>('');
  const [tempo, setTempo] = useState<string>('');
  const [arret, setArret] = useState('');
  const [note, setNote] = useState('');
  const [ouvert, setOuvert] = useState(false);

  const nomDe = useMemo(
    () => new Map(fiches.map((f) => [f.id, f.nom])),
    [fiches]
  );
  const signaux = fiches.find((f) => f.id === (technique || techniqueParDefaut))?.signalArret ?? [];

  const minutesEffectives = Number(minutes || minutesParDefaut || 0);
  const tempoEffectif = Number(tempo || tempoParDefaut || 0);

  const soumettre = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (minutesEffectives <= 0) return;
    await onAjouter({
      date,
      technique: technique || null,
      minutes: Math.round(minutesEffectives),
      tempo: tempoEffectif > 0 ? { valeur: Math.round(tempoEffectif), unite: 'bpm' } : undefined,
      arret: arret || undefined,
      note: note.trim() || undefined,
    });
    setMinutes('');
    setTempo('');
    setArret('');
    setNote('');
    setOuvert(false);
  };

  return (
    <section className="jo">
      <header className="jo__tete">
        <h2 className="jo__titre">Journal</h2>
        <button type="button" className="jo__btn" onClick={() => setOuvert((o) => !o)}>
          {ouvert ? 'Annuler' : 'Noter une séance'}
        </button>
      </header>

      {ouvert && (
        <form className="jo__form" onSubmit={soumettre}>
          <div className="jo__ligne">
            <label className="jo__champ">
              <span>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>

            <label className="jo__champ jo__champ--large">
              <span>Technique</span>
              <select value={technique} onChange={(e) => setTechnique(e.target.value)}>
                <option value="">Séance libre</option>
                {fiches.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </label>

            <label className="jo__champ jo__champ--court">
              <span>Minutes</span>
              <input
                type="number"
                min={1}
                max={600}
                value={minutes}
                placeholder={minutesParDefaut ? String(minutesParDefaut) : ''}
                onChange={(e) => setMinutes(e.target.value)}
                required={!minutesParDefaut}
              />
            </label>

            <label className="jo__champ jo__champ--court">
              <span>Tempo atteint</span>
              <input
                type="number"
                min={20}
                max={300}
                value={tempo}
                placeholder={tempoParDefaut ? String(tempoParDefaut) : 'bpm'}
                onChange={(e) => setTempo(e.target.value)}
              />
            </label>
          </div>

          {signaux.length > 0 && (
            <label className="jo__champ">
              <span>Un signal d’arrêt est-il apparu&nbsp;?</span>
              <select value={arret} onChange={(e) => setArret(e.target.value)}>
                <option value="">Non</option>
                {signaux.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="jo__champ">
            <span>Note</span>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ce qui a marché, ce qui a bloqué."
            />
          </label>

          <button type="submit" className="jo__btn jo__btn--fort">
            Enregistrer
          </button>
        </form>
      )}

      {seances.length === 0 ? (
        <p className="jo__vide">
          Aucune séance notée. Le journal ne sert qu’une fois qu’il y en a plusieurs&nbsp;:
          c’est la série qui montre une tendance, pas la ligne isolée.
        </p>
      ) : (
        <ul className="jo__liste">
          {seances.map((s) => (
            <li key={s.id} className={`jo__seance${s.arret ? ' jo__seance--arret' : ''}`}>
              <span className="jo__date">{enFrancais(s.date)}</span>
              <span className="jo__quoi">
                {s.technique ? (nomDe.get(s.technique) ?? s.technique) : 'Séance libre'}
              </span>
              <span className="jo__minutes">{s.minutes} min</span>
              <span className="jo__tempo">
                {s.tempo ? `♩ ${s.tempo.valeur}` : ''}
              </span>
              <button
                type="button"
                className="jo__supprimer"
                onClick={() => {
                  if (s.id === undefined) return;
                  // Un clic détruisait une séance sans retour possible et sans
                  // corbeille. On nomme ce qu'on efface plutôt que de demander
                  // « êtes-vous sûr ? », qui ne dit rien.
                  const quoi = s.technique ? (nomDe.get(s.technique) ?? s.technique) : 'séance libre';
                  const ok = window.confirm(
                    `Supprimer la séance du ${enFrancais(s.date)} — ${quoi}, ${s.minutes} min ?`
                  );
                  if (ok) void onSupprimer(s.id);
                }}
                aria-label="Supprimer cette séance"
              >
                ×
              </button>
              {s.arret && <p className="jo__arret">Signal d’arrêt&nbsp;: {s.arret}</p>}
              {s.note && <p className="jo__note">{s.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
