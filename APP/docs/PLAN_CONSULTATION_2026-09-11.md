# Plan — la consultation (C4 + C5)

> **Établi le 11/09/2026**, après : l'ouverture des maquettes `C4 - Consultations.dc.html` et
> `C5 - Consultation.dc.html`, la lecture de la messagerie de **CMS-SARIS**
> (`apps/web/src/modules/messagerie`, 4 103 lignes), et la mesure de nos deux écrans **en ligne**
> sur `ulamu-web.onrender.com`.
>
> ⚠️ **Rien n'est lancé sans validation du porteur, chantier par chantier.**

---

## 1. Ce qui a été VÉRIFIÉ — les faits, avec leur source

Ces points ne sont pas des impressions : chacun a été lu dans le code ou mesuré à l'écran.

| Fait | Source |
|---|---|
| Le serveur accepte **quatre** types de message : `TEXT`, `PHOTO`, **`VOICE`**, **`DOCUMENT`** | `m06.dto.ts` l.80 |
| Notre écran web n'en envoie que **deux** : `TEXT` et `PHOTO` | `ConsultationPage.tsx` l.939, 971 |
| Le serveur accepte un **album de 10 photos** dans une seule bulle (`fileKeys`) | `m06.dto.ts` l.98-100 |
| `fileKeys` **n'est même pas déclaré** dans notre client web | `lib/api.ts` — absent |
| L'envoi de média accepte **images et audio uniquement** — **aucun format de document** | `m06.dto.ts` l.136 |
| ⚠️ Le DTO laisse passer **~84 Mo**, le stockage **refuse au-delà de 8 Mo** | `m06.dto.ts` l.135 vs `storage.service.ts` l.169 |
| Le serveur **ne pagine pas** les consultations : `take: 100`, sans curseur ni total | `m06.session.service.ts` l.668 |
| Annuler une ordonnance **ne dépend pas** de l'état de la séance, seulement de l'ordonnance | `m09.prescriptions` service, `cancel()` |
| Les réactions, la citation, l'édition et la double suppression **existent déjà** chez nous | `ConsultationPage.tsx` l.135, 204 |
| L'indicateur de frappe, les accusés à deux coches, `⏎`/`⇧⏎` **existent déjà** chez nous | idem |

**Conséquence :** l'essentiel de ce qui manque ne demande **aucun travail serveur**. C'est la
dixième occurrence du motif du projet — *la capacité existe, l'écran ne l'offre pas.*

---

## 2. Ce que les maquettes demandent, et ce qu'on en retient

### C5 — la consultation

| Dans la maquette | Chez nous | Décision |
|---|---|---|
| Titre = le **motif** (« Palpitations nocturnes ») | « Consultation » | ✅ **à prendre** — les symptômes sont déjà servis |
| Référence de séance au fil d'Ariane | absente | ✅ à prendre |
| **Honoraires** dans le rail | absents | ✅ à prendre |
| **Allergies** dans le contexte patient | absentes | ✅ à prendre — le garde-fou d'ordonnance les connaît déjà |
| Minuteur **encadré et étiqueté** | 20 px nu dans la ligne de titre | ✅ à prendre |
| Ligne d'ouverture du fil | absente | ✅ à prendre |
| Pièce jointe = carte (nom · taille) | photos seulement | ⚠️ voir §3 |
| **« Retenu pour le compte-rendu »** | retiré (écart n°3) | ⏳ demande le serveur — §5 |
| « Transférer au confrère » | absent | ❌ n'existe pas au serveur |
| « Délai réglementaire de 48 h » | **on dit 24 h** | ❌ la maquette est **fausse**, on ne la suit pas |
| Sexe du patient · « En cabinet » · identifiant patient · « Exporter » | absents | ❌ n'existent pas dans le produit |

### C4 — la liste

Notre écran est **déjà très proche** de la maquette (mêmes tuiles, mêmes onglets, mêmes colonnes),
et **meilleur sur deux points** : un bandeau d'alerte au lieu d'une pastille, et une phrase que la
maquette n'a pas — *« Vous n'avez aucune offre de suivi active. »*

