/**
 * Statut épistémique affiché — CLAUDE.md, décision 1.
 *
 * Le contenu stocke trois informations indépendantes :
 *   · `origine`  — d'où vient l'affirmation (source identifiée ou déduction)
 *   · `observe`  — promotion manuelle après vérification à la guitare
 *   · `doute`    — un [À VÉRIFIER] avec sa raison
 *
 * Le statut montré à l'écran est **calculé** à partir des trois. C'est la
 * décision 9 appliquée : la donnée est stockée, le libellé est produit.
 */

import type { EpistemicStatus } from './taxonomy';

export interface Provenance {
  origine: 'source' | 'deduit';
  sourceIds: string[];
  observe?:
    | { date: string; note?: string | undefined; par?: 'guitare' | 'sonde' | 'ecoute' }
    | undefined;
  doute?: string | undefined;
}

/** Comment la vérification a été faite. Le contenu stocke la clé, pas la phrase. */
const MOYEN: Record<'guitare' | 'sonde' | 'ecoute', string> = {
  guitare: 'Vérifié à la guitare',
  sonde: 'Vérifié par la sonde alphaTab — pas à l’instrument',
  ecoute: 'Vérifié à l’écoute du rendu — pas à l’instrument',
};

/**
 * Ordre de priorité : observé › à vérifier › origine.
 *
 * « Observé » gagne sur le doute parce que la vérification à la guitare le
 * tranche. Un doute qui survivrait à la vérification porterait sur autre
 * chose et mériterait sa propre entrée.
 */
export function statutAffiche(p: Provenance): EpistemicStatus {
  if (p.observe) return 'observe';
  if (p.doute) return 'verifier';
  return p.origine === 'source' ? 'source' : 'deduit';
}

/**
 * Phrase complète pour l'infobulle : le statut, plus ce qui l'accompagne.
 * Elle doit permettre de comprendre *pourquoi* ce statut sans ouvrir la fiche.
 */
export function detailProvenance(p: Provenance): string {
  const bouts: string[] = [];

  if (p.observe) {
    // On dit **comment** la vérification a été faite : une syntaxe confirmée
    // par la sonde alphaTab n'est pas un geste éprouvé à l'instrument, et les
    // faire porter la même phrase est exactement l'inexactitude que le statut
    // épistémique existe pour empêcher.
    bouts.push(`${MOYEN[p.observe.par ?? 'guitare']} le ${formaterDate(p.observe.date)}.`);
    if (p.observe.note) bouts.push(p.observe.note);
    bouts.push(
      p.origine === 'source'
        ? "L'affirmation reste par ailleurs sourcée."
        : "L'affirmation était une déduction avant vérification."
    );
  } else if (p.doute) {
    bouts.push(`À vérifier : ${p.doute}`);
  } else if (p.origine === 'deduit') {
    bouts.push(
      "Raisonnement mécanique cohérent, qu'aucune source consultée ne formule ainsi."
    );
  } else {
    bouts.push('Attribué à une source identifiée, citée en bas de fiche.');
  }

  return bouts.join(' ');
}

/**
 * Provenance d'un lien de prérequis — `déduit` faute de mieux.
 *
 * La grande majorité des liens vient de la taxonomie de la phase de recherche
 * et n'a jamais été rejugée : ce sont des déductions, et l'écran doit le dire
 * plutôt que de faire passer un jugement de conception pour un fait établi.
 * L'invariant de monotonie de `graph.ts` en a d'ailleurs attrapé trois qui
 * étaient faux.
 *
 * Le défaut n'est pas stocké fiche par fiche : le contenu ne porte que les
 * liens qui ont une histoire, le code produit le reste (décision 9).
 */
export const LIEN_DEDUIT: Provenance = { origine: 'deduit', sourceIds: [] };

export function provenanceLien(
  table: Record<string, Provenance> | undefined,
  prerequisId: string
): Provenance {
  return table?.[prerequisId] ?? LIEN_DEDUIT;
}

/** Une fiche est-elle intégralement assurée ? Sert au tri et au filtrage. */
export const estAssure = (p: Provenance): boolean =>
  Boolean(p.observe) || (p.origine === 'source' && !p.doute);

function formaterDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
