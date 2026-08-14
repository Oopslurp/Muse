# Dette, défauts connus et décisions en attente

> **À traiter en tranche 8**, avec ce que remontera l'audit Codex.
>
> Ce document recense ce que je sais être imparfait, incomplet ou non vérifié
> à la fin de la tranche 6. Il est écrit pour être exploitable : chaque entrée
> dit **ce que c'est**, **pourquoi ça compte** et **ce que ça coûterait**.
> Rien n'y est masqué, y compris ce qui est gênant.
>
> Dernière revue : 14 août 2026, après la tranche 6 (commit `0b120d0`).

**Comment lire les priorités.**

| | Sens |
|---|---|
| 🔴 | Fausse une information affichée, ou fait perdre des données. |
| 🟠 | Défaut réel, contourné ou invisible aujourd'hui. |
| 🟡 | Dette, propreté, confort. Aucun risque. |
| 🔵 | **Décision qui m'attend** — je ne peux pas trancher seul. |

---

## A. Décisions qui m'attendent

### A1 🔵 Écriture des percussions : A (silences) ou B (notes mortes)

`CLAUDE.md`, table des conventions : *« Défaut "A — silences". **À confirmer
avant la tranche 3.** »* — **la tranche 3 est passée sans cette réponse**, et
les tranches 4, 5 et 6 aussi. J'ai continué sur le défaut A parce que la sonde
de la tranche 0 avait montré qu'un `ds` posé sur une note morte disparaît
silencieusement du modèle alphaTab.

C'est une dette que j'ai contractée sans le dire assez fort à l'époque.

- **Ce que ça touche** : la fiche `percussion-kick-snare-golpe` et toute
  tablature percussive future.
- **Coût si on change** : réécriture des blocs alphaTex percussifs, plus une
  passe de `npm run validate`. Une heure environ.

### A2 🔵 Promotion des trois fiches courtes en fiches approfondies

Reporté *« après la tranche 3 »* par `CLAUDE.md`. Débloqué depuis, jamais fait.
Candidates identifiées pendant la recherche : `MD-05 appui préparé`,
`TR-04 équilibre des voix`, `MG-09 étouffements MG`.

- **Pourquoi ça compte** : une fiche approfondie exige ≥ 4 paliers avec critère
  de passage. Ces trois-là sont référencées comme prérequis par d'autres et
  n'offrent pas de progression.
- **Coût** : c'est du contenu, pas du code. Compter une fiche par séance de
  travail, et il faut des sources.

### A3 🔵 Promotion « observé » : fiche entière ou affirmation par affirmation ?

Aujourd'hui la promotion de la décision 1 porte sur **la fiche entière**. Le
schéma permettrait mieux : `provenance` existe aussi sur chaque exercice,
chaque erreur, et sur le protocole de séance.

La décision 1 dit « faire passer **un item** ». Une fiche est un item, mais ce
n'était probablement pas l'intention.

- **Coût** : le magasin est indexé par identifiant de fiche ; il faudrait une
  clé composite `fiche#element`. Deux à trois heures, plus l'interface.

### A4 🔵 Bourdon dans l'accordeur

`06-accordeur.md` §9 écarte un générateur de note de référence — accorder à
l'oreille dessus est moins précis que l'accordeur — mais suggère qu'un
**bourdon tenu** serait utile pour vérifier l'intonation en jouant.

Je ne l'ai pas fait : ce n'était pas dans la tranche 4. À décider.

### A5 🔵 Poids d'alphaTab : on accepte ou on attaque ?

Trois chunks de ~1,1 Mo non compressé — le lecteur, le worker de synthèse, le
worklet audio. Chacun embarque le cœur d'alphaTab. Les deux derniers ne sont
chargés qu'au premier appui sur « lire ».

En local, invisible. Sur un déploiement, c'est 3,3 Mo pour lire une tablature
de deux mesures.

- **Pistes** : rendu SVG statique au build pour l'affichage, alphaTab chargé
  seulement si on veut *entendre* ; ou accepter et documenter.
- **Coût** : élevé, et le rendu statique perdrait le curseur.

