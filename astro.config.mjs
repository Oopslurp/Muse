// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import { alphaTab } from '@coderline/alphatab-vite';

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
    plugins: [
      tailwindcss(),
      /**
       * Worker de synthèse et worklet audio d'alphaTab.
       *
       * Le lecteur en a besoin dans TOUS les cas : `core.useWorkers: false` ne
       * concerne que le moteur de rendu, jamais l'audio. alphaTab charge son
       * worker par `new URL('./alphaTab.worker.mjs', import.meta.url)`, une URL
       * qui pointe dans `node_modules/.vite/deps/` une fois le paquet
       * pré-bundlé — où le fichier n'existe pas.
       *
       * L'échec est **totalement silencieux** : `new Worker()` ne lève pas sur
       * une URL absente, le worker meurt à son chargement, et le synthétiseur
       * reste muet. `loadSoundFont()` poste alors dans le vide, `soundFontLoaded`
       * n'arrive jamais, et le bouton de lecture tourne indéfiniment.
       *
       * Ce plugin réécrit ces URL et fait construire worker et worklet comme de
       * vrais points d'entrée. Copie d'actifs désactivée : la nôtre est plus
       * légère (Bravura en woff2 seulement, soundfont en sf3), voir
       * tools/copy-alphatab-assets.mjs.
       *
       * `@coderline/alphatab/vite`, le plugin embarqué dans le paquet principal,
       * est cassé en 1.8.4 — il réexporte `dist/vite/alphaTab.vite.mjs`, absent —
       * et déprécié au profit de ce paquet séparé.
       */
      ...alphaTab({ assetOutputDir: false }),
    ],
    /**
     * Minification des bundles de worker.
     *
     * Le plugin alphaTab construit worker et worklet par un appel direct à
     * rolldown, hors du chemin de minification de Vite : sans cette ligne ils
     * sortent bruts, 2,3 Mo pièce au lieu de 1,1. Ils embarquent chacun le
     * cœur d'alphaTab, d'où le poids.
     */
    worker: {
      rolldownOptions: { output: { minify: true } },
    },
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
        // Mêmes raisons pour les dépendances des îlots : découvertes à la
        // volée, elles déclenchent une ré-optimisation en cours de session et
        // les modules déjà chargés répondent « 504 Outdated Optimize Dep ».
        // L'îlot concerné ne s'hydrate alors plus du tout.
        'pitchy',
        'dexie',
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
