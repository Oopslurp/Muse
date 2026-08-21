# Vérifications manuelles

> Ce que **je ne peux pas faire** et que je n'affirmerai donc jamais. Chaque
> point demande un instrument, un vrai appareil ou une oreille.
>
> Les entrées correspondantes de [dette.md](dette.md) restent ouvertes tant que
> ces cases ne sont pas cochées.

---

## A. Accordeur sur Firefox et Safari, guitare en main

**Entrée D2.** `06-accordeur.md` §10 place en **risque n°1** le fait que les
navigateurs ne respectent pas tous les contraintes `getUserMedia`. La page
relit `getSettings()` et le dit — mais seul Chrome a été essayé, et avec un
signal de synthèse parfait.

Ouvrir `/accordeur` en **HTTPS** (une IP de réseau local ne suffit pas :
`getUserMedia` exige un contexte sécurisé).

### Sur chaque navigateur — Firefox, Safari, Chrome

- [ ] **L'encadré d'avertissement reste-t-il absent ?** S'il apparaît, noter
      lequel des trois traitements le navigateur a gardé. C'est le risque n°1 :
      la page le dit au lieu de laisser croire à une détection capricieuse.
- [ ] **Refuser le micro** : la page nomme-t-elle la panne *et* la marche à
      suivre ?
- [ ] Ligne du bas : périphérique, fréquence d'échantillonnage, fenêtre.

### Avec la guitare

- [ ] **Corde 6 à vide, plusieurs fois.** L'aiguille part-elle à l'octave ?
      Combien de fois sur dix ? *(Le taux réel d'erreurs d'octave reste `déduit`.)*
- [ ] **Pendant l'attaque** d'une corde grave : l'aiguille s'affole-t-elle les
      premières 200 ms ? *(Le comportement de `clarity` à l'attaque reste
      `déduit`.)*
- [ ] **Le gate dans votre pièce** : l'accordeur se déclenche-t-il tout seul au
      silence ? reste-t-il muet sur une note pincée doucement ? Le calibrage
      dure deux secondes au démarrage — rester silencieux pendant.
- [ ] **Si vous avez une guitare en BADGAD ou drop C** : le si1 à 61,74 Hz est
      la note qui dimensionne toute la chaîne. Elle n'a jamais été entendue.
- [ ] **Verrouillage de corde** : accorder une corde volontairement d'un ton
      trop bas, vérifier que l'écran dit bien la corde visée et non le
      demi-ton voisin.

**À rapporter** : ce qui diffère entre les trois navigateurs, et le taux
approximatif d'erreurs d'octave. Ces deux points débloquent D2.

---

## B. Sur un vrai téléphone, au doigt

**Entrée D3, partie restante.** `audit:mobile` force les métriques d'appareil
et vérifie qu'aucune page ne déborde à 320 et 390 px. Aucune page n'a jamais
été **manipulée**.

- [ ] **Le graphe de l'arbre** défile-t-il dans son cadre sans emporter la
      page ? Peut-on viser un nœud au pouce ?
- [ ] **Les tablatures** : le défilement horizontal du bloc est-il distinct de
      celui de la page ?
- [ ] **Le clavier virtuel** masque-t-il le champ qu'on remplit — journal,
      observation, recherche ?
- [ ] **La palette de recherche** s'ouvre-t-elle à la loupe ? Le clavier
      apparaît-il directement dans le champ ?
- [ ] **Les cibles** : les boutons du métronome, les cases à cocher, la
      suppression d'une séance se touchent-ils sans viser ?
- [ ] **L'accordeur** en tenant le téléphone d'une main, guitare dans l'autre :
      la tête de manche est-elle lisible à cette distance ?
- [ ] **Le minuteur** : les signaux sonores s'entendent-ils par le haut-parleur
      du téléphone, en jouant ?

---

## C. Lecteur d'écran

**Entrée D1, partie restante.** Les contrastes et les cibles sont mesurés
([accessibilite.md](accessibilite.md)) ; l'expérience réelle ne l'est pas.

Un seul passage suffit à trancher, avec NVDA, VoiceOver ou Orca.

- [ ] **`/techniques`** : les 32 fiches s'annoncent-elles sans noyer la liste
      sous les statuts et les difficultés ?
- [ ] **La recherche** : les flèches annoncent-elles bien le résultat visé ?
      C'est le point que Codex signalait et que le motif combobox doit régler.
- [ ] **Une fiche** : l'ordre d'annonce a-t-il un sens — en-tête, doutes,
      geste, corps, paliers ?
- [ ] **L'arbre** : 32 nœuds en boutons, est-ce parcourable ou assommant ?
- [ ] **Le minuteur** qui tourne : le chronomètre est-il annoncé en boucle ?
      *(Si oui, il faut un `aria-live` plus discret — à me signaler.)*

---

## D. Faisabilité musicale des exercices

**Signalé par l'audit Codex.** `npm run validate` garantit la syntaxe et,
depuis la tranche 8a, qu'aucun accord ne pose deux notes sur une même corde.
Il ne dit rien de ce qui est **jouable**.

- [ ] **`extensions`, exercice A.** La notation a été corrigée — index case 5
      puis auriculaire case 9, tenus ensemble, au lieu d'un accord impossible.
      Reste à juger si l'écartement prescrit est raisonnable, et si la durée de
      cinq secondes tient. C'est une fiche à **risque élevé**.
- [ ] **Les 62 autres blocs**, à l'occasion : une relecture d'ensemble, une
      fiche à la fois.

---

## Comment me rapporter

Le plus utile est **ce qui vous a surpris**, pas la case cochée. « L'aiguille
saute à l'octave une fois sur trois sur la corde 6 » vaut mieux que « ne
marche pas ». Ce qui est vérifié se marque `observé` sur la fiche concernée,
là où l'affirmation est écrite.

---

## E. Le premier déploiement, page par page

**Ajoutée en tranche 9.** Le site est publié sur GitHub Pages, et deux choses
n'y ressemblent pas à ce qu'on voit en local.

- [ ] **Les partitions ont-elles leurs glyphes ?** `public/alphatab/` n'est pas
      versionné : la police Bravura et la banque de sons sont recopiées par le
      script `prebuild`. Si la copie échoue, **la construction réussit quand
      même** et le site sort avec une portée vide et un lecteur muet. Le workflow
      refuse de publier dans ce cas, mais c'est un garde-fou jamais éprouvé en
      conditions réelles.
- [ ] **HTTPS** : `getUserMedia` n'existe qu'en contexte sécurisé. GitHub Pages
      le fournit — à confirmer sur l'accordeur, qui est le seul à en dépendre.
- [ ] Les audits tournent contre n'importe quelle URL :

```bash
export MUSE_URL=https://oopslurp.github.io/Muse
npm run audit:console && npm run audit:lecture && npm run audit:poids
```

`audit:poids` est le plus utile ici : il vérifie qu'**aucune requête ne quitte
l'origine**, ce qui ne peut se constater que sur le site réellement servi.