### A6 🔵 Le métronome doit-il survivre au changement de page ?

C'est un îlot : quitter `/pratique` l'arrête. Pour travailler une fiche en
gardant le clic, il faudrait un métronome persistant — donc une architecture
de vue partagée (transitions Astro, ou un métronome flottant).

---

## B. Défauts connus

### B1 🟠 Réimporter deux fois duplique les séances

`sauvegarde.ts` **ajoute** les séances au lieu de les fusionner : leur clé est
auto-incrémentée et rien ne garantit qu'un identifiant désigne la même séance
d'une base à l'autre. C'est délibéré — un écrasement silencieux serait pire —
mais ce n'est pas satisfaisant.

- **Correctif** : une clé naturelle (`date` + `technique` + `minutes`) ou un
  identifiant stable généré à la création (`crypto.randomUUID()`).
- **Coût** : faible, mais migration Dexie à écrire.

### B2 🟠 Aucune remise à zéro de la base

On peut supprimer une séance à la fois. On ne peut pas repartir de zéro sans
passer par les outils de développement du navigateur.

### B3 🟠 Rien ne rappelle d'exporter

IndexedDB s'efface avec les données de navigation, sans prévenir. La page le
dit en toutes lettres, mais un texte ne remplace pas un rappel — par exemple
au bout de N séances non exportées.

### B4 🟠 Le décompte du lecteur se rejoue à chaque reprise après pause

Comportement d'alphaTab (`play()` relance le décompte dès que
`countInVolume > 0`). Repartir au milieu d'un exercice impose donc une mesure
de clics. Contournable en coupant le décompte à la volée avant la reprise.

### B5 🟠 La partition ne défile pas pendant la lecture

`scrollMode: ScrollMode.Off`. Sur les exercices de deux à quatre mesures, tout
tient à l'écran. Sur une fiche longue ouverte en petit, le curseur peut sortir
du champ.

### B6 🟠 Le minuteur ne prévient qu'à l'œil

Dépassement de `dureeMax` : le bloc change de ton, aucun son. Or on travaille
en regardant ses mains.

### B7 🟡 Les séries n'ont pas de transition sonore

Le passage travail → repos est visuel. Un signal court à chaque bascule
rendrait le mode utilisable sans regarder.

### B8 🟡 Le journal n'enregistre que des tempos en bpm

`TempoNote` accepte `notes-min`, la saisie non. `bilan()` compare déjà les
unités correctement, donc la structure est prête ; c'est l'interface qui
manque.

### B9 🟡 `audit:layout` sort en code non nul sur un débordement légitime

Il signale tout élément plus large que le viewport, y compris ceux qui vivent
dans un conteneur à défilement — le graphe de l'arbre, les tablatures. C'est
un outil de diagnostic, pas un garde-fou, mais son code de sortie prétend le
contraire.

---

## C. Dette technique

### C1 🟡 Code mort, vérifié

| Symbole | Fichier | État |
|---|---|---|
| `parJour()` | `src/lib/journal.ts` | Écrit pour un graphe d'assiduité jamais fait. **Zéro usage.** |
| `oublier()` | `src/lib/progression.ts` | **Zéro usage.** |
| `motifSimple` | `src/lib/metronome.ts` | Importé puis ré-exporté par `Metronome.tsx` sans raison. |
| `NoeudPlace.rang` | `src/lib/arbre.ts` | Calculé, jamais lu. |

