# 08 — alphaTex vérifié (Tranche 0)

**Méthode** : parsing réel avec alphaTab et lecture du modèle produit. Aucune de ces réponses n'est déduite de la documentation. Sonde reproductible : `node tools/probe-alphatex.mjs`.

**Version testée** : `@coderline/alphatab` **1.8.4**, Node 24.18.0.

---

## Résumé exécutable

| # | Question | Réponse | Impact sur le corpus |
|---|---|---|---|
| R1 | `\staff {tab}` | ❌ **N'existe pas.** C'est `{tabs}`. | 🔴 **Tous les exercices du corpus** |
| R2 | Ordre des cordes dans `\tuning` | ✅ **Corde 1 (aiguë) en premier** | 🟢 Corpus correct |
| R3 | `X.N` dans le texte | `.1` = 1ʳᵉ entrée de `\tuning` = corde aiguë | 🟢 Corpus correct |
| R4 | `note.string` dans le modèle | ⚠️ **Numérotation inversée** par rapport au texte | 🟠 Piège pour le code |
| R5 | `rf 1-5` (main droite) | ✅ **`rf 1` = pouce.** Hypothèse confirmée | 🟢 Corpus correct |
| R6 | `lf 1-5` (main gauche) | ❌ **`lf 1` = pouce aussi**, pas index | 🔴 **Corpus décalé de 1** |
| R7 | `ds` / `glpt` / `glpf` sur silence | ✅ **Fonctionnent** | 🟢 Percussif viable |
| R12 | Rendu **audio** de ces effets | ⚠️ `ds` sonne, **`glpt`/`glpf` sont muets** | 🟠 Kick et snare doivent passer par `ds` |
| R8 | `barre` | `{ barre (5) }`, formes `Full` / `Half` | 🟠 Parenthèses manquantes |
| R9 | `\ts 4 4` | Toléré mais **avertissement** → `\ts (4 4)` | 🟠 Cosmétique |
| R10 | Piste `\instrument percussion` | Staff créé, **syntaxe des articulations non résolue** | ⚪ Non bloquant |

**Verdict global : le percussif est faisable nativement sur la portée de guitare.** La solution de repli (piste de percussion parallèle) n'est pas nécessaire — ce qui est la bonne nouvelle de cette tranche.

**Deux erreurs systématiques à corriger dans le corpus** : `{tab}` → `{tabs}`, et tous les `lf N` → `lf N+1`.

---

## R1 — `\staff {tab}` n'existe pas

```
[205] ligne 2, col 8 : Unrecognized property 'tab'.
```

La propriété valide est **`tabs`** (pluriel). `\staff {score tab}` doit devenir `\staff {score tabs}`.

**Ce diagnostic fait échouer `readScore()`**, il n'est pas seulement cosmétique. Tous les exercices du corpus de recherche sont actuellement **impossibles à parser** pour cette seule raison.

> **Piège méthodologique à retenir.** Le message de l'exception est inutilisable :
> `UnsupportedFormatError: Error parsing alphaTex, check diagnostics on inner error for details`
> — et `error.inner` est **`undefined`**. Les vrais diagnostics sont sur **l'importer**, pas sur l'erreur :
>
> ```js
> const importer = new at.importer.AlphaTexImporter();
> importer.initFromString(tex, new at.Settings());
> try { importer.readScore(); } catch (e) {
>   // e.inner === undefined — inutile
>   console.log(importer.lexerDiagnostics.items);
>   console.log(importer.parserDiagnostics.items);   // ← ici
> }
> ```
>
> Chaque diagnostic porte `code`, `message`, `severity`, `start {line, col, offset}`, `end`. **L'invariant de build n°9 doit lire ces tableaux**, sinon il ne dira jamais *pourquoi* une tablature échoue.

---

## R2 / R3 — Ordre des cordes : l'hypothèse du corpus est bonne

### Le test

```
\track "T"
\staff {tabs}
:4 0.1 0.2 0.3 0.4 | :4 0.5 0.6 r r |
```

Accordage par défaut, résultat :

