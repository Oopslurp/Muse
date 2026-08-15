/**
 * Résolution des imports sans extension, pour les tests sous Node.
 *
 * Le code de `src/` s'écrit comme un bundler l'attend — `import { db } from
 * './base'` — parce que c'est Vite qui le compile. Node, lui, applique la
 * résolution ESM stricte et exige l'extension. Un test qui importe un module
 * de `src/` échoue donc sur le premier import relatif rencontré.
 *
 * Deux mauvaises réponses écartées :
 *
 *  · **ajouter `.ts` partout dans `src/`** — on tordrait le code de
 *    production pour arranger l'outillage, et le prochain fichier écrit sans
 *    y penser recasserait les tests ;
 *  · **dupliquer la logique pure dans le test** — un test qui ne lit pas le
 *    code livré ne teste rien.
 *
 * D'où ce crochet, qui ne vit que dans `tools/` : il tente `.ts`, puis
 * `/index.ts`, et laisse tout le reste à Node. Les alias `~/…` du projet sont
 * résolus de la même façon, vers `src/`.
 *
 * ⚠️ Il se charge par `node --import ./tools/resolveur-ts.mjs`, **pas** par un
 * `import` en tête du test : les imports ESM sont hissés et tout le graphe de
 * modules est résolu avant qu'une seule ligne ne s'exécute. Enregistré depuis
 * le test, le crochet arriverait trop tard — et l'erreur serait exactement la
 * même qu'en son absence.
 */

import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as joindre } from 'node:path';

const SRC = joindre(dirname(fileURLToPath(import.meta.url)), '..', 'src');

registerHooks({
  resolve(specifier, contexte, suivant) {
    const relatif = specifier.startsWith('.');
    const alias = specifier.startsWith('~/');
    if (!relatif && !alias) return suivant(specifier, contexte);

    const base = alias
      ? joindre(SRC, specifier.slice(2))
      : joindre(dirname(fileURLToPath(contexte.parentURL)), specifier);

    for (const essai of [base, `${base}.ts`, joindre(base, 'index.ts')]) {
      if (existsSync(essai) && essai.endsWith('.ts')) {
        return { url: pathToFileURL(essai).href, shortCircuit: true };
      }
    }
    return suivant(specifier, contexte);
  },
});
