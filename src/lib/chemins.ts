/** Préfixe un chemin interne avec la base de déploiement configurée par Astro. */
export function chemin(href: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${href}` || '/';
}
