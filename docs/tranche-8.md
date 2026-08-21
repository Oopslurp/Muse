# Tranche 8 — tri de l'audit Codex et backlog fusionné

> **Document de chantier.** Il montre comment un rapport d'audit externe a été
> trié plutôt qu'appliqué en bloc : ce qui était confirmé, ce qui était déjà
> connu, ce qui n'était pas reproductible, et ce qui contredisait une décision
> prise — cette dernière catégorie ne se corrige pas, elle se signale. La
> méthode compte autant que le résultat, d'où sa conservation.
>
> Établi le 14 août 2026, après lecture de [audit.md](audit.md) et vérification
> de chaque affirmation dans le dépôt. **Aucune correction n'a été appliquée.**
>
> Un seul backlog : les points Codex et les entrées de [dette.md](dette.md) y
> sont mélangés et classés à la même échelle de gravité.

---

## 1. Ce que j'ai vérifié, et comment

| Affirmation de Codex | Vérification | Verdict |
|---|---|---|
| Accord de deux notes sur la corde 6 dans `extensions` | Balayage de tous les accords du corpus : recherche d'une corde répétée dans un même groupe `( … )` | **Confirmé**, et c'est le seul cas des 63 blocs |
| Le compteur de doutes omet les doutes imbriqués | Comptage direct dans le frontmatter | **Confirmé** : 30 comptés, 11 omis, **41 réels** |
| Textes secondaires sous 4,5:1 en clair | Ratios calculés sur les jetons des deux thèmes | **Confirmé**, 6 paires en échec (chiffres §4) |
| Provenance accessible au seul survol | `grep` des `title=` sur éléments non focalisables | **Confirmé** : 6 occurrences |
| Cible tactile trop petite sur la suppression du journal | Lecture du CSS : `1.1rem` + `0 0.2em` ≈ 18 × 14 px | **Confirmé** |
| Pas de modèle combobox accessible dans la recherche | Lecture de `Recherche.astro` : aucun `role`, aucun `aria-activedescendant` | **Confirmé** |
| Import sans transaction | `sauvegarde.ts` : `bulkPut` puis `bulkAdd`, deux écritures séparées | **Confirmé** |
| `npm test` échoue volontairement | `package.json` | **Confirmé** |
| Version de Node non épinglée | Ni `engines`, ni `.nvmrc` | **Confirmé** |
| Avertissement `import.meta` en sortie IIFE | Build complet relu | **Confirmé** — sur un chemin de code non emprunté, les audits prouvent que la lecture marche |
| Lien d'évitement présent | `BaseLayout.astro:72` | **Confirmé** (c'est un point fort, pas un défaut) |
| 26 fiches sur 32 sans aucun palier | Comptage | **Confirmé** |

**Un mot sur la fiabilité du rapport.** Codex cite `src/components/LecteurTab.tsx` ;
ce fichier n'existe pas, c'est `src/components/react/LecteurTab.tsx`. Cette
partie a donc été écrite sans ouvrir le fichier. J'ai vérifié tout le reste
plutôt que de faire confiance — d'où le tableau ci-dessus.

---

## 2. Tri en quatre catégories

### Catégorie 1 — confirmé, absent de `dette.md`

| # | Point | Où il va |
|---|---|---|
| K1 | Accord de deux notes sur la corde 6 (`extensions`) | **8a** |
| K2 | Compteur de doutes faux : 30 affichés, 41 réels | **8a** |
| K3 | L'accueil et l'index promettent des paliers que 26 fiches sur 32 n'ont pas | **8a** |
| K4 | « Le galop précède **toujours** la douleur » — affirmation médicale absolue, non sourcée | **8a** |
| K5 | Import hors transaction, et validation partielle du fichier | **8a** |
| K6 | Suppression d'une séance sans confirmation | **8a** |
| K7 | `npm test` échoue volontairement | **8b** |
| K8 | Version de Node non épinglée (Astro 7 exige ≥ 22.12) | **8b** |
| K9 | Avertissement `import.meta` en sortie IIFE d'alphaTab | **8b** |
| K10 | Ni `README.md`, ni fichier de licence, ni description de paquet, ni Open Graph | **8b** |
| K11 | La carte d'accueil dit « mise en page provisoire » — ce n'est plus vrai | **8b** |
| K12 | Autres formulations absolues (glissando « jamais », plateau à 8 notes/s, doigt-guide « jamais ») | **v2** |
| K13 | Relier chaque affirmation sensible à une source précise | **v2** |
| K14 | Intégration continue GitHub | **tranche 9** — remontée : un dépôt public doit faire tourner ses garde-fous |
| K15 | Sitemap et `robots.txt` | **tranche 9** — remontée : sans publication ils ne servaient à rien |

