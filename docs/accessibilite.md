# Accessibilité — mesures

> La direction artistique pose l'accessibilité comme **non négociable**. Elle
> n'avait jamais été mesurée : c'était le trou le plus sérieux de
> [dette.md](dette.md) (entrée D1).
>
> Ce document ne contient que des **relevés**, pas des intentions. Tout ce qui
> y figure est reproductible par `npm run audit:a11y`.
>
> Relevé du 14 août 2026, tranche 8a.

---

## Résultat

| | Avant | Après |
|---|---|---|
| Points relevés sur 8 routes × 2 thèmes | **656** | **0** |
| Causes distinctes | 85 | 0 |

Les 656 points se ramenaient à une poignée de causes répétées sur toutes les
pages. Deux jetons de couleur en portaient à eux seuls plus de la moitié.

---

## 1. Contraste

Mesuré sur les couleurs **réellement rendues**, pas sur les jetons : c'est la
composition qui compte, et un `color-mix` ne se lit pas dans la feuille de
style. Seuil 4,5:1, ou 3:1 pour le grand texte — WCAG 2.2 AA, critère 1.4.3.

### Ce qui échouait

| Jeton | Sur | Avant | Où ça se voyait |
|---|---|---|---|
| `--c-ink-3` clair | `--c-surface-2` | **3,96:1** | Toutes les métadonnées : codes de technique, tempos, mentions |
| `--c-ink-3` clair | `--c-bg` | 4,29:1 | Idem, sur le fond de page |
| `--c-ink-3` sombre | `--c-surface-2` | 4,29:1 | Idem, thème sombre |
| `--c-brass` clair | `--c-surface-2` | 4,15:1 | Liens, numéros de palier, accents |
| `--c-brass` clair | `--c-bg` | 4,49:1 | Navigation, liens d'exercice |
| `--c-observe` clair | `--c-surface-2` | 4,20:1 | Statut « observé » |
| `--c-pm` clair | `--c-surface-2` | 4,15:1 | Famille percussif & moderne |
| `.fh__sep`, `.row__sep` | — | **1,81:1** et 1,97:1 | Séparateurs `·` |

### Ce qui a changé

Quatre jetons, assombris ou éclaircis en gardant leur teinte. Les valeurs ont
été **calculées** pour atteindre 4,5:1 sur le pire des trois fonds, pas
choisies à l'œil.

| Jeton | Avant | Après | Pire ratio après |
|---|---|---|---|
| `--c-ink-3` clair | `#7c7062` | `#72675a` | 4,53:1 |
| `--c-brass` clair | `#8a6a1b` | `#826419` | 4,55:1 |
| `--c-observe` clair | `#3f7a4e` | `#3c744a` | 4,55:1 |
| `--c-pm` clair | `#a85a24` | `#9c5321` | 4,52:1 |
| `--c-ink-3` sombre | `#8d8172` | `#928576` | 4,54:1 |
| `--c-deduit` clair | `#7c7062` | `#72675a` | aligné sur `ink-3` |

Les séparateurs `·` passent à `--c-ink-3` et portent `aria-hidden` : ce sont
des ornements de ponctuation, ils n'ont rien à énoncer.

**Les familles de techniques restent distinctes** — le changement le plus
visible porte sur le percussif, d'un demi-ton plus sombre. Les trois autres
passaient déjà : main droite 6,05:1, main gauche 5,07:1, transversal 6,30:1
au pire.

---

## 2. Cibles tactiles

24 × 24 px minimum — WCAG 2.2 AA, critère 2.5.8. Les liens en pleine ligne de
texte sont exemptés **par le critère lui-même** et ne sont donc pas comptés.

| Élément | Avant | Correction |
|---|---|---|
| Cases à cocher natives | 13 × 13 | Règle globale `min-width/height: 1.5rem` |
| Curseurs de tempo et de volume | 16 px de haut | `height: 1.5rem` |
| Boutons ±1 / ±5 du métronome | 22 × 26 | `min-width: 1.5rem` |
| Suppression d'une séance | ≈ 18 × 14 | Reprise dans le composant |
| Liens du fil d'Ariane | 22 px de haut | `min-height: 1.5rem` |
| Liens d'exercice, sommaire | 22 px de haut | Idem |

Les deux premières lignes sont réglées **une fois pour toutes** dans
`global.css` plutôt que composant par composant : le navigateur dessine ces
contrôles à 13 et 16 px, et chaque nouveau formulaire aurait reproduit le
défaut.

---

## 3. Recherche : un vrai combobox

Les flèches déplaçaient une surbrillance que **rien n'énonçait** : le focus
reste dans le champ, et aucun modèle accessible n'était déclaré.

La palette suit maintenant le motif combobox :

- le champ porte `role="combobox"`, `aria-expanded`, `aria-controls`,
  `aria-autocomplete="list"` ;
- la liste porte `role="listbox"`, chaque résultat `role="option"` et
  `aria-selected` ;
- `aria-activedescendant` désigne le résultat visé — c'est lui qui fait
  annoncer le déplacement sans jamais bouger le focus.

Le reste vient de `<dialog>` : focus piégé, `Échap`, retour du focus au
déclencheur, sans une ligne de JavaScript.

---

## 4. Information au seul survol

Un `title` sur un élément non focalisable n'existe ni au clavier ni au lecteur
d'écran. L'audit ne signale que les cas où l'information **n'existe nulle part
ailleurs** — un `title` qui double un texte visible ou un `aria-label` est un
confort de souris, pas un défaut.

Vérification faite : les badges de difficulté portaient déjà `role="img"` et
`aria-label`, les pastilles de statut ont leur libellé en clair. Après
affinage de la règle, **aucun cas ne subsiste**.

Une classe `.sr-only` a été ajoutée à `global.css` — elle était **utilisée par
`StatusBadge` sans jamais avoir été définie** : le texte censé être réservé aux
lecteurs d'écran s'affichait donc à l'écran.

---

## 5. Structure et noms accessibles

Relevé sur les 8 routes, dans les deux thèmes : un seul `<h1>` par page, aucun
saut de niveau de titre, aucun contrôle sans nom accessible. Rien à corriger.

---

## Ce que cet audit ne dit pas

Il mesure ce qu'un navigateur peut mesurer. Trois choses lui échappent, et
elles vous reviennent — voir [verifications-manuelles.md](verifications-manuelles.md) :

1. **Un vrai lecteur d'écran.** NVDA, VoiceOver ou Orca liront des choses
   qu'aucune heuristique ne prédit — l'ordre réel des annonces, la verbosité
   du graphe, la lisibilité du minuteur pendant qu'il tourne.
2. **Le parcours clavier vécu.** L'ordre de tabulation est syntaxiquement
   correct ; savoir s'il est *praticable* demande de l'essayer.
3. **La perception réelle des couleurs.** 4,5:1 est un seuil, pas une garantie
   de confort.

---

## Reproduire

```bash
npm run audit:a11y              # 8 routes × 2 thèmes, sort en code 1 si échec
npm run audit:a11y -- --rapport # écrit le relevé complet dans .captures/a11y.json
```
