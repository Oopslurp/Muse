# Licences

Deux licences, parce que le code et le contenu n'ont ni la même valeur ni le
même risque.

| | Licence | Couvre |
|---|---|---|
| **Code** | [MIT](LICENSE) | `src/` hors contenu, `tools/`, la configuration |
| **Contenu** | [CC BY-NC-SA 4.0](LICENSE-CONTENU.md) | `src/content/`, `src/data/sources.ts`, `docs/` |

© 2026 Olivier.

Le code se réutilise sans condition. Le corpus s'attribue, ne se vend pas, et se
repartage aux mêmes conditions — **en conservant ses statuts et ses doutes**,
qui en sont la partie utile.

---

## Ce qui n'appartient pas à ce dépôt

Trois choses cohabitent ici et ne relèvent d'aucune des deux licences ci-dessus.

### Le contenu cité

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
licence. Quatre méritent d'être nommées parce qu'elles sont servies au visiteur :

| | Licence | Servi depuis le bundle |
|---|---|---|
| [alphaTab](https://alphatab.net) | MPL-2.0 | oui — moteur, worker, worklet |
| Police Bravura (SMuFL) | OFL 1.1 | oui — glyphes de partition |
| Fraunces, Public Sans | OFL 1.1 | oui — aucune requête vers un CDN |
| Banque de sons Sonivox | voir alphaTab | oui — `.sf3` |
