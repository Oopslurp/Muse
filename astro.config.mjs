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
