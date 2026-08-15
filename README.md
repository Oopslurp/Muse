# Muse

Site personnel d'apprentissage de la guitare : une **bibliothèque de référence
des grandes techniques** de fingerstyle — classique et percussif moderne — et
un **accordeur chromatique**.

Un seul utilisateur, aucun compte, aucun backend. Tout ce qui est enregistré
vit dans le navigateur et ressort en JSON.

```bash
npm install
npm run dev        # http://localhost:4321
```

---

## Ce qui rend ce site différent d'un cours en ligne

**Chaque affirmation dit d'où elle vient.** Trois statuts, visibles à l'écran et
filtrables, jamais en note de bas de page :

| | |
|---|---|
| `sourcé` | attribué à une source identifiée et citée |
| `déduit` | raisonnement mécanique cohérent, qu'aucune source consultée ne formule ainsi |
| `observé` | vérifié guitare en main, avec sa date et sa note |

`observé` est une **promotion manuelle**, par affirmation, qui n'écrase pas
l'origine : « la source affirme ceci, j'ai constaté cela » est l'information
utile. Et les doutes restent écrits — 44 points portent un `[À VÉRIFIER]` avec
sa raison, y compris une fiche entière qui en compte neuf à elle seule. Ils
sont affichés, pas rangés.

**Les champs santé sont une contrainte de construction.** Une fiche sans durée
maximale, sans signaux d'arrêt ordonnés du plus précoce au plus tardif et sans
repos minimal ne compile pas. Le signal d'arrêt s'affiche près du tempo, là où
on décide de pousser — et le minuteur le **sonne**, parce qu'on travaille en
regardant ses mains.

**Aucun nom de note n'est écrit en dur.** Ils sont dérivés en TypeScript depuis
`(accordage, corde, case)`. Deux erreurs sont entrées dans le corpus par cette
voie exacte pendant la phase de recherche : une tablature juste, un nom de note
faux.

---

## Ce qu'il y a dedans

| | |
|---|---|
| `/techniques` | 32 fiches pour 33 techniques, filtrables sur quatre facettes |
| `/techniques/<id>` | fiche : geste, paliers, exercices joués, erreurs, protocole de séance |
| `/arbre` | graphe de prérequis et progression locale |
| `/accordeur` | chromatique, 13 accordages, affiché sur une tête de manche |
| `/pratique` | métronome à motifs, minuteur adossé aux champs santé, journal |
| `/style-guide` | le design system |

---

## Stack

**Astro** en sortie statique · **content collections** validées par **Zod** ·
**Tailwind 4** sans une seule variante `dark:` · **îlots React** réservés à
l'interactif lourd · **alphaTab** pour la partition, sources en **alphaTex** ·
**pitchy** (McLeod Pitch Method) et Web Audio pour l'accordeur · **Dexie** pour
le local · **TypeScript strict**.

**Aucun CDN, aucune police distante, aucun appel réseau à l'exécution** — et un
audit qui échoue si l'un apparaît.

---

## Vérifier

Un HTML correct ne prouve rien, une page chargée non plus : **ce qui a un
bouton doit être cliqué.** Le lecteur a été livré muet une fois, sans qu'aucun
contrôle ne s'en aperçoive.

```bash
npm test              # notes, accordeur, arbre, journal, sauvegarde, tablatures

npm run audit:console      # exceptions, îlots vides, débordement
npm run audit:lecture      # appuie sur « lire » et vérifie que le curseur avance
npm run audit:accordeur    # joue un mi2 détendu dans un faux micro, lit l'écran
npm run audit:progression  # note une technique, recharge, vérifie qu'elle a tenu
npm run audit:pratique     # compte les oscillateurs réellement programmés
npm run audit:mobile       # 8 routes × 320 et 390 px
npm run audit:poids        # budget par route, aucun appel hors origine
npm run audit:a11y         # contrastes et cibles, sur les couleurs rendues
npm run audit:finitions    # recherche, impression, page introuvable

npm run shot               # captures de contrôle dans .captures/
```

Chacun de ces garde-fous a été **vérifié en échec** avant qu'on lui fasse
confiance : un contrôle qui n'a jamais échoué ne prouve rien.

---

## Documents

| | |
|---|---|
| [CLAUDE.md](CLAUDE.md) | les décisions qui font foi. En cas de contradiction, il gagne |
| [docs/research/](docs/research/) | la phase de recherche, close |
| [docs/dette.md](docs/dette.md) | ce qui est imparfait, incomplet ou non vérifié |
| [docs/accessibilite.md](docs/accessibilite.md) | relevés d'accessibilité, mesurés et reproductibles |
| [docs/verifications-manuelles.md](docs/verifications-manuelles.md) | ce qu'aucun script ne peut vérifier à ma place |
| [docs/deploiement.md](docs/deploiement.md) | site statique, HTTPS obligatoire |

[LICENCE.md](LICENCE.md) — tous droits réservés, et ce que le dépôt ne possède
pas.
