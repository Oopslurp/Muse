/**
 * Observations — la promotion « observé » de CLAUDE.md décision 1.
 *
 * **Une observation porte sur une affirmation, pas sur une fiche.** La
 * décision dit « faire passer *un item* de sourcé ou déduit à observé, avec
 * date et commentaire libre ». Une fiche est un item, mais ce n'était pas
 * l'intention : la fiche percussion porte neuf points douteux qui se lèvent un
 * par un, sur des semaines.
 *
 * Ce que l'observation **ne fait pas** : écraser l'origine. La pastille
 * produite au build continue d'afficher `sourcé` ou `déduit`, et le texte d'un
 * doute reste écrit en toutes lettres même une fois levé. Deux champs, jamais
 * un enum — c'est ce qui permet d'écrire « la source affirme ceci, j'ai
 * constaté cela ».
 */

import { cleObservation, db, disponible, type ObservationLigne } from './base';

export { cleObservation, disponible };
export type { ObservationLigne } from './base';

/** Les formes d'élément promouvables sur une fiche. */
export type Element =
  | 'fiche'
  | 'seance'
  | `doute:${number}`
  | `erreur:${number}`
  | `exercice:${string}`;

/** Libellé de l'élément, pour l'infobulle et le lecteur d'écran. */
export function nommerElement(element: string): string {
  if (element === 'fiche') return 'cette fiche';
  if (element === 'seance') return 'le protocole de séance';
  const [type, reste] = element.split(':');
  if (type === 'doute') return `le point à vérifier n° ${Number(reste) + 1}`;
  if (type === 'erreur') return `l’erreur typique n° ${Number(reste) + 1}`;
  if (type === 'exercice') return `l’exercice ${String(reste).toUpperCase()}`;
  return element;
}

export async function lirePourFiche(fiche: string): Promise<Map<string, ObservationLigne>> {
  if (!disponible()) return new Map();
  const lignes = await db().observations.where('fiche').equals(fiche).toArray();
  return new Map(lignes.map((l) => [l.element, l]));
}

export async function lireToutes(): Promise<ObservationLigne[]> {
  if (!disponible()) return [];
  return db().observations.toArray();
}

export async function observer(
  fiche: string,
  element: string,
  date: string,
  note?: string
): Promise<ObservationLigne> {
  const ligne: ObservationLigne = {
    cle: cleObservation(fiche, element),
    fiche,
    element,
    date,
    note: note?.trim() || undefined,
    maj: new Date().toISOString(),
  };
  await db().observations.put(ligne);
  return ligne;
}

/** Retirer une observation est un geste normal : on s'est trompé, ou on doute à nouveau. */
export async function retirer(fiche: string, element: string): Promise<void> {
  await db().observations.delete(cleObservation(fiche, element));
}

/** Aujourd'hui en ISO court, dans le fuseau local — pas en UTC. */
export function aujourdhui(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