Restent : le **nom** de la consultation (aujourd'hui `573DCCCB`), la **pagination**, et un
**menu d'actions par ligne**.

---

## 3. Ce que la messagerie SARIS apporte — et à quelles conditions

SARIS a une messagerie complète. Elle n'est **pas** transposable telle quelle : notre conversation
n'est pas une messagerie, c'est **une séance payée, unique, chronométrée, chiffrée, qui se
verrouille à la fin** (RM-06-03, RM-06-06).

### ✅ Ce qu'on prend

| De SARIS | Chez nous |
|---|---|
| `VoiceRecorder` — chrono, **onde d'amplitude**, envoi en **un seul geste**, corbeille pour annuler | les **notes vocales**, que notre serveur accepte déjà |
| `MediaPreview` — aperçu avant envoi, ajout multiple, légende, **compression d'image** | l'aperçu + l'album de 10 photos que le serveur accepte |
| Barre de **progression d'envoi**, abonnée **localement à la bulle** | idem — le fil ne se redessine pas à chaque tic |
| `EmojiPicker` — jeu Apple, **sprite local auto-hébergé**, recherche, catégories | le choix libre d'emoji à la saisie (nos réactions rapides existent déjà) |
| Rendu **géant** d'un message tout en emojis | idem |
| Lecteur audio **dans la bulle**, avec vitesse de lecture | pour écouter une note vocale sans quitter le fil |

⚠️ **Une contrainte technique à connaître :** le `VoiceRecorder` de SARIS produit du
`audio/webm;codecs=opus`. **Notre serveur ne l'accepte pas.** Il faudra forcer un format de sa
liste — `audio/ogg` ou `audio/mp4`. Vérifié, et sans conséquence : `MediaRecorder` sait produire
les deux.

### ❌ Ce qu'on ne prend pas

| De SARIS | Pourquoi |
|---|---|
| Groupes, `GroupInfoPanel`, quitter un groupe | une consultation, c'est **un** patient et **un** soignant |
| **Transférer un message** | il n'y a aucune autre conversation où l'envoyer — et sortir une donnée de santé de sa séance casse le modèle |
| Mettre en sourdine | on ne met pas en sourdine une séance de 30 minutes qu'on a payée |
| Suppression par lot | fils courts, contenu médical |
| Vidéo (16 Mo, rognage, `ffmpeg`) | notre API ne connaît pas la vidéo — et c'est un débat produit, pas un chantier d'écran |
| Mise en forme gras/italique | à décider : utile en messagerie d'entreprise, discutable dans un échange de soin |

---

## 4. Les chantiers

**Trois chantiers. Chacun se valide, se code, se commit et se pousse séparément.**
À chacun, sans exception : le **filet** (`npx vitest run`, seule) et `promesses-sans-filet.py`
**avant et après**, plus l'**injection de fautes** pour prouver que les tests mordent.

### Chantier A — ouvrir les portes que le serveur tient déjà ouvertes

> ✅ **FAIT — chantier 75, 11/09/2026.** Tout le contenu de ce chantier est livré, sauf les
> documents : `UploadSessionMediaDto` ne connaît que les images et l'audio, il n'existe donc
> aucun moyen d'obtenir la clé d'un document. Reversé au §5 comme dette serveur.

*Aucun travail serveur. Aucune migration.*

1. **Les notes vocales.** Enregistrement avec chrono et onde d'amplitude, **envoi en un seul
   geste**, corbeille pour annuler, plafond de durée. Lecture **dans la bulle**.
   *Format forcé sur `audio/ogg` ou `audio/mp4` — voir la contrainte au §3.*
2. **L'album de photos.** Jusqu'à 10 dans une bulle, ce que le serveur accepte et que le client ne
   sait même pas nommer.
3. **L'aperçu avant envoi**, avec **compression** des images.
4. ⚠️ **La limite de 8 Mo, annoncée AVANT l'envoi.** Aujourd'hui un fichier de 20 Mo part en entier
   et se fait refuser à l'arrivée — après avoir traversé le réseau. C'est un défaut, pas un confort.
5. **Le minuteur devient un instrument** : encadré, étiqueté, en chasse fixe.

### Chantier B — la consultation prend un nom, et le rail dit ce qui manque

> ✅ **FAIT — chantier 76, 11/09/2026**, avec **deux corrections à ce plan** :
> • les **allergies étaient déjà affichées** (panneau Carnet, distinct du contexte patient) —
>   l'analyse bloc à bloc des maquettes avait pris un rangement différent pour une absence ;
> • **nommer la ligne de C4 demande le serveur** : `SessionListItem` ne porte pas la
>   pré-consultation. Reversé au §5 comme dette.
> Le choix libre d'emoji (point 10) n'est pas fait : il demande une dépendance et un sprite
> auto-hébergé de plusieurs centaines de Ko. À décider séparément.

*Aucun travail serveur.*

6. **Le nom de la consultation** — son motif — dans le titre de C5, le fil d'Ariane, et la ligne de
   C4. Un seul changement qui répare **quatre endroits**.
7. **Les honoraires** dans le rail de C5.
8. **Les allergies** dans le contexte patient — elles existent, le garde-fou d'ordonnance les
   connaît, mais le médecin ne les voit pas pendant qu'il décide.
9. **La ligne d'ouverture du fil** et le rail présenté **en colonnes alignées** (libellé à gauche,
   valeur à droite en chasse fixe), comme la maquette.