### Catégorie 2 — confirmé, déjà listé (je ne duplique pas)

| Point Codex | Entrée existante |
|---|---|
| Contrastes, clavier, lecteur d'écran | **D1** |
| Cibles tactiles trop petites | **G1** |
| Import qui duplique les séances | **B1** |
| Absence de tests sur graphe / journal / import-export | **C2** |
| Poids d'alphaTab | **A5** — décidé : accepté |
| Fiches courtes sans critères | **A2** — décidé : hors périmètre |
| Mesure sur mobile et réseau lent | **D3** |

### Catégorie 3 — non reproductible, caduc ou faux positif

- **Le blocage GitHub Pages (`base`) a été traité.** Le dépôt public s'appelle
  `Muse` et le site est servi sous `/Muse/`. Le workflow pose `MUSE_BASE=/Muse`
  et les chemins internes utilisent la base générée par Astro.
- **« L'instruction est musicalement incohérente » : à moitié.** Tenir l'index
  case 5 et l'auriculaire case 9 sur la même corde est un exercice d'écartement
  classique et parfaitement faisable. C'est **la tablature** qui est fausse, pas
  la consigne : elle notate un accord qui ne peut pas sonner. La correction
  porte sur la notation, pas sur l'exercice.
- **Chemin de fichier erroné** dans le rapport (voir §1).

### Catégorie 4 — contredit une décision de la section E : je ne corrige pas, j'attends

1. **« Certains cours vidéo sont cités alors que leur contenu n'a pas été
   vérifié. »** C'est la règle de fond n°3, appliquée exprès : chaque source
   vidéo porte `visionne: false`, et c'est **affiché**. Codex lit comme un
   défaut ce qui est la politique.
2. **« La fiche tambora signale qu'aucune méthode propre n'a été consultée. »**
   C'est le doute affiché de la décision 1. Le masquer serait la faute.
3. **« Retirer les mentions d'avancement (tranches 8/9) et le lien vers le
   design system. »** C'est l'honnêteté d'avancement posée dans `nav.ts` : un
   menu qui cache ce qui manque ment. C'est une décision de publication, pas
   un défaut — à toi.
4. **« Faire vérifier l'exercice d'extensions par un guitariste qualifié. »**
   C'est ta vérification manuelle, pas une correction que je peux faire. Elle
   ira dans `verifications-manuelles.md`.

---

## 3. Backlog 8a — liste unique et ordonnée

> Ordre proposé. **Une seule déviation de ton découpage**, signalée en 4.

| # | Point | Gravité | Pourquoi maintenant |
|---|---|---|---|
| 0 | Reporter tes décisions : A1 dans CLAUDE.md, A5 et la section v2 dans dette.md | — | Dix minutes, et le reste s'y appuie |
| 1 | **A3 — provenance par affirmation**, clé `fiche#element`, migration Dexie, promotion sur chaque exercice, erreur et protocole | 🔵 | Ton instruction : avant toute autre intervention sur le contenu. Et les points 2 à 5 s'expriment mieux une fois qu'un doute se pose par affirmation |
| 2 | **K1 — accord de deux notes sur la corde 6**, plus un invariant de build qui refuse deux notes sur une corde dans un même temps | 🔴 | La tablature affichée notate un accord qui ne peut pas sonner. C'est la classe d'erreur exacte que la décision 2 existe pour empêcher — et `validate` ne voit que la syntaxe |
| 3 | **K2 — compteur de doutes** | 🔴 | `/techniques` annonce 30 doutes ; il y en a 41. Sous-déclarer le doute est l'inverse exact du principe du projet |
| 4 | **K3 — promesse éditoriale** sur l'accueil et l'index | 🔴 | Les deux pages affirment que chaque fiche porte « ses paliers avec critère de passage ». 26 sur 32 n'en ont aucun. Correction de formulation, pas de contenu — donc dans le périmètre |
| 5 | **K4 — « précède toujours la douleur »** | 🔴 | Affirmation médicale absolue et non sourcée, dans un `signalArret`. Une nuance suffit, aucune source nouvelle n'est requise |
| 6 | **B1 + K5 — identifiant stable `crypto.randomUUID()`, migration Dexie, réimport idempotent, import en une transaction, validation stricte du fichier** | 🔴 | Perte et duplication de données. Deux écritures séparées peuvent laisser une base à moitié importée ; rien ne valide les champs libres |
| 7 | **D1 — accessibilité**, avec `docs/accessibilite.md` chiffré : contrastes des deux thèmes, parcours clavier des 8 routes, essai lecteur d'écran. Intègre **G1 + K6-cible** (cibles tactiles, dont la suppression du journal ≈ 18 × 14 px), **C5** (filets de famille), **K-combobox** (la recherche n'annonce pas le résultat visé), **K-title** (6 provenances au seul survol) | 🔴 | Six paires de couleurs sous 4,5:1, mesurées. Le texte de métadonnées est aujourd'hui illisible pour une partie des gens, dans les deux thèmes |
| 8 | **B6 + B7 — signaux sonores** : dépassement de `dureeMax`, et chaque bascule travail/repos | 🟠 | Tu as fait des champs santé une contrainte de build ; l'alerte est aujourd'hui invisible pour qui regarde ses mains |
| 9 | **B2 + B3 + K6 — remise à zéro avec confirmation explicite, rappel d'export au bout de N séances, confirmation avant suppression d'une séance** | 🟠 | Un clic détruit une séance sans retour possible, et rien ne rappelle d'exporter avant qu'IndexedDB ne s'efface |

