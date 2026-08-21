/**
 * robots.txt, produit au build plutôt que posé en fichier statique.
 *
 * La directive `Sitemap:` exige une **URL absolue** : un chemin relatif n'est
 * pas conforme et plusieurs robots l'ignorent. Or le domaine n'est connu qu'au
 * moment de la construction, par `MUSE_SITE` (voir astro.config.mjs). Un
 * fichier dans `public/` ne peut donc pas le porter — d'où cet endpoint, sur
 * le même modèle que `recherche.json.ts`.
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const base = (site ?? new URL('https://muse.local')).href.replace(/\/$/, '');
  const cheminBase = import.meta.env.BASE_URL.replace(/\/$/, '');

  const corps = `# Muse — bibliothèque de technique de guitare fingerstyle.
#
# Rien à cacher : le site est entièrement statique et public. La seule page
# écartée est la vitrine du design system, qui n'est pas du contenu et
# n'aiderait personne à trouver ce qu'il cherche.

User-agent: *
Allow: ${cheminBase}/
Disallow: ${cheminBase}/style-guide

Sitemap: ${base}${cheminBase}/sitemap-index.xml
`;

  return new Response(corps, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
