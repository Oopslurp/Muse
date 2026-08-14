# CLAUDE.md — Muse

Site personnel d'apprentissage de la guitare : bibliothèque de référence des grandes techniques (fingerstyle classique + fingerstyle moderne percussif) et accordeur chromatique.

**Utilisateur unique.** Guitariste intermédiaire visant expert. Lit la tablature, connaît la position de base des mains. Pratique : fingerstyle, classique, percussif (Kotaro Oshio, Mike Dawes, Andy McKee).

**Langue** : français. Termes techniques avec équivalents ES/EN (butée / *apoyando* / rest stroke).

La phase de recherche est terminée et vit dans [docs/research/](docs/research/). Ce fichier fixe les décisions prises **après** cette recherche. En cas de contradiction, **ce fichier gagne** sur les documents de recherche.

---

## Règles de fond (héritées de la phase de recherche)

1. **Sourcer.** Chaque affirmation pédagogique renvoie à une source identifiée, avec son auteur.
2. **Ne rien inventer.** Un doute signalé vaut mieux qu'une affirmation fausse. Voir la décision 1 ci-dessous.
3. **YouTube.** Aucune vidéo n'est visionnable. On collecte et qualifie des liens d'après descriptions/transcriptions. **Ne jamais affirmer avoir vu une démo.** Toute source `kind: 'video'` porte un champ `viewed` explicite.
4. **Droits d'auteur.** Aucune tablature de morceau sous droits. Répertoire = domaine public + exercices originaux. Pour le moderne : liens vers sources officielles, jamais de copie.

---

## Décision 1 — Statut épistémique

**Champ obligatoire sur chaque affirmation technique.** Trois valeurs :

| Statut | Signification |
|---|---|
| `sourcé` | Attribué à une source identifiée et citée |
| `déduit` | Raisonnement mécanique cohérent, non sourcé |
| `observé` | **Vérifié guitare en main par l'utilisateur** |

- **Rendu visible dans l'UI et filtrable.** Pas de note de bas de page.
- **`observé` est une transition manuelle.** L'interface doit permettre de faire passer un item de `sourcé` ou `déduit` à `observé`, avec date et commentaire libre. C'est un état utilisateur persistant, pas une donnée de contenu figée — il survit aux mises à jour du contenu.
- Un item peut être `sourcé` **et** `observé` : la promotion n'écrase pas l'origine. Modéliser comme deux champs, pas un enum unique.
- **La fiche percussion est publiée telle quelle, avec ses `[À VÉRIFIER]` affichés.** Ne pas la masquer, ne pas la mettre en brouillon, ne pas lisser ses incertitudes. C'est la fiche la plus fragile du corpus (9 points douteux) et c'est assumé : elle documente aussi l'état du domaine.

> Ce champ remplace le triptyque `sourced | derived | to-verify` esquissé dans `docs/research/05-modele-donnees.md` §Verification. Le `to-verify` disparaît : un doute est un `déduit` non promu, plus une liste de raisons de douter.

---

## Décision 2 — Noms de notes interdits en dur

**Aucun nom de note (do, ré, mi, C, D, E…) n'est écrit en dur dans le contenu** — ni dans le corps MDX, ni dans le frontmatter, ni dans les commentaires alphaTex.

Les noms de notes sont **dérivés en TypeScript** depuis `(accordage, corde, case)`. Une seule fonction, testée, utilisée partout.

**Pourquoi.** Deux erreurs ont été introduites pendant la recherche par cette voie exacte : une tablature mécaniquement correcte accompagnée d'un nom de note faux. Le numéro de case est vérifiable ; le nom de note recopié à la main est une faute en attente.

### Corrections à appliquer

| Fichier | Erreur | Correction |
|---|---|---|
| `docs/research/02-fiches/arpeges-pima.md`, Ex. C | Commentaire « ré » pour ce qui est un sol (corde 1 case 3) | Retirer les noms de notes des commentaires. La mélodie reste à réécrire. |
| `docs/research/02-fiches/alternance-pouce.md`, Ex. D mesure 3 | Corde 3 case 2 utilisée à la fois comme basse alternée et comme note de mélodie | Corriger la position. **Conserver l'exemple comme note pédagogique** : toutes les positions n'offrent pas deux basses disponibles — c'est une contrainte de composition du style, pas un détail. |

---

## Décision 3 — Santé

Trois champs **obligatoires** dans le schéma d'une fiche technique. **Le build échoue si l'un manque.**

| Champ | Type | Sens |
|---|---|---|
| `dureeMax` | minutes | Durée maximale d'une séance sur cette technique |
| `signalArret` | `string[]`, non vide | Signaux d'arrêt, **du plus précoce au plus tardif**. Le premier est l'alarme utile. |
| `reposMin` | secondes | Repos minimal entre séries, mains complètement relâchées |

**Rendu** : le signal d'arrêt est affiché **près du tempo**, dans le bloc de travail, pas en bas de page. On le lit au moment où on décide de pousser, pas après.

**Valeurs sur les fiches percussives** : conservatrices, et marquées `déduit`. **Aucune littérature n'existe sur les impacts répétés en fingerstyle percussif** — c'est le trou documentaire le plus préoccupant de la recherche (voir `docs/research/07-synthese.md` §2.3, point A7). Ne pas faire passer ces valeurs pour sourcées.

Justification factuelle de cette exigence, sourcée dans `docs/research/01-sources.md` §D : jusqu'à 89 % des musiciens rapportent une blessure professionnelle ; 42 % des musiciens vus en centre spécialisé pour dystonie focale sont guitaristes ; **les premiers signes sont typiquement pris pour un défaut de technique, ce qui pousse à travailler plus**.

---

## Décision 4 — Tranche 0 : sonde alphaTex, avant tout le reste

**Rien d'autre ne se code avant que cette tranche soit close.**

### 4a — Sonde Node

Script Node minimal qui charge des extraits alphaTex, les parse avec alphaTab, et **dump le modèle résultant** : `track > staff > bar > voice > beat > note`, en exposant pour chaque note la corde, la case et le doigté.