| Texte | `staff.tuning` | Hauteur obtenue |
|---|---|---|
| `0.1` | `[0] = 64` | **E4** — mi aigu |
| `0.2` | `[1] = 59` | B3 |
| `0.3` | `[2] = 55` | G3 |
| `0.4` | `[3] = 50` | D3 |
| `0.5` | `[4] = 45` | A2 |
| `0.6` | `[5] = 40` | **E2** — mi grave |

### Conclusion

- **`\tuning` s'écrit de la corde 1 (la plus aiguë) vers la corde 6 (la plus grave).** L'exemple « Dropped D » de la documentation (`E4 B3 G3 D3 A2 D2`) est le bon ; l'autre exemple (`A1 D2 A2 D3 G3 B3 E4`) ne suit pas cette convention et **ne doit pas servir de modèle**.
- **`X.N` : `N` est l'index dans la liste `\tuning`, 1-indexé.** En accordage standard, `.1` = mi aigu, `.6` = mi grave — la convention de tablature usuelle.

**Le corpus de recherche utilise `\tuning (E4 B3 G3 D3 A2 E2)` et `.1` = corde aiguë. C'est correct.** La contradiction relevée dans `05-modele-donnees.md` et `06-accordeur.md` est levée.

### Vérification croisée — DADGAD

```
\tuning (D4 A3 G3 D3 A2 D2)
```
→ `.1` = D4 (62), `.6` = D2 (38). Conforme.

---

## R4 — ⚠️ Le modèle inverse la numérotation des cordes

**C'est le piège le plus sournois de cette tranche.**

Dans le texte alphaTex, `.1` désigne la corde aiguë. Dans le modèle produit, la même note porte **`note.string === 6`**.

```
alphaTex  0.1   →  note.string = 6,  note.realValue = 64 (E4)
alphaTex  0.6   →  note.string = 1,  note.realValue = 40 (E2)
alphaTex  3.5   →  note.string = 2,  note.fret = 3, realValue = 48
```

Autrement dit : **`Note.string` compte à partir de la corde la plus grave**, l'inverse du texte source et de la convention de tablature.

```
stringModel = nombreDeCordes + 1 − stringTexte
```

### Conséquence directe pour la décision 2 (noms de notes dérivés)

**Ne dérive pas les noms de notes depuis `(string, fret)` en supposant que `string 1` = corde aiguë.** Deux voies sûres :

1. **`note.realValue`** donne directement la hauteur MIDI, accordage et capo appliqués. **C'est la voie recommandée** : une seule conversion MIDI → nom, aucun risque d'inversion.
2. Si tu pars de `(corde, case)` côté contenu, applique la formule d'inversion et couvre-la par un test.

Le champ existe aussi en `realValue` sur les notes de percussion, mais sans signification de hauteur.

---

## R5 — `rf 1-5` : l'hypothèse du corpus est confirmée

```
:4 0.1{rf 1} 0.1{rf 2} 0.1{rf 3} 0.1{rf 4} | :4 0.1{rf 5} r r r |
```

| alphaTex | `Fingers` (valeur brute) | Doigt |
|---|---|---|
| `rf 1` | `Thumb` (0) | **pouce — p** |
| `rf 2` | `IndexFinger` (1) | index — i |
| `rf 3` | `MiddleFinger` (2) | majeur — m |
| `rf 4` | `AnnularFinger` (3) | annulaire — a |
| `rf 5` | `LittleFinger` (4) | auriculaire — c |

**Le corpus est correct.** C'était le risque n°1 identifié dans `07-synthese.md` (B1) — il est écarté. Aucune tablature n'est à retoucher de ce côté.

`rf 0` → **erreur de parse.** La numérotation textuelle est 1-indexée, l'enum interne 0-indexé.

---

## R6 — ⚠️ `lf 1-5` : le corpus est décalé d'un cran

**Même table que `rf`. `lf 1` = pouce, pas index.**

| alphaTex | Doigt réel | Doigté classique MG correspondant |
|---|---|---|
| `lf 1` | pouce | *(T — pouce par-dessus, jeu acoustique)* |
| `lf 2` | index | **1** |
| `lf 3` | majeur | **2** |
| `lf 4` | annulaire | **3** |
| `lf 5` | auriculaire | **4** |

### La règle de conversion

```
lf_alphaTex = doigté_classique_MG + 1
```

