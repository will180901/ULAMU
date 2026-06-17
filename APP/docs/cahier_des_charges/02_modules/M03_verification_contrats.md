# MODULE M03 — Vérification & Contrats

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-029 |
| Release | MVP — Chantier 1 |
| Domaine | D2 Confiance & Conformité |
| Dépendances | M01, M02 |

---

## 1. Mission et périmètre

Garantir que chaque professionnel et chaque structure sont **vrais** (vérification → Badge Vérifié) et que la relation avec ULAMU est **contractuelle** (contrat numérique signé, D-011). C'est le module qui fabrique la confiance — notre actif n° 1 ([[../00_cadrage/personas_parcours|P5]], risque R-06).

**Hors-périmètre explicite :**
- Création des comptes → M01 ; des espaces → M02
- Signalements et modération du contenu → M04
- Suspension administrative générale d'un compte → M16

## 2. Acteurs

| Acteur | Usage |
|---|---|
| Professionnel | Dépose son dossier, signe son contrat |
| Titulaire | Idem pour sa structure |
| Admin Vérification | Examine, décide, révoque |
| Le Système | Files d'attente, alertes de délai, expiration des documents |

## 3. Exigences fonctionnelles

| ID | Exigence |
|---|---|
| EF-03-01 | Dossier de vérification **professionnel** : pièce d'identité, diplôme(s), numéro d'ordre / autorisation d'exercice, photo de profil. Statuts : à compléter → déposé → en examen → **vérifié** / refusé / complément demandé. |
| EF-03-02 | Dossier de vérification **structure** (pharmacie au MVP) : autorisation d'exercice de l'officine, identité du titulaire, justificatif de localisation. ⚠️ Liste exacte à confirmer avec l'autorité pharmaceutique ([[../00_cadrage/cadre_reglementaire|cadre réglementaire]] §5). |
| EF-03-03 | File de traitement pour l'Admin Vérification : tri par ancienneté, **délai cible 72 h ouvrées** (PM-11), alerte automatique en cas de dépassement. |
| EF-03-04 | Toute décision est **motivée** : vérifié / refusé (motifs précis) / complément demandé. Re-soumission possible après refus ou complément. |
| EF-03-05 | **Posture stricte (D-029 ✅)** : aucune pratique sans vérification — pas d'offre publiée, pas de poignée de main reçue, pas de stock visible tant que le Badge Vérifié n'est pas accordé. |
| EF-03-06 | **Contrat numérique** : généré après vérification positive (identité du signataire, taux PM-01, engagements de service, clauses de mise à jour du stock pour les pharmacies) → **signature électronique** → activation du compte/espace. Sans signature, pas d'activation. |
| EF-03-07 | Avenants : tout changement de conditions (ex. taux, D-022) produit une nouvelle version à re-signer, notifiée à l'avance. L'historique des versions signées est conservé à vie. |
| EF-03-08 | **Révocation du badge** (fraude, documents falsifiés) par l'Admin Vérification : effet immédiat en cascade (C6) — retiré de l'annuaire, plus aucune nouvelle poignée de main ; les sessions déjà payées sont honorées ou remboursées. |
| EF-03-09 | Documents à durée de validité : alerte au professionnel/titulaire avant expiration, badge suspendu si non renouvelé après délai de grâce. |

## 4. Cas d'utilisation

### CU-03-01 — Déposer un dossier professionnel
- *Étant donné* un compte professionnel créé (CU-01-02), *quand* toutes les pièces obligatoires sont téléversées, *alors* le dossier passe « déposé », l'Admin Vérification le voit en file, le déposant reçoit un accusé avec délai annoncé (PM-11).
- *Étant donné* un dossier incomplet sauvegardé, *alors* il reste « à compléter » — rien n'est visible des patients.

### CU-03-02 — Examiner un dossier (Admin Vérification)
- *Étant donné* un dossier en file, *quand* l'admin l'ouvre, *alors* statut « en examen » ; il compare pièces et déclarations, peut contacter le déposant.
- *Quand* la décision est rendue, *alors* elle est motivée, horodatée, signée du sous-rôle admin, notifiée au déposant (C4) et auditée (C5).
- *Étant donné* un refus, *alors* les motifs précis sont visibles par le déposant, qui peut corriger et re-soumettre.