**Deux questions à trancher en lisant le modèle, pas en devinant :**

1. **Ordre des cordes dans `\tuning`.** La documentation alphaTab se contredit : `\tuning (E4 B3 G3 D3 A2 D2)` étiqueté « Dropped D » (aigu → grave) contre `\tuning (A1 D2 A2 D3 G3 B3 E4)` (grave → aigu).
2. **Mapping `rf 1-5`** (doigté main droite). La recherche suppose 1 = pouce, 2 = index, 3 = majeur, 4 = annulaire. **Non confirmé.** Si c'est faux, toutes les tablatures écrites sont décalées d'un cran.

**Livrable** : `docs/research/08-alphatab-verifie.md`, avec les réponses et les extraits de test qui les établissent.

### 4b — Page de jugement humain

Page HTML unique, autonome, avec :
- les cas `ds` (dead slap), `glpf` (golpe doigt), `glpt` (golpe pouce) ;
- une boucle A/B pour comparer.

**L'utilisateur juge le son et le comportement lui-même et répond.** Claude s'arrête là et n'interprète pas le rendu à sa place.

---

## Décision 5 — Accordeur

- **`@chordbook/tuner` est lu comme référence d'implémentation, PAS ajouté en dépendance.** On s'en inspire, on n'en dépend pas.
- **`getUserMedia` avec les trois traitements désactivés**, et un commentaire expliquant pourquoi à côté du code :

```ts
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    // Les trois traitements par défaut du navigateur sont conçus pour la voix
    // en visioconférence et détruisent la détection de hauteur :
    //  - noiseSuppression identifie une note tenue comme du bruit stationnaire
    //    et l'atténue : la note « disparaît » au bout d'une seconde ;
    //  - autoGainControl modifie l'amplitude en continu, ce qui ruine le gate
    //    RMS et fait remonter le bruit de fond entre les notes ;
    //  - echoCancellation applique des traitements non linéaires qui déforment
    //    la forme d'onde.
    // C'est la cause n°1 des accordeurs web qui « marchent mal sans raison ».
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
  },
});
```

- Détection de hauteur : `pitchy` (**McLeod Pitch Method**, pas YIN — la prémisse initiale était inexacte, sans conséquence négative). Algorithme isolé derrière une interface d'une seule fonction, pour pouvoir en changer.
- Le reste des paramètres (fenêtre 4096, filtres, gates, lissage à trois étages, accordages) est spécifié dans [docs/research/06-accordeur.md](docs/research/06-accordeur.md).

---

## Décision 6 — Répertoire

- **Villa-Lobos : retiré.** †1959 → domaine public en UE en 2030. Ne rien reproduire, ne pas citer comme répertoire utilisable. Reste mentionnable en référence d'écoute, explicitement marqué sous droits.
- **Barrios Mangoré : ajouté.** †1944 → domaine public en UE depuis 2015. *Un Sueño en la Floresta* devient une cible légitime pour le trémolo, *La Catedral* pour les arpèges.

Le reste des positions juridiques (Segovia, *Romance anónimo*, *Freight Train*, arrangements traditionnels, *compás* flamencos) est dans `docs/research/07-synthese.md` §2.4 et reste en l'état.

---

## Décision 7 — TR-03 placement rythmique

**Trou documentaire acté.** Aucune ressource guitare classique ne traite sérieusement le placement rythmique. La fiche courte reste en l'état, marquée `déduit`.

**Candidat v2. Ne pas rouvrir le sujet.**

**Aucune analyse audio en v1 hors accordeur.** Pas de détection de justesse, pas d'évaluation de régularité, pas de scoring du jeu. La détection micro sert à accorder, point. Toute autre idée d'analyse audio est hors périmètre v1.

---

## Décision 8 — Stack (définitive)

| Rôle | Choix |
|---|---|
| Framework | **Astro** (dernière version) + **content collections** + **MDX** |
| Styles | **Tailwind CSS** |
| Interactif | **Îlots React uniquement** : accordeur, alphaTab, filtres, métronome, journal. Tout le reste est statique. |
| Partition / tablature | **alphaTab**, sources en **alphaTex** |
| Accordeur | **pitchy** + **Web Audio API** |
| État persistant | **Dexie** (IndexedDB) |
| Langage | **TypeScript strict** |

**Aucun backend, aucun compte, aucune API externe. Tout est local, tout est exportable en JSON.**

Conséquence à respecter partout : **pas de CDN, pas de Google Fonts, pas d'appel réseau à l'exécution.** Les polices sont installées en dépendance et servies depuis le bundle.

> Cette décision remplace la section « Architecture pressentie » de la phase de recherche. Ce qui en reste valable : validation du frontmatter **à l'exécution** (Zod), fichiers `.atex` séparés au-delà de 4 mesures, catalogue de sources global.

---

## Décision 9 — Le contenu stocke la donnée, le code produit le libellé

**Généralisation de la décision 2.** Partout où les éditeurs, les écoles ou les traditions divergent sur une notation, **le contenu stocke la structure, jamais la chaîne affichée.**

```ts
// ✅ le contenu stocke ceci
{ type: 'full', fret: 5 }
// ✅ le code produit cela, et peut en changer d'avis
"CV"        // barré complet, case 5, chiffre romain
"½CV"       // demi-barré
```

Rendu par défaut du barré : **`CV` / `½CV`**, le chiffre romain désignant la case.

**Cette règle s'applique à TOUTE convention contestée** — pas seulement au barré et aux noms de notes. Doigtés, nuances, symboles d'articulation, numérotation des cordes, désignation des positions : si deux sources écrivent la même chose différemment, le contenu porte la donnée et une fonction de rendu produit le libellé.

Le test à appliquer : *si je changeais d'avis sur la notation, combien de fichiers de contenu devrais-je toucher ?* La réponse doit être **zéro**.

---

## Décision 10 — `audioFaithful: false` n'a jamais désactivé la lecture

