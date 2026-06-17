# MODULE M08 — Missions de Triage

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-042 |
| Release | **V1** (D-026) |
| Domaine | D4 Carnet |
| Dépendances | M05, M07, M13, M14 |

---

## 1. Mission et périmètre

Permettre à un patient de faire venir un **soignant vérifié** (infirmier, agent de santé communautaire) pour prendre ses **constantes** à domicile et les verser au Carnet. C'est le parcours 🅲 complété (Papa Gaston, P2) et un **revenu digne** pour les soignants de terrain (P6, Nadège).

**Hors-périmètre explicite :**
- Soins à domicile (injections, pansements) — uniquement la prise de constantes au lancement V1
- Prescription — le soignant n'est pas prescripteur (glossaire)

## 2. Exigences fonctionnelles

| ID | Exigence |
|---|---|
| EF-08-01 | **Offre de mission** : le soignant vérifié publie son service — prix de la mission, **rayon d'intervention** (PM-39, défaut 10 km), disponibilités. Visible dans l'Annuaire (M05, catégorie soignants). |
| EF-08-02 | **Demande de mission** : le patient choisit un soignant proche (par arrondissement), précise l'adresse/position et le motif (suivi tension, pesée bébé…). |
| EF-08-03 | **Poignée de main de mission** (même loi que D-007) : demande → le soignant **confirme** (voit la distance avant d'accepter) → seulement là, paiement possible (C1) → mission confirmée, position du patient révélée au soignant. |
| EF-08-04 | **Le jour J** : le patient remet au soignant un **code de visite à 4 chiffres** (affiché dans son app) — la preuve incontestable que la visite a eu lieu. |
| EF-08-05 | **Saisie des constantes** : formulaire structuré (tension, température, poids, pouls) depuis le téléphone du soignant → Entrées au Carnet (C2), provenance « constaté par un professionnel ». |
| EF-08-06 | **Gains crédités uniquement après** code de visite + constantes saisies (même principe que le compte-rendu M06 : la qualité avant la trésorerie). Commission PM-01 (10 %). |
| EF-08-07 | **Protections** : soignant absent (pas de code saisi sous 24 h) → **remboursement automatique** ; annulation par le patient avant confirmation → gratuite ; après confirmation → politique affichée avant paiement. |
| EF-08-08 | **Notation** de la mission par le patient (PM-13) ; les indicateurs de fiabilité du soignant sont publics (M05). |
| EF-08-09 | Si le médecin traitant du patient existe (session passée), il est **notifié des nouvelles constantes** (C4) — la boucle de suivi se referme. |

## 3. Cas d'utilisation

### CU-08-01 — Mission complète
- *Étant donné* un soignant disponible dans le rayon, *quand* la poignée de main aboutit et le paiement réussit, *alors* le soignant reçoit l'adresse, le patient reçoit la photo/badge du soignant (sécurité : il sait qui va frapper à sa porte).
- *Quand* le soignant arrive et saisit le code de visite, *alors* la mission passe « en cours » ; *quand* les constantes sont enregistrées, *alors* Carnet alimenté, gains crédités, notation proposée.

### CU-08-02 — Soignant absent
- *Étant donné* aucune saisie de code sous 24 h après l'heure convenue, *alors* remboursement intégral automatique (C1), incident compté dans les indicateurs du soignant, patient notifié avec excuse.

### CU-08-03 — Mission pour une personne à charge
- *Étant donné* un sous-profil (Carnet familial, D-033), *quand* le tuteur commande la mission « pour Grâce », *alors* les constantes vont au Carnet de Grâce.

## 4. Données du module

**Référencées :** MissionTriage, Constantes, EntreeCarnet ([[../01_architecture_fonctionnelle/modele_donnees_global|dictionnaire]] §D4).

**Propres au module :**
| Entité | Attributs clés | Règles |
|---|---|---|
| OffreMission | soignant, prix, rayon (PM-39), disponibilités, active | Soignant vérifié uniquement (C6) |
| CodeVisite | mission, code 4 chiffres, saisi à | Généré au paiement, usage unique |

## 5. Règles métier

| ID | Règle |
|---|---|
| RM-08-01 | Jamais de paiement sans confirmation du soignant (la loi D-007 s'applique aux missions). |
| RM-08-02 | La position exacte du patient n'est révélée **qu'après paiement** — symétrie avec le dévoilement. |
| RM-08-03 | Gains conditionnés au code de visite + constantes (EF-08-06) — pas de visite, pas d'argent. |
| RM-08-04 | Les constantes saisies sont immuables (RM-07-02) ; une erreur = nouvelle saisie corrective liée. |
| RM-08-05 | Un soignant suspendu (M03/M16) ne reçoit plus de demandes ; ses missions payées en cours sont honorées ou remboursées. |

## 6. Interfaces

| Sens | Contrat |
|---|---|
| Consomme | Annuaire/offres (M05) ; **C1** encaisser/rembourser/créditer (M13) ; statut C6 (M03) |
| Expose | **C2** — constantes → Carnet (M07) ; événements de mission → indicateurs M05, audit C5 |
| Émet | Notifications (C4), dont l'alerte au médecin traitant (EF-08-09) |

## 7. Risques et points ouverts

| Point | Détail |
|---|---|
| ⚠️ Sécurité physique | Un inconnu entre chez le patient : badge vérifié + photo avant la visite + traçabilité complète sont les garde-fous ; à évaluer au pilote V1 |
| ⚠️ Matériel du soignant | La qualité des constantes dépend de son tensiomètre/balance — charte d'équipement minimal au contrat (M03) |
| 💡 Extension naturelle | Soins à domicile (pansements, injections sur ordonnance) en V2 — même mécanique |

---

*V1 — module 14/16 · Précédent : [[M15_urgence]] · Suivant : [[M10_examens_resultats]] · Index : [[../00_HOME|HOME]]*
