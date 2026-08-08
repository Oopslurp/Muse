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
| 2 | **Contenu** | Content collections typées selon `05-modele-donnees.md`, migration des 6 fiches longues + 27 courtes en MDX, liste + filtres (famille, difficulté, style, statut épistémique), page de détail | ⏳ |
| 3 | Tablatures | alphaTab : rendu, lecture, curseur, tempo, boucle A/B, métronome. Composant réutilisable inséré via MDX | ⏳ |
| 4 | Accordeur | Page dédiée, chromatique, selon `06-accordeur.md`. Cents, aiguille lissée, choix d'accordage, gestion propre du micro **et de son refus** | ⏳ |
| 5 | Arbre de compétences | Graphe de prérequis cliquable + progression | ⏳ |
| 6 | Pratique | Métronome, minuteur de séance, journal IndexedDB, suivi par technique, export/import JSON | ⏳ |
| 7 | Finitions | Recherche, perf, responsive, impression PDF d'une fiche, déploiement | ⏳ |

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
```

### État de la Tranche 0

- **4a — sonde Node : faite.** Résultats dans [docs/research/08-alphatab-verifie.md](docs/research/08-alphatab-verifie.md). Les deux questions bloquantes sont tranchées : `\tuning` s'écrit de la corde aiguë vers la grave, et `rf 1` = pouce.
- **4b — page de jugement : prête**, en attente du verdict humain sur `ds` / `glpf` / `glpt`. **Ne rien coder d'autre avant cette réponse.**

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