Quand le rendu MIDI ne restitue pas fidèlement ce qui est écrit, **on lit quand même**, et on affiche un **badge nommant précisément ce qui manque** :

> ⚠️ *Les golpe ne sont pas restitués à l'audio.*
> ⚠️ *Le rendu ne distingue pas butée et pincé.*
> ⚠️ *Kick et snare sonnent identiques.*

Même logique que le statut épistémique : **on montre l'incertitude, on ne la cache pas.** Un badge précis vaut mieux qu'un bouton grisé, qui n'apprend rien.

Cas connus à ce jour, établis par la Tranche 0 (`docs/research/08-alphatab-verifie.md` R12) :

| Effet | Audio | À signaler |
|---|---|---|
| `ds` (dead slap) | ✅ sonne | — |
| `glpt` / `glpf` (golpe) | ❌ **muets** | oui |
| Kick vs snare | ⚠️ **même son** | oui — alphaTab n'a qu'une percussion |
| Butée / pincé, timbre, dynamiques fines | ❌ non rendus | oui |

---

## Conventions

| Sujet | Décision | Statut |
|---|---|---|
| **Latéralité** | Champ `hand: 'pince' \| 'frette' \| 'les-deux'`, jamais « droite/gauche » en dur. Réécriture à l'affichage. | Arrêté |
| **5ᵉ doigt main droite** | `c` (usage Tennant), documenté | Arrêté |
| **Ordre canonique des cordes** | **Corde 1 (aiguë) en premier**, comme alphaTex. Tranché par la sonde. | Arrêté |
| **Notation du barré** | Donnée `{ type, fret }`, rendu `CV` / `½CV`. Voir décision 9. | Arrêté |
| **Noms de notes** | Dérivés de `note.realValue`, jamais en dur. Voir décisions 2 et 9. | Arrêté |
| **Tempo** | Toujours avec son unité (`bpm` + subdivision, ou `notes-min`). « 120 » seul ne veut rien dire. | Arrêté |
| **Écriture des percussions** (silences vs notes mortes) | Défaut « A — silences ». **À confirmer avant la tranche 3.** | Ouvert |

---

## Méthode de travail

1. **`docs/research/` fait foi pour le contenu.** Le relire avant d'écrire quoi que ce soit qui en dépend — ne pas travailler de mémoire.
2. **Une tranche, puis arrêt et présentation.** Ne jamais enchaîner sur la suivante sans accord explicite.
3. **Commit à la fin de chaque tranche.**
4. **`npm run dev` doit fonctionner dès la tranche 1** et le rester.

### Règles de contenu non négociables

- **Statut épistémique** (`sourcé` / `déduit` / `observé`) obligatoire et **affiché**.
- **Noms de notes interdits en dur**, dérivés en TypeScript depuis accordage + case.
- **Champs santé** (`dureeMax`, `signalArret`, `reposMin`) obligatoires, **build en échec si absents**, affichés **près du tempo** et non en bas de page.
- **`[À VÉRIFIER]` conservé et rendu visible dans l'UI.** On ne lisse pas les doutes.

---

## Découpage

| # | Tranche | Contenu | État |
|---|---|---|---|
| 0 | Sonde alphaTex | Vérification du format, corrections du corpus | ✅ **close** |
| 1 | **Fondations** | Astro, Tailwind, design system (tokens couleur, échelle typo, espacements, composants de base), layout, mode sombre, accueil | ✅ **close** |
| 2 | **Contenu** | Content collections typées selon `05-modele-donnees.md`, migration des fiches en MDX, liste + filtres, page de détail | ✅ **close** |
| 3 | **Tablatures** | alphaTab : rendu, lecture, curseur, tempo, boucle par mesure, métronome | ✅ **close** |
| 4 | **Accordeur** | Page dédiée, chromatique, selon `06-accordeur.md`. Cents, aiguille lissée, choix d'accordage, gestion propre du micro **et de son refus** | ✅ **close** |
| 5 | **Arbre de compétences** | Graphe de prérequis cliquable + progression | ✅ **close** |
| 6 | **Pratique** | Métronome, minuteur de séance, journal IndexedDB, suivi par technique, export/import JSON | ✅ **close** |
| 7 | Finitions | Recherche, perf, responsive, impression PDF d'une fiche, déploiement | ⏳ |
| 8 | Reprise | Dette, défauts connus, décisions en attente — voir [docs/dette.md](docs/dette.md), plus l'audit Codex | ⏳ |

> **[docs/dette.md](docs/dette.md) recense ce qui est imparfait, incomplet ou non vérifié**, avec les décisions qui attendent une réponse. Le tenir à jour à chaque tranche : un défaut connu qui n'est écrit nulle part est un défaut oublié.

**Reporté, ne pas le rouvrir avant l'échéance indiquée :**
- **Promotion des fiches courtes en fiches longues** → après la tranche 3. Candidates notées : `MD-05 appui préparé`, `TR-04 équilibre des voix`, `MG-09 étouffements MG`.
- **Conception du journal** → tranche 6. Mais **l'architecture prévoit dès maintenant du local exportable**.

---

## Direction artistique

**Registre : atelier de luthier.** Bois chaud, laiton, encre profonde, beaucoup de blanc.

| Axe | Direction |
|---|---|
| **Typographie** | Serif éditoriale en titrage, sans-serif en corps |
| **Texture** | Grain / papier **très subtil** — perceptible, jamais décoratif |
| **Mode sombre** | Soigné, pas un simple inverse. Usage réel : pratique du soir. |
| **Lisibilité** | **Depuis un pupitre** : corps de texte généreux, contrastes francs, interlignage large |
| **Ton** | Un beau livre de méthode, pas une app SaaS. **Rien de « bootstrap ».** Ambition : niveau Awwwards. |
| **Accessibilité** | Navigation clavier, focus visibles, respect de `prefers-reduced-motion`. Non négociable. |

### Design system — ce qui est en place (tranche 1)

Tout vit dans [src/styles/global.css](src/styles/global.css). **Vitrine : [/style-guide](src/pages/style-guide.astro).**

