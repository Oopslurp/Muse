/**
 * Faux microphone : un fichier WAV qu'on donne à Chrome à la place du micro.
 *
 * Sert à `audit:accordeur` et à `shot`, qui doivent tous deux voir l'accordeur
 * en marche sans guitare.
 *
 * ⚠️ Le fichier commence par du silence : l'accordeur calibre le bruit de la
 * pièce pendant ses deux premières secondes. Une note tenue pendant le
 * calibrage placerait le seuil au-dessus d'elle et le gate ne s'ouvrirait
 * jamais.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FE = 48000;

/** WAV PCM 16 bits mono — le seul format accepté par le drapeau de Chrome. */
function ecrireWav(chemin, echantillons, frequence) {
  const donnees = Buffer.alloc(echantillons.length * 2);
  for (let i = 0; i < echantillons.length; i++) {
    const v = Math.max(-1, Math.min(1, echantillons[i]));
    donnees.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const entete = Buffer.alloc(44);
  entete.write('RIFF', 0);
  entete.writeUInt32LE(36 + donnees.length, 4);
  entete.write('WAVE', 8);
  entete.write('fmt ', 12);
  entete.writeUInt32LE(16, 16);
  entete.writeUInt16LE(1, 20); // PCM
  entete.writeUInt16LE(1, 22); // mono
  entete.writeUInt32LE(frequence, 24);
  entete.writeUInt32LE(frequence * 2, 28);
  entete.writeUInt16LE(2, 32);
  entete.writeUInt16LE(16, 34);
  entete.write('data', 36);
  entete.writeUInt32LE(donnees.length, 40);
  writeFileSync(chemin, Buffer.concat([entete, donnees]));
}

/**
 * Fabrique une corde pincée et renvoie le chemin du WAV.
 *
 * @param hz fréquence de la note juste
 * @param ecartCents désaccord voulu, en cents
 * @param nom nom du fichier, pour ne pas mélanger deux notes
 */
export function fabriquerCorde(hz, ecartCents = 0, nom = 'corde') {
  const silence = 3;
  const tenue = 10;
  const f = hz * 2 ** (ecartCents / 1200);
  const buf = new Float32Array(FE * (silence + tenue));
  // Fondamental plus deux harmoniques : c'est leur présence qui fait sauter
  // les accordeurs à l'octave sur les cordes graves.
  for (let i = FE * silence; i < buf.length; i++) {
    const t = (i - FE * silence) / FE;
    buf[i] =
      0.32 *
      (Math.sin(2 * Math.PI * f * t) +
        0.5 * Math.sin(4 * Math.PI * f * t) +
        0.25 * Math.sin(6 * Math.PI * f * t));
  }
  const dossier = join(tmpdir(), 'muse-faux-micro');
  mkdirSync(dossier, { recursive: true });
  const chemin = join(dossier, `${nom}.wav`);
  ecrireWav(chemin, buf, FE);
  return chemin;
}

/** Drapeaux Chrome pour brancher ce fichier à la place du micro. */
export const drapeauxFauxMicro = (wav) => [
  '--use-fake-device-for-media-stream',
  `--use-file-for-fake-audio-capture=${wav}`,
  '--autoplay-policy=no-user-gesture-required',
];
