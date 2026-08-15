# Audit du projet Muse

> **Rapport externe, conservé tel qu'il a été rendu — donc non corrigé.**
> Il décrit l'état du projet au 14 août 2026, avant la tranche 8. Plusieurs de
> ses constats ont été traités depuis, d'autres se sont révélés non
> reproductibles, et quelques-uns contredisent des décisions prises exprès.
>
> **Ne pas le lire comme l'état actuel du dépôt.** Le tri point par point, avec
> ce qui a été retenu et pourquoi, est dans [tranche-8.md](tranche-8.md).


**Date de l’audit :** 14 août 2026  
**Périmètre :** contenu musical et pédagogique, qualité du code, accessibilité, performances et préparation au déploiement sur GitHub Pages.  
**Méthode :** audit en lecture seule du dépôt, compilation, validations et tests existants. Aucun fichier source n’a été modifié pendant l’audit.

## Verdict

Le projet est techniquement sain et déjà très abouti visuellement, mais il n’est pas encore prêt pour un déploiement public immédiat sur GitHub Pages.

Les deux blocages principaux sont :

1. la configuration actuelle ne garantit pas le fonctionnement du site sous l’URL d’un dépôt GitHub Pages (`https://utilisateur.github.io/Muse/`) ;
2. un exercice d’extensions contient une position physiquement incohérente et potentiellement risquée.

Après correction de ces deux points, le projet pourrait être mis en ligne comme préversion. Une publication présentée comme une ressource pédagogique fiable demanderait aussi de renforcer les sources et les critères de progression des fiches courtes.

## Résultats des vérifications automatiques

| Vérification | Résultat |
| --- | --- |
| `npm run check` | 0 erreur, 0 avertissement, 0 indication sur 57 fichiers |
| `npm run build` | Réussi, 39 pages générées |
| Validation alphaTex | 63 exercices valides, aucun échec |
| Tests des notes | 10 tests réussis sur 10 |
| Tests de l’accordeur | 19 tests réussis sur 19 |
| Audit des dépendances npm | 0 vulnérabilité connue sur 608 dépendances |
| État Git avant et après l’audit | Propre |

La validation alphaTex contrôle la syntaxe, pas la faisabilité musicale des exercices. Le problème relevé dans la fiche sur les extensions illustre précisément cette limite.

## Problèmes classés par priorité

### 1. Bloquant — Préparer réellement le déploiement GitHub Pages

La configuration Astro définit `site`, mais pas `base`. De nombreux liens et chemins sont absolus depuis la racine : `/techniques`, `/arbre`, `/pratique`, `/recherche.json`, `/alphatab/font/`, le soundfont et `/favicon.svg`.

Cela fonctionnera sur un domaine installé à la racine, mais pas nécessairement sur un site de projet GitHub Pages servi sous `/Muse/`. Dans ce dernier cas, une partie des pages, ressources, données de recherche et fichiers alphaTab peut renvoyer vers le mauvais emplacement.

Fichiers concernés notamment :

- [`astro.config.mjs`](../astro.config.mjs) ;
- [`src/components/Recherche.astro`](../src/components/Recherche.astro) ;
- [`src/components/LecteurTab.tsx`](../src/components/LecteurTab.tsx) ;
- [`src/layouts/BaseLayout.astro`](../src/layouts/BaseLayout.astro).

Il manque aussi :

- un workflow de déploiement dans `.github/workflows/` ;
- l’URL de production définitive pour produire les bonnes URL canoniques ;
- une version de Node déclarée ou épinglée — Astro 7 demande Node 22.12 ou plus récent ;
- un dépôt distant configuré au moment de l’audit.

En l’absence de `MUSE_SITE`, les pages compilées utilisent actuellement `https://muse.local/` comme origine canonique.

**À faire avant déploiement :** choisir entre un domaine racine et une URL de projet GitHub Pages, configurer `site` et éventuellement `base`, rendre les chemins compatibles avec ce choix, puis ajouter et tester le workflow officiel de déploiement Astro.

