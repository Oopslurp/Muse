# 03 — Fiches courtes

Les 27 techniques de la taxonomie non traitées en fiche approfondie. Format volontairement contraint : définition, geste clé, une erreur, un exercice, une source. Ces fiches sont des **points d'entrée**, destinées à être développées plus tard si l'usage le justifie.

Référence croisée : `00-taxonomie.md` pour les identifiants, prérequis et difficultés.

---

## Famille — Main droite

### MD-03 — Alternance i-m · diff. 2
**Définition.** Alternance stricte de deux doigts (i-m, m-i, ou a-m-i) pour jouer une ligne mélodique sans jamais répéter un doigt consécutivement.
**Geste clé.** Chaque doigt se réarme pendant que l'autre joue. Le doigt qui vient de jouer doit être **revenu en position d'attente avant** que l'autre n'attaque — sinon on plafonne à 8 notes/seconde environ.
**Erreur fréquente.** Répétition involontaire d'un doigt au changement de corde, en particulier au sommet d'une gamme. *Autodiag* : chante « i-m-i-m » à voix haute en jouant ; l'erreur se révèle quand la voix et les doigts se désynchronisent.
**Exercice.** Gamme chromatique sur une corde, 4 cases, aller-retour, en alternance stricte. Puis la même en commençant par `m`. Puis en `a-m-i`.
**Source.** Scott Tennant, *Pumping Nylon* (chapitre gammes) · Abel Carlevaro, *Serie Didáctica* n°1 (gammes diatoniques).

### MD-05 — Appui préparé (*planting*) · diff. 3
**Définition.** Poser le doigt sur la corde avant de la pincer, pour contrôler l'attaque et étouffer la note précédente.
**Geste clé.** Deux régimes : **simultané** (tous les doigts posés d'un coup — outil d'exercice, son sec) et **séquentiel** (chaque doigt se pose pendant que le précédent joue — le régime musical réel).
**Erreur fréquente.** Poser trop tôt, ce qui étouffe la résonance et rend l'arpège sec. *Autodiag* : joue le même passage sans aucun appui ; si la résonance revient d'un coup, tu posais trop tôt.
**Exercice.** Un cycle p-i-m-a joué trois fois : appui simultané, appui séquentiel, sans appui. Écoute la différence — c'est le coût de ton appui.
**Source.** Scott Tennant, *Pumping Nylon*. Voir aussi `02-fiches/arpeges-pima.md` §3.3.

### MD-06 — Technique du pouce · diff. 2
**Définition.** Jeu du pouce sur les cordes graves, en pincé, en butée ou étouffé paume.
**Geste clé.** Le moteur est la **carpo-métacarpienne** (base du pouce, dans le poignet) — une articulation distincte de celle des autres doigts, ce qui rend l'indépendance physiologiquement possible. L'interphalangienne du pouce ne doit pas « claquer ».
**Erreur fréquente.** Pouce systématiquement trop fort, en pilote automatique dynamique. *Autodiag* : essaie de jouer la basse **plus faible** que la mélodie. Si tu n'y arrives pas, le pouce n'est pas sous contrôle.
**Exercice.** Ligne de basse simple (fondamentale-quinte) sur 4 accords, avec crescendo puis decrescendo sur chaque phrase de 4 mesures. Pouce seul.
**Source.** Voir `02-fiches/alternance-pouce.md` §3.1 · Carlevaro, *Serie Didáctica* n°2.

### MD-09 — Rasgueado · diff. 3
**Définition.** Déploiement successif des doigts depuis le poing fermé pour un balayage percussif continu, hérité du flamenco.
**Geste clé.** Chaque doigt se déplie par **extension active** depuis la MCP, comme un ressort qu'on libère — ce n'est pas un balayage de la main entière. Formules courantes : `ii`, `mi`, `ami`, `pmp`, `pai`.
**Erreur fréquente.** Le poignet balaie à la place des doigts, ce qui donne un strumming au lieu d'un rasgueado (pas de « roulement »). *Autodiag* : si tu entends un seul coup au lieu de 3-4 attaques distinctes très rapprochées, c'est le poignet.
**Exercice.** Rasgueado `a-m-i` sur un accord de la mineur, très lentement, en cherchant à entendre **trois attaques séparées**. Puis accélérer jusqu'à ce qu'elles fusionnent.
**Source.** alphaTex supporte les patterns de rasgueado via l'effet `rasg` (`ii`, `mi`, `pmp`, `pei`, `pai`, `ami`…) — [propriétés de beat](https://alphatab.net/docs/alphatex/beat-properties). Emilio Pujol, *Escuela Razonada*, pour le contexte historique.

