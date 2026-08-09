/**
 * Catalogue global des sources.
 *
 * Les fiches ne stockent qu'un `id` et une phrase de pertinence locale.
 * *Pumping Nylon* apparaît dans une quinzaine de fiches : le dupliquer
 * garantirait des divergences.
 *
 * Champ `visionne` : obligatoire pour les sources vidéo. Aucune vidéo n'a été
 * visionnée pendant la recherche — le site doit le dire plutôt que de laisser
 * croire le contraire (CLAUDE.md, règle de fond 3).
 *
 * Référence : docs/research/01-sources.md
 */

export type SourceKind =
  | 'methode'
  | 'partition'
  | 'cours-ligne'
  | 'article'
  | 'video'
  | 'academique'
  | 'medical'
  | 'documentation';

export interface SourceEntry {
  auteur: string;
  titre: string;
  kind: SourceKind;
  annee?: number;
  editeur?: string;
  url?: string;
  acces?: 'gratuit' | 'payant' | 'emprunt' | 'domaine-public';
  /** Vidéo uniquement. `false` = qualifiée d'après sa description, pas vue. */
  visionne?: boolean;
}

export const SOURCES = {
  'tennant-pumping-nylon': {
    auteur: 'Scott Tennant',
    titre: "Pumping Nylon: The Classical Guitarist's Technique Handbook",
    kind: 'methode',
    annee: 1995,
    editeur: 'Alfred',
    url: 'https://www.thisisclassicalguitar.com/pumping-nylon-scott-tennant/',
    acces: 'payant',
  },
  'carlevaro-cuaderno-1': {
    auteur: 'Abel Carlevaro',
    titre: 'Serie Didáctica para Guitarra, Cuaderno n°1 — Escalas diatónicas',
    kind: 'methode',
    annee: 1966,
    url: 'https://www.stringsbymail.com/carlevaro-cuadernos-didactic-series-for-solo-guitar-1-4-18205.html',
    acces: 'payant',
  },
  'carlevaro-cuaderno-2': {
    auteur: 'Abel Carlevaro',
    titre: 'Serie Didáctica para Guitarra, Cuaderno n°2 — Technique de la main droite',
    kind: 'methode',
    url: 'https://www.stringsbymail.com/carlevaro-serie-didactica-no-2-right-hand-technique-for-solo-guitar-7055.html',
    acces: 'payant',
  },
  'carlevaro-cuaderno-3-4': {
    auteur: 'Abel Carlevaro',
    titre: 'Serie Didáctica para Guitarra, Cuadernos n°3 et 4 — Technique de la main gauche',
    kind: 'methode',
    url: 'https://www.stringsbymail.com/carlevaro-cuadernos-didactic-series-for-solo-guitar-1-4-18205.html',
    acces: 'payant',
  },
  'carlevaro-escuela': {
    auteur: 'Abel Carlevaro',
    titre: 'Escuela de la Guitarra: Exposición de la Teoría Instrumental',
    kind: 'methode',
    annee: 1979,
    url: 'https://www.cglib.org/abel-carlevaro-school-of-guitar-exposition-of-instrumental-theory/',
    acces: 'payant',
  },
  'pujol-escuela-razonada': {
    auteur: 'Emilio Pujol',
    titre: 'Escuela Razonada de la Guitarra (4 volumes)',
    kind: 'methode',
    annee: 1934,
    url: 'https://en.wikipedia.org/wiki/Emilio_Pujol',
    acces: 'payant',
  },
  'shearer-learning': {
    auteur: 'Aaron Shearer',
    titre: 'Learning the Classic Guitar',
    kind: 'methode',
    annee: 1990,
    acces: 'payant',
  },
  'sagreras-lecciones': {
    auteur: 'Julio Salvador Sagreras',
    titre: 'Las Lecciones de Guitarra (7 volumes)',
    kind: 'methode',
    annee: 1922,
    url: 'https://en.wikipedia.org/wiki/Julio_Salvador_Sagreras',
    acces: 'domaine-public',
  },
  'giuliani-op1': {
    auteur: 'Mauro Giuliani',
    titre: '120 Studi per la mano destra, op. 1',
    kind: 'partition',
    annee: 1812,
    url: 'https://imslp.org/',
    acces: 'domaine-public',
  },
  'imslp': {
    auteur: 'Petrucci Music Library',
    titre: 'IMSLP',
    kind: 'partition',
    url: 'https://imslp.org/',
    acces: 'domaine-public',
  },
  'this-is-classical-guitar': {
    auteur: 'Bradford Werner',
    titre: 'This Is Classical Guitar',
    kind: 'cours-ligne',
    url: 'https://www.thisisclassicalguitar.com/',
    acces: 'gratuit',
  },
  'classical-guitar-shed': {
    auteur: 'Allen Mathews',
    titre: 'Classical Guitar Shed',
    kind: 'cours-ligne',
    url: 'https://classicalguitarshed.com/',
    acces: 'gratuit',
  },
  'classical-guitar-corner': {
    auteur: 'Simon Powis',
    titre: 'Classical Guitar Corner — comparatif des méthodes',
    kind: 'article',
    url: 'https://www.classicalguitarcorner.com/classical-guitar-method/',
    acces: 'gratuit',
  },
  'dawes-jamplay': {
    auteur: 'Mike Dawes',
    titre: 'Fingerstyle Mastery — 40 leçons (JamPlay)',
    kind: 'video',
    url: 'https://jamplay.com/guitar-lessons/artists/316-mike-dawes',
    acces: 'payant',
    visionne: false,
  },
  'dawes-truefire': {
    auteur: 'Mike Dawes',
    titre: 'Progressive Fingerstyle: Essential Riffs (TrueFire)',
    kind: 'video',
    url: 'https://truefire.com/mike-dawes-guitar-lessons/progressive-fingerstyle-essential-riffs/c1841',
    acces: 'payant',
    visionne: false,
  },
  'acoustic-guitar-percussif': {
    auteur: 'Acoustic Guitar Magazine',
    titre: 'Learn These Percussive Fingerstyle Guitar Techniques',
    kind: 'article',
    url: 'https://acousticguitar.com/learn-these-percussive-fingerstyle-guitar-techniques-to-add-punch-and-groove-to-your-playing/',
    acces: 'gratuit',
  },
  'guitar-world-percussif': {
    auteur: 'Guitar World',
    titre: 'Mastering Two-Handed Percussive Techniques',
    kind: 'article',
    url: 'https://www.guitarworld.com/lessons/mastering-two-handed-percussive-techniques',
    acces: 'gratuit',
  },
  'wikipedia-golpe': {
    auteur: 'Wikipédia',
    titre: 'Golpe (guitar technique)',
    kind: 'article',
    url: 'https://en.wikipedia.org/wiki/Golpe_(guitar_technique)',
    acces: 'gratuit',
  },
  'acoustic-accent-oshio': {
    auteur: 'Acoustic Accent',
    titre: 'Kotaro Oshio — fingerstyle perfection and… NAIL ATTACK!',
    kind: 'article',
    url: 'https://acousticaccent.wordpress.com/2015/11/05/kotaro-oshio-fingerstyle-perfection-and-nail-attack/',
    acces: 'gratuit',
  },
  'pasadena-injury': {
    auteur: 'Pasadena Conservatory of Music',
    titre: 'Music Injury Prevention Guide',
    kind: 'medical',
    url: 'https://pasadenaconservatory.org/current-students/health-and-safety/music-injury-prevention-guide/',
    acces: 'gratuit',
  },
  'jht-dystonie': {
    auteur: 'Journal of Hand Therapy',
    titre: 'Focal dystonia in musicians, a literature review',
    kind: 'academique',
    annee: 2024,
    url: 'https://www.jhandtherapy.org/article/S0894-1130(24)00024-3/fulltext',
    acces: 'payant',
  },
  'dmrf-dystonie': {
    auteur: 'Dystonia Medical Research Foundation',
    titre: "Musician's Dystonia",
    kind: 'medical',
    url: 'https://dystonia-foundation.org/what-is-dystonia/types-dystonia/musicians/',
    acces: 'gratuit',
  },
  'msstate-rsi': {
    auteur: 'Mississippi State University',
    titre: 'Repetitive Stress and Strain Injuries: Preventive Exercises for the Musician',
    kind: 'medical',
    url: 'https://www.music.msstate.edu/sites/www.music.msstate.edu/files/2025-07/repetitive_stress.pdf',
    acces: 'gratuit',
  },
  'performance-health': {
    auteur: 'Performance Health',
    titre: 'Treating Common Hand and Wrist Injuries in Musicians',
    kind: 'medical',
    url: 'https://www.performancehealth.com/articles/treating-common-hand-and-wrist-injuries-in-musicians',
    acces: 'gratuit',
  },
  'alphatab-doc': {
    auteur: 'CoderLine',
    titre: 'Documentation alphaTex',
    kind: 'documentation',
    url: 'https://alphatab.net/docs/alphatex/introduction',
    acces: 'gratuit',
  },
  'sonde-alphatex': {
    auteur: 'Muse',
    titre: 'Sonde alphaTex — docs/research/08-alphatab-verifie.md',
    kind: 'documentation',
    annee: 2026,
    acces: 'gratuit',
  },
} as const satisfies Record<string, SourceEntry>;

export type SourceId = keyof typeof SOURCES;

export const sourceById = (id: string): SourceEntry | undefined =>
  (SOURCES as Record<string, SourceEntry>)[id];