**Thème — trois états, pas deux.** Aucun attribut sur `<html>` = le système décide ; `data-theme="light"` / `"dark"` = choix explicite. Toutes les couleurs passent par des variables `--c-*` redéfinies par thème et exposées à Tailwind via `@theme inline`. **Conséquence : on n'écrit jamais de variante `dark:`.** Un design system qui l'exige à chaque déclaration finit incohérent. `bg-surface text-ink` suffit.

Le thème est appliqué par un script **inline et bloquant** dans `<head>` — seule exception assumée au « pas de script inline ». Différé, la page clignote.

**Jetons de couleur.** Surfaces `--c-bg`, `--c-surface`, `--c-surface-2/3` · encres `--c-ink`, `--c-ink-2/3` · filets `--c-line`, `--c-line-strong` · accents `--c-brass`, `--c-brass-bright`, `--c-wood` · familles `--c-md` (bleu ardoise), `--c-mg` (vert forêt), `--c-pm` (rouille), `--c-tr` (gris-encre) · statuts `--c-source`, `--c-deduit`, `--c-observe`, `--c-verifier` · alerte `--c-sante`.

Le transversal est volontairement **neutre** : il s'applique partout, il ne revendique pas de couleur.

**Typographie.** Fraunces Variable en titrage (axes `opsz` / `SOFT` / `WONK` réglés pour un dessin gravé), Public Sans Variable en corps (humaniste, grandes ouvertures, lisible à distance de pupitre), pile mono système. **Fraunces est chargée en romain seulement** : son italique coûte 146 Ko pour du titrage. L'emphase en titrage passe par la couleur et les axes. Public Sans a bien son italique — le corpus en est plein.

Échelle fluide en `clamp()`, corps 17→19 px, interlignage 1,68. Total servi : **172 Ko de polices, 34 Ko de CSS.**

**Passer une couleur à un composant** se fait par **variable CSS en style inline** (`colorVar="--c-md"`), jamais par classe Tailwind construite dynamiquement : le scanner de Tailwind ne voit pas les classes calculées, et une table de correspondance en dur se désynchroniserait de `src/lib/taxonomy.ts`.

**Composants** — `ui/Badge`, `ui/StatusBadge`, `ui/Difficulty`, `ui/Callout` (tons `note` / `sante` / `verifier`), `ui/Card`, `ui/Button`, plus la classe `.prose` pour le contenu MDX.

**Vocabulaires contrôlés** — [src/lib/taxonomy.ts](src/lib/taxonomy.ts) : familles, difficulté, statut épistémique, style. Les décomptes y sont saisis à la main pour l'instant ; **à dériver des content collections en tranche 2**.

**Navigation** — [src/lib/nav.ts](src/lib/nav.ts). Les sections non livrées apparaissent quand même, désactivées et étiquetées du numéro de tranche qui les livrera. Même honnêteté que le statut épistémique, appliquée à l'avancement.

---

## Points de vigilance permanents

- **Ne jamais affirmer avoir écouté un enregistrement ou visionné une vidéo.** Aucun n'a été consulté pendant la recherche ; le corpus le dit explicitement à chaque référence.
- **Le rendu audio d'alphaTab ne sera pas fidèle** sur les fiches à étouffements percussifs, ni sur butée/pincé, ni sur le timbre. Le champ `audioFaithful` existe pour ça ; le comportement à adopter (avertissement, désactivation, acceptation) reste **ouvert**.
- **Se méfier de toute source donnant un angle de main en degrés.** Aucune des méthodes de référence n'en donne : elles décrivent qualitativement.
- **Ne faire confiance qu'aux numéros de case dans les tablatures existantes**, jamais aux noms de notes qui les commentent (d'où la décision 2).

---

## Commandes

```bash
npm install       # dépendances

npm run probe     # sonde alphaTex : parse des extraits et dump le modèle
                  # → répond aux questions de la décision 4a
                  # → résultats consignés dans docs/research/08-alphatab-verifie.md

npm run validate  # invariant de build n°9 : parse TOUS les blocs ```alphatex
                  # du corpus et remonte les diagnostics. Sort en code 1 si échec.

npm run serve     # serveur statique local (sans dépendance), port 5173
                  # → http://localhost:5173/tools/percussion-audio-test.html
                  # Nécessaire : les imports de modules ES sont bloqués sur file://

npm run dev       # site en développement, port 4321
npm run build     # construction statique
npm run test:notes    # dérivation des noms de notes (10 cas)
npm run test:accordeur # moteur de l'accordeur sur signaux de synthèse (19 cas)