Références : [déployer Astro sur GitHub Pages](https://v4.docs.astro.build/en/guides/deploy/github/) et [page 404 personnalisée sur GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site).

### 2. Bloquant — Corriger l’exercice d’extensions

Dans [`src/content/techniques/extensions.mdx`](../src/content/techniques/extensions.mdx), l’exercice demande de maintenir simultanément :

- l’index à la case 5 de la sixième corde ;
- l’auriculaire à la case 9 de cette même corde.

La partition alphaTex contient également ces deux notes dans le même accord et sur la même corde. Le moteur accepte cette syntaxe, mais une corde ne peut pas faire entendre simultanément deux frettes de cette manière : la note la plus haute neutralise l’autre. L’instruction est donc musicalement incohérente. La grande extension prescrite mérite également une réévaluation prudente.

**À faire avant toute publication :** faire vérifier et réécrire cet exercice par un guitariste ou un pédagogue qualifié, puis effectuer une revue humaine de la faisabilité de tous les exemples. La littérature disponible sur la prévention des troubles musculosquelettiques chez les musiciens reste hétérogène et ne justifie pas des prescriptions trop catégoriques : [revue systématique, PubMed](https://pubmed.ncbi.nlm.nih.gov/37659064/).

### 3. Important — Faire correspondre les sources à la promesse éditoriale

La page d’accueil affirme que chaque affirmation indique d’où elle vient. En pratique, beaucoup de fiches donnent une liste générale de références en bas de page sans relier précisément chaque conseil à une page, un chapitre, une étude ou une méthode.

Exemples :

- la fiche sur le glissando affirme que la vitesse est constante ou légèrement accélérée, « jamais » décélérée, alors que sa référence principale concerne la notation alphaTab ;
- la fiche sur la tambora s’appuie notamment sur une page consacrée au *golpe* tout en signalant qu’aucune méthode propre à la tambora n’a été consultée ;
- la fiche sur le rasgueado donne des prescriptions biomécaniques sans source aussi précise que leur formulation ;
- certains cours vidéo sont cités alors que leur contenu n’a pas été directement vérifié.

Le compteur global des doutes, dans [`src/lib/corpus.ts`](../src/lib/corpus.ts), ne semble compter que `f.data.doutes`. Il omet donc les doutes imbriqués dans la provenance d’exercices ou de séances, même si certains sont affichés localement sur les fiches.

**Recommandation :** associer chaque conseil sensible à une référence précise et vérifiée, distinguer clairement source primaire, source secondaire et avis pédagogique, puis intégrer tous les doutes au décompte global.

### 4. Important — Compléter les critères pédagogiques des fiches courtes

Le corpus comprend 32 fiches représentant 33 gestes. Six fiches sont complètes et 26 sont courtes. Les fiches complètes offrent une progression, des tests et des critères observables ; la majorité des fiches courtes ne propose pas de paliers équivalents.

Cela entre en tension avec les pages d’accueil et d’index qui annoncent que chaque technique possède des paliers et des critères. L’arbre permet aussi de marquer une technique comme acquise alors que, pour de nombreuses fiches, l’utilisateur ne dispose d’aucun seuil objectif pour prendre cette décision.

**Recommandation :** enrichir en priorité les techniques prérequises par plusieurs parcours, notamment l’appui préparé, l’équilibre des voix et les étouffements de la main gauche. Pour chaque fiche prioritaire, ajouter au minimum :

- une erreur typique observable ;
- un test simple ;
- un critère de réussite ;
- un tempo ou une difficulté de départ, si pertinent ;
- une règle claire d’arrêt en cas d’inconfort.

### 5. Important — Nuancer certaines formulations trop absolues

Quelques affirmations présentent comme universelles des consignes qui semblent plutôt dépendre du style, de l’interprétation ou de la morphologie :

- le glissando ne décélérerait « jamais » ;
- le plateau de l’alternance index-majeur serait situé vers huit notes par seconde ;
- le doigt-guide ne quitterait « jamais » la corde ;
- le « galop » au trémolo précéderait « toujours » la douleur.

**Recommandation :** remplacer les absolus par des formulations contextualisées, ou fournir une source précise qui justifie la règle. Séparer explicitement la convention musicale, le conseil d’apprentissage, l’observation empirique et l’information médicale.

### 6. Important — Corriger plusieurs détails d’accessibilité

Les bases sont bonnes : lien d’évitement, focus visible, structure sémantique, libellés et respect de la réduction des animations.

Points restant à corriger :

- plusieurs textes secondaires de petite taille sont juste sous le rapport de contraste de 4,5:1 en thème clair, notamment sur les fonds `surface-2` ;
- dans la recherche, les flèches changent visuellement le résultat actif, mais le focus reste dans le champ et aucun modèle accessible de type `combobox`/`listbox` ou `aria-activedescendant` n’annonce la sélection ;
- le bouton de suppression du journal offre une cible tactile trop petite ;
- certaines informations de provenance ne sont accessibles qu’au survol via l’attribut `title` d’un élément non focalisable.

**Recommandation :** tester au clavier et avec un lecteur d’écran, augmenter le contraste des petits textes, agrandir les cibles interactives et donner à la recherche un véritable comportement de combobox accessible.

### 7. Modéré — Durcir l’import et la gestion des données locales

L’application reconnaît déjà qu’un import peut dupliquer des séances. La validation interne paraît toutefois contrôler surtout la date, la durée et l’identifiant de technique. Des valeurs arbitraires dans les observations, le tempo, la note ou les motifs d’arrêt peuvent donc être importées.

L’import réalise plusieurs opérations de base de données sans garantie évidente d’une transaction unique. Une erreur entre les opérations pourrait laisser un état partiellement importé. Enfin, la suppression d’une séance se fait en un clic, sans confirmation ni possibilité d’annulation.

**Recommandation :** appliquer un schéma strict à l’intégralité du fichier importé, effectuer l’écriture dans une transaction, détecter les doublons et ajouter une confirmation ou une annulation après suppression.

### 8. Modéré — Consolider la stratégie de tests et l’intégration continue

Les vérifications existantes sont utiles, mais aucune intégration continue n’est configurée. Le script générique `npm test` échoue volontairement avec « no test specified », alors que les vrais tests utilisent des commandes séparées.

Les zones les moins couvertes sont :

- le graphe de prérequis ;
- le journal de pratique ;
- l’import et l’export ;
- le comportement de recherche ;
- les parcours clavier et lecteur d’écran ;
- les régressions visuelles ;
- la validité musicale des exercices.

**Recommandation :** faire de `npm test` la commande de référence, agréger les tests actuels, puis exécuter contrôle Astro, tests et compilation dans une CI GitHub.

### 9. Modéré — Surveiller le poids d’alphaTab

La compilation réussit, mais Vite signale des fragments JavaScript supérieurs à 500 Ko ainsi qu’un avertissement relatif à `import.meta` dans la sortie IIFE d’alphaTab.

Les principaux fichiers générés sont approximativement :

- lecteur de tablature : 1,16 Mo ;
- worker alphaTab : 1,15 Mo ;
- worklet alphaTab : 1,15 Mo ;
- soundfont : 0,98 Mo ;
- police Bravura : 0,31 Mo.

Le chargement différé de la tablature limite déjà le coût initial. Le premier lancement du lecteur peut néanmoins représenter plusieurs mégaoctets, ce qui mérite une mesure sur mobile et réseau lent après déploiement.

### 10. Faible — Retirer les éléments provisoires avant l’annonce publique

La page d’accueil mentionne encore une « mise en page provisoire », affiche l’avancement interne « tranches livrées 8/9 » et expose un lien vers le système de design. La documentation de déploiement indique également que l’hébergeur reste à décider.

Il manque plusieurs éléments classiques pour un dépôt public :

- `README.md` ;
- fichier de licence correspondant à la licence ISC déclarée dans `package.json` ;
- description utile du paquet ;
- métadonnées Open Graph et Twitter ;
- éventuellement un sitemap et un fichier `robots.txt`.

Ces éléments ne bloquent pas une préversion privée, mais ils affectent la crédibilité, le partage social, le référencement et la réutilisation du projet.

## Points forts

- architecture Astro/React claire, avec interactivité chargée seulement lorsque nécessaire ;
- schémas de contenu stricts et validation des prérequis et des cycles ;
- identité visuelle cohérente et soignée sur les captures disponibles ;
- très bonne pédagogie autour des erreurs, des tests et du diagnostic dans les fiches complètes ;
- outils pratiques reliés au contenu : arbre, journal, accordeur et recherche ;
- recherche enrichie par des alias multilingues ;
- données de pratique conservées localement, avec export ;
- doutes éditoriaux affichés au lieu d’être dissimulés ;
- compilation, typage, validation des partitions et tests spécialisés tous réussis ;
- aucune vulnérabilité npm connue au moment de l’audit.

## Ordre de traitement conseillé

1. Décider l’URL de production et rendre tous les chemins compatibles avec GitHub Pages.
2. Corriger et faire vérifier humainement l’exercice d’extensions.
3. Ajouter le workflow de déploiement et l’URL canonique réelle.
4. Relier les affirmations sensibles à des sources précises et compléter le registre des doutes.
5. Donner des critères de réussite aux fiches courtes les plus structurantes.
6. Corriger la recherche accessible, les contrastes et les petites cibles tactiles.
7. Sécuriser import, suppression et transactions du journal.
8. Unifier les tests sous `npm test` et les exécuter en CI.
9. Mesurer le lecteur alphaTab sur un téléphone et une connexion lente.
10. Retirer les mentions provisoires et compléter les fichiers publics du dépôt.

## Limites de l’audit

Les pages ont été compilées et les captures locales existantes ont été inspectées, mais l’environnement d’audit n’a pas permis de lancer une nouvelle session de navigateur interactive. Les conclusions sur l’interface reposent donc sur le code, les contrôles automatisés et les captures disponibles. Un test final sur les navigateurs réellement ciblés — au minimum Chrome, Firefox et Safari mobile — reste nécessaire avant publication.

