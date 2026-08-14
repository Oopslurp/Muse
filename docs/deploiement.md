# Déploiement

Muse est un **site entièrement statique**. Pas de serveur applicatif, pas de
base de données, pas d'API. `npm run build` produit un dossier `dist/` qu'on
dépose tel quel.

```bash
npm run build            # → dist/
MUSE_SITE=https://exemple.net npm run build   # avec le domaine réel
```

`MUSE_SITE` ne sert qu'aux URL canoniques. Sans lui, la construction reste
valide et les liens internes fonctionnent — c'est la balise `<link rel="canonical">`
qui pointera vers un domaine local.

---

## Deux contraintes, une seule vraiment bloquante

### HTTPS est obligatoire

`getUserMedia` n'existe qu'en **contexte sécurisé**. Sans HTTPS, l'accordeur
ne démarre pas — et il le dit, mais il ne marchera pas pour autant.

`localhost` compte comme contexte sécurisé, ce qui explique que tout
fonctionne en développement. **Une adresse IP de réseau local, non** : ouvrir
`http://192.168.1.20:4321` depuis un téléphone donnera un accordeur mort.

Tout hébergeur statique moderne fournit un certificat automatiquement. C'est
la seule exigence réelle.

### Rien ne doit sortir de l'origine

CLAUDE.md décision 8 : pas de CDN, pas de Google Fonts, aucun appel réseau à
l'exécution. Les polices sont dans le bundle, la banque de sons aussi.

`npm run audit:poids` vérifie cet invariant en écoutant toutes les requêtes du
navigateur et en refusant tout ce qui quitte l'origine. **À lancer contre le
site déployé**, pas seulement en local :

```bash
MUSE_URL=https://exemple.net npm run audit:poids
```

---

## Ce que l'hébergeur doit savoir faire

| Besoin | Pourquoi |
|---|---|
| Servir des fichiers statiques | C'est tout ce qu'il y a |
| HTTPS | L'accordeur en dépend |
| Réécrire les erreurs 404 vers `/404.html` | Sinon la page introuvable ne s'affiche pas |

Rien d'autre. Ni fonctions, ni rendu serveur, ni variables d'environnement à
l'exécution.

**Le choix de l'hébergeur reste à faire.** La configuration exacte — fichier
`_redirects`, `netlify.toml`, `vercel.json`, action GitHub Pages — dépend de
lui, et l'écrire à l'avance pour trois plateformes différentes serait écrire
deux fichiers morts. Une fois l'hébergeur choisi, c'est une dizaine de lignes.

---

## Ce qui reste local, quoi qu'il arrive

La progression, les observations et le journal vivent dans **IndexedDB, dans
le navigateur**. Ils ne sont ni synchronisés, ni sauvegardés côté serveur.

Conséquences à garder en tête :

- ouvrir le site sur le téléphone **ne montrera pas** la progression du
  portable ;
- effacer les données de navigation efface tout ;
- la sauvegarde JSON, exportable depuis l'arbre de compétences, est le seul
  pont entre deux appareils — et la seule assurance.

C'était le choix de départ (aucun compte, aucun serveur) et il tient. Mais il
faut savoir qu'il se paie ici.

---

## Après un déploiement, ce qu'on vérifie

Les garde-fous fonctionnent contre n'importe quelle URL :

```bash
export MUSE_URL=https://exemple.net
npm run audit:console      # exceptions, îlots vides, débordement
npm run audit:mobile       # 8 routes × 2 largeurs
npm run audit:poids        # budget + aucun appel hors origine
npm run audit:finitions    # recherche, impression, 404
npm run audit:lecture      # la tablature joue
npm run audit:accordeur    # le micro est refusé proprement, la note est juste
npm run audit:progression  # ce qu'on note survit au rechargement
npm run audit:pratique     # le métronome sonne
```

⚠️ `audit:accordeur` et `audit:pratique` ouvrent un microphone et un contexte
audio&nbsp;: sur un site en HTTPS ils fonctionnent, sur un site en HTTP simple
ils échoueront — et ils auront raison.
