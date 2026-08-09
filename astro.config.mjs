// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://muse.local',
  integrations: [
    // Îlots React réservés à l'interactif : accordeur, alphaTab, filtres,
    // métronome, journal. Tout le reste du site est rendu statiquement.
    react(),
    mdx(),
  ],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      /**
       * Pré-bundling forcé de React et de ses runtimes JSX.
       *
       * Sans cette liste, Vite les découvre à la volée et les ré-optimise dès
       * qu'une dépendance change en cours de session. L'interop CJS de
       * `react/jsx-dev-runtime` en ressort parfois cassée : `jsxDEV` vaut
       * `undefined`, le composant lève « _jsxDEV is not a function » à sa
       * première balise, et React vide l'îlot — la page s'affiche puis
       * disparaît en une fraction de seconde.
       *
       * Symptôme trompeur : le HTML servi est parfaitement correct, seule
       * l'exécution du JS détruit le rendu. Bug de développement uniquement,
       * la construction de production n'utilise pas `jsxDEV`.
       */
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ],
    },
  },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      wrap: true,
    },
  },
  build: {
    // Une feuille de style unique : le site est petit et le CSS critique
    // tient largement dans un seul fichier mis en cache.
    inlineStylesheets: 'auto',
  },
});