**Le corpus écrit `lf 1` pour l'index, `lf 2` pour le majeur, `lf 3` pour l'annulaire.** C'est faux : ça affiche pouce / index / majeur.

**Fichiers touchés** : `apoyando-tirando.md` (Ex. C, gamme de do), `03-fiches-courtes.md` (mentions). Peu d'occurrences — le corpus utilise surtout `rf`.

> **Pourquoi cette asymétrie est un piège durable.** `rf` et `lf` partagent le même enum `Fingers`, où le pouce est le premier élément. C'est cohérent côté implémentation, mais ça entre en collision frontale avec la convention musicale universelle où les doigts de la main gauche se numérotent **1 = index** et où le pouce n'a pas de numéro. **À encapsuler dans une fonction de conversion, jamais à écrire à la main.**

---

## R7 — Le percussif fonctionne nativement

C'est la question qui décidait de la couverture du fingerstyle moderne. **Réponse : oui.**

### `ds` (dead slap) sur un silence

```
:4 r { ds } r r r |
→ beat[0] isRest=false  deadSlapped=true  notes=[]
```

Le beat **cesse d'être un silence** et devient un beat percussif sans note. C'est exactement le comportement voulu pour un snare.

### `glpt` / `glpf` (golpe pouce / doigt) sur un silence

```
:4 r { glpt } r { glpf } r r |
→ beat[0] isRest=true  golpe=Thumb
   beat[1] isRest=true  golpe=Finger
```

Fonctionnent, mais le beat **reste un silence** avec un golpe attaché. Différence de traitement avec `ds` à garder en tête — **c'est un des points que la page de jugement HTML doit trancher à l'oreille** : un golpe sur un silence produit-il un son ?

### Sur une note

```
:4 3.5 { ds } 3.5 { glpt } 3.5 { glpf } 3.5 |
→ les trois effets sont portés, la note est conservée
```

### Sur une note morte

```
:4 x.6 { ds } x.6 { glpt } x.6 { glpf } r |
→ x.6 { ds }   : deadSlapped=true, MAIS la note disparaît du modèle
→ x.6 { glpt } : golpe=Thumb + note morte conservée (isDead=true)
```

⚠️ **`ds` avale la note morte.** Combinaison à éviter : elle perd de l'information sans avertissement.

### Combinaison

```
:4 r { glpt ds } r r r |
→ beat[0] golpe=Thumb  deadSlapped=true
```

**Kick et snare sur le même beat sont exprimables.** C'est ce qu'il faut pour les motifs percussifs denses.

### Ce que ça change pour la fiche percussion

Les exercices B, C et D de `02-fiches/percussion-kick-snare-golpe.md` sont écrits en `r { ds }` et `r { glpt }` — **ils parsent.** L'incertitude bloquante B2 de `07-synthese.md` est levée côté modèle. **Reste la question du rendu audio et visuel, qui n'est pas décidable sans écouter.**

---

## R8 — `barre`

```
:1 (5.6 5.5 5.4 5.3 5.2 5.1) { barre 5 }
→ barreFret=5  barreShape=Full          (avertissement 303)

:1 (5.3 5.2 5.1) { barre (5 half) }
→ barreFret=5  barreShape=Half          (aucun avertissement)
```

- **Forme canonique : `{ barre (N) }` ou `{ barre (N half) }`.** Sans parenthèses, ça marche mais alphaTab émet `[303] Property args should be wrapped into parenthesis`.
- `BarreShape` = `None` (0) · `Full` (1) · `Half` (2). **`partial` est rejeté.**
- **Le demi-barré est représentable** — bonne nouvelle pour la fiche `barre.md`, qui insiste sur son importance.

À corriger dans `barre.md` : `{ barre 5 }` → `{ barre (5) }`, et l'Ex. D peut utiliser `{ barre (5 half) }`.

---

## R9 — Métadonnées : parenthèses recommandées

```
\ts 4 4    → [301] Metadata arguments should be wrapped into parenthesis.
\ts (4 4)  → aucun avertissement
```

Toléré, mais à normaliser. Cosmétique, sans effet sur le modèle.

---

## R10 — Piste de percussion séparée : non résolue, non bloquante

`\instrument percussion` crée bien un staff avec `isPercussion = true` et `0` cordes. Mais **je n'ai pas trouvé la syntaxe des articulations** :

