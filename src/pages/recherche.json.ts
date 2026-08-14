/**
 * Index de recherche, servi en fichier.
 *
 * Une première version l'embarquait dans le HTML de chaque page. Mesuré :
 * **+77 Ko par page**, dupliqués partout et jamais mis en cache d'une page à
 * l'autre. Le raisonnement — « quelques kilooctets, autant éviter une requête »
 * — était faux d'un ordre de grandeur.
 *
 * En fichier séparé : rien au chargement, une requête mise en cache à la
 * première ouverture de la palette, c'est-à-dire avant qu'on ait fini de
 * taper.
 */

import type { APIRoute } from 'astro';
import { indexRecherche } from '~/lib/corpus';

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await indexRecherche()), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
