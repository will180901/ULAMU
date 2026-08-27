# Alignement maquette ↔ cahier des charges

| Champ | Valeur |
|---|---|
| Ouvert le | 2026-08-25 |
| Raison | Reconstruction de B, C, E à partir de zéro. Avant de coder, aligner les deux sources. |
| Périmètre | Web uniquement (médecin + administrateur). Mobile = patients. Pharmacie écartée du MVP. |

---

## Règle d'arbitrage (tranchée le 25/08/2026)

> **La maquette décide de la FORME. Le cahier des charges décide des FAITS.**

- **Forme** — disposition, densité, composants, états, ton des textes, maître-détail, panneaux
  latéraux. La maquette fait autorité, sans discussion.
- **Faits** — les chiffres (PM-xx), les règles métier (RM-xx), ce qui existe côté serveur.
  Le cahier fait autorité. Une maquette qui écrit « 12 % » quand le contrat signé dit 10 %
  ne fait pas un choix de design : elle porte une erreur de donnée.

Cette règle remplace `04_ux_ui/README.md` §3 pour ce chantier — celle-ci donnait tout au cahier,
y compris la forme, ce qui n'est pas ce que le porteur veut.

---

## Famille 4 — Ce que la maquette OUBLIE

**Constat qui change tout : les 11 manques existent DÉJÀ côté serveur, codés et testés.**
Dix sur onze sont du travail d'interface pur. **Seul le point 11 demande du serveur** — deux petits
ajouts de lecture (~25 lignes), détaillés dans sa ligne et ci-dessous.

