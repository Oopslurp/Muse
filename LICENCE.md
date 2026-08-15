# Licence

**Tous droits réservés.** © Olivier, 2026.

Ce dépôt est un site personnel d'apprentissage, à un seul utilisateur. Il n'est
pas publié comme un projet réutilisable et ne porte donc pas de licence libre.
Aucune autorisation de reproduction, de modification ou de redistribution n'est
accordée par le seul fait que le code soit lisible.

> Si ce choix doit changer, il tient en deux fichiers : celui-ci et le champ
> `license` de `package.json`. Le reste du dépôt n'en dépend pas.

---

## Ce qui n'appartient pas à ce dépôt

Trois choses cohabitent ici et ne relèvent pas de la même règle.

### Le contenu pédagogique

Les fiches de `src/content/techniques/` sont des textes originaux. Ce qu'elles
**citent** appartient à ses auteurs : le catalogue de
[src/data/sources.ts](src/data/sources.ts) nomme chaque source, et chaque
affirmation sourcée y renvoie. Une citation reste une citation.

### Le répertoire et les tablatures

**Aucune tablature d'œuvre sous droits ne figure ici**, et c'est une règle de
fond du projet, pas une précaution. Les exercices sont soit originaux, soit des
formules communes non protégeables ; le répertoire cité est en domaine public,
avec sa date de mort d'auteur et son statut juridique inscrits dans le contenu
(`droits:`). Les œuvres encore protégées sont mentionnées **en référence
d'écoute uniquement**, explicitement marquées comme telles, et jamais
reproduites.

Villa-Lobos (†1959) a été retiré du répertoire utilisable pour cette raison :
domaine public en UE en 2030, pas avant.

### Les dépendances

`node_modules/` n'est pas dans ce dépôt et chaque paquet garde sa propre
licence. Trois méritent d'être nommées parce qu'elles sont servies au visiteur :

| | Licence | Servi depuis le bundle |
|---|---|---|
| [alphaTab](https://alphatab.net) | MPL-2.0 | oui — moteur, worker, worklet |
| Police Bravura (SMuFL) | OFL 1.1 | oui — glyphes de partition |
| Fraunces, Public Sans | OFL 1.1 | oui — aucune requête vers un CDN |
| Banque de sons Sonivox | voir alphaTab | oui — `.sf3` |
