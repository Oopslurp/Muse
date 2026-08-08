# 04 — Benchmark

Analyse de six plateformes, sous un angle unique : **comment elles présentent une technique**. Pas leur catalogue, pas leur prix, pas leur communauté — la présentation pédagogique d'un geste.

> **Méthode et limites.** Analyse fondée sur les pages publiques, la documentation produit et des recensions tierces. **Je n'ai d'accès payant à aucune de ces plateformes** et je n'ai visionné aucune vidéo de cours. Ce qui est décrit comme « bien fait » est déduit de descriptions et d'avis, pas d'un usage direct. Les jugements sur ce qui *manque* sont donc plus fiables que les jugements sur ce qui *fonctionne*.

---

## 1. tonebase Guitar

**Ce que c'est.** Plateforme d'apprentissage par des artistes de haut niveau (dont des lauréats Grammy), lancée en 2017 sur la guitare classique puis étendue au piano, violon, violoncelle. Milliers de leçons. Sources : [tonebase](https://www.tonebase.co/), [Nylon Plucks](https://nylonplucks.com/technique-learning/tonebase-review-online-classical-guitar-lessons/), [ClickTrack](https://www.clicktrack.fm/p/inside-tonebase-the-masterclass-for), [Mordents](https://mordents.com/tonebase-guitar-review/).

### Bien fait
- **La séparation explicite répertoire / technique / *special features***. Trois catégories, pas un magma. C'est structurant : on sait si on vient travailler un geste ou une pièce.
- **Les *learning tracks*** — parcours balisés plutôt que catalogue à butiner. Décrits comme « solides et polyvalents ».
- **Les cahiers PDF** sur les routines d'échauffement et les fondamentaux techniques : du **texte imprimable** en complément de la vidéo. C'est rare et c'est juste — on ne travaille pas avec un écran qui joue.
- **Le retour d'artiste sur ta propre vidéo** (masterclasses virtuelles). C'est le seul mécanisme de correction réel dans tout ce benchmark, avec le Woodshed.
- **Le niveau assumé** : la plupart des leçons présupposent une technique installée. Ils n'essaient pas de plaire à tout le monde.

### Ce qui manque
- **Pas de modèle de la technique comme objet.** Une technique n'y existe que comme *sujet d'une vidéo*. Il n'y a pas de fiche « apoyando » persistante, versionnée, avec des prérequis et des critères. Le savoir est enfermé dans la durée d'une vidéo.
- **Pas de graphe de dépendances.** Impossible de savoir ce qu'il faut maîtriser avant d'aborder le trémolo.
- **Pas de critère de passage explicite.** L'artiste montre et explique ; il ne dit pas « tu passes à la suite quand tu tiens X pendant Y ».
- **Le percussif moderne est absent** — c'est une plateforme classique.
- Contenu **derrière un mur payant**, donc non liable depuis un site tiers.

### Ce que j'en reprends
1. **La tripartition technique / répertoire / transversal.**
2. **La double sortie vidéo + PDF imprimable.** Chez moi ce sera fiche web + version imprimable de la progression et des exercices.
3. **L'hypothèse de niveau assumée.** Je ne fais pas un site pour débutants.

---

## 2. Soundslice

**Ce que c'est.** Lecteur de notation synchronisée à l'audio/vidéo. Sources : [Features](https://www.soundslice.com/features/), [Practice guitar](https://www.soundslice.com/practice-guitar/), [Ralenti et boucles](https://www.soundslice.com/blog/199/introducing-enhanced-slowdown-and-perfect-looping/), [Outils vidéo sans notation](https://www.soundslice.com/blog/45/new-use-soundslice-video-tools-without-music-notation/).

### Bien fait
- **La synchronisation notation ↔ enregistrement réel.** Les notes s'allument ; on clique sur une note pour sauter à cet instant. C'est le meilleur mécanisme d'apprentissage de tout ce benchmark.
- **Le ralenti sans changement de hauteur, jusqu'à 25 %** sur les fichiers audio avec un navigateur récent.
- **Les boucles qui s'aimantent** à la note, au silence ou à la barre de mesure la plus proche. C'est un détail d'ergonomie qui change tout : une boucle qui commence 40 ms trop tôt est inutilisable, et personne ne veut la régler au pixel.
- **La forme d'onde visuelle** pour naviguer.
- **Le masquage/mute de parties individuelles** — pensé pour le chœur mais directement utile pour isoler la basse d'une texture polyphonique.

### Ce qui manque
- **Aucune pédagogie du geste.** Soundslice affiche *quoi* jouer, jamais *comment*. C'est un outil, pas un enseignant — et ils l'assument.
- Pas de progression, pas de prérequis, pas de diagnostic.
- Pas de notion de technique du tout.

### Ce que j'en reprends
1. **La boucle aimantée sur les frontières musicales.** À implémenter avec alphaTab : une boucle qui s'aligne sur la mesure ou le temps, jamais sur le temps absolu.
2. **Le ralenti par défaut sur les exercices**, avec un tempo de départ **préréglé par palier** — puisque mes fiches définissent déjà un tempo de départ et un tempo cible, le lecteur peut être initialisé dessus automatiquement. C'est une intégration que Soundslice ne peut pas faire, faute de données pédagogiques.
3. **L'isolement de voix** pour les fiches polyphoniques (trémolo, Travis, équilibre des voix) : bouton « basse seule », « mélodie seule ».

> **Soundslice est le concurrent technique direct.** Mon avantage n'est pas le lecteur — le leur sera toujours meilleur — c'est **le contexte pédagogique autour du lecteur**.

---

## 3. Ultimate Guitar

**Ce que c'est.** Base de tablatures massive et contributive, avec une offre Pro. Sources : [À propos](https://www.ultimate-guitar.com/about/), [Guitar Chalk, review 2026](https://www.guitarchalk.com/ultimate-guitar-pro-review/), [Killer Guitar Rigs](https://killerguitarrigs.com/ultimate-guitar-pro-review/), [Aide UG — types de tabs](https://help.ultimate-guitar.com/en/articles/6741306-tabs).

### Bien fait
- **La couverture.** Rien n'approche leur catalogue.
- **La hiérarchie de qualité explicite** : *Official* (produites en interne, avec pistes d'accompagnement enregistrées par des musiciens pro), *Pro* (contributives mais très bien notées, affichées en format riche), *User* (contributives brutes en texte). **Nommer les niveaux de fiabilité est une bonne idée que je reprends.**
- **La modération avant publication** de chaque contribution.
- Outils de lecture Pro : contrôle de vitesse, boucle, manche virtuel, pistes multiples.

### Ce qui manque
- **Zéro pédagogie du geste.** Une tab dit quelles cases, jamais quel doigt, quel type d'attaque, quel relâchement.
- **La fiabilité reste un problème même sur les tabs officielles.** Les recensions sont explicites : les *Official* sont annoncées comme « impeccablement transcrites » mais les testeurs notent qu'elles ne sont **pas toujours exactes** et qu'aucune qualification n'est fournie sur les transcripteurs. Un test cité relève deux notes fausses dans une version gratuite, corrigées dans la Pro. **Traduction : même le meilleur niveau payant du plus gros acteur du marché n'est pas fiable à 100 %.**
- Aucune notion de progression, de prérequis, de diagnostic.

### Ce que j'en reprends
1. **L'affichage explicite du niveau de fiabilité de chaque contenu.** C'est exactement ce que fait mon marquage `[À VÉRIFIER]` — je vais l'institutionnaliser en champ de données (`verificationStatus`), affiché visiblement sur chaque fiche et chaque tablature.
2. **Rien d'autre.** UG est ici principalement comme contre-exemple : c'est ce qui arrive quand on optimise le volume et l'accès plutôt que la compréhension.

---

## 4. Fret Trainer / Fretonomy

**Ce que c'est.** Application de mémorisation du manche. Attention : **le nom a bougé**. `frettrainer.com` pointe aujourd'hui vers **Fretonomy**, et plusieurs applications distinctes portent des noms proches (*Fretboard Trainer*, *Fret Pro*, *Fretboard Addict*, *FretGenius*). Sources : [Fretonomy](https://fretonomy.com/), [frettrainer.com](https://frettrainer.com/), [Fretboard Trainer, App Store](https://apps.apple.com/us/app/fretboard-trainer/id1486193335), [Fretonomy, App Store](https://apps.apple.com/us/app/fretonomy-learn-fretboard/id1279576225).

`[À VÉRIFIER : je ne sais pas laquelle de ces applications tu avais en tête. L'analyse ci-dessous porte sur le mécanisme commun, pas sur un produit précis.]`

### Bien fait
- **La détection par microphone : on joue sur sa vraie guitare, pas sur un manche à l'écran.** Fretboard Trainer permet d'utiliser son instrument réel plutôt qu'une image de manche ; Fretonomy propose les deux. **C'est le point le plus important de tout ce benchmark pour mon projet**, parce que c'est exactement la brique technique que je vais construire pour l'accordeur (voir `06-accordeur.md`).
- **La boucle de rétroaction immédiate et chiffrée.** Une note demandée, tu joues, +1 point si juste, −1 si faux, une minute au chrono. C'est court, mesurable, et ça crée une envie de recommencer.
- **La granularité des sessions** : Fretboard Trainer propose six sessions distinctes (cordes à vide, case 3, case 5, case 7, case 10, formes d'octave). Chacune est un objectif atteignable en une séance.
- **Les modes de jeu variés** (identification de note, association de couleurs, gammes) chez Fretonomy.

### Ce qui manque
- **Une seule compétence traitée** — la localisation des notes. Rien sur le geste.
- **Aucune notion de qualité.** L'app sait si tu as joué le bon *pitch*, pas si tu l'as bien joué. C'est une limite intrinsèque de la détection de hauteur, et il faut en être conscient : **je ne pourrai jamais évaluer une butée par microphone.**

### Ce que j'en reprends
1. **La détection micro comme brique réutilisable.** L'accordeur n'est pas un module isolé : c'est le premier usage d'une capacité audio que je peux ensuite étendre (vérification d'accordage alternatif avant un exercice, par exemple).
2. **Les sessions courtes et chiffrées.** Mes paliers ont déjà des critères ; certains sont mesurables automatiquement (tenir un tempo), la plupart non. **Je dois être honnête sur cette frontière** plutôt que de faire semblant d'évaluer ce que je ne peux pas mesurer.
3. **Ce que je ne reprends pas** : la gamification par points. Sur une bibliothèque de référence pour un adulte expert, ça sonnerait faux.

---

## 5. JustinGuitar

**Ce que c'est.** Le plus grand site de cours gratuits de guitare populaire. Sources : [JustinGuitar](https://www.justinguitar.com/), [Guitar World review](https://www.guitarworld.com/reviews/justinguitar-review), [Cours intermédiaire grade 4](https://www.justinguitar.com/classes/intermediate-guitar-course-grade-four), [Practice Assistant](https://www.justinguitar.com/guitar-lessons/using-my-practice-assistant-b1-117).

### Bien fait
- **La structure en grades et modules.** Trois niveaux, neuf grades, chaque grade découpé en une demi-douzaine de modules, chaque module en leçons de 8 à 20 minutes. **C'est le meilleur découpage pédagogique du web guitare**, tous styles confondus : lisible, fini, on sait toujours où on en est.
- **Le *Practice Assistant*** : construction de routines de travail, ordre libre des exercices, métronome optionnel, **statistiques de temps passé par exercice et par jour**. C'est la fonctionnalité que personne d'autre n'a et qui manque le plus ailleurs.
- **Les chansons rattachées à chaque module** — une application immédiate de ce qu'on vient d'apprendre.
- **La gratuité du fond.**

### Ce qui manque
- **Le domaine.** Guitare populaire, accompagnement, accords. Presque rien de classique, rien de percussif, rien de fingerstyle avancé.
- **Le geste n'est pas analysé anatomiquement.** On est dans le « fais comme ça », pas dans « quelle articulation, quel angle, quel relâchement ».
- **Le Practice Assistant est incomplet** — encore récent, disponible sur les leçons récentes seulement, avec l'intention de couvrir tout le site à terme.

### Ce que j'en reprends
1. **Le découpage grade → module → leçon**, transposé en **famille → technique → palier**. Chaque palier doit être une unité finie, faisable en une séance.
2. **Le journal de pratique avec statistiques par exercice.** C'est reprenable et ça manque partout ailleurs. Chez moi, ça se branche naturellement sur les paliers : « tu es au palier 3 de trémolo depuis 12 jours ».
3. **L'application immédiate** : chaque fiche a déjà une section répertoire domaine public. Elle doit être liée, pas décorative.

---

## 6. Classical Guitar Shed (Allen Mathews)

**Ce que c'est.** École de guitare classique en ligne pour adultes ; articles gratuits + programme *The Woodshed®* en abonnement. Sources : [Classical Guitar Shed](https://classicalguitarshed.com/), [Page programme](https://classicalguitarshed.com/start/), [Allen Mathews](https://www.allenmathews.com/), [Trustpilot](https://www.trustpilot.com/review/classicalguitarshed.com).

### Bien fait
- **« Aucune devinette sur quoi travailler ».** C'est leur promesse explicite et c'est le bon problème à résoudre : le premier obstacle de l'autodidacte adulte n'est pas la difficulté, c'est **l'incertitude sur la pertinence de ce qu'il fait**.
- **Papier ET vidéo pour chaque leçon**, consultables indéfiniment.
- **L'envoi de vidéos pour retour individuel.** Comme tonebase, c'est le seul vrai correctif.
- **Le rythme libre**, chaque leçon révisable autant que nécessaire — pensé pour l'adulte qui a une vie.
- **L'obsession de la réduction d'effort.** Le traitement de la tension est le plus explicite du benchmark. Les avis Trustpilot louent surtout la structure et la capacité à maintenir la pratique dans la durée.

### Ce qui manque
- **Le niveau.** Ciblé adulte débutant → intermédiaire. Pour un intermédiaire visant expert, c'est un cran en dessous.
- **Pas de percussif, pas de moderne.**
- **Pas de modèle de données navigable** : c'est un parcours linéaire, pas une bibliothèque de référence. On ne peut pas y arriver par la question « comment marche le barré » et repartir.

### Ce que j'en reprends
1. **Supprimer l'incertitude.** Chaque fiche doit répondre à « qu'est-ce que je fais aujourd'hui, pendant combien de temps, et comment je sais que c'est bon ». C'est déjà la structure de mes fiches (§5 paliers, §8 protocole) — ce benchmark confirme que c'est le bon axe.
2. **La priorité donnée au relâchement.** Chez moi, TR-05 doit être visible en permanence, pas rangé dans un coin.
3. **Le double format papier/écran.**

---

## Synthèse comparative

| | Technique = objet | Prérequis explicites | Critères de passage | Anatomie du geste | Autodiag | Journal de pratique | Lecteur de tab | Niveau expert | Percussif |
|---|---|---|---|---|---|---|---|---|---|
| **tonebase** | ✗ | ✗ | ✗ | ~ | ✗ | ✗ | ✗ | ✓ | ✗ |
| **Soundslice** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **✓✓** | n/a | n/a |
| **Ultimate Guitar** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| **Fret Trainer / Fretonomy** | ✗ | ~ | ✓ | ✗ | **✓** (micro) | ✓ | ✗ | ✗ | ✗ |
| **JustinGuitar** | ~ | ✓ | ✓ | ✗ | ✗ | **✓** | ~ | ✗ | ✗ |
| **Classical Guitar Shed** | ~ | ✓ | ~ | ✓ | ~ | ✗ | ✗ | ✗ | ✗ |
| **Ce site (visé)** | **✓** | **✓** | **✓** | **✓** | **✓** | ✓ | ✓ | ✓ | **✓** |

**Le constat central : personne ne traite une technique comme un objet de première classe.** Partout, la technique est le *sujet d'une leçon*, jamais une entité durable avec des prérequis, des critères et des symptômes. C'est le créneau, et il est vide.

**Le second constat : personne ne couvre le percussif avec rigueur.** Les seules ressources structurées (Dawes chez JamPlay/TrueFire) sont en vidéo, payantes, et sans analyse anatomique. Voir `02-fiches/percussion-kick-snare-golpe.md`, qui documente ce trou en détail.

---

## Cinq partis pris de design pédagogique

### 1. La technique est l'objet de première classe, pas la leçon

Une URL = une technique. Elle est durable, versionnée, avec des prérequis machine-lisibles, des paliers, des critères et une liste de symptômes. Les vidéos, tablatures et pièces de répertoire sont des **satellites** de la fiche, pas l'inverse.

**Conséquence concrète** : le graphe de prérequis de `00-taxonomie.md` doit être navigable et affiché sur chaque fiche (« pour aborder ceci, tu dois tenir cela »). C'est ce que personne ne fait.

### 2. Chaque affirmation porte visiblement son niveau de fiabilité

Trois états, affichés dans l'interface, pas cachés dans une note de bas de page :

| État | Signification |
|---|---|
| **Sourcé** | Attribué à une méthode ou une source identifiée, citée |
| **Déduit** | Raisonnement mécanique cohérent, non sourcé |
| **À vérifier** | Doute explicite, avec la raison du doute |

C'est le principe déjà appliqué dans toutes les fiches de cette recherche, et c'est ce qu'UG rate malgré ses trois niveaux de tabs : ils hiérarchisent la *provenance*, pas la *certitude*. Un site honnête sur ses limites est plus utile qu'un site qui affirme tout au même niveau. **Et pour un site à utilisateur unique, c'est simplement la vérité de l'état du travail.**

### 3. Un critère de passage explicite et testable en solo, ou rien

Aucun palier ne se termine par « quand tu te sens prêt ». Chaque palier a un critère **observable seul**, formulé en termes de son ou de sensation, pas d'intention. Et quand un critère n'est pas testable seul, la fiche le dit.

Corollaire : **la section autodiagnostic est aussi importante que la section technique.** C'est ce qui remplace le professeur. Personne dans ce benchmark ne le fait — ils supposent tous soit un prof, soit un retour vidéo payant.

### 4. Le relâchement et la santé ne sont pas une page annexe

Chaque fiche porte un protocole de séance avec **une durée maximale et un signal d'arrêt nommé**, pas seulement un objectif. La technique la plus à risque du corpus (le barré) porte un avertissement dans son protocole, pas dans un pied de page.

Justification : la littérature est explicite (voir `01-sources.md` §D) — jusqu'à 89 % des musiciens rapportent une blessure professionnelle, 42 % des musiciens vus pour dystonie focale en centre spécialisé sont guitaristes, et **les premiers signes sont typiquement pris pour un défaut de technique, ce qui pousse à travailler plus**. Un site qui pousse à travailler plus sans dire quand s'arrêter est activement nuisible.

### 5. Le rendu sonore sert le diagnostic, pas la démonstration

alphaTab jouera les exercices. Mais l'usage cible n'est pas « écoute comme c'est joli » — c'est :

- **boucle aimantée** sur une mesure ou un temps (repris de Soundslice) ;
- **tempo initialisé au tempo de départ du palier courant**, pas au tempo d'écriture ;
- **isolement de voix** (basse seule / mélodie seule) sur les fiches polyphoniques ;
- **métronome décalable** — clic sur le temps 2, ou sur la 2ᵉ note du cycle. Plusieurs autodiagnostics de mes fiches reposent là-dessus (trémolo, placement rythmique) et **aucun outil du benchmark ne le propose**.

Et une honnêteté à afficher : le rendu MIDI ne restitue **ni le timbre, ni la butée, ni les étouffements percussifs**. Sur les fiches concernées, il faut le dire. Le son de référence reste l'oreille et l'enregistrement de soi.

---

## `[À VÉRIFIER]` de ce document

| Point | Raison |
|---|---|
| Toutes les descriptions de fonctionnalités payantes | Aucun accès. Déduites des pages produit et de recensions tierces. |
| Identité de « Fret Trainer » | Plusieurs applications de noms proches ; `frettrainer.com` pointe vers Fretonomy. Je ne sais pas laquelle tu visais. |
| Complétude du Practice Assistant de JustinGuitar | Décrit comme récent et partiel au moment des sources consultées ; peut avoir évolué. |
| Qualité réelle des tabs *Official* d'Ultimate Guitar | Deux sources tierces s'en méfient ; je n'ai pas testé. |
| Capacités réelles d'alphaTab en matière de boucle aimantée, isolement de voix et métronome décalé | **Non vérifiées.** Les partis pris 5 supposent que c'est faisable. À valider avant de s'engager dessus. |
