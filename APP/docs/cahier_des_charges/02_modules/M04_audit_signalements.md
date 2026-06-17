# MODULE M04 — Audit & Signalements

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-030 |
| Release | MVP — en continu dès le Chantier 1 (journal) ; modération simple |
| Domaine | D2 Confiance & Conformité |
| Dépendances | M01 |

---

## 1. Mission et périmètre

La **mémoire incorruptible** de la plateforme : enregistrer tout acte sensible (qui, quoi, quand) de façon inaltérable, et recueillir les **signalements** des utilisateurs avec une modération simple au MVP.

**Hors-périmètre explicite :**
- Sanctions sur les comptes (suspension) → M16 ; révocation de badge → M03
- Tableaux de bord statistiques → M16
- Modération outillée avancée → V1 (D-026)

## 2. Acteurs

| Acteur | Usage |
|---|---|
| Tous les modules | Émettent des événements d'audit (C5) |
| Tout utilisateur | Signale un contenu ou comportement |
| Admin (sous-rôles habilités) | Consulte le journal, traite les signalements |
| Le Système | Chaîne les empreintes, vérifie l'intégrité, surveille les délais |

## 3. Exigences fonctionnelles

| ID | Exigence |
|---|---|
| EF-04-01 | Réception **asynchrone** des événements d'audit de tous les modules : acteur, action, ressource, horodatage, contexte minimal. Écriture seule. |
| EF-04-02 | **Inaltérabilité** : chaque événement est chaîné par empreinte au précédent ; vérification d'intégrité automatique quotidienne ; toute rupture de chaîne = alerte critique au Super Admin. |
| EF-04-03 | **Catalogue des événements auditables**, tenu à jour à chaque module validé (M01 : créations, blocages, changements de numéro… M03 : décisions, signatures… etc.). |
| EF-04-04 | Consultation par les admins habilités : filtres (acteur, action, ressource, période), export PDF/CSV — **toute consultation et tout export sont eux-mêmes audités**. |
| EF-04-05 | **Signalement** par tout utilisateur : cible (profil, message d'une session, structure), motif (liste fermée + texte libre), accusé de réception immédiat. |
| EF-04-06 | File de modération : traitement par l'Admin Vérification avec délai cible (PM-23 ❓), issues possibles — rejeter (motivé) / avertir l'auteur / transmettre à M16 (suspension) ou M03 (révocation). |
| EF-04-07 | **Protection du signaleur** : son identité n'est jamais révélée à la personne signalée. |
| EF-04-08 | Rétention des événements : durée longue (PM-24 ❓), purge uniquement à l'échéance légale, jamais manuelle. |

## 4. Cas d'utilisation

### CU-04-01 — Émission d'un événement (transversal)
- *Étant donné* une action sensible dans n'importe quel module, *alors* l'événement est transmis de façon asynchrone — **l'audit ne ralentit jamais l'action de l'utilisateur** ; en cas d'indisponibilité du journal, les événements sont mis en file et aucun n'est perdu.

### CU-04-02 — Consulter le journal (Admin)
- *Étant donné* un admin habilité, *quand* il recherche « toutes les actions de l'utilisateur U sur 30 jours », *alors* résultats en < 5 s, paginés, exportables — et sa consultation est journalisée (EF-04-04).
- *Étant donné* un admin Finance, *alors* il ne voit que les événements de son domaine (matrice M02).

### CU-04-03 — Signaler un contenu
- *Étant donné* un patient dans une session, *quand* il signale un message précis avec un motif, *alors* accusé immédiat, signalement en file, **seul le message signalé et son contexte immédiat** seront visibles du modérateur (RM-04-03).
- *Étant donné* un signalement traité, *alors* le signaleur est notifié de l'issue (sans détail des sanctions).

### CU-04-04 — Traiter un signalement (Admin)
- *Étant donné* la file triée par ancienneté et gravité du motif, *quand* l'admin décide, *alors* décision motivée, horodatée, auditée ; transmission à M16/M03 si sanction requise.
- *Étant donné* un dépassement du délai PM-23, *alors* alerte automatique au Super Admin.

## 5. Données du module

**Référencées :** EvenementAudit, Signalement ([[../01_architecture_fonctionnelle/modele_donnees_global|dictionnaire]] §D2).

**Propres au module :**
| Entité | Attributs clés | Règles |
|---|---|---|
| BlocIntegrite | période, empreinte cumulative, empreinte du bloc précédent | La chaîne qui rend le journal inaltérable |
| DecisionModeration | signalement, décision, motif, admin, horodatage | Immuable |

## 6. Règles métier

| ID | Règle |
|---|---|
| RM-04-01 | Le journal est en **écriture seule** : ni modification, ni suppression, par personne — pas même le Super Admin. |
| RM-04-02 | Consulter ou exporter le journal est un acte audité. |
| RM-04-03 | **Le contenu médical n'entre jamais dans l'audit** : on journalise « un message a été envoyé dans la session S », jamais son texte. Le modérateur n'accède au contenu que pour le message explicitement signalé. |
| RM-04-04 | Le signaleur reste anonyme vis-à-vis du signalé, toujours. |
| RM-04-05 | Les signalements abusifs répétés peuvent eux-mêmes être signalés par l'admin (boucle de modération). |

## 7. Interfaces

| Sens | Contrat |
|---|---|
| Consomme | **C5** — événements d'audit de tous les modules (asynchrone, file garantie) |
| Expose | Recherche du journal et file de modération → interfaces admin (M16) |
| Expose | Transmission de cas → M16 (suspension) et M03 (révocation) |
| Émet | Accusés et notifications de décision (C4) |

## 8. Exigences non fonctionnelles spécifiques

- Ingestion d'un événement : n'ajoute **aucune latence perceptible** au module émetteur (traitement asynchrone, ENF-03).
- Aucune perte d'événement, même en panne du journal (file persistante).
- Vérification d'intégrité de la chaîne : quotidienne, automatique, alertante.

## 9. Risques et points ouverts

| Point | Détail |
|---|---|
| ❓ PM-23 | Délai cible de traitement d'un signalement : proposition **48 h** — à valider |
| ❓ PM-24 | Durée de rétention du journal : proposition **5 ans** (actes médicaux et financiers) — à confirmer avec l'avocat ([[../00_cadrage/cadre_reglementaire|cadre réglementaire]] §1) |
| ⚠️ Volume | Le journal grossit vite — l'archivage à froid au-delà de 12 mois sera décidé en Phase 3 |

---

*Phase 2 — module 4/12 · Précédent : [[M03_verification_contrats]] · Suivant : M05 Annuaire des Professionnels · Index : [[../00_HOME|HOME]]*
