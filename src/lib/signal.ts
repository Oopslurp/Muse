/**
 * Signaux sonores du minuteur.
 *
 * Pourquoi ils ne sont pas du confort
 * -----------------------------------
 * Les champs santé sont une contrainte de build (CLAUDE.md décision 3) : une
 * fiche sans `dureeMax` ni `signalArret` ne compile pas. Mais l'alerte de
 * dépassement n'était que **visuelle** — or on travaille en regardant ses
 * mains, pas l'écran. Une alarme qu'on ne peut pas voir n'est pas une alarme.
 *
 * Trois signaux, trois formes distinctes à l'oreille :
 *
 * | Signal | Ce qu'il dit | Forme |
 * |---|---|---|
 * | `travail` | La série reprend | Deux notes montantes, brèves |
 * | `repos` | La série s'arrête, mains relâchées | Deux notes descendantes |
 * | `limite` | Durée maximale atteinte | Trois notes graves, plus insistantes |
 *
 * Volontairement **courts et sourds** : on est en train de jouer, un signal
 * agressif fait sursauter et gâche la prise.
 *
 * ⚠️ Aucun fichier à télécharger. Trois oscillateurs, comme le métronome.
 */

export type Signal = 'travail' | 'repos' | 'limite';

/** Fréquences en hertz, dans l'ordre où elles sonnent. */
const MOTIFS: Record<Signal, { notes: number[]; duree: number; volume: number }> = {
  travail: { notes: [660, 880], duree: 0.09, volume: 0.5 },
  repos: { notes: [880, 587], duree: 0.11, volume: 0.42 },
  // Plus grave, plus long, trois fois : c'est le seul des trois qui doive
  // interrompre ce qu'on est en train de faire.
  limite: { notes: [392, 392, 330], duree: 0.16, volume: 0.6 },
};

let ctx: AudioContext | null = null;

/**
 * Joue un signal.
 *
 * Le contexte audio est créé à la première demande et réutilisé : en ouvrir un
 * par signal épuiserait la limite du navigateur en une séance.
 */
export async function jouerSignal(signal: Signal, actif = true): Promise<void> {
  if (!actif || typeof AudioContext === 'undefined') return;

  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return; // Pas de geste utilisateur : on renonce sans casser le minuteur.
    }
  }

  const { notes, duree, volume } = MOTIFS[signal];
  const depart = ctx.currentTime + 0.02;

  notes.forEach((hz, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    const quand = depart + i * (duree + 0.05);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(hz, quand);

    // Attaque douce : une rampe abrupte claque et fait sursauter.
    gain.gain.setValueAtTime(0.0001, quand);
    gain.gain.exponentialRampToValueAtTime(volume, quand + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, quand + duree);

    osc.connect(gain);
    gain.connect(ctx!.destination);
    osc.start(quand);
    osc.stop(quand + duree + 0.02);
  });
}

/** Libère le contexte. À appeler quand le minuteur disparaît. */
export function fermerSignaux(): void {
  void ctx?.close();
  ctx = null;
}
