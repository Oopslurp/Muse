# Contribuer

Muse est un projet personnel, écrit pour un seul praticien et publié tel quel.
Il n'y a pas d'équipe, pas de feuille de route négociable, et la direction
artistique comme les décisions d'architecture sont arrêtées dans
[CLAUDE.md](CLAUDE.md) — qui gagne en cas de contradiction avec tout le reste.

Cela dit, ce corpus a un besoin précis, et c'est celui-là qui vaut la peine.

## Ce qui est le plus utile

**Les 44 points marqués `[À VÉRIFIER]` sont une invitation.** Un corpus qui
affiche ses doutes appelle exactement l'expertise qui lui manque. Si vous êtes
professeur, luthier, kinésithérapeute du musicien, ou simplement guitariste avec
vingt ans de pratique, voici ce qui aiderait vraiment :

| | |
|---|---|
| **Lever un doute avec une source** | La référence précise — auteur, ouvrage, page. Pas « c'est bien connu » |
| **Corriger un doigté ou une position** | Avec ce qui cloche et ce que vous jouez à la place |
| **Contredire une affirmation `déduit`** | C'est leur raison d'être : elles n'attendent que ça |
| **Un retour d'usage sur l'accordeur** | Firefox et Safari, guitare en main — c'est écrit dans [docs/verifications-manuelles.md](docs/verifications-manuelles.md) et personne ne l'a fait |
| **Un signalement de bug** | Avec le navigateur et ce que vous attendiez |

## Ce qui ne sera pas retenu

- **Toute tablature d'œuvre sous droits.** Règle de fond, sans exception. Le
  répertoire est en domaine public, les exercices sont originaux ou construits
  sur des formules communes non protégeables.
- **Retirer les doutes, les statuts ou les champs santé.** Ils sont le projet,
  pas des scories. Une fiche « propre » sans ses `[À VÉRIFIER]` est plus fausse
  que l'originale, tout en ayant l'air plus sûre.
- **Un nom de note écrit en dur.** Ils sont dérivés en TypeScript depuis
  `(accordage, corde, case)`. Deux erreurs sont entrées dans le corpus par cette
  voie exacte, et la règle existe pour ça.
- **Une refonte de la direction artistique** ou un changement de pile.
- **De l'analyse audio** hors accordeur. Hors périmètre, décision arrêtée.

## Si vous ouvrez une pull request

```bash
npm install
npm test        # notes, accordeur, arbre, journal, sauvegarde, tablatures
npm run dev
```

Le build **échoue** si une fiche manque un champ santé, si un prérequis pointe
dans le vide, si le graphe a un cycle, si une difficulté n'est pas monotone, ou
si un accord pose deux notes sur la même corde. Ce n'est pas de la sévérité
gratuite : chacun de ces invariants a attrapé une vraie erreur.

L'intégration continue fait tourner les tests **et** les audits navigateur —
ceux qui appuient sur les boutons et vérifient qu'un son sort. Un HTML correct
ne prouve rien ici ; c'est une leçon payée cher.

Le contenu est en **français**, avec les termes techniques accompagnés de leurs
équivalents espagnol et anglais (butée / *apoyando* / rest stroke).

## Licences

Le code est sous [MIT](LICENSE), le contenu sous
[CC BY-NC-SA 4.0](LICENSE-CONTENU.md). En contribuant, vous acceptez que votre
apport soit diffusé sous la licence correspondant au fichier touché.
