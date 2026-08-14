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

## A. Décisions — toutes tranchées le 14 août 2026

### A1 ✅ Écriture des percussions — TRANCHÉ le 14 août 2026

**A — silences.** Confirmé définitivement. Un `ds` posé sur une note morte
disparaît silencieusement du modèle alphaTab : la sonde de la tranche 0 l'a
établi, et l'option B n'est donc pas viable techniquement.

Inscrit dans CLAUDE.md, table des conventions. **Point clos, ne plus le
rouvrir.**

### A2 → v2 Promotion des trois fiches courtes

Hors périmètre de la tranche 8 : c'est du contenu, et il faut des sources.
Une tranche de nettoyage n'ajoute rien. Voir la section V.

### A3 ✅ Promotion « observé » — TRANCHÉ : par affirmation

Clé composée `fiche#element`, migration Dexie, interface de promotion sur
chaque exercice, chaque erreur et le protocole de séance. C'était l'intention
de la décision 1.

Raison donnée : la fiche percussion porte **neuf** points douteux — sept au
niveau fiche, deux imbriqués — qui seront levés un par un, sur des semaines.
Une promotion qui porte sur la fiche entière ne permet pas cela.

Traité en **tranche 8a, en premier**.

### A4 → v2 Bourdon dans l'accordeur

Hors périmètre : fonctionnalité neuve. Voir la section V.

### A5 ✅ Poids d'alphaTab — TRANCHÉ : accepté

Pas de rendu statique. **Le curseur est le cœur de l'outil** et un SVG figé le
perdrait.

Conséquence à traiter en 8b : inscrire les 3,3 Mo dans `audit:poids` comme
**budget de chargement différé**, distinct du budget initial, avec sa
justification. Cela résout **G2**.

### A6 → v2 Métronome persistant entre les pages

Hors périmètre : fonctionnalité neuve. Voir la section V.

---

## B. Défauts connus

### B1 ✅ Réimporter deux fois duplique les séances — CORRIGÉ en 8a

`sauvegarde.ts` **ajoute** les séances au lieu de les fusionner : leur clé est
auto-incrémentée et rien ne garantit qu'un identifiant désigne la même séance
d'une base à l'autre. C'est délibéré — un écrasement silencieux serait pire —
mais ce n'est pas satisfaisant.

- **Correctif** : une clé naturelle (`date` + `technique` + `minutes`) ou un
  identifiant stable généré à la création (`crypto.randomUUID()`).
- **Coût** : faible, mais migration Dexie à écrire.

### B2 ✅ Aucune remise à zéro de la base — CORRIGÉ en 8a

On peut supprimer une séance à la fois. On ne peut pas repartir de zéro sans
passer par les outils de développement du navigateur.

### B3 ✅ Rien ne rappelle d’exporter — CORRIGÉ en 8a

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

### B6 ✅ Le minuteur ne prévient qu’à l’œil — CORRIGÉ en 8a

Dépassement de `dureeMax` : le bloc change de ton, aucun son. Or on travaille
en regardant ses mains.

### B7 ✅ Les séries n’ont pas de transition sonore — CORRIGÉ en 8a

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

### C5 ✅ Contraste des filets de famille — MESURÉ en 8a

`taxonomy.ts` fournit `colorVar` pour les familles ; l'arbre et la liste s'en
servent différemment (bordure gauche / pastille). Rien ne casse, mais le
contraste du filet de famille n'a jamais été mesuré.

---

## D. Trous de vérification

### D1 ◐ Accessibilité — MESURÉE en 8a, reste le lecteur d’écran

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

## F. Traité en tranche 7

Pour ne pas rouvrir ce qui est fait :

- **D3 (rien vu sur un téléphone) est partiellement levé.** `npm run audit:mobile`
  couvre 8 routes × 320 et 390 px, et sept grilles ont été corrigées. Reste ce
  qu'aucune émulation ne donne : la manipulation au doigt, la taille réelle
  des cibles tactiles, le comportement du clavier virtuel.
- **D5 (aucune mesure de performance) est levé.** `npm run audit:poids` tient
  un budget par route et refuse tout appel hors origine.
- Recherche globale, impression d'une fiche, page 404 : livrés.
- **Le déploiement reste à faire** : l'hébergeur n'est pas choisi. Voir
  [deploiement.md](deploiement.md) — c'est une décision, pas un travail.

**Nouveau depuis la tranche 7**

### G1 ✅ Cibles tactiles — CORRIGÉ en 8a

La sonde relève des liens de 17 à 23 px de haut. Les liens en pleine ligne de
texte sont exemptés par WCAG 2.2 (critère « Target Size (Minimum) »), mais
plusieurs sont des boutons à part entière. À reprendre avec l'audit
d'accessibilité (D1), pas séparément.

### G2 🟡 `audit:poids` mesure le chargement initial seulement

Le lecteur de tablature et l'accordeur chargent leur machinerie au premier
clic — c'est précisément pourquoi ils sont paresseux, et les compter punirait
le bon comportement. Mais du coup, **les 3,3 Mo d'alphaTab ne sont dans aucun
budget** (voir A5).

---

## V. Reporté en v2

Décidé le 14 août 2026 : ces points ne rentrent proprement ni en 8a ni en 8b.
Ce sont des fonctionnalités neuves ou du travail de contenu, et une tranche de
nettoyage n'ajoute rien.

| Point | Ce que c'est | Pourquoi pas maintenant |
|---|---|---|
| **A2** | Promotion des trois fiches courtes structurantes — `MD-05 appui préparé`, `TR-04 équilibre des voix`, `MG-09 étouffements MG` | Du contenu, et il faut des sources |
| **A4** | Bourdon tenu dans l'accordeur | Fonctionnalité neuve |
| **A6** | Métronome persistant d'une page à l'autre | Fonctionnalité neuve, et une architecture de vue partagée |
| **K12** | Nuancer les autres formulations absolues (glissando « jamais », plateau à 8 notes/s, doigt-guide « jamais ») | Du contenu. L'affirmation *médicale* absolue, elle, est traitée en 8a |
| **K13** | Relier chaque affirmation sensible à une source précise, page ou chapitre | Du contenu, et le plus long du lot |
| **K14** | Intégration continue GitHub | Pas de dépôt distant, projet mono-utilisateur |
| **K15** | Sitemap et `robots.txt` | Après le déploiement, s'il y a lieu |
| **Graphe d'assiduité** | Le `parJour()` supprimé en 8b, à réécrire un jour | Mieux vaut le réécrire que le garder en réserve |

---

## Abandonné

- **C3** — comparaison automatique de captures. Projet mono-utilisateur : je
  regarde les images, cela suffit.
