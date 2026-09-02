# MODULE M10 — Examens & Résultats

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-043 |
| Release | **V1** (D-026, D-038) |
| Domaine | D5 Prescription |
| Dépendances | M06, M07 (+ activation des laboratoires : M02/M03/M11/M12 déjà génériques) |

---

## 1. Mission et périmètre

Fermer la boucle des **examens complémentaires** : le prescripteur demande des analyses en session, le patient trouve un laboratoire, le labo téléverse les résultats **directement dans le Carnet** — fini les résultats perdus ou jamais revenus chez le médecin.

**Hors-périmètre explicite :**
- Paiement de l'examen via la plateforme → au laboratoire, hors plateforme (D-015)
- Imagerie lourde (scanner, IRM) → extension V2 ; V1 = analyses de laboratoire

## 2. Activation des laboratoires (réutilisation, zéro nouveau mécanisme)

| Besoin | Déjà couvert par |
|---|---|
| ~~Espace labo, titulaire, membres~~ | ~~M02 (type de structure « laboratoire »)~~ — **sans objet depuis le 02/09/2026** ([[../00_cadrage/registre_decisions#D-051 — Trois acteurs, et deux seulement sur le web (remplace D-003 et D-004 sur le volet COMPTE)|D-051]]) : le compte membre de structure est retiré du produit. M10 est en V1 ; sa reprise devra dire par quel acteur un laboratoire est administré. |
| Vérification + contrat | M03 (posture stricte D-029) |
| Catalogue d'examens (prix, délais) | M11 (entité CatalogueExamen prévue) |
| Recherche + dévoilement + réservation 24 h | M12 (D-009, prix PM-03) — le patient cherche « NFS + glycémie », même mécanique que les médicaments |

## 3. Exigences fonctionnelles

| ID | Exigence |
|---|---|
| EF-10-01 | **Demande d'examens** créée **uniquement en session** par un prescripteur : liste d'examens (référentiel + texte libre marqué), signée, **QR unique**, versée au Carnet (C2), patient notifié. Expire en PM-40 (30 jours). |
| EF-10-02 | **Recherche de laboratoire** par la demande d'examens (M12) : résultat anonyme par arrondissement → dévoilement 500 XAF → labo révélé + réservation 24 h. |
| EF-10-03 | **Au laboratoire** : le membre (droit M02) scanne le QR → voit la demande (jamais le Carnet, RM-09-04 s'applique) → marque les examens « en cours » → réalisés. |
| EF-10-04 | **Téléversement des résultats** : fichier PDF + valeurs clés structurées (optionnel mais encouragé) → **Entrée au Carnet** (C2), immuable. |
| EF-10-05 | **Notifications croisées** (C4) : patient (« vos résultats sont disponibles ») et **prescripteur d'origine** (« les résultats de votre patient P sont arrivés ») — avec proposition de session de suivi (D-016). |
| EF-10-06 | **Résultats partiels** : un labo peut téléverser examen par examen ; la demande suit ses statuts — active → partielle → complète / expirée (PM-40). |
| EF-10-07 | Historique des demandes et résultats dans l'onglet Consultations du patient. |

## 4. Cas d'utilisation

### CU-10-01 — Boucle complète
- *Étant donné* une session active, *quand* le Dr Armel demande « NFS, glycémie à jeun », *alors* demande signée + QR en < 5 s, Carnet et patient notifiés.
- *Quand* le patient dévoile un labo et s'y présente, *alors* scan, réalisation, téléversement → le Carnet s'enrichit, le Dr Armel est notifié et propose une session de suivi à tarif réduit.

### CU-10-02 — Résultat anormal urgent
- *Étant donné* un résultat marqué « critique » par le labo au téléversement, *alors* notification **prioritaire** au prescripteur (C4, priorité critique) — le médecin décide de la suite, pas la plateforme (nous ne faisons pas de diagnostic automatique).

### CU-10-03 — Demande expirée
- *Étant donné* PM-40 dépassé sans réalisation, *alors* statut « expirée », QR inerte, patient prévenu à J-7 et J-1 — une nouvelle demande passe par une session.

## 5. Données du module

**Référencées :** DemandeExamens, ResultatExamens, CatalogueExamen ([[../01_architecture_fonctionnelle/modele_donnees_global|dictionnaire]] §D5/D6).

**Propres au module :**
| Entité | Attributs clés | Règles |
|---|---|---|
| LigneExamen | demande, examen (référentiel ou libre marqué), statut (à faire / en cours / résultat déposé) | Statuts par ligne (EF-10-06) |
| ReferentielExamen | code, nom, catégorie | Géré par l'Équipe ULAMU, comme le référentiel Medicament (ADR-13) |

## 6. Règles métier

| ID | Règle |
|---|---|
| RM-10-01 | Demande d'examens : prescripteurs uniquement, en session uniquement (symétrie avec RM-09-01). |
| RM-10-02 | Le labo ne voit que la demande — jamais le Carnet (extension de RM-09-04). |
| RM-10-03 | Un résultat téléversé est **immuable** ; une correction = nouveau dépôt lié à l'ancien, les deux visibles (RM-07-02). |
| RM-10-04 | Le téléversement exige une structure vérifiée + membre habilité + connexion (symétrie avec RM-09-03). |
| RM-10-05 | La plateforme n'interprète jamais un résultat — elle transporte et notifie (le marquage « critique » vient du labo). |

## 7. Interfaces

| Sens | Contrat |
|---|---|
| Consomme | Contexte de session (M06) ; recherche/dévoilement (M12) ; droits membres (M02) ; statut C6 |
| Expose | **C2** — demandes et résultats → Carnet (M07) ; contenu de demande active → M12 |
| Émet | Notifications croisées patient/prescripteur (C4) ; audit complet (C5) |

## 8. Risques et points ouverts

| Point | Détail |
|---|---|
| ⚠️ Recrutement des labos | L'effort terrain qui justifiait le report en V1 — objectifs et formation au modèle opérationnel (mêmes recettes que les pharmacies) |
| ⚠️ Référentiel d'examens | Constitution initiale (nomenclature courante des analyses au Congo-B) — Phase 3 / Équipe ULAMU |
| 💡 V2 | Imagerie (scanner, radio), résultats structurés normalisés, tendances graphiques dans le Carnet |

---

*V1 — module 15/16 · Précédent : [[M08_missions_triage]] · **Les 16 modules sont tous spécifiés** · Index : [[../00_HOME|HOME]]*
