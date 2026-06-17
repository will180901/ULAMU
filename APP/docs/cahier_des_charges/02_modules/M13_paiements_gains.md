# MODULE M13 — Paiements & Gains

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-037 |
| Release | MVP — Chantier 2 |
| Domaine | D7 Argent |
| Dépendances | M01 |

---

## 1. Mission et périmètre

L'infrastructure financière, **aveugle au métier** : elle exécute des ordres référencés (encaisser, capturer, rembourser, retirer) sans jamais savoir ce qu'est une session ou un dévoilement (C1, [[../01_architecture_fonctionnelle/carte_domaines|carte des domaines]] règle 3). Tout passe par l'**agrégateur Mobile Money agréé** ([[../00_cadrage/cadre_reglementaire|cadre réglementaire]] §6).

**Hors-périmètre explicite :**
- Décider *quand* payer, rembourser, créditer → M06, M12 (eux donnent les ordres)
- Les taux et leurs contrats → M03 (M13 les lit)
- La supervision financière → M16 (M13 lui expose les données)

## 2. Acteurs

| Acteur | Usage |
|---|---|
| Patient | Confirme ses paiements sur son téléphone (MoMo), consulte ses reçus |
| Professionnel / Titulaire | Consulte gains et mouvements, retire vers son MoMo |
| Admin Finance | Supervise, traite les litiges, valide les gros remboursements |
| Le Système | Exécute, réconcilie, alerte |

## 3. Exigences fonctionnelles

| ID | Exigence |
|---|---|
| EF-13-01 | **Encaissement (C1)** : sur ordre référencé (référence opaque, montant, payeur) → initiation MoMo (MTN / Airtel) → le patient confirme sur son téléphone → statut retourné au module demandeur. |
| EF-13-02 | **Répartition** : calculée au taux du contrat en vigueur du bénéficiaire (M03) — part professionnel/structure + commission ULAMU (PM-01). Dévoilements : 100 % ULAMU (PM-03). |
| EF-13-03 | **Capture différée** : les fonds d'une session restent « en attente » jusqu'à l'ordre de crédit (compte-rendu déposé, RM-06-04) — alors seulement le CompteGains est crédité. |
| EF-13-04 | **Remboursements automatiques** sur ordre référencé (D-008, garanties M06/M12) — vers le moyen de paiement d'origine, en < 1 min côté ULAMU (le délai opérateur s'affiche honnêtement). |
| EF-13-05 | **Reçu numérique systématique** (D-010) : numéroté, horodaté, consultable et exportable à vie. |
| EF-13-06 | **CompteGains** : solde **disponible** / **en attente**, journal MouvementGains complet — jamais de solde modifié sans mouvement. |
| EF-13-07 | **Retrait** : vers le MoMo du titulaire du compte, **0 % ULAMU** (PM-02), frais opérateur réels affichés **avant** confirmation (mot de passe + OTP). Exécution < PM-36 ❓. |
| EF-13-08 | **Échecs** : paiement échoué → nouvel essai guidé (dans la fenêtre PM-07 pour les sessions) ; retrait échoué → re-crédit automatique + alerte. |
| EF-13-09 | **Réconciliation quotidienne** avec l'agrégateur : chaque franc rapproché ; tout écart déclenche une alerte Admin Finance. Toute transaction traçable en < 1 min (ENF-08). |
| EF-13-10 | **Remboursements manuels** (litiges, via M16) : par l'Admin Finance, **double validation** au-delà de PM-35 ❓. |

## 4. Cas d'utilisation

### CU-13-01 — Encaisser (transversal)
- *Étant donné* un ordre C1 « encaisse 5 000 XAF, réf. R, payeur P », *alors* P reçoit la demande MoMo sur son téléphone ; *quand* il confirme avec son code opérateur, *alors* statut « réussi », reçu émis, répartition calculée, part professionnel placée « en attente ».
- *Étant donné* un refus ou délai opérateur dépassé, *alors* statut « échoué » retourné — le module demandeur décide de la suite (retry, expiration).

### CU-13-02 — Capturer après compte-rendu
- *Étant donné* l'ordre de crédit (M06), *alors* mouvement « crédit » au CompteGains, solde disponible mis à jour, professionnel notifié (« +4 500 XAF — session du 10/06 »).