### MD-10 — Harmoniques naturelles · diff. 2
**Définition.** Effleurement d'une corde à vide au-dessus d'un nœud de vibration pour ne faire sonner qu'un partiel.
**Geste clé.** Le doigt MG **effleure sans presser**, exactement **au-dessus de la frette** (pas derrière), et se retire **immédiatement** après l'attaque. Nœuds : case 12 (octave), case 7 (octave + quinte), case 5 (deux octaves), cases 4 et 9 (deux octaves + tierce majeure — attention, ces deux dernières sont légèrement **en deçà** de la position de la frette).
**Erreur fréquente.** Retirer le doigt trop tard, ce qui étouffe l'harmonique. *Autodiag* : si tu obtiens un « ploc » sourd au lieu d'une cloche, le doigt est resté.
**Exercice.** Les 6 cordes en case 12, puis case 7, puis case 5. Chercher la même intensité sur les six.
**Source.** Scott Tennant, *Pumping Nylon* · alphaTex : effet de note `nh` ([propriétés de note](https://alphatab.net/docs/alphatex/note-properties)).

### MD-11 — Harmoniques artificielles (octavées) · diff. 4
**Définition.** L'index de la main droite effleure le nœud situé 12 cases au-dessus de la case frettée, pendant que `a` (ou `p`) pince la corde. Permet une harmonique sur n'importe quelle note.
**Geste clé.** La main droite fait deux choses en même temps : l'index se pose **exactement au-dessus de la frette cible** et `a` pince quelques centimètres plus loin vers le chevalet. La coordination des deux est toute la difficulté.
**Erreur fréquente.** Index mal placé (quelques millimètres suffisent à tuer l'harmonique). *Autodiag* : glisse l'index de 2-3 mm de part et d'autre en répétant l'attaque — tu trouveras le point exact, et tu mémoriseras la précision requise.
**Exercice.** Gamme de do majeur en position ouverte, chaque note doublée à l'octave en harmonique artificielle. Très lent.
**Source.** Scott Tennant, *Pumping Nylon* · alphaTex : effet `ah` avec valeur de case.

### MD-12 — Étouffements main droite · diff. 3
**Définition.** L'ensemble des gestes qui **arrêtent** le son : paume sur les graves (*palm mute*), doigt reposé sur une corde, pizzicato sourd près du chevalet.
**Geste clé.** L'étouffement est **actif et planifié**, pas un accident. En jeu polyphonique, un doigt qui se prépare (MD-05) est déjà un étouffeur : il faut savoir *quand* on veut cet effet.
**Erreur fréquente.** Résonances parasites laissées libres, surtout après un changement d'accord. *Autodiag* : joue un accord, change, puis **arrête tout** — écoute 3 secondes. Ce qui chante encore ne devrait pas.
**Exercice.** Enchaîner 4 accords en imposant un **silence total** d'une noire entre chaque. Le silence est l'exercice.
**Source.** Carlevaro, *Serie Didáctica* n°2 (*apagado*) · alphaTex : effets `pm`, `st` (staccato), `x` (note morte).

### MD-13 — Tambora · diff. 2
**Définition.** Frappe du côté du pouce ou du tranchant de la main sur les cordes près du chevalet, produisant un accord sourd et tambouriné.
**Geste clé.** On frappe **les cordes**, pas la table, juste devant le chevalet, avec le côté du pouce. **Rebond immédiat** : la main ne reste pas posée, sinon le son est étouffé au lieu d'être tambouriné.
**Erreur fréquente.** Frapper trop loin du chevalet, ce qui produit un slap au lieu d'une tambora (les cordes claquent contre les frettes). *Autodiag* : si tu entends du grain métallique, tu es trop loin vers le manche.
**Exercice.** Accord de mi mineur tenu, 4 tamboras en noires, en cherchant à garder la hauteur de l'accord perceptible.
**Source.** Répertoire latino-américain (Barrios, Lauro). `[À VÉRIFIER : je n'ai pas de source méthodologique écrite sur la tambora ; description déduite du geste standard.]`

---

## Famille — Main gauche

### MG-01 — Placement main gauche & pouce · diff. 1
**Définition.** Position neutre du poignet, doigts perpendiculaires à la touche, pouce en contrepoids derrière le manche.
**Geste clé.** Le pouce se pose **à plat sur sa pulpe**, approximativement en face de l'index ou du majeur, et il **s'oppose** — il ne serre pas. Les doigts frettent **sur la pointe**, juste derrière la frette.
**Erreur fréquente.** Poignet cassé vers l'extérieur pour compenser un coude mal placé. *Autodiag* : regarde le dos de ta main — la ligne avant-bras/main doit être quasi droite. Un angle marqué signale une compensation en amont.
**Exercice.** Exercice chromatique 1-2-3-4 sur chaque corde, en cases 5-8, en surveillant **uniquement** l'angle du poignet. Aucun objectif de vitesse.
**Source.** Carlevaro, *Serie Didáctica* n°3 · Allen Mathews, [Classical Guitar Shed](https://classicalguitarshed.com/) (articles gratuits sur la tension MG).

### MG-03 — Ligado ascendant (*hammer-on*) · diff. 2
**Définition.** Un doigt MG frappe la corde déjà en vibration pour faire sonner une note plus aiguë, sans intervention de la main droite.
**Geste clé.** Le doigt tombe **de haut, vite et près de la frette**. C'est la **vitesse** de chute qui fait le volume, pas la pression finale. Le doigt part de 1-2 cm au-dessus de la corde, pas de la corde elle-même.
**Erreur fréquente.** Appuyer fort et lentement — la note sort faible et sourde. *Autodiag* : si tu dois forcer pour que la note sorte, tu appuies au lieu de frapper.
**Exercice.** Corde 1, index case 5, ligado vers l'annulaire case 7. Dix fois, en cherchant à ce que la 2ᵉ note soit **aussi forte** que la 1re. Puis toutes les paires de doigts (1-2, 1-3, 1-4, 2-3, 2-4, 3-4).
**Source.** Scott Tennant, *Pumping Nylon* · alphaTex : effet de note `h`.

### MG-04 — Ligado descendant (*pull-off*) · diff. 3
**Définition.** Un doigt MG quitte la corde en la « pinçant » latéralement vers la paume, faisant sonner la note inférieure.
**Geste clé.** Ce n'est **pas** un lever : c'est un **pincement latéral**. Le doigt tire la corde vers l'intérieur de la paume puis la relâche, comme un pincement de main droite fait par la main gauche. Le doigt qui tient la note inférieure doit être **posé avant**.
**Erreur fréquente.** Lever le doigt tout droit, ce qui donne un son quasi inaudible. *Autodiag* : si le pull-off est nettement plus faible que le hammer-on, c'est ça.
**Exercice.** L'inverse de l'exercice MG-03 : annulaire case 7 → index case 5, dix fois par paire de doigts, en cherchant l'égalité de volume avec l'ascendant.
**Source.** Scott Tennant, *Pumping Nylon* · alphaTex : effet de note `h` (le sens est déduit de la case suivante).

### MG-05 — Déplacements & doigts guides · diff. 3
**Définition.** Changement de position le long du manche en conservant un doigt en contact léger comme repère tactile et pivot.
**Geste clé.** **Relâcher la pression avant de glisser**, garder un contact léger, reposer à l'arrivée. Trois temps : relâcher / voyager / poser. Le doigt guide reste sur sa corde et ne quitte jamais le manche.
**Erreur fréquente.** Garder la pression pendant le déplacement, ce qui produit un glissando parasite et use les cordes. *Autodiag* : tu entends un « chuintement » à chaque changement de position.
**Exercice.** Un même accord (par ex. la forme de la mineur) déplacé de la case 2 à la case 7 puis retour, très lentement, avec le doigt 1 comme guide sur la corde 2. Chercher le **silence** pendant le déplacement.
**Source.** Carlevaro, *Serie Didáctica* n°3 et n°4 — la question des déplacements est centrale dans son système.

### MG-06 — Extensions · diff. 3
**Définition.** Écartement contrôlé entre deux doigts pour couvrir un intervalle large sans déplacer la main.
**Geste clé.** L'ouverture vient des **MCP** (base des doigts, dans la paume) — c'est là que se trouve l'amplitude articulaire. Elle ne vient **pas** d'une torsion du poignet ni d'un écartement forcé des phalanges.
**Erreur fréquente.** Compenser par une rotation du poignet, qui met le tendon en tension et prépare une blessure. *Autodiag* : si ton poignet change d'angle quand tu écartes, l'ouverture ne se fait pas au bon endroit.
**Exercice.** Index case 5 corde 6, auriculaire case 9 corde 6, tenus ensemble 5 secondes puis relâche 10 secondes. Trois répétitions. **Jamais plus, jamais en douleur.**
**Source.** ⚠️ **Technique à risque.** Voir `01-sources.md` §D : jusqu'à 89 % des musiciens rapportent une blessure professionnelle, l'hypermobilité articulaire est un facteur de risque. [Pasadena Conservatory, Injury Prevention Guide](https://pasadenaconservatory.org/current-students/health-and-safety/music-injury-prevention-guide/).

### MG-07 — Vibrato · diff. 3
**Définition.** Oscillation périodique de la hauteur d'une note tenue.
**Geste clé.** Deux familles distinctes. **Longitudinal (classique)** : l'oscillation se fait dans l'axe de la corde, en balançant l'avant-bras ; le doigt reste posé et la pression est constante. **Latéral (acoustique/électrique)** : le doigt tire la corde en travers. Le classique produit une variation plus fine et symétrique.
**Erreur fréquente.** Un vibrato irrégulier en vitesse, qui trahit qu'il est produit par le doigt seul au lieu de l'avant-bras. *Autodiag* : compte les oscillations sur 2 secondes ; si tu ne peux pas les compter régulièrement, ce n'est pas contrôlé.
**Exercice.** Une note tenue en case 7 corde 3, vibrato à 4 oscillations par seconde au métronome (clic à 120, une oscillation par clic à la double-croche), puis 6, puis 3.
**Source.** Emilio Pujol, *Escuela Razonada* · alphaTex : effets `v` (léger) et `vw` (large).

### MG-08 — Glissando · diff. 2
**Définition.** Déplacement du doigt le long de la corde en maintenant la pression, faisant entendre le trajet.
**Geste clé.** **Pression constante et vitesse contrôlée.** Contrairement au déplacement (MG-05) où l'on relâche, ici on maintient. La note d'arrivée est-elle réattaquée ou non ? C'est un choix musical à décider explicitement.
**Erreur fréquente.** Ralentir en fin de course, ce qui rend l'arrivée floue. *Autodiag* : enregistre — le glissando doit avoir une vitesse constante ou légèrement accélérée, jamais décélérée.
**Exercice.** Corde 3, case 2 → case 9, en une noire à ♩ = 60, dix fois. Puis en une croche. Puis en une blanche.
**Source.** alphaTex : effets `sl` (slide legato), `ss` (shift slide), `sib`/`sia`/`sou`/`sod` (slides d'entrée/sortie).

### MG-09 — Étouffements main gauche · diff. 3
**Définition.** Relâchement partiel ou pose passive d'un doigt pour couper une résonance parasite.
**Geste clé.** Deux moyens : **relâcher la pression** sans quitter la corde (la note s'arrête, la corde reste amortie), ou **poser à plat** un doigt libre sur les cordes à faire taire. Indispensable dès qu'on joue en accordage ouvert, où tout résonne.
**Erreur fréquente.** Ne pas étouffer les cordes graves qui continuent de sonner après un changement d'harmonie. *Autodiag* : le **test des 3 secondes** — joue, change d'accord, arrête, écoute.
**Exercice.** En accordage DADGAD, jouer une mélodie sur la corde 1 en imposant le **silence complet** des cinq autres cordes. C'est beaucoup plus dur qu'il n'y paraît.
**Source.** Voir MD-12. Le sujet est traité de façon dispersée dans la littérature — c'est un manque général.

---

## Famille — Percussif & moderne

### PM-02 — Nail attack · diff. 4
**Définition.** Balayage percussif du dos des ongles sur les cordes, signature de Kotaro Oshio.
**Geste clé.** D'après la description disponible : frappe des cordes avec **les ongles du majeur et de l'annulaire**, ce qui permet d'établir une pulsation percussive rapide **tout en continuant à jouer une mélodie par-dessus**. Oshio l'aurait développée sous l'influence de Michael Hedges.
**Erreur fréquente.** Perdre la mélodie dès que la percussion s'installe — les deux couches fusionnent en un seul geste. *Autodiag* : joue la percussion seule, puis la mélodie seule ; si la superposition dégrade l'une des deux, elles ne sont pas indépendantes.
**Exercice.** Nail attack en croches sur les cordes 4-5-6 étouffées, main gauche à plat. Puis ajouter une note tenue sur la corde 1. `[À VÉRIFIER : exercice déduit, pas issu d'une source.]`
**Source.** [Acoustic Accent, « Kotaro Oshio — fingerstyle perfection and… NAIL ATTACK! »](https://acousticaccent.wordpress.com/2015/11/05/kotaro-oshio-fingerstyle-perfection-and-nail-attack/) · [Wikipédia](https://en.wikipedia.org/wiki/Kotaro_Oshio). ⚠️ **Aucune vidéo visionnée.**

### PM-03 — Tapping deux mains · diff. 4
**Définition.** Les deux mains frappent des notes directement sur la touche, libérant la main droite de sa fonction de pincement.
**Geste clé.** Frappe perpendiculaire, **près de la frette**, avec rebond. Chaque doigt qui quitte une note doit l'étouffer en partant — sinon on accumule des résonances. Les deux mains travaillent dans des zones distinctes du manche.
**Erreur fréquente.** Bruit parasite des cordes non jouées. *Autodiag* : enregistre et écoute uniquement le bruit de fond entre les notes.
**Exercice.** Main gauche : arpège tapé en case 3-5-7 sur cordes 4-5-6. Main droite : mélodie tapée en case 12-15 sur cordes 1-2. D'abord séparément, longtemps.
**Source.** Mike Dawes, *Fingerstyle Mastery* (JamPlay) mentionne le *tapping chords* dans son programme · alphaTex : effet de beat `tt` (tapping), effet de note `lht` (left-hand tap).

### PM-04 — Harmoniques tapées · diff. 4
**Définition.** Un doigt de la main droite frappe perpendiculairement le nœud harmonique, généralement 12 cases au-dessus d'une note frettée par la main gauche. Son de cloche caractéristique de McKee et Dawes.
**Geste clé.** La frappe est **sèche, perpendiculaire, avec rebond immédiat** — c'est le rebond qui laisse l'harmonique sonner. On frappe **exactement sur la frette**, pas derrière. L'index tendu, doigt raide, fonctionne mieux qu'un doigt souple.
**Erreur fréquente.** Doigt qui reste sur la corde et étouffe l'harmonique. *Autodiag* : si tu obtiens un « clac » sans hauteur, c'est le rebond qui manque.
**Exercice.** Main gauche : corde 6 case 3. Main droite : frappe corde 6 case 15. Puis toutes les cordes, main gauche case 3, main droite case 15.
**Source.** Mike Dawes, [*Fingerstyle Mastery*](https://jamplay.com/guitar-lessons/artists/316-mike-dawes) (« hammered harmonics ») · alphaTex : effet de note `th` (tapped harmonic).

### PM-05 — Accordages alternatifs · diff. 2
**Définition.** Réaccordage de tout ou partie des cordes pour ouvrir des résonances et des doigtés impossibles en standard.
**Geste clé.** Techniquement facile, **conceptuellement exigeant** : chaque accordage redéfinit la carte du manche. Le vrai travail est de **réapprendre où sont les notes** et de gérer les résonances supplémentaires (d'où le prérequis MG-09).
**Erreur fréquente.** Traiter un accordage ouvert comme le standard et se contenter de transposer des formes. *Autodiag* : si tu joues en DADGAD les mêmes accords qu'en standard, tu n'utilises pas l'accordage.
**Exercice.** En DADGAD, trouver dix voicings différents de ré majeur en utilisant au moins deux cordes à vide dans chacun. Sans partition.
**Source.** Mike Dawes, [TrueFire](https://truefire.com/mike-dawes-guitar-lessons/progressive-fingerstyle-essential-riffs/c1841) (accordages alternatifs) · Voir `06-accordeur.md` pour la liste des accordages à supporter.

---

## Famille — Transversal

### TR-01 — Dynamiques · diff. 3
**Définition.** Contrôle continu de l'intensité, de *ppp* à *fff*.
**Geste clé.** Le volume vient de **l'amplitude de déplacement de la corde perpendiculairement à la table**, donc de la profondeur d'enfoncement du doigt et de sa vitesse — **pas de la force de serrage**. Jouer fort en crispant produit un son dur et faible.
**Erreur fréquente.** Une plage dynamique réelle de deux nuances (*mf* à *f*) alors qu'on croit en avoir cinq. *Autodiag* : enregistre une phrase en *pp* puis en *ff*. Si le vumètre bouge peu, ta plage est étroite.
**Exercice.** Une seule note répétée 16 fois, en crescendo continu de *ppp* à *fff*, puis retour. Chaque note doit être audiblement différente de la précédente.
**Source.** Carlevaro, *Escuela de la Guitarra* — la classification des *toques* est en partie une classification dynamique.

### TR-02 — Timbre : sul tasto ↔ ponticello · diff. 3
**Définition.** Déplacement du point d'attaque entre la touche (*sul tasto* : rond, feutré, pauvre en harmoniques) et le chevalet (*sul ponticello* : nasal, mordant, riche en harmoniques).
**Geste clé.** Deux paramètres indépendants : **la position** le long de la corde, et **l'angle du doigt** (plus l'attaque est perpendiculaire, plus le son est dur ; plus elle est oblique, plus il est doux). On peut être *ponticello* et doux, ou *sul tasto* et dur.
**Erreur fréquente.** Jouer toute une pièce au même endroit sans s'en rendre compte. *Autodiag* : regarde ta main droite au milieu d'une pièce — a-t-elle bougé depuis le début ?
**Exercice.** Une même phrase de 4 mesures jouée cinq fois : au-dessus de la case 19, sur la rosace, entre rosace et chevalet, à 3 cm du chevalet, à 1 cm du chevalet. Mémoriser les cinq couleurs.
**Source.** Carlevaro, *Escuela de la Guitarra* — grande insistance sur les différents *toques* pour obtenir une large palette de timbres ([contexte](https://www.cglib.org/abel-carlevaro-school-of-guitar-exposition-of-instrumental-theory/)).

### TR-03 — Placement rythmique & groove · diff. 4
**Définition.** Où l'on pose la note dans la subdivision : au centre, devant (*push*), derrière (*laid back*).
**Geste clé.** C'est une compétence d'**écoute**, pas de doigts. Elle demande de sentir la subdivision *sous* la note qu'on joue. Se travaille avec un métronome placé sur les temps faibles, ou sur un temps sur deux.
**Erreur fréquente.** Confondre « juste » et « mécanique ». *Autodiag* : joue avec le métronome sur les temps **2 et 4** seulement. Si tu dérives, ton horloge interne repose sur le clic, pas sur toi.
**Exercice.** Métronome à 60, clic sur le temps 2 uniquement (donc un clic toutes les 4 noires, sur le 2). Jouer une gamme en noires. Puis clic sur le « et » du 2.
**Source.** Pas de source guitare identifiée — c'est un savoir de musicien d'ensemble. `[À VÉRIFIER : je n'ai pas trouvé de ressource guitare classique traitant sérieusement le placement rythmique. Trou documentaire.]`

### TR-04 — Équilibre des voix · diff. 4
**Définition.** Faire ressortir la mélodie au-dessus de la basse et de l'accompagnement, joués simultanément par la même main.
**Geste clé.** Le doigt porteur de la mélodie attaque **plus profond et plus vite**, éventuellement en butée, pendant que les autres restent en pincé léger. C'est une différenciation **par doigt**, pas par main.
**Erreur fréquente.** Tout jouer au même niveau, ce qui donne une bouillie harmonique où rien ne chante. *Autodiag* : fais écouter à quelqu'un et demande de fredonner la mélodie. S'il ne peut pas, l'équilibre est raté.
**Exercice.** Un accord de 4 notes plaqué, joué 4 fois de suite, en faisant ressortir à chaque fois une voix différente. C'est l'exercice le plus rentable du corpus.
**Source.** Scott Tennant, *Pumping Nylon* — la 2ᵉ édition ajoute explicitement des exercices d'équilibre des voix d'accord ([recension](https://www.thisisclassicalguitar.com/pumping-nylon-scott-tennant/)).

### TR-05 — Relâchement & économie de geste · diff. 4
**Définition.** Rendre au repos chaque muscle immédiatement après son travail.
**Geste clé.** Après chaque note, le fléchisseur **rend**. Le doigt revient par relâchement, pas par extension active. Contracter fléchisseur et extenseur en même temps (co-contraction) est ce qui produit fatigue, plafond de vitesse et risque de blessure.
**Erreur fréquente.** Main « armée » en permanence entre les notes. *Autodiag* : **test de l'arrêt brutal** — joue 8 notes puis stoppe net. Ta main doit tomber molle. Si elle reste figée, tu es en co-contraction.
**Exercice.** Jouer n'importe quel exercice en insérant un silence d'une noire toutes les 4 notes, et **relâcher complètement** pendant ce silence. Le silence est l'exercice.
**Source.** ⚠️ **La compétence la plus importante du corpus pour ta santé.** Voir `01-sources.md` §D : jusqu'à 89 % des musiciens rapportent une blessure professionnelle ; 42 % des musiciens vus en centre spécialisé pour dystonie focale sont guitaristes ; **les premiers signes sont typiquement interprétés comme un défaut de technique, ce qui pousse à travailler davantage et aggrave**. [Dystonia Medical Research Foundation](https://dystonia-foundation.org/what-is-dystonia/types-dystonia/musicians/) · [Journal of Hand Therapy](https://www.jhandtherapy.org/article/S0894-1130(24)00024-3/fulltext).

### TR-06 — Ongles · diff. 2
**Définition.** Forme, longueur, polissage et angle de contact de l'ongle. Partie intégrante du geste, pas un accessoire.
**Geste clé.** L'ongle doit présenter une **rampe** : un bord latéral limé en pente douce sur lequel la corde glisse et quitte le doigt sans accrocher. La longueur se mesure en regardant la paume : l'ongle doit dépasser légèrement de la pulpe. Polissage progressif jusqu'au grain très fin — un ongle rugueux produit un bruit de friction.
**Erreur fréquente.** Un ongle limé symétriquement, sans rampe, qui accroche la corde. *Autodiag* : un « clic » ou « zip » avant chaque note.
**Exercice.** Ce n'est pas un exercice mais un entretien : lime + polissoir à disposition, contrôle hebdomadaire. Après chaque retouche, joue une gamme et écoute s'il reste un accrochage.
**Source.** Scott Tennant, *Pumping Nylon* contient un traitement détaillé de la coupe et de la forme des ongles — c'est l'une des raisons pour lesquelles ce livre reste la référence ([recension](https://www.thisisclassicalguitar.com/pumping-nylon-scott-tennant/)).

---

## Récapitulatif des `[À VÉRIFIER]` de ce document

| Technique | Point douteux |
|---|---|
| MD-13 Tambora | Description déduite, aucune source méthodologique écrite consultée. |
| PM-02 Nail attack | Exercice inventé par déduction. Aucune vidéo visionnée. |
| PM-03, PM-04 | Descriptions déduites de descriptifs de cours ; gestes non vérifiés. |
| TR-03 Placement rythmique | **Aucune source guitare identifiée.** Trou documentaire réel. |
| MG-04 | La distinction hammer/pull en alphaTex (`h` dans les deux sens, déduit de la case suivante) n'a pas été testée. |
| Toutes les mentions d'effets alphaTex | Existence relevée dans la doc, syntaxe et rendu non testés. |
