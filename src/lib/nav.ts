/**
 * Navigation principale.
 *
 * Elle a longtemps porté un mécanisme d'avancement : les sections non encore
 * livrées apparaissaient, désactivées, étiquetées du numéro de tranche qui les
 * livrerait — un menu qui cache ce qui manque ment sur l'état du chantier.
 *
 * Ce mécanisme a été retiré quand la dernière section a été livrée. Il n'avait
 * plus rien à annoncer, et un site public n'a pas à exposer son propre
 * calendrier de construction : cette histoire-là vit dans le dépôt, pas à
 * l'écran.
 */
export interface NavItem {
  href: string;
  label: string;
}

export const NAV: readonly NavItem[] = [
  { href: '/techniques', label: 'Techniques' },
  { href: '/arbre', label: 'Arbre' },
  { href: '/accordeur', label: 'Accordeur' },
  { href: '/pratique', label: 'Pratique' },
  { href: '/a-propos', label: 'À propos' },
] as const;
