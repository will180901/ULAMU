# Stratégie Offline & Synchronisation — ULAMU

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — revue D-040 |
| Documents liés | [[../01_architecture_fonctionnelle/exigences_non_fonctionnelles|ENF-04]] (D-025) · [[decisions_architecture]] (ADR-12) |

> Met en œuvre le périmètre hors ligne décidé en D-025. Principe directeur : **le serveur fait foi, le mobile est un miroir chiffré.**

---

## 1. Ce qui vit hors ligne (mobile patient)

| Donnée | Mode | Fraîcheur |
|---|---|---|
| Carnet complet (fiche synthèse + entrées) | Lecture | Synchronisé à chaque connexion ; ≤ 50 Mo (M07) |
| Ordonnances actives + QR | Lecture | Le QR s'affiche hors ligne ; l'état réel est vérifié par la pharmacie connectée (RM-09-02) |
| Session de dévoilement active | Lecture | Adresse, téléphone, plan statique — l'essentiel du trajet (EF-12-08) |
| Reçus et historique | Lecture | Dernier état connu |
| Messages d'une session active | **Écriture en file** | Envoyés à la reconnexion, dans l'ordre (EF-06-13) |
| Rappels de médicaments | Local autonome | Programmés sur l'appareil (RM-14-05), zéro réseau requis |

**Exige la connexion** (D-025) : recherche, dévoilement, paiement, poignée de main, téléversements, inscription. Le professionnel sur web, lui, **travaille connecté** — pas de mode offline web au MVP (délivrance RM-09-03, présence M05).

## 2. Stockage local

- Base **SQLite chiffrée** (SQLCipher) sur mobile ; clé dérivée du compte, stockée dans le coffre matériel Android (Keystore).
- Médias en cache chiffré avec plafond (inclus dans les 50 Mo) — éviction des plus anciens.
- **Purge** : déconnexion volontaire, révocation à distance (CU-01-06) ou clôture → cache effacé au prochain contact serveur ; le verrou app (PIN/biométrie) protège entre-temps (T-02).

## 3. La file d'actions sortantes

1. Toute écriture hors ligne (message de session) reçoit un **UUID client** (clé d'idempotence, ADR-12) et entre dans la file locale, horodatée.
2. À la reconnexion : envoi **dans l'ordre**, un par un ; le serveur déduplique sur l'UUID — un message rejoué n'apparaît jamais deux fois.
3. Rejets possibles et leur traitement honnête :
   - **Session expirée pendant la coupure** → le message est marqué « non remis — session terminée », proposé en brouillon si une session de suivi s'ouvre. Le patient le *voit*, rien ne disparaît en silence.
   - **Compte déconnecté à distance** → file purgée (sécurité avant confort, T-02).
4. Indicateur permanent : bandeau « hors ligne — N messages en attente » (ENF-04).

## 4. Synchronisation entrante (pull)

- À chaque connexion et à chaque ouverture d'app : **delta depuis le dernier curseur** (jamais de re-téléchargement complet) — économie de data (ENF-02).
- Priorités du delta : 1) état des sessions/poignées en cours, 2) nouvelles entrées du Carnet, 3) notifications manquées, 4) médias à la demande seulement.
- Conflits : **il n'y en a pas par construction** — le patient n'édite jamais une donnée partagée hors ligne ; il ne fait qu'ajouter (messages, à UUID) ou lire. Les entrées du Carnet sont immuables (RM-07-02). C'est le bénéfice direct de nos choix de Phase 1.

## 5. Le temps en mode dégradé

- Le décompteur de session court **côté serveur** (RM-06-02) ; l'app affiche le temps local resynchronisé à chaque échange WebSocket (ADR-06).
- Patient hors ligne en session : ses messages partiront, le temps court — c'est dit clairement à l'écran (« le temps de session continue »).
- Professionnel coupé en session : à son retour, invitation à prolonger gratuitement (CU-06-04) ; s'il ne revient jamais sans avoir écrit → remboursement automatique (D-008).

## 6. Tests dédiés (repris dans [[strategie_tests]])

- Scénario « tunnel » : rédaction de 5 messages hors ligne → reconnexion → ordre et unicité vérifiés.
- Scénario « session morte » : coupure avant la fin, reconnexion après expiration → message « non remis » visible.
- Scénario « vol » : révocation à distance → purge au contact suivant.
- Scénario « double tap » : même action rejouée (UUID identique) → un seul effet serveur.

---

*Phase 3 — 3/5 · Précédent : [[modele_menaces]] · Suivant : [[strategie_tests]] · Index : [[../00_HOME|HOME]]*
