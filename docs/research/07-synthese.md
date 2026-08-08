# 07 — Synthèse

---

## 1. Les huit choses les plus utiles que j'ai trouvées

### 1.1 Le créneau existe et il est vide

Sur les six plateformes analysées, **aucune ne traite une technique comme un objet durable**. Partout, une technique est le *sujet d'une vidéo* ou le *titre d'une leçon* : elle n'a pas de prérequis machine-lisibles, pas de critères de passage, pas de liste de symptômes, pas d'existence en dehors du contenu qui en parle.

C'est la raison d'être du site, et c'est ce qui justifie le graphe de prérequis de `00-taxonomie.md`.

### 1.2 Le fingerstyle percussif n'a pas de littérature technique

Le classique a Tennant, Carlevaro, Pujol, Shearer, Sagreras — un siècle et demi de formalisation. **Le percussif n'a rien d'équivalent** : pas de méthode de référence, pas de vocabulaire stabilisé, aucune description anatomique publiée. Tout est oral et vidéo, en mode « regarde et imite ».

Les sources les plus structurées (Mike Dawes chez JamPlay et TrueFire) sont vidéo, payantes, et décrivent des gestes sans dire quelle articulation bouge. Même le vocabulaire flotte : « kick », « body hit », « slap », « snare », « golpe » se recouvrent différemment selon les auteurs.

**Conséquence directe** : c'est ta contribution originale possible, mais c'est aussi la fiche la plus fragile du corpus (`02-fiches/percussion-kick-snare-golpe.md`) et celle qui demandera le plus de validation guitare en main.

### 1.3 `MD-05 Appui préparé` est le nœud caché du graphe

En construisant le graphe de prérequis, l'appui préparé (*planting*) est ressorti comme prérequis **à la fois** des arpèges et du trémolo. Ce n'est pas ce qu'on lit dans les descriptions habituelles, qui présentent le trémolo comme un problème de vitesse.

Si le blocage sur le trémolo est réel, **la piste à explorer en priorité est l'appui préparé, pas le métronome**.

### 1.4 La distinction butée/pincé est plus étroite qu'on ne le dit

