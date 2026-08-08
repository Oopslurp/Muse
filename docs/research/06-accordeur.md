# 06 — Note technique : accordeur chromatique en navigateur

> **Pas d'implémentation.** Pseudo-code et décisions d'architecture uniquement.

---

## ⚠️ Correction préalable sur `pitchy`

Le brief indique « la lib `pitchy` (YIN) ». **C'est inexact, et ça a des conséquences.**

`pitchy` implémente la **McLeod Pitch Method (MPM)**, pas YIN. La documentation de la bibliothèque la décrit comme « une bibliothèque simple de détection de hauteur écrite entièrement en JavaScript, qui vise à être rapide et suffisamment précise pour des applications temps réel telles que des accordeurs, en utilisant la McLeod Pitch Method ».
Source : [pitchy sur npm](https://www.npmjs.com/package/pitchy) · [dépôt GitHub](https://github.com/ianprime0509/pitchy)

**Est-ce grave ?** Non — MPM est un excellent choix pour un accordeur, sans doute meilleur que YIN pour cet usage :

| | YIN | MPM (McLeod) |
|---|---|---|
| Base | Fonction de différence normalisée | Autocorrélation normalisée (NSDF) |
| Force | Robustesse en environnement bruité | **Précision de la hauteur, stabilité sur les sons harmoniques** |
| Faiblesse | Un peu plus coûteux | Un peu plus sensible au bruit large bande |
| Indice de confiance | Seuil de « aperiodicity » | **`clarity` normalisé 0–1, directement exploitable** |

Pour une guitare acoustique dans une pièce calme, MPM et son `clarity` sont exactement ce qu'il faut. **Le vrai YIN est disponible ailleurs** si tu veux comparer : `pitchfinder` en propose une implémentation ([npm](https://www.npmjs.com/package/pitchfinder), [GitHub](https://github.com/peterkhayes/pitchfinder)), ainsi que `@dipscope/pitch-detector` (YIN, AMDF, ASDF — [npm](https://www.npmjs.com/package/@dipscope/pitch-detector)).

**Recommandation** : partir sur `pitchy`/MPM. Garder l'algorithme derrière une interface d'une seule fonction pour pouvoir en changer sans toucher au reste.

> **Référence d'implémentation à lire avant d'écrire une ligne** : [`@chordbook/tuner`](https://github.com/chordbook/tuner) — accordeur web open source **pour instruments à cordes**, construit sur Web Audio API + `pitchy`. C'est exactement le cas d'usage. Lis-le d'abord.
> Voir aussi, pour la théorie : [« Detecting pitch with the Web Audio API and autocorrelation »](https://alexanderell.is/posts/tuner/).

---

## 1. Chaîne audio

```
getUserMedia (contraintes strictes)
   ↓
MediaStreamAudioSourceNode
   ↓
BiquadFilter highpass ~60 Hz      ← élimine le rumble, le souffle de clim, les pas
   ↓
BiquadFilter lowpass ~1000 Hz     ← force MPM à se caler sur le fondamental
   ↓
AnalyserNode (fftSize = 4096)
   ↓
requestAnimationFrame → getFloatTimeDomainData → gate RMS → pitchy → lissage → UI
```

### Le point le plus important de tout ce document

```ts
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: false,   // ⚠️ OBLIGATOIRE
    noiseSuppression: false,   // ⚠️ OBLIGATOIRE
    autoGainControl: false,    // ⚠️ OBLIGATOIRE
    channelCount: 1,
  },
});
```

Les trois traitements par défaut du navigateur sont conçus pour la **voix en visioconférence**. Ils sont catastrophiques pour un accordeur :

- **`noiseSuppression`** identifie un son de guitare tenu comme du bruit stationnaire et l'atténue progressivement. La note « disparaît » au bout d'une seconde.
- **`autoGainControl`** modifie l'amplitude en continu, ce qui ruine le gate RMS et fait remonter le bruit de fond entre les notes.
- **`echoCancellation`** introduit des traitements non linéaires qui déforment la forme d'onde.

**Un accordeur qui « marche mal sans raison » a presque toujours ce problème.**

> `[À VÉRIFIER]` : les navigateurs ne respectent pas tous ces contraintes de la même façon, et certaines implémentations les réappliquent partiellement. À tester sur Chrome, Firefox et Safari. Vérifie aussi `track.getSettings()` après coup pour voir ce qui a réellement été appliqué.

### AnalyserNode ou AudioWorklet ?

| | AnalyserNode + `requestAnimationFrame` | AudioWorklet |
|---|---|---|
| Complexité | Faible | Moyenne (thread séparé, messages) |
| Latence | Liée au rAF (~16 ms) + fenêtre | Contrôle total, blocs de 128 samples |
| Suffisant pour un accordeur ? | **Oui** | Oui, mais surdimensionné |

**Recommandation : `AnalyserNode`.** Un accordeur n'a pas besoin d'une latence de 3 ms. Le facteur limitant est la taille de fenêtre nécessaire pour mesurer une basse fréquence, pas l'ordonnancement.

`ScriptProcessorNode` est déprécié — ne pas l'utiliser, même si beaucoup de tutoriels en ligne le font encore.

---

## 2. Plage de fréquences utile

### Fondamentales

| Contexte | Note la plus grave | Fréquence |
|---|---|---|
| Accordage standard | E2 | **82,41 Hz** |
| Drop D / DADGAD | D2 | **73,42 Hz** |
| Drop C / Open C | C2 | **65,41 Hz** |
| Descentes extrêmes (fingerstyle moderne, baryton) | B1 | **61,74 Hz** |
| Corde la plus aiguë (standard) | E4 | **329,63 Hz** |

### Plage à couvrir

- **Fondamentales** : **60 Hz → 350 Hz**. C'est tout. Une guitare à vide ne sort pas de là.
- **Mode chromatique complet** (notes frettées, harmoniques de contrôle en case 5/7/12) : **55 Hz (A1) → 1320 Hz (E6)**.

**Décision** : deux modes.
1. **Mode accordage** — fenêtre restreinte à 60–350 Hz, ce qui élimine d'un coup la quasi-totalité des erreurs d'octave.
2. **Mode chromatique libre** — 55–1320 Hz, pour vérifier une harmonique ou une note frettée.

Le filtre passe-bas à 1000 Hz mentionné plus haut concerne le **mode accordage**. En mode chromatique il faut le remonter à ~2500 Hz.

---

## 3. Taille de buffer et latence

### La contrainte physique

Une méthode d'autocorrélation a besoin d'au moins **deux périodes complètes** du signal dans sa fenêtre, et en pratique **trois à quatre** pour une mesure stable.

À 48 kHz :

| Note | Fréquence | Période | 2 périodes | 4 périodes | Buffer requis |
|---|---|---|---|---|---|
| E4 | 329,6 Hz | 3,03 ms | 291 éch. | 582 éch. | trivial |
| E2 | 82,4 Hz | 12,1 ms | 1 165 éch. | 2 330 éch. | 2048 minimum |
| D2 | 73,4 Hz | 13,6 ms | 1 308 éch. | 2 616 éch. | **4096 confortable** |
| C2 | 65,4 Hz | 15,3 ms | 1 468 éch. | 2 936 éch. | **4096** |
| B1 | 61,7 Hz | 16,2 ms | 1 556 éch. | 3 112 éch. | **4096** |

### Décision

**`fftSize = 4096`** (soit 85 ms à 48 kHz, 93 ms à 44,1 kHz).

- 2048 suffirait pour l'accordage standard mais devient limite dès le Drop C, et **c'est précisément ce que tu vas jouer**.
- 8192 (170 ms) donnerait une meilleure résolution en basses fréquences mais rendrait l'aiguille visiblement molle et empêcherait de percevoir la stabilisation d'une note pendant qu'on tourne la mécanique.

### Budget de latence

| Poste | Coût |
|---|---|
| Fenêtre d'analyse | 85 ms |
| Cadence de rafraîchissement (rAF) | 16 ms |
| Calcul MPM sur 4096 échantillons | < 5 ms `[À VÉRIFIER : ordre de grandeur estimé, non mesuré]` |
| Lissage (médiane sur 5 + EMA) | ~3 fenêtres avant stabilisation ≈ 100 ms perçus |
| **Total perçu** | **≈ 200 ms** |

**Cible : sous 250 ms** entre le pincement de la corde et une aiguille stable. Au-delà de ~350 ms, l'accordage à l'oreille devient plus rapide que l'accordeur, et l'outil ne sert plus à rien.

### Optimisation optionnelle : sous-échantillonnage

Comme aucune fondamentale utile ne dépasse 350 Hz en mode accordage, on peut sous-échantillonner à **8 kHz** (Nyquist = 4 kHz, largement suffisant après le passe-bas). Le buffer requis tombe à ~700 échantillons pour 4 périodes de 61,7 Hz, et le coût CPU de MPM chute d'un facteur ~6.

**Ne fais pas ça d'emblée.** C'est une optimisation à garder en réserve si tu constates un problème de CPU, notamment sur mobile. Elle ajoute une étape (filtre anti-repliement + décimation) et un risque de bug pour un gain qui n'est peut-être pas nécessaire.

---

## 4. Gate de bruit et confiance

Deux barrières successives, avant tout affichage.

### Barrière 1 — Niveau (RMS)

```
rms = sqrt( Σ x[i]² / N )
```

Si `rms < SEUIL_RMS` → **ne rien afficher, geler la dernière valeur en grisé**. Ne surtout pas afficher une hauteur détectée dans le silence : c'est le comportement qui rend les accordeurs web insupportables.

`SEUIL_RMS` ≈ **0,01** en amplitude linéaire (soit −40 dBFS) comme point de départ. `[À VÉRIFIER : valeur à calibrer sur ton micro et ta pièce. Prévois un calibrage automatique : mesurer le RMS ambiant pendant 2 secondes au démarrage et placer le seuil à 3–4× cette valeur.]`

### Barrière 2 — Clarté (fournie par `pitchy`)

`pitchy` retourne `[pitch, clarity]` où `clarity` ∈ [0, 1] mesure la périodicité du signal.

| Seuil | Comportement |
|---|---|
| `clarity < 0,80` | Rejeter la mesure |
| `0,80 ≤ clarity < 0,93` | Accepter mais afficher en état « incertain » (aiguille pâle) |
| `clarity ≥ 0,93` | Mesure fiable |

`[À VÉRIFIER : ces seuils sont des points de départ raisonnables, pas des valeurs mesurées. À calibrer. Une corde grave d'acoustique fraîchement pincée peut avoir une clarity plus basse pendant l'attaque, le temps que les harmoniques se stabilisent.]`

### Barrière 3 — Fenêtre de plausibilité

En mode accordage : rejeter toute hauteur hors de [55 Hz, 400 Hz]. En mode « corde ciblée » (l'utilisateur a désigné la corde qu'il accorde) : rejeter tout ce qui est à plus de **±350 cents** de la cible. Cela élimine les erreurs d'octave, qui sont **le** défaut classique sur les cordes graves d'acoustique, où le fondamental est souvent plus faible que le 2ᵉ harmonique.

---

## 5. Lissage

**Le problème** : une mesure brute par frame produit une aiguille qui tremble et devient illisible. Le lissage naïf (moyenne glissante) produit l'inverse : une aiguille qui traîne et qui ment.

**Trois étages, dans cet ordre** :

1. **Médiane glissante sur 5 mesures** (pas moyenne). La médiane **rejette les valeurs aberrantes** — typiquement l'erreur d'octave isolée — au lieu de les diluer dans la moyenne. C'est l'étage le plus important.
2. **Moyenne exponentielle sur les cents**, `α ≈ 0,25` :
   `centsAffiché = α × centsMesuré + (1 − α) × centsAffichéPrécédent`
   Lisse le résidu de tremblement. **Appliquer sur les cents, pas sur les Hz** — un écart de 1 Hz ne représente pas la même chose à 82 Hz et à 330 Hz, alors qu'un écart en cents est perceptuellement uniforme.
3. **Hystérésis sur le nom de la note.** Ne changer la note cible affichée que si la nouvelle note est détectée sur **3 frames consécutives**. Sans ça, l'affichage clignote entre deux demi-tons quand on est pile entre les deux — le moment exact où l'utilisateur a le plus besoin de stabilité.

**Réinitialiser les trois étages** quand le gate RMS passe de fermé à ouvert (nouvelle attaque). Sinon la première mesure d'une nouvelle corde est polluée par l'historique de la précédente.

---

## 6. Calcul de l'écart

```
midi   = 69 + 12 × log2(f / 440)
n      = round(midi)                        // note chromatique la plus proche
fRef   = 440 × 2^((n − 69) / 12)
cents  = 1200 × log2(f / fRef)              // ∈ ]−50, +50]
```

`A4 = 440 Hz` doit être **paramétrable** (415 Hz pour le diapason baroque, 432 Hz si tu joues avec quelqu'un qui y tient).

**Tolérance d'affichage** : ±3 cents = « juste ». En dessous de 3 cents, on est dans le bruit de mesure et dans la variation naturelle de l'instrument (une corde neuve dérive plus que ça pendant qu'on l'écoute). Afficher ±1 cent donne une fausse impression de précision et rend l'accordage frustrant.

> **Note guitare, pas logicielle.** Un accordeur parfaitement précis sur les six cordes à vide ne garantit pas que l'instrument sonnera juste : le tempérament égal, l'intonation du chevalet, la hauteur des cordes et la pression du doigt introduisent des écarts plus grands que la précision de l'accordeur. C'est une raison de plus de ne pas viser ±1 cent.

---

## 7. Accordages à supporter

Fréquences calculées en tempérament égal, A4 = 440 Hz. **Ordre : corde 6 (grave) → corde 1 (aiguë).**

### Accordages standards et courants

| Nom | Notes | Fréquences (Hz) |
|---|---|---|
| **Standard** | E2 A2 D3 G3 B3 E4 | 82,41 · 110,00 · 146,83 · 196,00 · 246,94 · 329,63 |
| **Demi-ton plus bas** (Eb) | Eb2 Ab2 Db3 Gb3 Bb3 Eb4 | 77,78 · 103,83 · 138,59 · 185,00 · 233,08 · 311,13 |
| **Drop D** | D2 A2 D3 G3 B3 E4 | 73,42 · 110,00 · 146,83 · 196,00 · 246,94 · 329,63 |
| **Drop C** | C2 G2 C3 F3 A3 D4 | 65,41 · 98,00 · 130,81 · 174,61 · 220,00 · 293,66 |

### Accordages ouverts

| Nom | Notes | Fréquences (Hz) |
|---|---|---|
| **Open G** | D2 G2 D3 G3 B3 D4 | 73,42 · 98,00 · 146,83 · 196,00 · 246,94 · 293,66 |
| **Open D** | D2 A2 D3 F#3 A3 D4 | 73,42 · 110,00 · 146,83 · 185,00 · 220,00 · 293,66 |
| **Open C** | C2 G2 C3 G3 C4 E4 | 65,41 · 98,00 · 130,81 · 196,00 · 261,63 · 329,63 |
| **Open E** | E2 B2 E3 G#3 B3 E4 | 82,41 · 123,47 · 164,81 · 207,65 · 246,94 · 329,63 |
| **Open Dm** | D2 A2 D3 F3 A3 D4 | 73,42 · 110,00 · 146,83 · 174,61 · 220,00 · 293,66 |

### Fingerstyle moderne

| Nom | Notes | Fréquences (Hz) | Note |
|---|---|---|---|
| **DADGAD** | D2 A2 D3 G3 A3 D4 | 73,42 · 110,00 · 146,83 · 196,00 · 220,00 · 293,66 | Le plus répandu du genre |
| **CGDGAD** | C2 G2 D3 G3 A3 D4 | 65,41 · 98,00 · 146,83 · 196,00 · 220,00 · 293,66 | DADGAD avec la 6ᵉ descendue à do |
| **CGDGCD** | C2 G2 D3 G3 C4 D4 | 65,41 · 98,00 · 146,83 · 196,00 · 261,63 · 293,66 | |
| **DADF#AD** = Open D | — | voir ci-dessus | Fréquent en fingerstyle percussif |
| **BADGAD** | B1 A2 D3 G3 A3 D4 | 61,74 · 110,00 · 146,83 · 196,00 · 220,00 · 293,66 | **La note la plus grave à gérer.** Dimensionne le buffer. |

> `[À VÉRIFIER]` — **Je n'attribue volontairement aucun accordage à un morceau ou à un artiste précis.** Les attributions du type « CGDGAD, l'accordage de *Drifting* » circulent partout mais je ne peux pas les vérifier sans écouter ou consulter une source officielle, et une erreur ici serait très visible. Les **noms et les intervalles** ci-dessus sont en revanche standard ; les **fréquences sont calculées**, pas recopiées, donc fiables à la condition que le nom de note soit le bon.

### Modèle de données

```ts
interface Tuning {
  id: string;                 // 'dadgad'
  name: string;               // 'DADGAD'
  family: 'standard' | 'drop' | 'open' | 'moderne';
  /** Corde 6 (grave) → corde 1 (aiguë). Notation scientifique. */
  strings: readonly [string, string, string, string, string, string];
  /** Dérivées de `strings` au build, jamais saisies à la main. */
  frequencies?: readonly number[];
  description?: string;
}
```

**Toujours dériver les fréquences des noms de notes**, jamais l'inverse. Une fréquence recopiée à la main est une faute de frappe en attente ; un nom de note faux se voit immédiatement.

> ⚠️ **Attention à l'ordre des cordes.** Ce document utilise **corde 6 → corde 1**. alphaTex semble utiliser **corde 1 → corde 6** (`\tuning (E4 B3 G3 D3 A2 D2)` pour le Drop D). Un autre exemple de la même documentation, `\tuning (A1 D2 A2 D3 G3 B3 E4)`, va dans l'ordre inverse — **la contradiction n'est pas résolue** (voir `05-modele-donnees.md`). **Si l'accordeur et le lecteur de tab partagent un jour la même liste d'accordages, cette incohérence produira des bugs silencieux.** Décide d'un ordre canonique interne et convertis aux frontières.

---

## 8. Pseudo-code

```
// ---------- Initialisation ----------
FONCTION démarrer():
    stream ← getUserMedia({ audio: {
        echoCancellation: faux,
        noiseSuppression: faux,
        autoGainControl:  faux,
        channelCount: 1
    }})

    ctx      ← nouveau AudioContext()
    source   ← ctx.createMediaStreamSource(stream)

    hp       ← ctx.createBiquadFilter()   // highpass, 60 Hz, Q = 0.7
    lp       ← ctx.createBiquadFilter()   // lowpass, 1000 Hz (mode accordage)
    analyser ← ctx.createAnalyser()
    analyser.fftSize ← 4096

    source → hp → lp → analyser           // pas de connexion vers la destination

    detector ← PitchDetector.forFloat32Array(analyser.fftSize)
    buffer   ← nouveau Float32Array(analyser.fftSize)

    état ← {
        historique: [],        // médiane, 5 dernières hauteurs valides
        centsLissés: null,
        noteAffichée: null,
        compteurNote: 0,
        gateOuvert: faux
    }

    calibrerBruitAmbiant(2 secondes)       // → SEUIL_RMS
    boucle()


// ---------- Boucle d'analyse ----------
FONCTION boucle():
    requestAnimationFrame(boucle)
    analyser.getFloatTimeDomainData(buffer)

    // --- Barrière 1 : niveau
    rms ← racine(somme(buffer[i]²) / longueur(buffer))
    SI rms < SEUIL_RMS ALORS
        SI état.gateOuvert ALORS
            état.gateOuvert ← faux
            afficherEnVeille()             // gèle l'affichage, le grise
        FIN SI
        RETOUR
    FIN SI

    SI NON état.gateOuvert ALORS
        état.gateOuvert ← vrai
        réinitialiserLissage(état)         // nouvelle attaque : on repart propre
    FIN SI

    // --- Détection
    (hauteur, clarté) ← detector.findPitch(buffer, ctx.sampleRate)

    // --- Barrière 2 : clarté
    SI clarté < CLARTÉ_MIN ALORS RETOUR

    // --- Barrière 3 : plausibilité
    SI hauteur < 55 OU hauteur > 400 ALORS RETOUR
    SI modeCibleActif ALORS
        SI |cents(hauteur, fréquenceCible)| > 350 ALORS RETOUR
    FIN SI

    // --- Lissage étage 1 : médiane (rejette les erreurs d'octave isolées)
    pousser(état.historique, hauteur)   // taille max 5
    hauteurRobuste ← médiane(état.historique)

    // --- Conversion
    midi   ← 69 + 12 × log2(hauteurRobuste / A4)
    n      ← arrondi(midi)
    fRef   ← A4 × 2^((n − 69) / 12)
    cents  ← 1200 × log2(hauteurRobuste / fRef)

    // --- Lissage étage 2 : EMA sur les cents
    SI état.centsLissés = null ALORS
        état.centsLissés ← cents
    SINON
        état.centsLissés ← 0.25 × cents + 0.75 × état.centsLissés
    FIN SI

    // --- Lissage étage 3 : hystérésis sur le nom de note
    note ← nomDeNote(n)
    SI note ≠ état.noteAffichée ALORS
        état.compteurNote ← état.compteurNote + 1
        SI état.compteurNote ≥ 3 ALORS
            état.noteAffichée ← note
            état.compteurNote ← 0
            état.centsLissés  ← cents      // pas de traînée entre deux notes
        FIN SI
    SINON
        état.compteurNote ← 0
    FIN SI

    afficher(état.noteAffichée, état.centsLissés, clarté)
```

---

## 9. Interface — ce qui compte vraiment

| Élément | Décision | Pourquoi |
|---|---|---|
| **Indicateur principal** | Une aiguille ou une barre horizontale centrée, plage **±50 cents** | Le format universel. Ne réinvente pas. |
| **Zone « juste »** | ±3 cents, marquée visuellement, avec un **changement de couleur franc** | Le seuil doit être binaire à l'œil. Un dégradé continu ne donne pas de moment de validation. |
| **Sens de la correction** | Indiquer **« tends » / « détends »** en toutes lettres, pas seulement gauche/droite | Sous une aiguille, « à gauche » n'a pas de sens univoque quand on a la tête dans les mécaniques. |
| **Nom de note** | Grand, avec l'octave (E2, pas E) | Évite l'accordage à l'octave. Erreur classique et coûteuse en cordes. |
| **Mode « corde ciblée »** | L'utilisateur choisit l'accordage, puis la corde. Verrouille la fenêtre de plausibilité | Élimine 90 % des erreurs d'octave sur les cordes graves. |
| **Mode chromatique libre** | Sans cible | Pour vérifier une harmonique, une note frettée, l'intonation. |
| **Indicateur de confiance** | Discret, mais présent (opacité de l'aiguille) | L'utilisateur doit pouvoir distinguer « c'est juste » de « je ne sais pas ». |
| **Micro non autorisé** | Message explicite avec la marche à suivre, pas un échec silencieux | La première cause de « ça ne marche pas ». |
| **HTTPS** | Obligatoire — `getUserMedia` n'est disponible qu'en contexte sécurisé (ou sur `localhost`) | À prévoir dès le dev. |

**Ce que je ne mettrais pas** : un générateur de son de référence. C'est facile à faire, mais accorder à l'oreille sur un son synthétique est moins précis que l'accordeur lui-même, et ça encourage une mauvaise habitude. Si tu en veux un, mets plutôt un **bourdon** (drone) tenu, utile pour vérifier l'intonation en jouant.

---

## 10. Ce qu'il faut tester en premier

Par ordre de risque décroissant :

1. **Les contraintes `getUserMedia` sont-elles réellement respectées** sur Chrome / Firefox / Safari ? Vérifier avec `track.getSettings()`. **C'est le risque n°1 du projet.**
2. **Le comportement sur B1 (61,74 Hz)** avec `fftSize = 4096`. Si c'est instable, il faut monter à 8192 et accepter la latence, ou sous-échantillonner.
3. **Le taux d'erreurs d'octave sur la corde 6 d'une acoustique**, avec et sans le passe-bas à 1000 Hz. C'est le défaut classique.
4. **Le comportement de `clarity` pendant l'attaque** — pour calibrer les seuils et éviter que l'aiguille ne parte pendant les 200 premières ms d'une note.
5. **Le CPU sur mobile.** Si c'est un problème, le sous-échantillonnage à 8 kHz est la réponse.

---

## 11. Sources

- **`pitchy`** — McLeod Pitch Method, JavaScript, conçu pour le temps réel et explicitement pour des accordeurs. [npm](https://www.npmjs.com/package/pitchy) · [GitHub](https://github.com/ianprime0509/pitchy)
- **`@chordbook/tuner`** — accordeur web open source pour instruments à cordes, Web Audio API + `pitchy`. **Référence d'implémentation directe.** [GitHub](https://github.com/chordbook/tuner)
- **`pitchfinder`** — compilation d'algorithmes de détection de hauteur pour JS (navigateur et Node), **dont YIN**. [npm](https://www.npmjs.com/package/pitchfinder) · [GitHub](https://github.com/peterkhayes/pitchfinder)
- **`@dipscope/pitch-detector`** — AMDF, ASDF et YIN. [npm](https://www.npmjs.com/package/@dipscope/pitch-detector)
- **« Detecting pitch with the Web Audio API and autocorrelation »** — exposé pédagogique sur l'autocorrélation en JS. [alexanderell.is](https://alexanderell.is/posts/tuner/)
- **Détection par microphone appliquée à la guitare** — précédent d'usage : *Fretboard Trainer* et *Fretonomy* écoutent la guitare réelle via le micro du téléphone. Voir `04-benchmark.md` §4. [Fretonomy](https://fretonomy.com/) · [Fretboard Trainer](https://apps.apple.com/us/app/fretboard-trainer/id1486193335)

---

## Récapitulatif des `[À VÉRIFIER]` de ce document

| Point | Raison |
|---|---|
| **`pitchy` = MPM, pas YIN** | ⚠️ **Correction d'une prémisse du brief.** Sourcé, mais à confirmer par toi. Sans conséquence négative — MPM convient mieux. |
| Respect réel des contraintes `getUserMedia` selon les navigateurs | Comportements connus pour diverger. Risque n°1. |
| `SEUIL_RMS ≈ 0,01` | Point de départ, à calibrer sur ton matériel. Prévoir un calibrage automatique. |
| Seuils de `clarity` (0,80 / 0,93) | Valeurs de départ raisonnables, non mesurées. |
| Coût CPU de MPM sur 4096 échantillons (< 5 ms) | Ordre de grandeur estimé, non mesuré. |
| Stabilité de la détection à 61,74 Hz avec `fftSize = 4096` | Calcul théorique (5,2 périodes dans la fenêtre) ; non testé en conditions réelles. |
| Attribution des accordages modernes à des morceaux ou artistes | **Volontairement absente.** Non vérifiable sans écoute ou source officielle. |
| Ordre des cordes entre ce document et alphaTex | Contradiction non résolue dans la documentation alphaTab. Source de bugs silencieux si les deux modules partagent des données. |
