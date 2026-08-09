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
  observe?: { date: string; note?: string | undefined } | undefined;
  doute?: string | undefined;
}

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
    bouts.push(`Vérifié à la guitare le ${formaterDate(p.observe.date)}.`);
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

/** Une fiche est-elle intégralement assurée ? Sert au tri et au filtrage. */
export const estAssure = (p: Provenance): boolean =>
  Boolean(p.observe) || (p.origine === 'source' && !p.doute);

function formaterDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
