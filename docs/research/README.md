# Phase de recherche — close

> **Ces documents sont archivés. Ils ne font plus foi.**
>
> Ils ont servi à construire le site, et [CLAUDE.md](../../CLAUDE.md) fixe les
> décisions prises **après** eux. En cas de contradiction, **CLAUDE.md gagne** —
> plusieurs affirmations d'ici ont été corrigées, contredites ou abandonnées
> depuis.
>
> Le contenu vivant du site est dans [`src/content/techniques/`](../../src/content/techniques/),
> pas ici.

Ils sont conservés parce que le raisonnement compte : on voit d'où vient chaque
choix, y compris ceux qui se sont révélés faux.

## Ce qu'on y trouve

| | |
|---|---|
| [00-taxonomie.md](00-taxonomie.md) | Les 33 techniques, leurs familles et le graphe de prérequis |
| [01-sources.md](01-sources.md) | Le corpus de sources, avec son §D sur la santé du musicien |
| [02-fiches/](02-fiches/) | Six fiches approfondies, rédigées avant la migration en MDX |
| [03-fiches-courtes.md](03-fiches-courtes.md) | Les autres techniques, en format court |
| [04-benchmark.md](04-benchmark.md) | Six plateformes analysées, et le créneau qui en ressort |
| [05-modele-donnees.md](05-modele-donnees.md) | Le schéma pressenti. Trois écarts assumés depuis — voir CLAUDE.md |
| [06-accordeur.md](06-accordeur.md) | La spécification de l'accordeur. Quatre écarts délibérés dans le code |
| [07-synthese.md](07-synthese.md) | Ce qui a été retenu, et les trous documentaires |
| [08-alphatab-verifie.md](08-alphatab-verifie.md) | La sonde : ce qu'alphaTab fait réellement, vérifié en parsant |

## Trois erreurs connues, conservées telles quelles

Elles sont ici parce qu'elles ont produit des règles :

1. **Un nom de note faux** dans un commentaire de tablature — la case était
   juste, le nom ne l'était pas. C'est de là que vient l'interdiction d'écrire
   un nom de note en dur : ils sont dérivés en TypeScript.
2. **Une corde utilisée deux fois** dans un même temps, comme basse alternée et
   comme mélodie. Le build refuse désormais ce cas.
3. **Trois liens de prérequis incohérents**, attrapés par l'invariant de
   monotonie de difficulté au moment de la migration.

Le seul document d'ici qui reste une **référence exécutable** est
`08-alphatab-verifie.md` : ses réponses ont été établies en parsant, pas en
lisant la documentation, et la documentation d'alphaTab se contredisait.