| Tentative | Résultat |
|---|---|
| `:4 35 38 35 38` | parse, mais `realValue` = 0 et 1 — les nombres ne sont **pas** des numéros MIDI |
| `:4 KickHit SnareHit` | erreur de parse |
| `:4 "Kick (hit)" "Snare (hit)"` | erreur de parse, **sans diagnostic renseigné** |
| `:4 (35.1) (38.1)` | erreur de parse |

Le bundle alphaTab contient bien une table `_instrumentArticulationNames` avec des entrées `"Kick (hit)" → "Acoustic Kick Drum.35"`, `"Snare (hit)" → "Snare.38"`, mais la syntaxe alphaTex qui les atteint m'échappe.

**Non bloquant** : R7 montre que le percussif se note directement sur la portée de guitare, ce qui est préférable (une seule portée, un seul flux). La piste séparée était la solution de repli — elle n'est plus nécessaire.

> `[À VÉRIFIER]` si tu veux un jour une portée de batterie séparée. Piste : chercher `\articulation` dans la doc alphaTex, ou passer par un import Guitar Pro.

---

## R11 — Vérification musicale d'un exercice du corpus

La gamme de do de `apoyando-tirando.md` Ex. C, parsée :

```
:8 3.5 0.4 2.4 3.4 0.3 2.3 0.2 1.2
→ MIDI 48 · 50 · 52 · 53 · 55 · 57 · 59 · 60
```

Soit **C3 D3 E3 F3 G3 A3 B3 C4** : gamme de do majeur ascendante, une octave. **L'exercice est musicalement correct.** Un doute de `07-synthese.md` en moins.

---

## Corrections appliquées au corpus

| Correction | Portée | État |
|---|---|---|
| `\staff {tab}` → `\staff {tabs}` · `{score tab}` → `{score tabs}` | 23 blocs, 6 fiches | ✅ appliqué |
| `lf N` → `lf N+1` | `apoyando-tirando.md` Ex. C + sa légende | ✅ appliqué |
| `{ barre 5 }` → `{ barre (5) }` | `barre.md` Ex. A, C, D | ✅ appliqué |
| `\ts 4 4` → `\ts (4 4)` | Tous les exercices | ✅ appliqué |
| Noms de notes retirés des commentaires alphaTex | `arpeges-pima.md` Ex. C, `alternance-pouce.md` Ex. D | ✅ appliqué (décision 2) |
| Mélodie de `arpeges-pima.md` Ex. C réécrite | ligne `0 – 3 \| 3 – 1 \| 0 – 0` sur la corde 1 | ✅ appliqué |
| `alternance-pouce.md` Ex. D : Fa → Ré mineur | la contrainte « deux basses disponibles » est conservée comme note pédagogique | ✅ appliqué |
| Villa-Lobos retiré, Barrios ajouté | `01-sources.md`, `barre.md`, `07-synthese.md` | ✅ appliqué (décision 6) |
| Exercices percussifs | `percussion-kick-snare-golpe.md` | ⏸ **en attente du jugement audio** |

Les `rf` étaient corrects et n'ont pas bougé.

### Vérification automatique

```
$ npm run validate
23 bloc(s) alphaTex — 23 valide(s), 0 en échec, 0 avec avertissement.
```

`tools/validate-corpus-tabs.mjs` implémente l'**invariant de build n°9** de `05-modele-donnees.md` : il extrait chaque bloc ` ```alphatex ` du corpus, le parse, et sort en code 1 au moindre échec. Il lit les diagnostics **sur l'importer**, pas sur l'exception (voir R1). À brancher en CI dès que le site existe.

> ⚠️ Ce validateur garantit la **validité syntaxique**, pas la justesse musicale. Il n'aurait attrapé aucune des deux erreurs de contenu de la phase de recherche — les deux tablatures parsaient parfaitement. La justesse musicale reste vérifiable uniquement guitare en main.

---

## R12 — Jugement humain du rendu percussif

**Testé le 8 août 2026** par l'utilisateur, sur `tools/percussion-audio-test.html`. Je n'ai rien écouté moi-même : ce qui suit est un rapport de ses réponses, pas une observation de ma part. Statut épistémique : **`observé`**.