| # | Manque | Exigence | Route serveur (existe) | Décision | Écran |
|---|---|---|---|---|---|
| 1 | Prolongation gratuite de session | EF-06-07, PM-29 (+30 min max) | `POST /v1/care-sessions/:id/extend` | ✅ **VALIDÉ 25/08** — bouton « + 10 min », pas de 10 conformes au cahier (le serveur accepte tout entier ≥ 1 ; on s'en tient au cahier : 3 clics max, pas de saisie en pleine consultation). Crédit restant affiché, ligne dans le fil après usage. | C5 |
| 2 | Carnet du patient en session | EF-06-06, RM-06-05 (lecture seule, tracé) | `GET /v1/care-sessions/:id/record` et `/record/summary` | ✅ **VALIDÉ 25/08** — panneau latéral droit. Allergies / groupe sanguin / chroniques en tête, puis chronologie filtrable. Trois mentions imposées : « lecture seule », « votre consultation est enregistrée », « l'accès s'est refermé avec la consultation ». Le serveur ferme l'accès dès que le décompteur tombe à zéro : le compte-rendu tardif n'aura plus le Carnet. | C5 |
| 3 | Garde-fou allergies | EF-09-03 (alerte bloquante, passage outre motivé) | 409 `code: ALLERGY_GUARD` + `conflicts[]` sur `POST /v1/prescriptions/sessions/:id` | ✅ **VALIDÉ 25/08** — alerte rouge nommant médicament ET allergie, lien vers le Carnet, deux issues (retirer / prescrire avec motif obligatoire). Scellement bloqué tant qu'un conflit vit. Mention permanente : le contrôle ne porte que sur le référentiel, pas sur le texte libre (EF-09-02). Comparaison par inclusion de noms — utile, pas exhaustive : dit à l'écran. **Dépend entièrement de C7.** | C7 |
| 4 | Rédaction de l'ordonnance | EF-09-01, D-014 | `POST /v1/prescriptions/sessions/:sessionId` + `GET /v1/medicaments?q=` | ✅ **VALIDÉ 25/08** — écran neuf **C7**, en panneau depuis C5 (le médecin ne quitte pas le fil). Recherche au référentiel, repli texte libre marqué « non vérifié », posologie/durée/quantité par ligne, avertissement d'immuabilité avant scellement (RM-09-05), QR + expiration après. **Référentiel porté de 6 à ~60 médicaments courants (option B, validée porteur)** — sinon la démonstration tombe sur du vide. | C7 |
| 5 | Statut en ligne / absent | EF-05-05, EF-05-06, PM-26, RM-05-04 | `POST /v1/presence/state`, `/presence/heartbeat`, `GET /presence/me` | ✅ **VALIDÉ 25/08** — pastille + mot dans la barre du haut (3 états), battement de cœur toutes les 5 min tant que l'onglet vit. **À CONSTRUIRE EN PREMIER** : sans lui `isAvailableForInitiation` renvoie false, le bouton « initier » du patient reste gris, et AUCUNE démonstration n'est possible. | B1 |
| 6 | Plafond de 3 sessions simultanées | PM-27, EF-06-14 | compté en transaction sérialisable à l'initiation | ✅ **VALIDÉ 25/08** — affichage seul, aucune action. « 1 consultation sur 3 » discret ; à 3, la pastille passe à « Occupé » avec la raison. Aucun réglage côté médecin : PM-27 se change dans E3 par le super-admin. Sans cet affichage, le médecin croit à une panne quand les demandes cessent. | B1 |
| 7 | Notation laissée par le patient | EF-06-11, EF-05-01, EF-05-07 | `GET /v1/directory/:id` (publique) — moyenne, nombre, taux de confirmation, délai moyen, 10 derniers commentaires | ✅ **VALIDÉ 25/08** — bloc « Ce que les patients voient » dans C2 ; note par consultation dans C4. Délai traduit en langage humain. **Aucun moyen de répondre, masquer ou contester** : le cahier n'en prévoit pas, un avis abusif passe par un signalement M04. Le taux de confirmation est public et baisse si des demandes expirent (R-04) — dit à l'écran. | C2, C4 |
| 8 | Proposition de session de suivi | EF-06-12, D-016 | **automatique** : au dépôt du compte-rendu, le serveur cherche une offre FOLLOW_UP active et notifie le patient. Aucun geste du médecin. | ✅ **VALIDÉ 25/08** — **rien à construire**. Deux phrases seulement : dans C2, dire qu'une offre « suivi » déclenche la relance automatique ; dans C4, dire si la proposition est partie ou non (et pourquoi). Aucun bouton : il ferait doublon avec l'envoi serveur. Trouvé en lisant le code, invisible dans la maquette comme dans le cahier. | C2, C4 |
| 9 | Remboursement automatique | D-008, EF-06-09, invariant n°9 de la liste rouge | `refundRequired` = aucun message du pro ; auto-réparant, rejoué à chaque lecture + balayage | ✅ **VALIDÉ 25/08** — **rien de fonctionnel**, trois avertissements : C5 tant que le médecin n'a rien écrit (« vous ne percevrez rien »), C4 sur une consultation remboursée, C6 près du solde en attente. Limite assumée : un seul « Bonjour » annule le remboursement (risque documenté au cahier, garde-fou = notation + signalement). **On n'écrit pas cette limite à l'écran** — ce serait le mode d'emploi de la triche. | C5, C4, C6 |
| 10 | Procédures support | EF-16-03, CU-16-04 (exigence **MVP**) | 4 routes `/v1/admin/support-procedures` ; types `PHONE_CHANGE`, `OWNER_UNREACHABLE`, `RECORD_TRANSFER`, `OTHER` | ✅ **VALIDÉ 25/08** — dans **E7**, pas d'écran neuf (c'est là qu'on cherche le compte). Type en langage clair, étapes à cocher, justification obligatoire, liste des procédures ouvertes en tête. Phrase imposée : « cette procédure enregistre votre intervention, elle ne change rien par elle-même » (RM-16-01 : M16 guide et journalise, il n'agit pas). **Le moins spectaculaire des onze — retenu quand même : exigence MVP écrite, serveur prêt.** | E7 |
| 11 | Avenant au contrat | EF-03-07, CU-03-04, RM-03-05 | Changement de PM-01/PM-02 dans E3 → **ré-édition automatique** des contrats signés (lots de 500, `m16.parameters.service.ts:122`) + `POST /v1/admin/verification/:caseId/agreement/reissue`, idempotent. La version ré-éditeée est **non signée** → `canPractice` tombe à `false` | ✅ **VALIDÉ 25/08 — option complète (les deux écrans)**. Dans **C1** : le parcours de re-signature — bandeau « votre contrat a été modifié, vous ne pouvez plus exercer », ancien taux → nouveau côte à côte, texte relu, signature. Dans **E3** : le vrai compte **avant** de confirmer (« ce taux figure dans N contrats signés · les ré-éditer suspendra l'exercice de N soignants »), à la place de la case morale. **Seul point des onze qui demande du serveur** : ~15 lignes pour l'aperçu N dans E3, ~10 lignes pour exposer la dernière version signée dans `GET /v1/verification/me`, + 2 tests. Le « préavis 30 jours » de la maquette n'existe nulle part → famille 2. | E3 + C1 |

### Le point 4 mérite une explication

**Aucune maquette n'existe pour la rédaction d'ordonnance.** Ni dans les 24 fichiers livrés,
ni ailleurs. C'est le trou le plus grave du lot :

- C'est l'**étape 7** du parcours de soin (vision §2).
- Sans elle, le parcours 🅰 s'arrête au compte-rendu, et le parcours 🅱 — trouver son
  médicament — ne peut **jamais** démarrer, faute d'ordonnance à présenter.
- Le garde-fou allergies (point 3) n'a nulle part où vivre.

Cet écran est donc **créé de zéro**, dans le langage visuel des autres — ce que la règle 2 de
`04_ux_ui/README.md` prévoit explicitement pour les écrans manquants. Il est nommé **C7 —
Ordonnance**.

### Le point 11 mérite une explication

**Un clic dans E3 suspend l'exercice de tous les soignants vérifiés à la fois.** Vérifié route par
route le 25/08 :

- changer PM-01 déclenche la ré-édition de chaque contrat signé, par lots de 500
  (`m16.parameters.service.ts:122`) ;
- chaque ré-édition crée une version **non signée** (`m03.service.ts:668`) ;
- « peut exercer » vaut *dossier vérifié **et** version courante signée* (`m03.policies.ts:138`).

Trois portes se ferment alors en même temps : publier ou modifier une offre
(`m05.offers.service.ts:274`), recevoir une poignée de main (`m06.handshake.service.ts:137`), et
**encaisser une poignée déjà confirmée** (`m06.handshake.service.ts:416`). Le serveur notifie bien
le soignant (`m03.agreement.reissued`), mais **aucun écran web ne lui permet de re-signer** — alors
que la route existe : `POST /v1/verification/me/agreement/sign`.

C'est le seul scénario connu où la plateforme entière se bloque sur un geste légitime
d'administrateur. D'où la décision de faire les deux écrans.

### Écart de signature découvert au passage (C1)

**La maquette C1 fait signer avec une case à cocher et le nom tapé au clavier. Le serveur exige le
mot de passe **et** un code OTP d'action sensible** (`signStart` → `sign`, `m03.service.ts:697`).
Application de la règle d'arbitrage : c'est un **fait**, pas une forme. La signature — première
comme re-signature — suivra le serveur. La forme de l'écran reste celle de la maquette.

### Ce qui NE sera pas ajouté, et pourquoi

Rien. Les 11 sont retenus. Ils sont tous exigés par le cahier, tous déjà servis par l'API,
et aucun ne dépend de la branche pharmacie.

---

**Famille 4 close le 25/08/2026 : 11 points sur 11 tranchés.**

---

## Famille 1 — L'ARGENT (ouverte le 25/08/2026)

**Famille 1 close le 25/08/2026 : 6 points sur 6 tranchés.**

6 écarts. La maquette décrit une plateforme qui **paie ses soignants une fois par mois** ;
le cahier en décrit une qui **les laisse retirer quand ils veulent**. Ce n'est pas un chiffre
à corriger, c'est un modèle à choisir — d'où le point par point.

| # | Écart | Maquette | Cahier | Décision |
|---|---|---|---|---|
| 1 | Taux de commission | **12 %** (C1 ×3, C2 ×2, C6 ×4) | **10 %** — PM-01, D-022 | ✅ **VALIDÉ 25/08** — **on n'écrit plus le taux nulle part.** Le problème n'était pas que 12 soit faux, c'est qu'un taux soit écrit : le texte du contrat est **fabriqué et scellé sha256 par le serveur** (`m03.policies.ts:100`), et le taux appliqué à un paiement est celui du **contrat signé de ce bénéficiaire-là**, pas PM-01 (RM-13-07, `m13.payments.service.ts:504`) — deux médecins peuvent avoir deux taux en même temps. **C1** affiche `agreement.body` tel quel, la phrase d'acceptation prend `agreement.commissionPct`. **C2** calcule le net avec ce même taux. **C6** lit le journal, qui fait foi (EF-13-06). Coût : C1 et C2 = zéro serveur ; **C6 = ~20 lignes** — la vue portefeuille ne renvoie que le **net** (`EarningsEntry.amountXaf`), le brut et la commission vivent dans `PaymentSplit` (`grossXaf`/`commissionXaf`/`netXaf`) qu'elle ne joint pas. Jointure en **lecture seule**, sur des données déjà écrites |
| 2 | Rythme de versement | « Versement le **5 de chaque mois** » (C1, C6) | Retrait **à la demande**, exécuté < 24 h — EF-13-07, PM-36 (86 400 s) | ✅ **VALIDÉ 25/08** — **le mensuel disparaît.** C6 contenait déjà le bouton « Demander un retrait », le parcours de confirmation et une ligne « Retrait anticipé » : le mensuel n'était qu'un décor, sans écran ni route. **Aucune tâche planifiée n'existe côté serveur** (vérifié : ni cron ni lot) — le garder aurait voulu dire le construire, sur un hébergement gratuit qui s'endort à 15 min. Trois textes réécrits (C1 sous-titre, C6 état vide, C6 carte de solde → « Disponible au retrait, à tout moment », sans chiffre). Le **délai** et les **frais** s'annoncent dans le récapitulatif, avant de confirmer : les frais y sont déjà (`ulamuFeeXaf`, `netToReceiveXaf`), on ajoute le délai lu de PM-36 — **~3 lignes** |
| 3 | Retrait minimum | **5 000 XAF** (C6) | Aucun minimum n'existe | ✅ **VALIDÉ 25/08** — **supprimé.** Le serveur accepte tout entier strictement positif, à partir de 1 XAF (`m13.dto.ts:16`) ; le seul garde-fou est le solde, revérifié au débit. Raison décisive : le prix plancher d'une offre est **500 XAF** (PM-06), soit 450 net — un minimum à 5 000 imposerait **douze consultations avant le premier retrait**, et un bouton gris devant le jury. L'argument « l'opérateur l'impose » ne tient pas : la passerelle MoMo est simulée (`DevAggregatorGateway`). Coût : zéro — c'est une contrainte qu'on enlève. Si un vrai opérateur en impose un jour un, ce sera un paramètre PM lu du serveur, jamais un chiffre dans la page |
| 4 | Double validation | > **100 000 XAF** (E2, `const SEUIL_DOUBLE = 100000`) | **50 000 XAF** — PM-35, D-037 | ✅ **VALIDÉ 25/08** — **l'écran ne calcule plus la règle, il lit le serveur.** La règle de la maquette était juste (deux admins distincts, pas d'auto-validation, pas de double validation par le même) : c'est RM-13-06, et c'est ce que fait `m13.manual-refunds.service.ts:97`. Seul le nombre était faux — et l'écran n'a aucune raison de le connaître : le serveur pose déjà le statut `PENDING_SECOND_APPROVAL` à la demande. La phrase d'explication lit **PM-35** via `GET /v1/admin/parameters` (route admin existante, E2 est un écran admin) — E2 suit donc E3 tout seul. Coût : **zéro ligne de serveur** |
| 5 | Délai de remboursement | « Décision de remboursement · limite **15 j** · médiane 6 j · tenue 100 % » (E5) | Automatique **< 1 min** — EF-13-04, PM-12. Pour le remboursement **manuel**, le cahier ne fixe **aucun délai** | ✅ **VALIDÉ 25/08** — trois défauts trouvés, pas un : (a) 15 j est faux d'un facteur ~20 000 pour l'automatique ; (b) la ligne parle en fait du remboursement **manuel**, dont aucune échéance n'existe au cahier — chiffre **inventé**, pas erroné ; (c) **médiane, hors-délai et taux de tenue ne sont mesurés nulle part** : le serveur n'expose que 7 indicateurs (`m16.kpi.service.ts:37`), aucun ne mesure un délai de traitement. **Décision :** la ligne disparaît, remplacée par l'indicateur qui existe — **« Taux de remboursement automatique »** avec sa cible. Là où le délai se dit en toutes lettres, on reprend la formule du cahier : immédiat côté ULAMU, **délai opérateur annoncé à part** (EF-13-04 exige cette honnêteté). Coût : **zéro serveur**. → report en famille 3 : le reste du tableau « tenue des engagements » |
| 6 | Compte de versement | « Configurer mon **compte de versement** », présenté comme un compte MoMo vérifié distinct (C6) | N'existe pas — `startWithdrawal` envoie au **téléphone du compte** (`m13.earnings.service.ts:142`) | ✅ **VALIDÉ 25/08** — le bouton disparaît, remplacé par la vérité : « vos gains sont envoyés au numéro de votre compte · pour en changer, passez par Mes paramètres ». Le numéro vient de `GET /v1/accounts/me`. **La vérification existe déjà**, au bon endroit : `POST /v1/accounts/me/phone-change/start` + `/confirm`, code envoyé sur le nouveau numéro (→ B3). Ce que le médecin choisit réellement, c'est l'**opérateur** (MTN/Airtel), au moment du retrait : ça, la maquette a raison de le proposer, on le garde. Coût : **zéro serveur**. Le plus trompeur des six : croire à un compte séparé, c'est ignorer que son numéro personnel est engagé |

