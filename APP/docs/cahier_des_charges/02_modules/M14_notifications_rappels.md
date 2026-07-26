# MODULE M14 — Notifications & Rappels

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-038 |
| Release | MVP — Chantier 2 (push + in-app ; canal SMS de notification en V1, D-026) |
| Domaine | D8 Communication |
| Dépendances | M01 |

---

## 1. Mission et périmètre

Notifier **la bonne personne, au bon moment, sans jamais déranger pour rien**. Service aveugle au métier : les modules lui envoient des demandes (C4), il livre.

**Hors-périmètre explicite :**
- OTP SMS → passerelle directe de M01 (RM-01-03, hors de ce module)
- Le contenu des messages de session → M06 (M14 ne transporte que « vous avez un message »)

## 2. Exigences fonctionnelles

| ID | Exigence |
|---|---|
| EF-14-01 | Réception des demandes **C4** : destinataire, modèle, données, priorité (critique / normale / faible). |
| EF-14-02 | **Canaux MVP** : push mobile, centre in-app, notification web (avec **son** pour les critiques — la poignée de main en < 5 s, ENF-09). SMS de notification en V1. |
| EF-14-03 | **Catalogue de modèles** versionnés — les modules n'envoient jamais de texte libre. |
| EF-14-04 | **Préférences par catégorie** (soin, finance, rappels, système) ; les **critiques ne sont pas désactivables** : poignée de main, remboursement, sécurité du compte. |
| EF-14-05 | **Rappels de médicaments** (gratuits, [[../00_cadrage/vision|vision]] §2) : proposés automatiquement à la délivrance (M09) à partir de la posologie ; le patient active, ajuste les heures, arrête quand il veut ; fin automatique à la fin du traitement. |
| EF-14-06 | **Confidentialité** : jamais de contenu médical dans une notification (ENF-07) — « Vous avez un nouveau message », jamais le texte ; « Rappel : votre traitement de 20 h », jamais le nom du médicament en clair sur l'écran verrouillé (libellé discret par défaut — RM-14-03). |
| EF-14-07 | **Centre in-app** : historique (PM-37 ❓), badge non-lu, regroupement par catégorie. |
| EF-14-08 | **Livraison garantie des critiques** : nouvel essai automatique, suivi des statuts envoyé / livré ; échec persistant → événement vers le module demandeur. |

## 3. Cas d'utilisation (clés)

### CU-14-01 — Notification critique (poignée de main)
- *Étant donné* une initiation (M06), *alors* notification web sonore au professionnel en < 5 s ; *non livrée en 30 s* → second essai + bannière in-app persistante.

### CU-14-02 — Rappel de médicament
- *Étant donné* une délivrance « 3×/jour pendant 7 jours », *alors* proposition de rappels (8 h, 14 h, 20 h — ajustables) ; *à chaque prise*, notification discrète ; *au 7ᵉ jour*, dernier rappel + arrêt automatique.
- *Étant donné* un patient hors ligne, *alors* les rappels sonnent localement (programmés sur l'appareil — pas besoin de réseau).

### CU-14-03 — Gérer ses préférences
- *Étant donné* la catégorie « rappels » désactivée, *alors* plus aucun rappel ; les critiques restent (EF-14-04), expliqué honnêtement dans l'interface.

## 4. Données — référencées : Notification, RappelMedicament ([[../01_architecture_fonctionnelle/modele_donnees_global|dictionnaire]] §D8). Propres : ModeleNotification (clé, version, gabarits par canal), PreferenceNotification (utilisateur, catégorie, canaux).

## 5. Règles métier

| ID | Règle |
|---|---|
| RM-14-01 | Service aveugle : M14 ne connaît aucune logique métier — il livre des modèles remplis. |
| RM-14-02 | Les notifications critiques ne sont jamais désactivables ni silencieuses côté web professionnel. |
| RM-14-03 | Jamais de contenu médical en clair (EF-14-06). |
| RM-14-04 | **Aucune notification commerciale ou promotionnelle au MVP** — on ne dérange que pour servir ([[../00_cadrage/vision|vision]] §4). |
| RM-14-05 | Les rappels de médicaments fonctionnent hors ligne (programmation locale). |

## 6. Interfaces — Consomme : C4 (tous les modules), identité M01. Expose : statuts de livraison au module demandeur. Émet : audit des critiques (C5).

## 7. Points ouverts

| Point | Détail |
|---|---|
| ❓ PM-37 | Rétention du centre de notifications : proposition **90 jours** |
| ⚠️ Fiabilité push Android | Sur les téléphones d'entrée de gamme, les push sont parfois tuées par l'économiseur de batterie — les rappels locaux (RM-14-05) et le centre in-app sont les filets ; détail en Phase 3 |

---

*Phase 2 — module 12a/12 · Suivant : [[M16_pilotage_administration]] · Index : [[../00_HOME|HOME]]*