| # | Question | Réponse |
|---|---|---|
| 1 | `ds` sur un silence produit-il un son ? | ✅ **Oui.** |
| 2 | `glpt` / `glpf` sur un silence produisent-ils un son ? | ❌ **Non — ils sont muets.** |
| 3 | Sur des notes réelles, entend-on l'effet en plus de la note ? | ✅ **Oui** — « un *temp* », un bruit percussif attaché au symbole **X** du dead slap. |
| 4 | Le rendu visuel est-il lisible, `glpt` distinguable de `glpf` ? | ✅ Oui, avec une réserve de sa part (« je pense ? »). |
| 5 | Écriture A (silences) ou B (notes mortes) ? | ⚠️ **Réponse ambiguë** — voir ci-dessous. |
| 6 | Verdict global | ✅ **« C'est utilisable. »** |

### Ce que ça implique concrètement

**Le dead slap est sonore, le golpe est visuel.** C'est une asymétrie structurante, pas un détail :

| Effet | Modèle | Audio | Visuel |
|---|---|---|---|
| `ds` | `isRest` passe à `false` | ✅ bruit percussif | symbole **X** |
| `glpt` / `glpf` | `isRest` reste `true` | ❌ **muet** | symbole de golpe |

L'hypothèse formulée avant le test était la bonne : le comportement du champ `isRest` **prédisait** le comportement audio. `ds` transforme le beat en événement sonore, `glpt`/`glpf` l'annotent sans le sonoriser.

**Conséquences pour le site :**

1. **Le kick et le snare passent par `ds`**, parce que ce sont les deux sons qui doivent être *entendus* dans un exercice percussif. Le motif de base « kick sur 1 et 3, snare sur 2 et 4 » ne peut donc pas s'écrire `glpt` / `ds` comme dans la version actuelle de la fiche : les kicks seraient muets.
2. **Le golpe reste une annotation d'accent**, ce qui correspond d'ailleurs à sa fonction musicale réelle (voir la fiche : le golpe est une couche d'accent, jamais la fondation). Son mutisme est acceptable — mais il doit être **signalé**.
3. **`audioFaithful: false` s'applique à toute fiche employant `glpf` / `glpt`**, avec un badge nommant précisément ce qui manque : *« les golpe ne sont pas restitués à l'audio »*. Conformément à la décision 3 de `CLAUDE.md`, la lecture n'est jamais désactivée pour autant.
4. **alphaTab ne distingue pas deux hauteurs de percussion.** Il n'y a qu'un seul son percussif (`ds`). Kick et snare sonneront **identiques**. C'est une limite à annoncer sur les fiches : la notation distingue les deux, le rendu audio non.

### Le point 5 reste ouvert

La question « A ou B » appelait un choix, la réponse reçue est « oui ». **Je ne tranche pas à sa place.**

Position par défaut retenue en attendant : **A — percussions sur silences**, pour deux raisons vérifiées par la sonde :

- `ds` appliqué à une note morte (`x.6 { ds }`) **fait disparaître la note du modèle** (R7). Perte d'information silencieuse — le pire cas.
- `r { ds }` produit un beat propre, sans note fantôme, et sonne.

**À confirmer avant la tranche 3** (tablatures). Aucune conséquence sur les tranches 1 et 2.

---

## Ce qui reste ouvert après cette tranche

1. ~~Rendu audio et visuel de `ds`, `glpf`, `glpt`~~ — **tranché**, voir R12.
2. ~~Un golpe sur un silence produit-il un son ?~~ — **non, muet**, voir R12.
3. **Écriture A ou B pour les exercices percussifs** — réponse ambiguë, position par défaut « A ». À confirmer avant la tranche 3.
4. **Réécriture des exercices percussifs** de `percussion-kick-snare-golpe.md` : les kicks écrits en `glpt` sont muets et doivent passer en `ds`. À faire en tranche 2 ou 3, une fois le point 3 confirmé.
5. **Syntaxe des articulations de percussion** (R10) — non bloquante.
6. **Boucle aimantée, isolement de voix, métronome décalé** (B5 de `07-synthese.md`) — questions d'API `AlphaTabApi`, pas de format. **Tranche 3.**