---

## Famille 2 — LES DÉLAIS (ouverte le 25/08/2026)

**Famille 2 close le 25/08/2026 : 5 points sur 5 tranchés.**

5 écarts. Ici les chiffres ne trompent pas seulement : **certains coûtent de l'argent au soignant.**

| # | Écart | Maquette | Cahier / serveur | Décision |
|---|---|---|---|---|
| 1 | Dépôt du compte-rendu | **48 h** (C4, C5) | **24 h** — PM-30 (86 400 s). Au-delà, le dépôt est **refusé**, pas toléré : `ConflictException` « gains gelés » (`m06.report.service.ts:60`), et RM-06-04 ne crédite qu'au dépôt | ✅ **VALIDÉ 25/08** — **échéance calculée par le serveur.** Le pire écart rencontré : les autres trompent, celui-ci **coûte les honoraires**. Un médecin qui lit 48 h et dépose à la 30e heure perd tout, et notre écran en est la cause. L'écran ne peut pas calculer l'échéance : il reçoit `endedAt` mais **PM-30 ne lui est pas accessible** (lecture des paramètres = admin seulement) — il ne pourrait qu'écrire un chiffre en dur, ce qui a produit le 48 h. **Décision :** ajouter **`reportDueAt`** à la vue des consultations (**~5 lignes**, le service lit déjà PM-30 dans ce fichier). C4/C5 affichent un vrai décompte, suivent PM-30 si E3 le change, et ne portent aucun chiffre. À noter : le serveur relance déjà à **12 h et 23 h**, en notifications `critical` donc non désactivables (RM-14-02) |
| 2 | Compte à rebours des demandes | **12 h** (43 200 s, écrit en clair dans C3) | **5 minutes** — PM-07 = `300` | ✅ **VALIDÉ 25/08** — ce n'est pas un chiffre, **c'est le produit** : 12 h transforme la poignée de main en **rendez-vous**, ce qu'ULAMU supprime (D-006, D-007). 5 min veut dire « le médecin est là maintenant, ou la demande part ailleurs » — et c'est pourquoi la **présence** (famille 4, point 5) est le premier chantier. **La forme de la maquette est excellente et intégralement conservée** : anneau qui décrémente à la seconde, bascules de couleur. **Seuils redéfinis (validé porteur) : ambre à 2 min, rouge à 1 min** — « 2 h / 30 min » n'a aucun sens sur 300 s. Coût : **zéro serveur** — `windowExpiresAt` est déjà servi, commenté « fin de la fenêtre PM-07 courante, compte à rebours CU-06-01 » (`m06.handshake.service.ts:58`). L'écran affiche une échéance reçue, il ne calcule rien |
| 3 | Réponse de l'administration | « L'administration ULAMU répond sous **24 heures ouvrées**, du lundi au vendredi » (C1) | **Aucune messagerie support n'existe** — ni module, ni route, ni écran ; les « procédures support » de M16 sont un outil **d'administrateur** (E7), pas une boîte où un médecin écrit. RM-06-03 interdit toute messagerie hors session active | ✅ **VALIDÉ 25/08** — **la phrase disparaît.** Elle promettait un délai de réponse **sans qu'aucun bouton ne permette de poser la question**. On garde ce qui est vrai et qui répond à la vraie inquiétude : le dossier est traité sous **72 h** (PM-11), rien n'est attendu du médecin, il est notifié à la décision. « Remonte en tête de file » est vrai — la file est simplement traitée du plus ancien au plus récent (`m03.service.ts:527`). **Corollaire : « ouvrées » est retiré** — le serveur compte des heures pleines, le code dit lui-même que les heures ouvrées « seront affinées » (`m03.policies.ts:88`) ; un dossier déposé vendredi soir est en retard **lundi** côté serveur, pas mercredi. Coût : **zéro serveur** |
| 4 | Écart financier | « Un écart **non instruit sous 7 jours** est signalé au porteur » (E2) | Rapprochement **quotidien** (EF-13-09) ; l'alerte part **immédiatement**, dans la même transaction que l'audit (`m13.reconciliation.service.ts:118`) — T-05 annonçait < 24 h | ✅ **VALIDÉ 25/08** — 7 jours est **~40 fois plus lent que la réalité**, et donne une image molle d'un mécanisme strict. Surtout : **la notion d'écart « instruit » n'existe pas** — ni table, ni statut, ni cycle de vie ; le rapprochement calcule un rapport, alerte, journalise, et rien ne reste à cocher. « Signalé au porteur » désigne en plus un destinataire inexistant : l'alerte va aux **administrateurs Finance**. **Décision :** phrase remplacée par la vérité, et E2 affiche le rapport lui-même (manquant en base / manquant chez l'agrégateur / montants divergents) via un bouton « Lancer le rapprochement » → `POST /v1/admin/finance/reconcile`, qui existe. Coût : **zéro serveur**. Limite assumée : la route **déclenche**, elle ne relit pas le dernier rapport — affichage après clic, pas au chargement (le stocker demanderait une table + une écriture dans la tâche quotidienne). Choisi aussi parce que cliquer devant le jury *montre* le rapprochement |
| 5 | Préavis sur changement de taux | « Un préavis de **30 jours** leur est légalement dû avant toute application » (E3) | « Notifié à l'avance », **sans chiffre** (EF-03-07). Et le serveur **refuse** une date d'effet future : « différé non géré au MVP… le différé arrive en V1 » (`m16.parameters.service.ts:76`) | ✅ **VALIDÉ 25/08** — le différé n'est pas absent, il est **activement rejeté**, et le code dit pourquoi : « pour ne pas mentir sur le contrat ». Un écran qui promet 30 jours proposerait un geste que le serveur refuse par une erreur. **Décision :** la phrase cède la place à celle déjà arrêtée au **point 11 de la famille 4** — « ce taux figure dans N contrats signés ; le changement s'applique immédiatement : les N contrats seront ré-édités et notifiés dans la foulée, et chaque soignant devra re-signer avant de reprendre son activité ». Une seule phrase remplace la case morale **et** le faux préavis. Coût supplémentaire : **aucun** (déjà compté au point 11) |

---

## Famille 3 — CONCEPTS INEXISTANTS (ouverte le 25/08/2026)

**17 écarts** : les 15 relevés à l'extraction, plus deux ajoutés en traitant les familles 1 et 2.
**Traités par groupes de même racine (validé porteur)** — plusieurs écarts ne sont qu'une seule
décision répétée ; le détail écart par écart reste écrit ici.

### Le fait qui commande le groupe A

Le glossaire du cahier (`01_architecture_fonctionnelle/glossaire.md` §2) a une colonne
**« Ne pas dire »**, et elle proscrit nommément le vocabulaire de la maquette :

| Terme juste | Ne pas dire |
|---|---|
| Offre de consultation | tarif, **créneau** |
| Initiation | **demande**, requête |
| Session | conversation, chat, **rendez-vous** |
| Décompteur | timer, **compte à rebours** |

Dans tout le cahier, « rendez-vous » n'apparaît **qu'une fois** — dans cette colonne. Et « agenda »
une seule fois aussi, pour décrire l'agenda **réel** d'un médecin dans son portrait, jamais une
fonction. La maquette parle la langue d'une **autre médecine**.

### Groupe A — le vocabulaire du rendez-vous (4 écarts) ✅ **VALIDÉ 25/08**

| Écran | Maquette | Réalité vérifiée | Remplaçant |
|---|---|---|---|
| B1 | « **Clinique de Bacongo** · Brazzaville » | **Aucune clinique n'existe** : `FacilityType` ne vaut que `PHARMACY` ou `LABORATORY` (`schema.prisma:247`). Un médecin n'est rattachable à rien | — |
| B1 | « **6 rendez-vous** · 2 en téléconsultation » | Aucun objet rendez-vous, nulle part | La **pastille de présence** (famille 4, pt 5) et le **« 1 consultation sur 3 »** (pt 6) — déjà validés : *ce qu'on enlève libère la place de ce qui manquait* |
| C3 | « **Créneau proposé** » | Aucune planification dans M06 ; « créneau » est proscrit | L'**offre** elle-même : durée + prix, ce que le patient a choisi |
| C2 | « **Lieux de consultation** » — cabinet, adresse, horaires | La fiche pro porte **un seul champ géographique** : `district` (`schema.prisma:126`), exactement ce qu'autorise EF-05-01 | L'**arrondissement**, déjà servi par l'annuaire |

**Coût : zéro ligne de serveur, pour les quatre.**

Réserves inscrites : « 2 en téléconsultation » relève du **groupe B**. Et **C3 garde son titre
« Demandes »** malgré le glossaire : celui-ci vise la précision entre nous, « Initiations » serait
du jargon pour un médecin pressé — la forme reste à la maquette (arbitrage porteur).

### Groupe B — ce que la plateforme n'est pas (3 écarts) ✅ **VALIDÉ 25/08**

| Écran | Maquette | Réalité vérifiée |
|---|---|---|
| C2 | « Téléconsultation » à **activer** | *« Pas de consultation vidéo/audio en direct au démarrage : la messagerie est le seul portail »* (`vision.md:64`). L'interrupteur **n'a pas de position éteinte** — éteint, il ne reste rien |
| C2 | « Langues de consultation » | **Français uniquement** — D-005, PM-15 |
| B3 | « Langue de l'interface » **FR / EN** | Idem, et **aucune chaîne n'est externalisée** côté web : le bouton « English » n'aurait rien traduit |

**Et l'écart caché derrière l'interrupteur** : C2 écrit *« au moins un lieu ou la téléconsultation
est requis pour publier »*. Cette règle n'existe pas. **La vraie est RM-03-01** — badge vérifié
**et** contrat signé — et c'est elle que le serveur applique à la publication d'une offre
(`m05.offers.service.ts:274`). Correction **utile** : un médecin bloqué cherchait un cabinet à
saisir ; il lira désormais la vraie raison — et si son contrat vient d'être ré-édité (point 11),
qu'il doit re-signer. **Coût : zéro serveur.**

> **⚠️ Point de vigilance pour la reconstruction de B3 (hors liste, non arbitré).**
> La maquette B3 affirme que les données sont « **hébergées au Congo-Brazzaville** ». C'est **faux** :
> `render.yaml` déclare `region: frankfurt` et la base Neon vit en `eu-central-1` — tout est en
> Allemagne. Ce texte est accepté à l'inscription, il vaut donc **preuve**. Une session précédente
> l'avait corrigé dans le code aujourd'hui refusé ; **en reconstruisant B3 depuis la maquette, la
> phrase fausse revient toute seule.**

### Groupe C — vie privée et périmètre du médecin (3 écarts) ✅ **VALIDÉ 25/08**

**Le seul groupe où la maquette ne se trompe pas : elle propose de franchir une ligne.**

| Écran | Maquette | La règle | Remplaçant retenu |
|---|---|---|---|
| C3 | « **Message du patient** » au stade de la demande | **RM-06-03** : aucun message hors session active. **EF-06-04** : la pré-consultation se remplit **après paiement**. **EF-06-01** : « fiche anonymisée (prénom, âge — **pas plus avant paiement**) » | Prénom, âge, et l'offre choisie. Rien d'autre. **Donnée interdite, pas donnée manquante** |
| B1 | « **Rechercher un patient**, une ordonnance… » (barre globale) | Chercher à l'échelle de la plateforme donnerait accès à des patients sans session ; or le serveur **referme** l'accès au Carnet dès que le décompteur tombe à zéro (famille 4, pt 2) | La barre **reste**, sa **portée** change : les consultations et ordonnances **du médecin lui-même** |
| C4 | « **Suivi en officine** » | Branche pharmacie hors périmètre — le bloc resterait vide à jamais | Le **statut de l'ordonnance** : `GET /v1/prescriptions/prescribed` renvoie `ACTIVE` / `EXPIRED` / `CANCELLED`. Le médecin voit si son ordonnance court encore (PM-10, 30 j). À dire : `DISPENSED` et `PARTIALLY_DISPENSED` existent au modèle mais ne seront jamais atteints tant que l'officine est écartée |

**Coût : zéro ligne de serveur pour les trois.**

### Groupe D — les pouvoirs d'administrateur (3 écarts) ✅ **VALIDÉ 25/08**

> **⚠️ Correction d'un constat de l'extraction.** La liste de départ affirmait que « créer un
> administrateur » n'existait pas et que la maquette « se contredisait toute seule ».
> **C'est faux : la route existe.** `POST /v1/admin/admins` crée un compte administrateur complet
> en une transaction (`m02.service.ts:517`), réservée au SUPER_ADMIN.

| Écran | Maquette | Réalité vérifiée | Décision |
|---|---|---|---|
| E4 | « Créer un administrateur » — **nom + téléphone** | La route existe, mais le serveur exige **nom d'utilisateur + mot de passe** : le super-admin **choisirait le mot de passe d'autrui** — ce que **E7 interdit dans sa propre phrase** (« un compte ne peut être créé que par son titulaire »). Seconde route alignée sur EF-02-08 : `POST /v1/admin/admins/:accountId/role` | **Validé :** l'action principale devient **« attribuer un rôle à un compte existant »** ; la création reste **en second**, réservée au super-admin, avec ses **vrais champs** et une phrase honnête sur le mot de passe provisoire |
| E7 | « **Durée de la suspension** » : 7 / 15 / 30 j, échéance affichée | `AccountSanction` n'a **aucun champ de durée** (`schema.prisma:1358`) : type, motif, demandeur, approbateur, statut, dates. Une suspension dure **jusqu'à réactivation** par un administrateur | **Validé :** sélecteur retiré. « Suspension jusqu'à réactivation, motif obligatoire ». Un sélecteur promettrait une libération automatique qui n'arrive jamais |
| B1, C4, E2, E5, E7 | Boutons « **Exporter** » un peu partout | EF-04-04 ne prévoit l'export que pour le **journal d'audit** — et il existe : `GET /v1/admin/audit/export.csv`, plafonné à 5 000 lignes, **lui-même audité**. Le code déclare l'**export PDF hors MVP** | **Validé :** tous retirés, sauf sur le journal d'audit, **en CSV uniquement** |

**Coût : zéro ligne de serveur pour les trois.**

### Groupe E — les chiffres que personne ne mesure (3 écarts) ✅ **VALIDÉ 25/08**

**Le seul groupe qui coûte du serveur.**

| Écran | Maquette | Réalité vérifiée | Décision |
|---|---|---|---|
| E5 | « **Couverture par arrondissement** » — 6 arrondissements, effectifs **écrits en dur** (Bacongo 78, Poto-Poto 64…), et « moins d'un soignant pour **8 000 habitants** » | Deux choses distinctes : les **effectifs sont calculables** (chaque fiche pro et chaque structure portent leur `district`) ; la **population ne l'est pas** — aucune donnée de recensement, et ULAMU n'a aucune raison d'en détenir | **Validé :** le bloc **reste**, alimenté par un vrai regroupement par arrondissement (soignants vérifiés + structures). La phrase sur les habitants **disparaît**. **Coût : ~20 lignes + un test** — seul coût serveur de la famille 3. Retenu parce que c'est **la seule dimension territoriale du produit**, sur un sujet d'accès aux soins |
| E5 | Tableau « **tenue des engagements** » : limite / médiane / hors délai / taux de tenue (écart n°16) | Aucune de ces colonnes n'est mesurée. **Mais une ligne peut devenir vraie gratuitement** : la file de vérification calcule déjà `overdue` par dossier, avec deux seuils (PM-11 et 2×PM-11) — `m03.service.ts:547` | **Validé :** le tableau garde **deux lignes vraies** — *dossiers en retard en ce moment* (compte réel) et *taux de remboursement automatique* (décidé en famille 1, pt 5). Les colonnes inventées partent. **Coût : zéro** |
| C3 | « **Trois expirations consécutives** suspendent… » (écart n°17) | Les sanctions par accumulation existent mais **ne visent que les pharmacies** (EF-12-07, 3 en 30 j). Aucune suspension de médecin sur expiration | **Validé :** phrase remplacée par la vraie conséquence, déjà tranchée en famille 4 (pt 7) — le **taux de confirmation public baisse**, visible des patients. **Coût : zéro** |

### Groupe F — l'épinglage (1 écart) ✅ **VALIDÉ 25/08**

| Écran | Maquette | Réalité vérifiée | Décision |
|---|---|---|---|
| C5 | « **Retenu pour le compte-rendu** » — épinglage de messages, avec compteur | `SessionMessage` (`schema.prisma:663`) porte réponses citées, réactions, édition et suppression ≤ 15 min, masquage individuel — **aucun épinglage**. Mais `listMessages` (`m06.session.service.ts:516`) n'exige que d'être **participant**, **sans contrainte de temps** : le fil reste entièrement relisible pendant les 24 h de rédaction — **contrairement au Carnet, qui se referme à la clôture** | **Validé :** épinglage retiré, le compte-rendu se rédige **à côté du fil**. Le médecin perd du défilement, pas de l'information. **Coût : zéro**. Écarté : le construire toucherait la table du **contenu médical**, la plus sensible du modèle (RM-06-06) — trop de risque pour un confort de défilement |

### Groupe G — trouvé en OUVRANT la maquette (1 écart, ajouté le 27/08) ✅ **VALIDÉ 27/08**

> **Comment il a été trouvé, et pourquoi ça compte.** Les 17 premiers écarts viennent d'une analyse
> **textuelle** des maquettes. Le 27/08, en appliquant la règle n°1 du nouveau plan — *afficher la
> maquette avant de coder* — un 18ᵉ est apparu en dix minutes sur le **premier** écran ouvert.
> Il ne pouvait pas ressortir d'un `grep` : c'est un **titre d'infobulle**, pas une phrase visible.
> **Les écrans restants sont donc à rouvrir un par un, avant leur chantier.**

| Écran | Maquette | Réalité vérifiée | Décision |
|---|---|---|---|
| B1 | Bouton de 68 px dans la barre du haut, `title="Rideau de confidentialité"` | **Zéro occurrence dans les 40 fichiers du cahier.** Ni « rideau », ni masquage d'écran, ni mise en veille de discrétion. Présent en Bureau et Tablette, **absent en Mobile** | ✅ **VALIDÉ 27/08 — on le garde.** Masque d'un geste les données patient quand le médecin s'écarte de son écran. **Pur navigateur, zéro serveur, rien de stocké.** Application de la règle d'arbitrage : ce n'est pas un **fait** (aucun PM, aucune règle serveur) mais une **forme** — la maquette décide. Écarté : le déclencher aussi après inactivité, qui obligerait à **inventer un délai** que le cahier ne donne pas |

**Au passage, vérifié sur le même écran :** la cloche « Notifications (3 non lues) » est **réelle** —
`GET /v1/notifications/me/unread-count` et `GET /v1/notifications/me` existent (M14).

---

**Famille 3 close le 25/08/2026 : 17 écarts sur 17, en 6 groupes.**
Coût serveur total de la famille : **~20 lignes** (les effectifs par arrondissement, groupe E).

**Rouverte le 27/08 pour un 18ᵉ écart** (groupe G), trouvé en affichant la maquette B1. **Total général : 40 écarts.**

---

## Journal des arbitrages

| Date | Objet | Décision |
|---|---|---|
| 25/08/2026 | Règle d'arbitrage générale | Maquette = forme, cahier = faits |
| 25/08/2026 | Famille 4 — les 11 manques | Tous retenus ; C7 Ordonnance créé de zéro |
| 25/08/2026 | Point 1 — prolongation | Validé porteur : pas de 10 min, plafond 30 min affiché |
| 25/08/2026 | Point 10 — procédures support | Validé porteur : intégré à E7, pas d'écran neuf |
| 25/08/2026 | Point 9 — remboursement automatique | Validé porteur : avertir AVANT la perte, pas expliquer après |
| 25/08/2026 | Point 8 — proposition de suivi | Validé porteur : rien à construire, deux phrases explicatives |
| 25/08/2026 | Point 7 — notation | Validé porteur : lecture seule, aucune réponse possible aux avis |
| 25/08/2026 | Point 6 — plafond 3 sessions | Validé porteur : affichage seul, pastille « Occupé » |
| 25/08/2026 | Point 5 — présence | Validé porteur : 3 états + battement de cœur. Premier chantier de la reconstruction |
| 25/08/2026 | Point 4 — C7 Ordonnance | Validé porteur : écran neuf + référentiel élargi à ~60 (option B) |
| 25/08/2026 | Point 3 — garde-fou allergies | Validé porteur : bloquant, motif obligatoire, limites annoncées |
| 25/08/2026 | Famille 3 — méthode | Validé porteur : traitée par groupes de même racine, six décisions au lieu de dix-sept |
| **27/08/2026** | **Famille 3, groupe G — rideau de confidentialité (B1)** | Validé porteur : **retenu**. Absent du cahier, mais c'est une forme, pas un fait. Trouvé en **ouvrant** la maquette — invisible au `grep` |
| 25/08/2026 | Famille 3, groupe F — épinglage | Validé porteur : retiré ; le fil reste relisible 24 h, le compte-rendu se rédige à côté |
| 25/08/2026 | Famille 3, groupe E — chiffres non mesurés | Validé porteur : effectifs réels par arrondissement (~20 l.), population retirée, deux lignes vraies dans E5 |
| 25/08/2026 | Famille 3, groupe D — pouvoirs d'admin | Validé porteur : rôle d'abord et création en second ; pas de durée de suspension ; export CSV du seul journal d'audit |
| 25/08/2026 | Famille 3, groupe C — vie privée | Validé porteur : fiche anonymisée, recherche recentrée sur ses propres dossiers, statut d'ordonnance |
| 25/08/2026 | Famille 3, groupe B — téléconsultation et langues | Validé porteur : les trois retirés ; C2 dit la vraie règle de publication (RM-03-01) |
| 25/08/2026 | Famille 3, groupe A — vocabulaire du rendez-vous | Validé porteur : les quatre disparaissent ; C3 garde son titre « Demandes » |
| 25/08/2026 | Famille 2, point 5 — préavis de taux | Validé porteur : application immédiate dite comme telle, fondue dans la phrase du point 11 |
| 25/08/2026 | Famille 2, point 4 — écarts financiers | Validé porteur : alerte immédiate dite comme telle, rapport affiché à la demande |
| 25/08/2026 | Famille 2, point 3 — réponse admin | Validé porteur : promesse des 24 h supprimée, 72 h conservées sans « ouvrées » |
| 25/08/2026 | Famille 2, point 2 — rebours des demandes | Validé porteur : 5 min via `windowExpiresAt` ; anneau conservé, ambre 2 min / rouge 1 min |
| 25/08/2026 | Famille 2, point 1 — compte-rendu | Validé porteur : `reportDueAt` servi par le serveur, décompte réel dans C4/C5 |
| 25/08/2026 | Famille 1, point 6 — compte de versement | Validé porteur : pas de compte séparé, on affiche le numéro du compte et on renvoie vers B3 |
| 25/08/2026 | Famille 1, point 5 — délai de remboursement | Validé porteur : la ligne inventée cède la place au taux de remboursement automatique |
| 25/08/2026 | Famille 1, point 4 — seuil E2 | Validé porteur : l'écran lit le statut du serveur et PM-35, il ne calcule plus |
| 25/08/2026 | Famille 1, point 3 — retrait minimum | Validé porteur : supprimé, aucun plancher |
| 25/08/2026 | Famille 1, point 2 — versements | Validé porteur : plus de versement mensuel, retrait à la demande ; délai et frais annoncés par le serveur |
| 25/08/2026 | Famille 1, point 1 — commission | Validé porteur : aucun taux écrit dans le code, on lit le contrat ; C6 détaille brut/commission/net |
| 25/08/2026 | Point 11 — avenant au contrat | Validé porteur : option complète — re-signature dans C1 **et** compte réel dans E3 |
| 25/08/2026 | Signature du contrat (C1) | Mot de passe + OTP, comme le serveur — pas la case à cocher de la maquette |
| 25/08/2026 | Point 2 — Carnet en session | Validé porteur : panneau latéral, lecture seule, accès tracé et refermé à la clôture |