npm run shot          # captures de contrôle dans .captures/ (Chrome headless)
npm run audit:console # exceptions, erreurs console, îlots vides, débordement
npm run audit:lecture # appuie sur « lire » et vérifie que le curseur avance
npm run audit:accordeur # joue un mi2 détendu dans un faux micro, lit l'écran
npm run audit:progression # note une technique, recharge, vérifie qu'elle a tenu
npm run audit:pratique  # compte les clics du métronome, le minuteur, le journal
npm run audit:layout -- <url> <largeur>   # remonte à l'élément qui déborde
```

### Vérifier le rendu — ne pas s'en remettre au HTML

Les tranches 0 à 2 ont été livrées **sans jamais regarder le rendu**, faute de navigateur. C'est corrigé : Chrome est présent sur la machine et pilotable en headless.

- **`npm run shot`** capture les vues de référence — accueil, liste, fiche longue, fiche courte, fiche à risque, design system, clair et sombre. À lancer après chaque tranche.
- **`npm run audit:layout`** mesure le débordement horizontal à un viewport donné, via le protocole DevTools.

⚠️ **Chrome headless refuse une fenêtre sous ~485 px.** Une capture demandée à 420 px est rendue à 485 px puis rognée : le texte paraît coupé alors qu'il ne l'est pas. Pour un vrai viewport mobile, passer par `audit:layout`, qui force les métriques d'appareil.

⚠️ **Un HTML correct ne prouve rien.** La page « Techniques » a servi 29 Ko de HTML valide tout en s'affichant vide, pendant des heures, pour deux raisons successives : des en-têtes COEP qui bloquaient les modules, puis un pré-bundling Vite cassé qui rendait `jsxDEV` indéfini. Aucune des deux n'est visible dans la réponse du serveur. **Toujours exécuter le JS** — `npm run audit:console` fait exactement ça et échoue en code 1.

⚠️ **Charger la page ne prouve pas davantage.** La tranche 3 entière a été livrée avec un lecteur muet, sans qu'aucun contrôle ne s'en aperçoive : `audit:console` voyait cinq routes saines, les captures montraient de belles partitions. Le worker audio mourait en silence au chargement. **Ce qui a un bouton doit être cliqué** — `npm run audit:lecture` appuie sur « lire », vérifie que le curseur avance, et échoue en code 1.

**À lancer à la fin de chaque tranche**, avant le commit :

```bash
npm run audit:console                              # contre le dev
npm run audit:lecture
npm run audit:accordeur
npm run audit:progression
npm run audit:pratique
npm run build && npm run preview                   # puis contre le build
MUSE_URL=http://localhost:4322 npm run audit:console
MUSE_URL=http://localhost:4322 npm run audit:lecture
MUSE_URL=http://localhost:4322 npm run audit:accordeur
MUSE_URL=http://localhost:4322 npm run audit:progression
MUSE_URL=http://localhost:4322 npm run audit:pratique
npm run shot                                       # et regarder les images
```

Le build mérite son propre passage : le plugin alphaTab n'emprunte pas le même chemin en développement et en production.

**Pour vérifier que `audit:lecture` échoue vraiment** — un garde-fou qui n'a jamais échoué ne prouve rien : commenter la ligne `alphaTab({ … })` dans `astro.config.mjs`, vider `node_modules/.vite`, relancer `dev`. Les deux lecteurs doivent ressortir muets.

### Le piège du pré-bundling Vite

`astro.config.mjs` force `optimizeDeps.include` sur React et ses runtimes JSX. **Ne pas retirer.** Sans cette liste, Vite les ré-optimise dès qu'une dépendance change en cours de session, et l'interop CJS de `react/jsx-dev-runtime` en ressort parfois cassée : `jsxDEV` vaut `undefined`, le composant lève à sa première balise, React vide l'îlot. La page s'affiche puis disparaît en une fraction de seconde.

Si le symptôme réapparaît malgré tout : `rm -rf node_modules/.vite .astro` puis redémarrer.

### État de la Tranche 0

- **4a — sonde Node : faite.** Résultats dans [docs/research/08-alphatab-verifie.md](docs/research/08-alphatab-verifie.md). Les deux questions bloquantes sont tranchées : `\tuning` s'écrit de la corde aiguë vers la grave, et `rf 1` = pouce.
- **4b — page de jugement : prête**, en attente du verdict humain sur `ds` / `glpf` / `glpt`. **Ne rien coder d'autre avant cette réponse.**

### Contenu — ce qui est en place (tranche 2)

**32 fiches MDX pour 33 techniques** — butée et pincé sont deux entrées de la taxonomie et une seule fiche, parce que ce sont deux terminaisons du même geste. Décomptes dérivés de la collection par [src/lib/corpus.ts](src/lib/corpus.ts), jamais saisis à la main.

**Schéma** : [src/content.config.ts](src/content.config.ts), validé par Zod au build. Trois écarts assumés par rapport à `05-modele-donnees.md` :

1. **Le statut épistémique n'est plus un enum à quatre valeurs.** `origine` dit d'où vient l'affirmation (`source` / `deduit`), `observe` est une promotion manuelle qui **n'écrase pas** l'origine, `doute` porte un `[À VÉRIFIER]` avec sa raison. Le statut montré est **calculé** — [src/lib/provenance.ts](src/lib/provenance.ts), priorité observé › à vérifier › origine.
2. **Sources dans un catalogue global** — [src/data/sources.ts](src/data/sources.ts). La fiche ne garde qu'un identifiant et une phrase de pertinence locale. Les sources vidéo portent `visionne`, affiché.
3. **Champs santé obligatoires** : `dureeMax`, `signalArret` (non vide), `reposMin`. Le build échoue sans eux, et `risque: eleve` exige un `avertissementSante`.

**Invariants qui font échouer le build** — six dans le schéma (critère de passage jamais « quand tu te sens prêt », exercice référencé existant, ≥ 4 paliers pour une fiche approfondie, alphaTex présent hors consigne, `audioFidele: false` exige des réserves nommées, avertissement santé si risque élevé) et trois dans [src/lib/graph.ts](src/lib/graph.ts) : existence des prérequis, acyclicité, monotonie de difficulté. Le graphe est validé depuis `/techniques` — **une page doit en dépendre**, sinon la vérification ne s'exécute jamais.

> La monotonie de difficulté a attrapé **trois incohérences** de la taxonomie de recherche. Corrections retenues : `glissando` a pour prérequis le placement et non les déplacements ; `accordages-alternatifs` passe en difficulté 3 (la fiche dit elle-même « conceptuellement exigeant ») ; `alternance-pouce` a pour prérequis les étouffements plutôt que l'équilibre des voix.

**Noms de notes** — dérivés par [src/lib/notes.ts](src/lib/notes.ts) depuis `(accordage, corde, case)`, avec `npm run test:notes` (10 cas). La table des accordages y vit aussi, portée à **13 accordages** par la tranche 4 qui les réutilise. Rappel du piège : le modèle alphaTab **inverse** la numérotation des cordes par rapport au texte source — pour lire une hauteur, utiliser `note.realValue`.

**Validation des tablatures** — `npm run validate` parse les 63 blocs alphaTex du projet, ceux de `docs/research` et ceux du frontmatter MDX. Il garantit la validité **syntaxique**, pas la justesse musicale : il n'aurait attrapé aucune des deux erreurs de contenu de la recherche.

**Îlot React** — un seul pour l'instant : [FiltreTechniques](src/components/react/FiltreTechniques.tsx). Il justifie son hydratation (quatre facettes combinables, recherche, décompte en temps réel) et reflète son état dans l'URL, pour qu'une vue filtrée se mette en favori et que les liens « famille » retombent dessus.

### Lecteur de tablature (tranche 3)

[LecteurTab](src/components/react/LecteurTab.tsx), îlot React hydraté **à la visibilité**. Rien de la machinerie audio n'existe avant le premier appui sur « lire » : le lecteur démarre en `PlayerMode.Disabled` et n'est allumé qu'au clic. alphaTab crée son worker de synthèse **et son contexte audio** dès que le lecteur existe ; une fiche compte jusqu'à quatre exercices et le simple défilement les hydrate tous.

**Quatre pièges alphaTab, tous silencieux, tous rencontrés :**

1. **Le worker de synthèse est indispensable, et Vite le perd.** alphaTab le charge par `new URL('./alphaTab.worker.mjs', import.meta.url)` — une URL qui pointe dans `node_modules/.vite/deps/` une fois le paquet pré-bundlé, où le fichier n'existe pas. `new Worker()` **ne lève pas** sur une URL absente : le worker meurt à son chargement, le synthétiseur reste muet, `soundFontLoaded` n'arrive jamais. Le plugin **`@coderline/alphatab-vite`** réécrit ces URL ; il est branché dans [astro.config.mjs](astro.config.mjs). ⚠️ **`core.useWorkers: false` ne protège pas de ça** — ce réglage ne concerne que le moteur de rendu.
2. **`@coderline/alphatab/vite`, le plugin embarqué dans le paquet principal, est cassé** en 1.8.4 : il réexporte `dist/vite/alphaTab.vite.mjs`, qui n'existe pas. Il est de toute façon déprécié au profit du paquet séparé ci-dessus. Les ressources restent copiées par [tools/copy-alphatab-assets.mjs](tools/copy-alphatab-assets.mjs) (`assetOutputDir: false`), plus léger que la copie du plugin : Bravura en woff2 seulement, soundfont en sf3, 1,26 Mo au lieu de 3 Mo.
3. **Le plugin bundle worker et worklet hors du chemin de minification de Vite.** Sans `worker.rolldownOptions.output.minify`, ils sortent bruts — 2,3 Mo pièce au lieu de 1,15.
4. **Les couleurs sont figées à l'initialisation.** alphaTab rend en SVG ; sans recalcul, une partition composée en clair reste en encre sombre après bascule en sombre. Le composant observe `data-theme` **et** `prefers-color-scheme`, puis relance `updateSettings()` + `render()`. ⚠️ `resources.fillFromJson()` existe à l'exécution mais **pas dans les typages** : passer par `Color.fromJson` propriété par propriété. Même chose pour `notation.elements`, qui veut une `Map`, pas un objet.

**La partition suit le thème** plutôt que de rester sur un papier blanc fixe : le site sert surtout le soir. Les lignes de portée prennent `--c-ink-3` et non un filet, trop pâle en sombre.

**Boucle aimantée aux mesures** : les bornes viennent de `masterBar.start`, jamais d'une position en pixels ou en secondes. Le tempo démarre au **tempo de départ du palier**, avec des raccourcis vers départ et cible.

**Décompte** : alphaTab n'émet **aucun** `positionChanged` pendant le décompte — le curseur y glissait d'une note par simple animation puis s'y figeait, ce qui se lisait comme une lecture qui avance sans rien jouer. Le curseur est donc masqué tant que les clics tournent, et un compteur les affiche. Il est piloté par les événements `AlphaTabMetronome` (`midiEventsPlayedFilter`), pas par un minuteur maison qui dériverait de ce qu'on entend. Fin du décompte = premier `positionChanged`. ⚠️ Le décompte se rejoue à **chaque** appui, y compris à la reprise après pause.

**Décision 10 en action** : `audioFidele: false` n'a jamais désactivé la lecture. Le bloc « ce que la lecture ne restitue pas » nomme les réserves, exercice par exercice.

**Une panne de lecture ne coupe pas les commandes.** Elle s'affiche et on peut réessayer. Le délai d'attente du synthétiseur (20 s) est un **diagnostic, pas un filet** : une version antérieure laissait jouer quand même à son expiration, ce qui transformait un worker mort en disque qui tourne dix secondes puis s'arrête sans un mot.

⚠️ **Poids** : trois chunks d'environ 1,15 Mo non compressé — le lecteur, le worker de synthèse, le worklet audio. Chacun embarque le cœur d'alphaTab. Les deux derniers ne sont chargés qu'au premier appui sur « lire ». Acceptable en local, à revoir en tranche 7.

### Accordeur (tranche 4)

Trois fichiers, trois responsabilités : [accordeur.ts](src/lib/accordeur.ts) décide (gates, plausibilité, lissage, cents) et ne connaît ni le navigateur ni React ; [micro.ts](src/lib/micro.ts) tient la chaîne Web Audio ; [Accordeur](src/components/react/Accordeur.tsx) affiche.

**Ce découpage est ce qui rend l'accordeur testable.** `npm run test:accordeur` fabrique des sinusoïdes harmoniques et fait tourner la chaîne complète, détection MPM comprise : les 78 cordes des 13 accordages, le si1 de BADGAD à 61,74 Hz, l'erreur d'octave, le rejet du silence, l'hystérésis, le diapason. 19 cas. Un accordeur qu'on ne peut vérifier qu'une guitare à la main est un accordeur qu'on ne vérifie jamais.

**Et `npm run audit:accordeur` va jusqu'à l'écran** : Chrome sait remplacer le micro par un fichier (`--use-file-for-fake-audio-capture`, voir [tools/faux-micro.mjs](tools/faux-micro.mjs)). On lui joue un mi2 détendu de 30 cents et on vérifie que la page affiche `E2 · tends · −30 cents`, plus le verrou de corde, le mode chromatique et **le refus du micro** — l'écran doit nommer la panne *et* la marche à suivre. ⚠️ Le WAV commence par trois secondes de silence : l'accordeur calibre le bruit de la pièce pendant ses deux premières, et une note tenue pendant le calibrage placerait le seuil au-dessus d'elle. Le gate ne s'ouvrirait jamais.

**Les trois traitements du navigateur sont refusés** (décision 5), et surtout : on relit `track.getSettings()` après coup. C'est le risque n°1 du document de recherche — les navigateurs ne respectent pas tous la consigne. Si l'un des trois est resté actif, la page le dit au lieu de laisser croire à une détection capricieuse.

**Quatre points où le code s'écarte de `06-accordeur.md`, tous délibérés :**

1. **Plage de plausibilité en mode accordage : 55–400 Hz, pas 60–350.** Le document se contredit (§2 contre §4 et §8). À 60 Hz de plancher, un si1 détendu de 50 cents (59,99 Hz) serait rejeté — or c'est la note qui dimensionne tout le reste du document.
2. **La référence est la corde, pas le demi-ton le plus proche.** `OptionsAnalyse.cibles` porte les six cordes de l'accordage, ou une seule si l'utilisateur la verrouille. Un mi2 détendu de 70 cents s'afficherait sinon « ré♯2, +30 » : exact, et parfaitement inutilisable.
3. **La nouvelle attaque réinitialise aussi le nom de note affiché**, pas seulement la médiane et l'EMA. Le garder ferait afficher la corde précédente pendant les trois images que met l'hystérésis à céder. Défaut attrapé par un test, pas à l'usage.
4. **`@chordbook/tuner` a été lu, et suivi de loin.** Il demande `{ audio: true }` sans aucune contrainte — donc avec les trois traitements actifs, ce que le document appelle la cause n°1 des accordeurs web défaillants. Il règle aussi `smoothingTimeConstant`, qui ne concerne **que** les données fréquentielles et n'a aucun effet sur `getFloatTimeDomainData`, seul utilisé pour la détection.

**Lissage : les deux étages se composent.** Médiane sur 5, puis hystérésis sur 3 images : le nom de note ne bascule qu'après **cinq** images, le temps que la médiane penche d'abord. ~85 ms à 60 Hz, bien en deçà des 250 ms visés.

**L'écran est une tête de manche**, pas une rangée de boutons — [Manche.tsx](src/components/react/Manche.tsx). On tourne la bonne clé sans traduire « corde 5 » en position. Disposition d'une tête 3+3 vue de face, sillet en bas : la corde qui part du bord va à la cheville **la plus proche du sillet**, celle qui part du centre traverse jusqu'à la plus lointaine — d'où le croisement. Côté grave, de haut en bas : **ré4 · la5 · mi6** ; côté aigu : **sol3 · si2 · mi1**. Les boutons sont de vrais `<button>` positionnés en pourcentage sur les chevilles : l'alignement tient à toutes les tailles.

⚠️ **Ne jamais assombrir une couleur en la mélangeant à `--c-ink`** : l'encre est *crème* en thème sombre. La touche du manche en est ressortie plus claire que la tête. Passer par `--c-line-strong`, brun foncé dans les deux thèmes.

**Ordre des cordes** — corde 1 (aiguë) en premier en interne, comme partout dans le projet ; l'affichage inverse, parce qu'on lit un manche grave à gauche. `06-accordeur.md` §7 tabule dans l'autre sens et prévenait lui-même que deux ordres cohabitant produiraient des bugs silencieux : il n'y en a qu'un.

**Reste `déduit` faute d'observation guitare en main** : le comportement de `clarity` pendant l'attaque d'une corde grave d'acoustique, le taux réel d'erreurs d'octave sur la corde 6, et le seuil de bruit dans une vraie pièce. La page le dit, dans son encadré « à vérifier ».

### Arbre de compétences et progression (tranche 5)

**La disposition du graphe est calculée au build** — [arbre.ts](src/lib/arbre.ts), appelé depuis `/arbre`. Elle ne dépend que du contenu ; la recalculer à chaque chargement ferait payer au navigateur un travail qui ne change jamais. L'îlot ne reçoit que des coordonnées.

Six couches en **colonnes**, de gauche à droite, huit nœuds au plus par couche. En lignes il faudrait huit colonnes de large et le graphe deviendrait illisible. L'ordre interne à une colonne vient de quatre passes de barycentres, à partir d'un ordre initial déterministe (famille puis code) : **un graphe qui bouge à chaque build est impossible à relire.**

⚠️ `/arbre` appelle `construireGraphe` comme `/techniques` : les trois invariants (prérequis existants, acyclicité, monotonie) ne s'exécutent que si une page en dépend.

**Progression — [progression.ts](src/lib/progression.ts), Dexie/IndexedDB.** Deux choses distinctes, à ne pas confondre :

| | Ce que c'est | Où |
|---|---|---|
| **Avancement** (`neuf` / `en-cours` / `acquis`) | Où j'en suis. Pédagogique. | Arbre + fiche |
| **Observation** (`date` + note libre) | Vérifié guitare en main — la promotion de la **décision 1**. Épistémique. | Fiche |

L'observation **n'écrase pas l'origine** : la pastille produite au build continue d'afficher `sourcé` ou `déduit`, l'observation s'ajoute à côté. Deux champs, jamais un enum — c'est ce qui permet d'écrire « la source affirme ceci, j'ai constaté cela ». L'état est indexé par identifiant de fiche, donc il survit aux mises à jour du contenu.

⚠️ **La base n'est jamais instanciée à l'import.** Astro rend les îlots React en HTML au build, sous Node, où `indexedDB` n'existe pas : un `new Dexie()` au niveau du module ferait échouer la construction. Singleton paresseux, ouvert au premier usage.

**« Ouverte » est dérivé, jamais stocké** : une technique dont *tous* les prérequis sont tenus. C'est l'information qu'on vient chercher dans un arbre de compétences.

**`npm run audit:progression`** note une technique, recharge la page, et vérifie qu'elle a tenu — puis que la fiche montre le même état et que l'observation a survécu. Une progression locale qui ne se réécrit pas est le pire des défauts : les boutons répondent, les compteurs bougent, et tout disparaît au rechargement suivant sans un mot dans la console. Vérifié en échec en commentant le `put`.

> ⚠️ Le décompte « ouvertes » **ne bouge pas** quand on marque un point d'entrée : il cesse d'être ouvert en devenant tenu, pendant que sa dépendante s'ouvre. L'audit vise donc la dépendante nommément. Deux assertions trop grossières ont dû être corrigées ici — c'était le test qui avait tort, pas le code.

**Reste à faire, et assumé** : la promotion `observé` porte sur la fiche entière, pas sur chaque affirmation qu'elle contient. Le schéma le permettrait (`provenance` existe aussi sur les exercices et les erreurs) ; l'interface, pas encore.

### Atelier de pratique (tranche 6)

**Un métronome de plus, et pour une raison précise.** Celui d'alphaTab ne clique que sur les temps. Or plusieurs autodiagnostics du corpus reposent sur un **clic déplacé** — « sur la 2ᵉ note du cycle » pour le trémolo, « sur les temps 2 et 4 » pour le placement rythmique. Un clic sur l'appui rend ces tests impossibles : on s'appuie dessus au lieu de tenir la pulsation soi-même, ce qu'ils cherchent précisément à mesurer. D'où le motif — chaque position du cycle est **forte, faible ou muette**. Le déplacement se fait en taisant des positions, jamais en décalant une horloge.

⚠️ **Un `setInterval` qui joue un son à chaque tour dérive.** Les clics sont programmés à l'avance sur `ctx.currentTime`, seule horloge exacte ; le minuteur ne sert qu'à réveiller le programmateur. L'horizon passe de 150 ms à 2 s quand l'onglet est caché : les navigateurs y bornent `setTimeout` à une seconde, et un horizon court produirait des trous.

**Le minuteur est adossé aux champs santé**, qui sont obligatoires au schéma (décision 3) : `dureeMax` borne la séance et l'annonce **avant** de la dépasser, `series` pilote l'alternance travail/repos, `signalArret` s'affiche **collé au chronomètre**. Le décompte lit l'horloge système à chaque image — une accumulation d'intervalles prendrait des minutes de retard dans un onglet en arrière-plan.

**Le journal demande six champs, dont quatre facultatifs**, et le tempo comme les minutes sont préremplis par les deux autres outils. Un journal qui demande dix champs ne se remplit pas. Le champ le plus important est `arret` : un signal isolé ne dit rien, trois en deux semaines sur la même technique, si.

**Base unique** — [base.ts](src/lib/base.ts) porte la classe Dexie et les deux magasins. Ouvrir deux instances sur le même nom de base est une source de bugs silencieux. La sauvegarde JSON couvre les deux tables ([sauvegarde.ts](src/lib/sauvegarde.ts)) et relit l'ancien format `muse-progression` de la tranche 5. ⚠️ Les séances sont **ajoutées** à l'import, jamais écrasées : leur clé est auto-incrémentée et rien ne garantit qu'un identifiant désigne la même séance d'une base à l'autre. Réimporter deux fois duplique — moindre mal face à un écrasement silencieux.

**`npm run audit:pratique`** compte les oscillateurs réellement programmés en instrumentant `AudioContext.prototype.createOscillator` avant tout script de la page. Un navigateur sans carte son ne dit rien de ce qu'il « joue » ; un métronome peut passer en marche, allumer son cycle et ne rien produire. Vérifié en échec en commentant l'appel au clic.

**Deux défauts trouvés par cet audit, pas à l'usage :**

1. ⚠️ **`Astro.url.searchParams` est vide au build d'un site statique.** `?technique=<id>` était lu dans le frontmatter : la présélection ne marchait pour personne. Elle se lit dans l'îlot.
2. **Un composant qui prend une valeur en `props` et remonte ses changements écrase la valeur initiale.** Le métronome prenait `bpm` au montage et appelait `surTempo` dans un effet ; le tempo de départ du palier arrivait après et se faisait réécraser à 72. Le tempo est désormais **piloté par le parent** — une seule source de vérité.

⚠️ **Ajouter une dépendance d'îlot sans la déclarer dans `optimizeDeps.include`** provoque une ré-optimisation Vite en cours de session : les modules déjà chargés répondent `504 Outdated Optimize Dep` et l'îlot ne s'hydrate plus. C'est arrivé avec `dexie`, qui a fait tomber l'accordeur. `pitchy` et `dexie` y sont maintenant.

### Conventions alphaTex établies par la sonde

| Élément | Forme correcte | Piège |
|---|---|---|
| Portée | `\staff {tabs}` / `\staff {score tabs}` | `{tab}` au singulier **n'existe pas** et fait échouer le parse |
| Accordage | `\tuning (E4 B3 G3 D3 A2 E2)` | Corde 1 (**aiguë**) en premier |
| Doigté main droite | `rf 1` = p, `2` = i, `3` = m, `4` = a, `5` = auriculaire | `rf 0` rejeté |
| Doigté main gauche | `lf 2` = index, `3` = majeur, `4` = annulaire, `5` = auriculaire | ⚠️ **`lf 1` = pouce.** Décalage de +1 par rapport à la numérotation classique |
| Barré | `{ barre (5) }`, demi-barré `{ barre (5 half) }` | Sans parenthèses : avertissement |
| Mesure | `\ts (4 4)` | Sans parenthèses : avertissement |
| Numérotation des cordes **dans le modèle** | ⚠️ **inversée** par rapport au texte : `.1` → `note.string === 6` | Pour dériver une hauteur, utiliser `note.realValue`, pas `(string, fret)` |

**Lire les diagnostics** : ils sont sur l'importer (`importer.parserDiagnostics.items`), **pas** sur l'exception — `error.inner` est `undefined`.