### CU-13-03 — Rembourser automatiquement
- *Étant donné* un ordre de remboursement référencé, *alors* exécution immédiate, reçu d'annulation, notification au patient avec motif, audit C5. Si la part était déjà créditée (litige tardif), le CompteGains est débité en miroir.

### CU-13-04 — Retirer ses gains
- *Étant donné* un solde disponible de 47 000 XAF, *quand* le titulaire demande 40 000, *alors* écran récapitulatif (« frais opérateur : X — vous recevrez Y »), confirmation mot de passe + OTP, exécution, mouvement tracé.
- *Étant donné* un échec opérateur, *alors* re-crédit automatique intégral + alerte — l'argent ne disparaît jamais entre deux systèmes.

### CU-13-05 — Réconcilier (quotidien)
- *Étant donné* le rapport agrégateur du jour, *alors* rapprochement automatique ; *étant donné* un écart, *alors* alerte Admin Finance avec les références en cause — aucun écart ne vieillit plus de 24 h.

## 5. Données du module

**Référencées :** Paiement, Repartition, Recu, CompteGains, MouvementGains, Retrait ([[../01_architecture_fonctionnelle/modele_donnees_global|dictionnaire]] §D7).

**Propres au module :**
| Entité | Attributs clés | Règles |
|---|---|---|
| OrdreFinancier | référence opaque, type (encaisser / capturer / rembourser / retirer), statut, horodatages | **Idempotent** : une référence ne s'exécute qu'une fois |
| RapprochementAgregateur | date, transactions rapprochées, écarts | Quotidien, alertant |

## 6. Règles métier

| ID | Règle |
|---|---|
| RM-13-01 | **L'Argent est aveugle** : aucune entité métier référencée — uniquement des références opaques (C1). |
| RM-13-02 | Aucun solde ne change sans MouvementGains correspondant — le journal est la vérité. |
| RM-13-03 | ULAMU ne détient pas les fonds en propre : tout transite par l'agrégateur agréé (montage exact en Phase 3 avec l'avocat). |
| RM-13-04 | **Idempotence absolue** : le même ordre rejoué (réseau instable) ne débite jamais deux fois. |
| RM-13-05 | Tout flux financier émet un événement d'audit (C5) et un reçu (D-010). |
| RM-13-06 | Remboursement manuel > PM-35 = double validation par deux admins distincts. |
| RM-13-07 | Les taux appliqués sont lus dans le contrat en vigueur (M03) au moment de l'encaissement — jamais codés en dur. |

## 7. Interfaces

| Sens | Contrat |
|---|---|
| Expose | **C1** — encaisser / capturer / rembourser, sur référence opaque → M06, M12 (et M08 en V1) |
| Expose | Gains, mouvements, reçus → interfaces professionnels/structures ; données financières agrégées → M16 |
| Consomme | Taux contractuels (M03) ; identité authentifiée (M01) ; **API de l'agrégateur MoMo** (externe) |
| Émet | Notifications financières (C4) ; audit (C5) |

## 8. Exigences non fonctionnelles spécifiques

- Déclenchement d'un encaissement : < **3 s** entre l'ordre et la demande MoMo sur le téléphone du patient.
- Webhook agrégateur traité en < **5 s** (le patient regarde son écran en attendant la confirmation).
- Disponibilité du module : la plus critique de la plateforme — toute panne bloque le cœur (ENF-05).

## 9. Risques et points ouverts

| Point | Détail |
|---|---|
| ❓ PM-35 | Seuil de double validation des remboursements manuels : proposition **50 000 XAF** |
| ❓ PM-36 | Délai max d'exécution d'un retrait : proposition **24 h** (immédiat en pratique) |
| ⚠️ Choix de l'agrégateur | Action 4 du [[../00_cadrage/cadre_reglementaire|plan réglementaire]] — comparer frais, fiabilité, couverture MTN+Airtel, API de remboursement (critère souvent négligé !) |
| ⚠️ Pannes opérateur | MoMo a ses indisponibilités — files d'attente et retry à concevoir en Phase 3 ; jamais de double débit (RM-13-04) |

---

*Phase 2 — module 11/12 · Précédent : [[M12_recherche_devoilement]] · Suivants : M14 Notifications & M16 Pilotage (derniers du MVP) · Index : [[../00_HOME|HOME]]*
