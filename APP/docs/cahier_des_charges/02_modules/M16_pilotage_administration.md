# MODULE M16 — Pilotage & Administration

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-038 |
| Release | MVP — périmètre réduit (D-026) : back-office essentiel + KPIs du pilote ; tableaux de bord riches en V1 |
| Domaine | D10 Pilotage |
| Dépendances | M01 (+ lecture seule sur tous) |

---

## 1. Mission et périmètre

Donner à chacun **sa** vue (tableaux de bord) et à l'Équipe ULAMU les **outils d'intervention** — sous la règle absolue : le Pilotage **lit, n'écrit jamais** dans les domaines métier ([[../01_architecture_fonctionnelle/carte_domaines|carte]] règle 4), et n'accède **jamais** au contenu médical.

**Hors-périmètre explicite :**
- Files de vérification (M03) et de modération (M04) — M16 les héberge dans son interface mais leurs règles vivent chez elles
- Tableaux de bord riches, exports avancés → V1

## 2. Exigences fonctionnelles

| ID | Exigence |
|---|---|
| EF-16-01 | **Tableau de bord professionnel/structure** (MVP basique) : sessions du mois, gains (disponible / en attente), note moyenne, réservations servies, taux de confirmation. |
| EF-16-02 | **Mon Espace patient** : historique d'activité, reçus, dévoilements, accès au Carnet — agrégation de ce que les modules exposent déjà. |
| EF-16-03 | **Back-office Équipe ULAMU** : recherche de comptes, **suspension / réactivation motivée**, files M03 et M04, supervision financière (M13), arbitrage des strikes (M12), exécution des **procédures support** définies par les modules (changement de numéro CU-01-05, titulaire injoignable CU-02-05, transfert de Carnet CU-07-05). |
| EF-16-04 | **Paramètres de la plateforme** : les PM-xx ([[../01_architecture_fonctionnelle/parametres_metier|référentiel]]) modifiables par le **Super Admin seul**, avec date d'effet et historique ; un changement de taux déclenche la mécanique d'avenant (M03/D-022). |
| EF-16-05 | **KPIs du pilote** en temps réel : exactement les 7 critères de succès du [[../01_architecture_fonctionnelle/plan_releases|plan de releases]] §3 — pas un de plus au MVP. |
| EF-16-06 | Toute action d'admin : **TOTP obligatoire** (RM-01-06), motif obligatoire, audit (C5) ; chaque sous-rôle ne voit que son domaine (matrice M02). |
| EF-16-07 | **Bannissement définitif** d'un compte : double validation par deux admins distincts (même esprit que PM-35). |

## 3. Cas d'utilisation (clés)

### CU-16-01 — Suspendre un compte
- *Étant donné* un signalement grave transmis (M04), *quand* l'admin suspend avec motif, *alors* effet < 1 min partout (connexions révoquées, annuaire, recherche), événements audités, notification au titulaire du compte avec voie de recours.
- *Étant donné* un professionnel suspendu en pleine session payée, *alors* la session est close et remboursée automatiquement (C1).

### CU-16-02 — Modifier un paramètre
- *Étant donné* le Super Admin sous TOTP, *quand* il change PM-03 (500 → 600 XAF) avec date d'effet, *alors* historique conservé, modules servis à la date d'effet, et — s'il s'agit d'un taux contractuel — avenants générés (M03).

### CU-16-03 — Suivre le pilote
- *Étant donné* le tableau « critères du pilote », *alors* les 7 indicateurs en temps quasi réel (< 5 min), avec seuils vert/rouge — l'outil qui décidera « V1 ou pivot ».

### CU-16-04 — Procédure support
- *Étant donné* un patient ayant perdu son numéro (CU-01-05 cas sensible), *quand* l'admin exécute la procédure (vérification d'identité renforcée), *alors* chaque étape est guidée, motivée, auditée — pas d'action libre hors procédure.

## 4. Données — propres : ParametrePlateforme (déjà au [[../01_architecture_fonctionnelle/modele_donnees_global|dictionnaire]] §D10), ProcedureSupport (type, étapes, exécutant, justificatifs, horodatages), SanctionCompte (compte, type, motif, admin(s), statut).

## 5. Règles métier

| ID | Règle |
|---|---|
| RM-16-01 | Le Pilotage **lit seulement** — toute écriture passe par les procédures des modules propriétaires. |
| RM-16-02 | **Aucun admin n'accède au contenu d'une session ni au Carnet** — seul le message explicitement signalé est visible (RM-04-03). C'est une barrière technique, pas une politesse. |
| RM-16-03 | Toute action admin = TOTP + motif + audit. Le pouvoir sans trace n'existe pas. |
| RM-16-04 | Bannissement définitif = double validation (EF-16-07). |
| RM-16-05 | Les KPIs n'exposent que des agrégats — jamais de données médicales individuelles. |

## 6. Interfaces — Consomme : lecture seule des données exposées par tous les modules ; files M03/M04 ; supervision M13. Expose : ParametrePlateforme → tous ; sanctions → M01/M02 (application). Émet : audit (C5), notifications (C4).

## 7. Points ouverts

| Point | Détail |
|---|---|
| ⚠️ Modèle opérationnel | Qui est l'Équipe ULAMU au lancement (combien de personnes, quels horaires) — c'est le document dédié de la Phase 3 |
| 💡 V1 | Tableaux de bord riches (graphiques, exports), outils de modération avancés, statistiques professionnelles détaillées |

---

*Phase 2 — module 12b/12 · **Le MVP est entièrement spécifié** · Précédent : [[M14_notifications_rappels]] · Index : [[../00_HOME|HOME]]*