La formulation courante (« on appuie / on n'appuie pas ») induit en erreur. La mise en mouvement de la corde est le **même geste** ; c'est l'angle de sortie qui diffère de quelques degrés. D'où le corollaire pratique : **un pincé mature peut atteindre 80 % du volume d'une butée**, et un pincé faible est la cause n°1 des mélodies qui disparaissent dans les arpèges.

⚠️ C'est ma synthèse, marquée `[À VÉRIFIER]` — cohérente physiquement, non trouvée telle quelle dans une source.

### 1.5 La donnée santé qui change la façon de concevoir le site

Trois faits sourcés (`01-sources.md` §D), dont le troisième est le plus important :

1. Jusqu'à **89 % des musiciens** rapportent une blessure professionnelle au cours de leur carrière ; la douleur poignet/main est la plus fréquente.
2. Dans un centre de médecine des arts du spectacle, **42 % des musiciens atteints de dystonie focale étaient des guitaristes**.
3. **Les premiers signes de la dystonie de fonction sont typiquement interprétés par le musicien comme un défaut de technique ou un manque de travail** — donc il travaille *plus*, ce qui aggrave.

Le point 3 signifie qu'un site de technique qui n'affiche que des objectifs et jamais de signal d'arrêt est **activement contre-productif**. C'est pourquoi chaque fiche porte une durée maximale et des signaux d'arrêt nommés, et pas seulement un tempo cible.

**Corollaire opérationnel** : ne t'étire pas avant d'être échauffé. C'est explicite dans le guide du Pasadena Conservatory et ça contredit ce que font la plupart des guitaristes.

### 1.6 alphaTab sait noter le percussif (peut-être)

Découverte utile : alphaTex dispose d'effets de beat `ds` (*dead slap*), `glpf` et `glpt` (*golpe* au doigt / au pouce), `rasg` (motifs de rasgueado), `tt` (tapping), plus `\instrument percussion` pour une portée séparée, et `barre` pour le barré.

Si ça fonctionne, **alphaTab peut couvrir tout le corpus, percussif compris** — ce qui n'était pas acquis. C'est le test technique le plus important à faire avant de coder.

### 1.7 `pitchy` utilise MPM, pas YIN — et c'est mieux

Le brief indiquait « `pitchy` (YIN) ». La documentation de la bibliothèque dit **McLeod Pitch Method**. Sans conséquence négative : MPM est probablement le meilleur choix pour un accordeur, et son indice `clarity` normalisé 0–1 est directement exploitable comme filtre de confiance.

**Le vrai risque de l'accordeur est ailleurs** : les traitements par défaut du navigateur (`noiseSuppression`, `autoGainControl`, `echoCancellation`) détruisent la détection de hauteur. `noiseSuppression` en particulier prend une note tenue pour du bruit stationnaire et l'atténue. C'est la cause n°1 des accordeurs web qui « marchent mal sans raison ».

Et il existe une **référence d'implémentation directe** : [`@chordbook/tuner`](https://github.com/chordbook/tuner), accordeur web open source pour instruments à cordes, bâti sur Web Audio API + `pitchy`.

### 1.8 Trois emprunts concrets au benchmark

- **De Soundslice** : la boucle qui s'aimante à la note / au silence / à la barre de mesure. Une boucle qui commence 40 ms trop tôt est inutilisable, et personne ne la règle au pixel.
- **De JustinGuitar** : le journal de pratique avec statistiques par exercice et par jour. Personne d'autre ne l'a, et ça se branche naturellement sur les paliers.
- **De Fretboard Trainer / Fretonomy** : la détection micro sur l'instrument réel. L'accordeur n'est pas un gadget isolé — c'est la première brique d'une capacité audio réutilisable.

---

## 2. Zones d'incertitude

### 2.1 Bloquants — à lever avant d'écrire du code

| # | Incertitude | Où | Comment lever |
|---|---|---|---|
| **B1** | **Mapping des doigtés main droite `rf 1-5` en alphaTex.** Je suppose 1 = p, 2 = i, 3 = m, 4 = a (convention Guitar Pro). Non confirmé par la doc. | Toutes les fiches | 15 min dans le [playground alphaTab](https://alphatab.net/docs/playground). **Si c'est faux, tout le corpus de tablatures est décalé d'un cran.** |
| **B2** | **Syntaxe et rendu de `ds`, `glpf`, `glpt`.** Existence confirmée dans la doc, aucun exemple d'usage trouvé. En particulier : peut-on appliquer un effet de beat à un silence (`r { ds }`) ? Probablement non. | `percussion-kick-snare-golpe.md` | Playground. **Détermine si le site peut couvrir le percussif ou s'il faut une solution de repli (piste `\instrument percussion` séparée).** |
| **B3** | **Ordre des cordes dans `\tuning`.** La doc alphaTab donne deux exemples contradictoires : `\tuning (E4 B3 G3 D3 A2 D2)` étiqueté « Dropped D » (aigu → grave) et `\tuning (A1 D2 A2 D3 G3 B3 E4)` (grave → aigu). | `05`, `06`, toutes les tabs | Playground. **Si l'accordeur et le lecteur partagent une liste d'accordages, cette contradiction produira des bugs silencieux.** |
| **B4** | **Contraintes `getUserMedia` réellement appliquées** selon les navigateurs. | `06-accordeur.md` | Tester sur Chrome/Firefox/Safari, vérifier avec `track.getSettings()`. |
| **B5** | **Capacités d'alphaTab** : boucle aimantée sur les frontières musicales, isolement de voix, métronome décalable. Les partis pris de design en dépendent. | `04-benchmark.md` §5, `05-modele-donnees.md` | Lire l'API alphaTab avant de figer le modèle de données. |

### 2.2 Contenu musical — à vérifier guitare en main

| # | Incertitude | Où |
|---|---|---|
| C1 | **Exercice D d'`apoyando-tirando`** — écrit pour la fiche, jamais entendu. Vérifier la tenabilité main gauche et le fa naturel sur l'accord de mi. |
| C2 | **Exercice C d'`arpeges-pima`** — j'ai écrit « ré » pour ce qui est un **sol** (corde 1 case 3). Les cases sont bonnes, le commentaire était faux, la mélodie en résulte peu inspirée. **À réécrire.** |
| C3 | **Exercice D d'`alternance-pouce`, mesure 3 (Fa)** — la corde 3 case 2 y sert à la fois de basse et de mélodie. **Erreur assumée, laissée visible** parce qu'elle illustre une contrainte réelle du style : tous les accords n'offrent pas deux basses. Corriger en remplaçant Fa par Ré mineur. |
| C4 | **Exercices C et D de `barre`** — originaux, contenu vérifié par le calcul des notes, pas par l'écoute. |
| C5 | **Exercice C de `tremolo`** — le mi tenu produit une septième majeure sur l'accord de fa. Choix esthétique à valider. |
| C6 | **Voicings de la grille Giuliani op. 1** — j'utilise C `x32010` et G7 `320001` sans avoir consulté d'édition. À confirmer sur IMSLP avant d'écrire « d'après Giuliani » sur le site. |

> **Une leçon générale sur ces erreurs** : je peux écrire une tablature mécaniquement valide tout en me trompant sur le nom des notes. **Ne fais confiance qu'aux numéros de case, jamais à mes noms de notes.**

### 2.3 Anatomie et geste — descriptions déduites, non sourcées

| # | Point | Fiche |
|---|---|---|
| A1 | **Toute la §3.1 de la fiche percussion (kick)** : zone de frappe, surface de contact, articulation motrice. La seule source décrit un geste composite (ongles + paume simultanés) que je n'ai pu confirmer autrement. |
| A2 | **Snare** : le mécanisme (cordes claquant contre les frettes) est sourcé ; zone, surface et rôle du rebond sont déduits. |
| A3 | **Nail attack, tapping deux mains, harmoniques tapées** : descriptions déduites de descriptifs de cours. Aucune vidéo visionnée. |
| A4 | **Tambora** : aucune source méthodologique écrite consultée. |
| A5 | **Angles de main et d'avant-bras** : **aucune de mes sources ne donne de valeur chiffrée.** Toutes décrivent qualitativement. Méfie-toi de toute source qui te donnerait un angle en degrés sans le justifier. |
| A6 | **« La différence butée/pincé est un angle de sortie de quelques degrés »** et **« p et a doivent travailler dans des plans séparés »** (trémolo) : mes synthèses mécaniques, non trouvées dans une source. |
| A7 | **Recommandations santé de la fiche percussion** : **prudentielles, non sourcées.** La littérature sur la santé des musiciens ne couvre pas le fingerstyle percussif. **C'est le trou documentaire le plus préoccupant de toute la recherche.** |

### 2.4 Droit d'auteur — à trancher avant de publier quoi que ce soit

| # | Point | Position que j'ai prise |
|---|---|---|
| D1 | **Villa-Lobos** (†1959) | ✅ **Tranché — retiré** (`CLAUDE.md`, décision 6). Pas domaine public en UE avant 2030. Référence d'écoute seulement. |
| D2 | **Barrios Mangoré** (†1944) | ✅ **Tranché — ajouté** (`CLAUDE.md`, décision 6). Domaine public en UE depuis 2015. *Un Sueño en la Floresta* pour le trémolo, *La Catedral* pour arpèges et barrés. Statut hors UE toujours non vérifié. |
| D3 | **Doigtés des éditions Segovia** des études de Sor | L'œuvre est libre, l'édition révisée peut ne pas l'être. Non tranché. |
| D4 | **Romance anónimo** | Œuvre traditionnellement considérée comme anonyme et libre ; attribution à Yepes et éditions modernes à vérifier. |
| D5 | ***Freight Train*** | Attribué à Elizabeth Cotten (†1987). **Pas domaine public. Ne pas utiliser.** |
| D6 | **Arrangements de chansons traditionnelles** | La mélodie peut être libre, l'arrangement presque jamais. Faire les siens. |
| D7 | **Motifs rythmiques flamencos (*compás*)** | Un motif rythmique nu n'est en général pas protégeable, mais une transcription de *falseta* d'un guitariste identifié l'est. Hors de ma compétence. |
| D8 | **Tout le répertoire percussif moderne** | **Rien n'est dans le domaine public.** Prévois du contenu 100 % original sur cette famille. |

### 2.5 Références et sources — vérifications de routine

Numérotations d'opus citées de mémoire, à confirmer sur IMSLP : **Sor op. 6 n°11**, **Sor op. 31 n°20**, **Sor op. 35 n°22**, **Carcassi op. 60 n°7**, **Tárrega *Sueño (Mazurka)*** (contient-il vraiment du trémolo ?).

Autres : symbole du 5ᵉ doigt MD (**c** / **e** / **ch**) ; terminologie allemande de la butée ; filiation historique Mose Rager / Ike Everly → Merle Travis ; formule du trémolo flamenco `p-i-a-m-i` ; titre d'un ouvrage papier de référence de Tommy Emmanuel ; qualité réelle de **toutes** les chaînes YouTube listées (**aucune vidéo visionnée**) ; tous les tarifs des plateformes (aucun montant chiffré n'est cité dans le corpus, pour cette raison).

### 2.6 Deux trous documentaires que je n'ai pas pu combler

1. **Aucune étude clinique mesurant l'effet d'un échauffement guitare précis sur l'incidence des TMS.** Les sources médicales disent « 10–15 minutes » sans dire quoi jouer ; les sources guitare disent quoi jouer sans validation. Le seul pont est la *Daily Warm-Up Routine* de Tennant — consensus de praticien, pas donnée clinique. Recherche infructueuse, absence non prouvée.
2. **Aucune ressource guitare classique traitant sérieusement le placement rythmique** (TR-03). C'est un savoir de musicien d'ensemble qui n'a pas été formalisé côté guitare solo.

---

## 3. Ce qui reste à décider avant de coder

### 3.1 Décisions techniques

| # | Question | Mon avis |
|---|---|---|
| T1 | **alphaTex inline dans le frontmatter, ou fichiers `.atex` séparés ?** | Fichiers séparés dès qu'un exercice dépasse 4 mesures. Le YAML multiligne est fragile (indentation, échappement des `\`) et on perd la coloration syntaxique. |
| T2 | **Sources locales à chaque fiche, ou catalogue global ?** | Catalogue global (`sources.yaml`) + `sourceIds`. *Pumping Nylon* apparaît dans 15 fiches ; le dupliquer garantit des divergences. |
| T3 | **Validation du schéma : types TS seuls, ou Zod/Valibot au build ?** | Validation à l'exécution. Les types TS ne valident rien, et le frontmatter est du contenu, pas du code. Les 12 invariants de `05-modele-donnees.md` ne sont vérifiables qu'ainsi. |
| T4 | **Progression utilisateur : localStorage, fichier JSON versionné, ou backend ?** | Fichier JSON versionné dans le repo pour un utilisateur unique — sauvegardé, diffable, survit à un changement de navigateur. localStorage en complément. |
| T5 | **Le lecteur alphaTab est-il un composant partagé ou une intégration par fiche ?** | Dépend de B5. À trancher après le test des capacités. |

### 3.2 Décisions de contenu

| # | Question | Mon avis |
|---|---|---|
| Cn1 | **Convention pour le 5ᵉ doigt MD** (`c` / `e` / `ch`) | Choisis **`c`** (usage Tennant) et documente-le. Sans importance pratique, mais il faut une convention. |
| Cn2 | **Convention de notation du barré** (`CV`, `½CV`, `B5`…) | À standardiser. Les éditeurs divergent beaucoup. |
| Cn3 | **Ordre canonique des cordes** dans les données internes | Décide un ordre unique (je suggère **corde 6 → corde 1**, l'ordre de lecture d'un accordeur) et convertis aux frontières avec alphaTex. Dépend de B3. |
| Cn4 | **Latéralité** : champ `hand: 'pince' \| 'frette'` ou tout écrire en « droite/gauche » ? | Le champ. Coût quasi nul maintenant, impossible à rattraper plus tard. |
| Cn5 | **Faut-il afficher les fiches courtes au même niveau que les fiches complètes ?** | Oui, avec un marqueur de profondeur. Une fiche courte reste un nœud du graphe. |
| Cn6 | **Quelle nomenclature percussive imposer ?** | Je propose de classer par **fonction sonore** (grave/aigu/accent) plutôt que par nom d'usage, en documentant les synonymes. C'est la seule sortie propre au flottement du vocabulaire. À valider par ton usage réel. |

### 3.3 Décisions de périmètre

| # | Question |
|---|---|
| P1 | **Le rendu audio des fiches percussives sera faux** (alphaTab ne restituera pas le fait qu'un snare coupe les notes en cours). Affiche-t-on un avertissement, désactive-t-on la lecture, ou l'accepte-t-on tel quel ? Le champ `audioFaithful` du modèle prévoit le cas ; reste à décider du comportement. |
| P2 | **Combien de fiches courtes promeut-on en fiches complètes, et dans quel ordre ?** Les candidates les plus utiles pour ton profil me semblent `MD-05 appui préparé` (c'est le nœud caché du graphe), `TR-04 équilibre des voix`, `MG-09 étouffements MG` (indispensable en accordage ouvert). |
| P3 | **Le journal de pratique est-il dans le périmètre v1 ?** C'est le seul emprunt du benchmark qui demande un vrai état persistant. |
| P4 | **L'accordeur partage-t-il des données avec le lecteur de tab** (liste d'accordages commune) ? Si oui, B3 devient bloquant pour les deux modules. |

---

## 4. Ordre de travail recommandé

1. **Une heure dans le playground alphaTab.** Lever B1, B2, B3 et B5. C'est le point de plus grande incertitude et de plus grande conséquence : le résultat détermine le modèle de données, la faisabilité du percussif, et la validité de toutes les tablatures déjà écrites.
2. **Une session guitare de vérification** sur C1 à C6. Une heure suffit ; ce sont des vérifications de quelques secondes chacune.
3. **Le prototype d'accordeur**, isolé du reste. Lever B4 en premier (`getUserMedia`), puis tester la corde 6 d'acoustique et la stabilité à 61,74 Hz. Lire `@chordbook/tuner` avant d'écrire.
4. **Puis seulement** figer le modèle de données et commencer le site.

**Ne code rien avant l'étape 1.** Une correction du mapping `rf` ou de l'ordre des cordes après avoir écrit trente fiches coûte beaucoup plus cher qu'une heure de test maintenant.

---

## Inventaire des livrables

| Fichier | Contenu | `[À VÉRIFIER]` |
|---|---|---|
| `00-taxonomie.md` | 33 techniques, 4 familles, graphe de prérequis Mermaid | 4 |
| `01-sources.md` | Méthodes, plateformes, chaînes, **santé de la main** | 8 |
| `02-fiches/apoyando-tirando.md` | Fiche complète, 9 sections, 4 exercices | 7 |
| `02-fiches/arpeges-pima.md` | Fiche complète, grille Giuliani | 5 |
| `02-fiches/barre.md` | Fiche complète, 4 exercices | 5 |
| `02-fiches/tremolo.md` | Fiche complète, exercices de déstructuration | 7 |
| `02-fiches/alternance-pouce.md` | Fiche complète, Travis picking | 6 |
| `02-fiches/percussion-kick-snare-golpe.md` | Fiche complète — **la plus fragile** | 9 |
| `03-fiches-courtes.md` | 27 techniques restantes | 6 |
| `04-benchmark.md` | 6 plateformes + 5 partis pris de design | 5 |
| `05-modele-donnees.md` | Interfaces TS, types dérivés, 12 invariants de build | 4 |
| `06-accordeur.md` | Web Audio + MPM, accordages, pseudo-code | 8 |
| `07-synthese.md` | Ce document | — |