**À trancher au cas par cas** : brancher (`parJour` mérite un petit graphe
d'assiduité) ou supprimer.

### C2 🟡 Aucun test unitaire sur trois modules purs

`test:notes` (10 cas) et `test:accordeur` (19 cas) existent. Rien ne couvre :

- `arbre.ts` — couches, réduction des croisements, déterminisme de la
  disposition. **Le déterminisme est une propriété qu'on ne peut vérifier
  qu'en test** : deux builds successifs doivent donner le même dessin.
- `journal.ts` — `bilan()`, la comparaison de tempos d'unités différentes.
- `sauvegarde.ts` — le rejet d'un fichier étranger, la relecture du format v1,
  les identifiants inconnus ignorés.

Ces trois modules sont purs : ils se testent comme les deux autres.

### C3 🟡 Les captures ne sont jamais comparées

`npm run shot` produit des images que **je** regarde. Rien ne détecte une
régression visuelle entre deux tranches.

### C4 🟡 Git Bash mange les arguments à barre oblique

`npm run audit:console -- /accordeur` devient
`C:/Program Files/Git/accordeur` (conversion de chemins MSYS). Contourné en
passant par PowerShell ou en mettant les routes dans la liste par défaut. À
documenter dans `CLAUDE.md` plutôt que de le redécouvrir.

### C5 🟡 Un seul jeu de couleurs de famille pour deux usages

`taxonomy.ts` fournit `colorVar` pour les familles ; l'arbre et la liste s'en
servent différemment (bordure gauche / pastille). Rien ne casse, mais le
contraste du filet de famille n'a jamais été mesuré.

---

## D. Trous de vérification

### D1 🔴 Accessibilité jamais auditée

La direction artistique la déclare **non négociable** : navigation clavier,
focus visibles, `prefers-reduced-motion`. J'ai suivi ces règles en écrivant,
et `prefers-reduced-motion` est respecté partout. Mais :

- **aucun contraste n'a été mesuré**, dans aucun des deux thèmes ;
- aucun parcours au clavier n'a été fait de bout en bout ;
- aucun lecteur d'écran n'a été essayé.

C'est le trou le plus sérieux de cette liste, parce qu'il contredit une règle
posée comme non négociable.

### D2 🟠 L'accordeur n'a été vérifié que sur Chrome

`06-accordeur.md` §10 place en risque n°1 le fait que **les navigateurs ne
respectent pas tous les contraintes `getUserMedia`**. La page relit
`getSettings()` et le dit — mais Firefox et Safari n'ont jamais été essayés.

Et le faux micro de l'audit joue un signal de synthèse parfait. Restent
`déduit`, comme la page l'annonce : le comportement de `clarity` pendant
l'attaque d'une corde grave d'acoustique, le taux réel d'erreurs d'octave sur
la corde 6, le seuil de bruit dans une vraie pièce.

### D3 🟠 Rien n'a été vu sur un vrai téléphone

`audit:layout` force les métriques d'appareil et `audit:console` mesure le
débordement, mais aucune page n'a été manipulée au doigt. Le graphe de l'arbre
et les tablatures défilent dans leur cadre — en théorie.

### D4 🟠 Les liens de prérequis sont un jugement, pas une donnée sourcée

L'invariant de monotonie en a attrapé trois. Les 42 autres reposent sur la
taxonomie de la phase de recherche et n'ont pas été rejugés depuis. La page
`/arbre` le dit dans son encadré, ce qui est honnête mais ne les corrige pas.

### D5 🟡 Aucune mesure de performance

Aucun budget, aucun relevé. La tranche 7 devait s'en occuper.

---

## E. Reporté volontairement, à ne pas rouvrir sans raison

Ces points sont **des décisions déjà prises**, listées ici pour qu'on ne les
reprenne pas pour des oublis.

- **TR-03 placement rythmique** reste une fiche courte marquée `déduit` : trou
  documentaire acté, candidat v2. `CLAUDE.md` décision 7.
- **Aucune analyse audio hors accordeur.** Pas de détection de justesse, pas
  d'évaluation de régularité, pas de scoring. Décision 7.
- **Villa-Lobos** hors répertoire jusqu'en 2030. Décision 6.
- **Aucune tablature de morceau sous droits.** Règle de fond n°4.
- **Les `[À VÉRIFIER]` restent affichés**, la fiche percussion comprise, avec
  ses neuf points douteux. Décision 1.
- **`audioFidele: false` ne désactive jamais la lecture** ; on nomme les
  réserves. Décision 10. Les golpe restent muets et kick/snare identiques —
  c'est alphaTab, pas un défaut à corriger.

---

## F. Ce que la tranche 7 doit encore livrer

Pour mémoire, et pour ne pas confondre « pas fait » et « pas encore prévu » :
recherche, performance, responsive, impression PDF d'une fiche, déploiement.