### Contrastes mesurés, pour mémoire

| Encre sur fond | Clair | Sombre |
|---|---|---|
| `ink-3` sur `bg` | **4,29:1** | ok |
| `brass` sur `bg` | **4,49:1** | ok |
| `ink-3` sur `surface-2` | **3,96:1** | **4,29:1** |
| `brass` sur `surface-2` | **4,15:1** | ok |
| `observe` sur `surface-2` | **4,20:1** | ok |

Toutes passent le seuil « grand texte » (3:1) et échouent le seuil courant
(4,5:1). Or `--c-ink-3` porte les métadonnées en `text-2xs`.

---

## 4. La seule déviation que je propose

Ton découpage place **D1 en 2** et **B1 en 4**. Je propose d'**inverser** :
l'intégrité des données avant l'accessibilité.

La raison est la réversibilité. Un contraste insuffisant gêne à chaque lecture
mais ne détruit rien, et se corrige à tout moment. Une séance perdue ou
dupliquée par un import est irréversible — et chaque jour d'usage avant le
correctif ajoute des données à risque.

Si tu préfères ton ordre, dis-le : les deux blocs sont indépendants.

---

## 5. Backlog 8b — clos le 15 août 2026

| | Point | Résultat |
|---|---|---|
| **B4** | décompte rejoué à chaque reprise | ✅ décidé à l'appui, selon la position |
| **B5** | défilement de la partition | ◐ garde-fou posé, **cas non reproduit** — voir dette.md |
| **B8** | tempo en notes/min | ✅ et un défaut trouvé dans `bilan()` au passage |
| **B9** | code de sortie d'`audit:layout` | ✅ conteneur à défilement distingué du vrai débordement |
| **C1** | quatre exports morts | ✅ supprimés |
| **C2** | tests sur les trois modules purs | ✅ 45 cas, dont un défaut trouvé et un garde-fou faible corrigé |
| **C4** | souci Git Bash | ✅ documenté, avec les trois contournements |
| **D4** | provenance des arêtes de prérequis | ✅ `lienProvenance`, `déduit` par défaut, 44 doutes au lieu de 41 |
| **K7** | `npm test` | ✅ agrège tout, puis `validate` |
| **K8** | version de Node | ✅ `engines` + `.nvmrc` |
| **K9** | avertissement `import.meta` | ✅ workers en modules ES, worker vérifié jouant |
| **K10** | README, licence, paquet, Open Graph | ✅ |
| **K11** | « mise en page provisoire » | ✅ |
| **A5** | budget de chargement différé | ✅ 4326 Ko consignés — résout **G2** |

**Trois choses trouvées en 8b qui n'étaient dans aucune liste :**

1. `bilan()` **se verrouillait sur l'unité du premier tempo** et jetait en
   silence tous ceux de l'autre unité. Bloquant pour B8.
2. `audit:poids` attribuait les octets à la **dernière requête vue** au lieu de
   les classer par `requestId` — faux dès trois chargements parallèles.
3. Mon propre test de déterminisme de l'arbre **ne prouvait pas ce qu'il
   affirmait** : il fallait un graphe à barycentres égaux pour qu'il puisse
   tomber.

**Reste :** le déploiement Cloudflare Pages.

## 6. Proposé pour la v2

- **A2** promotion des fiches courtes · **A4** bourdon · **A6** métronome persistant
- **K12** nuancer les autres formulations absolues
- **K13** relier chaque affirmation sensible à une source précise
- Graphe d'assiduité (le `parJour()` supprimé en 8b, à réécrire un jour)

## 7. Abandonné

- **C3** comparaison automatique de captures — projet mono-utilisateur

## 8. Tes vérifications, que je ne simulerai pas

**D2** (accordeur sur Firefox et Safari, guitare en main) et le reste de **D3**
(manipulation au doigt sur un vrai téléphone), plus la relecture humaine de
l'exercice d'extensions. Liste de contrôle à produire en 8a dans
`docs/verifications-manuelles.md`.