10. **Le choix libre d'emoji** à la saisie, avec sprite local — sans CDN, hors-ligne.

### Chantier C — la liste, telle que le porteur la veut

> ✅ **FAIT — chantier 77, 11/09/2026.** Pagination et menu ⋯ livrés.
> ⚠️ Le point 13 (**avatar / prénom du patient dans la ligne**) n'est PAS fait : le fichier
> porte une décision écrite — *« aucune identité de patient n'est chargée ici »* — qui n'est
> pas à renverser au détour d'un chantier de forme. Remontée au porteur comme question de
> produit.

*Aucun travail serveur.*

11. **Tableau paginé**, côté écran, sur les 100 lignes que le serveur envoie.
    ⚠️ **La phrase du plafond reste** : au-delà de 100, les plus anciennes n'arrivent jamais.
    Paginer ne les fait pas revenir.
12. **Un menu ⋯ par ligne**, pour les gestes secondaires — tous **vérifiés comme existants** :
    *voir l'ordonnance* · *annuler l'ordonnance (avec motif)* · *signaler le patient*.
    Le geste principal reste **dehors et nommé** : **Déposer** ou **Ouvrir**.
13. **L'avatar du patient** dans la ligne.

### ⏳ Plus tard, et seulement sur décision du porteur

14. **« Retenu pour le compte-rendu ».** Le meilleur geste de la maquette C5, et SARIS prouve qu'il
    est simple. **Mais chez nous il demande une migration sur la table des messages** — la plus
    sensible du modèle, chiffrée au repos (RM-06-06). Ce n'est pas un refus : c'est une décision
    qui n'est pas à moi.
15. **Les documents (PDF).** Le type `DOCUMENT` est accepté par le message, mais **l'envoi de média
    refuse tout format de document**. Le patient ne peut donc pas transmettre un relevé — ce que la
    maquette montre pourtant. Demande une route serveur.

---

## 5. Les défauts trouvés en chemin

Ils ne sont pas du design. Ils sont notés ici pour ne pas être perdus.

| # | Défaut | Où |
|---|---|---|
| 1 | Le DTO accepte **~84 Mo**, le stockage refuse au-delà de **8 Mo**. Un envoi trop gros traverse le réseau **puis** échoue. Et le commentaire du DTO annonce « ≈ 80 Mo, cohérent avec StorageService » — **il est faux d'un facteur dix.** | `m06.dto.ts` l.134-135 |
| 2 | Le type `DOCUMENT` est accepté par le message, mais **aucun moyen d'obtenir la clé d'un document** : l'envoi de média ne connaît que l'image et l'audio. Un type mort. | `m06.dto.ts` l.80 vs l.136 |
| 3 | `fileKeys` (album de 10 photos) est servi par le serveur et **absent du client web**. | `lib/api.ts` |
| 4 | Le serveur coupe à **100 consultations** sans curseur. Au-delà, l'historique est inatteignable. | `m06.session.service.ts` l.668 |

---

## 6. Ma recommandation

**Commencer par le chantier A.**

C'est celui qui donne le plus pour le moins : il n'invente rien, il **ouvre des portes que le
serveur tient déjà ouvertes**, et il corrige au passage un défaut réel (la limite de 8 Mo annoncée
trop tard).

Et c'est celui qui change le produit, pas seulement l'écran : **un patient qui décrit sa douleur à
la voix, ou qui envoie trois photos d'une lésion en une fois, c'est une autre consultation.**