### CU-03-03 — Signer le contrat numérique
- *Étant donné* un dossier vérifié, *quand* le contrat est présenté (lecture obligatoire, défilement complet), *alors* signature électronique (mot de passe + OTP), document scellé avec empreinte, copie téléchargeable à vie.
- *Alors seulement* : badge affiché, compte/espace activé, pratique ouverte (EF-03-05).

### CU-03-04 — Avenant au contrat
- *Étant donné* un changement de conditions annoncé (préavis défini au contrat), *quand* le signataire re-signe, *alors* la nouvelle version prend effet à sa date ; *s'il refuse*, son compte passe en lecture seule à l'échéance (gains retirables, plus de nouvelle activité).

### CU-03-05 — Révoquer un badge
- *Étant donné* une fraude avérée, *quand* l'Admin Vérification révoque, *alors* cascade C6 < 1 min, motif consigné, dossier conservé comme preuve (RM-01-05), notification — et signalement aux autorités si requis ([[../00_cadrage/cadre_reglementaire|cadre réglementaire]]).

## 5. Données du module

**Référencées :** DossierVerification, ContratNumerique ([[../01_architecture_fonctionnelle/modele_donnees_global|dictionnaire]] §D2).

**Propres au module :**
| Entité | Attributs clés | Règles |
|---|---|---|
| DocumentJustificatif | dossier, type de pièce, fichier, date d'expiration éventuelle | Chiffré, accès restreint Admin Vérification |
| DecisionVerification | dossier, décision, motifs, admin, horodatage | Immuable, auditée |
| VersionContrat | contrat, version, contenu, signature, empreinte, date d'effet | Toutes les versions conservées à vie |

## 6. Règles métier

| ID | Règle |
|---|---|
| RM-03-01 | **Badge + contrat signé = condition absolue de toute pratique** (si EF-03-05 validée). |
| RM-03-02 | Toute décision de vérification est motivée, tracée, attribuée à un admin nommé. |
| RM-03-03 | Les documents justificatifs ne sont jamais publics ni partagés ; seul le badge (oui/non) est visible. |
| RM-03-04 | La révocation n'efface rien : dossiers et historiques sont conservés comme preuves. |
| RM-03-05 | Un contrat signé est immuable ; toute évolution = avenant versionné re-signé. |

## 7. Interfaces

| Sens | Contrat |
|---|---|
| Expose | **C6** — statut (vérifié / non vérifié / suspendu / révoqué) → M02, M05, M06, M11, M12 |
| Expose | Taux contractuel en vigueur du signataire → M13 (calcul des répartitions) |
| Consomme | Événement « compte professionnel créé » (M01) ; « espace structure créé » (M02) |
| Émet | Audit (C5) ; notifications de décision (C4) |

## 8. Exigences non fonctionnelles spécifiques

- Téléversement des pièces possible sur connexion lente (reprise après coupure, fichiers ≤ 5 Mo, photos compressées ENF-02).
- File de vérification : aucun dossier sans réponse au-delà de **2× PM-11** sans alerte au Super Admin.

## 9. Risques et points ouverts

| Point | Détail |
|---|---|
| ❓ EF-03-05 | **À valider : posture stricte** — aucune pratique avant vérification (plutôt que badge « non vérifié » visible). Conséquence : le délai de 72 h devient un engagement de service critique. |
| ⚠️ Liste des pièces | À confirmer avec l'Ordre des médecins et l'autorité pharmaceutique (action 2-3 du plan réglementaire) |
| ⚠️ Capacité de vérification | Au lancement, un seul Admin Vérification peut traiter ~20 dossiers/jour — à dimensionner dans le modèle opérationnel (Phase 3) |

---

*Phase 2 — module 3/12 · Précédent : [[M02_roles_espaces_structures]] · Suivant : M04 Audit & Signalements · Index : [[../00_HOME|HOME]]*
