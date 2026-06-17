# 01 — App patient (mobile)

> Maquette : `ui_kits/patient_mobile/index.html` (+ `screens.jsx`, `screens2.jsx`, `onboarding.jsx`, `flow.jsx`, `chat.jsx`, `session.jsx`, `tabs.jsx`).
> Cible : Android 8+, 2 Go RAM, écran 5", réseau intermittent. App légère (budget data).

## 1. Carte des écrans et routes

| Route | Écran | Source maquette |
|---|---|---|
| `/onboarding` (4 étapes) | Bienvenue → Téléphone → OTP → Profil | `onboarding.jsx` |
| `/` (onglet Accueil) | Salutation, rappel médicament, 4 actions rapides, recherche + chips, flux médecins | `screens.jsx` |
| `/soignant/:id` | Profil médecin (stats, tarifs, pré-consultation) | `screens.jsx` |
| `/consultation/:id/poignee` | Attente confirmation (étape 1/3) | `flow.jsx` |
| `/consultation/:id/paiement` | Reçu + choix opérateur MoMo (étape 2/3) | `flow.jsx` |
| `/consultation/:id/session` | Messagerie chronométrée (étape 3/3) | `session.jsx`, `chat.jsx` |
| `/medicaments` | Dévoilement-réservation | `screens2.jsx` |
| `/ordonnance/:id` | QR plein soleil + détail | `screens2.jsx` |
| `/dossier` | Dossier médical à vie | `screens2.jsx` |
| `/notifications`, `/paiements` | Listes | `screens2.jsx`, `tabs.jsx` |
| Onglets : Accueil / Consultations / Mon espace + bouton Urgence flottant | | `tabs.jsx` |

## 2. Machine d'états — consultation (cœur du produit)

```
RECHERCHE → DEMANDE_ENVOYEE → (CONFIRMEE | EXPIREE | REFUSEE)
CONFIRMEE → PAIEMENT_INITIE → (PAIEMENT_CONFIRME | PAIEMENT_ECHOUE)
PAIEMENT_CONFIRME → SESSION_ACTIVE → [PROLONGEE]* → CLOTUREE → COMPTE_RENDU_RECU
```

- `DEMANDE_ENVOYEE` : le pro a un délai pour confirmer **[À TRANCHER : durée — la maquette suggère quelques minutes]**. Aucun débit (D-007).
- `PAIEMENT_CONFIRME` : capture MoMo réussie → la session s'ouvre immédiatement, le décompteur démarre (durée affichée au profil, ex. 30 min).
- `PROLONGEE` : bouton « +5 min » gratuit, visible sous seuil warning (120 s dans la maquette). **[À TRANCHER : nombre max de prolongations]**
- `EXPIREE` / défaillance pro : **remboursement automatique**, notification au patient, écriture au journal.
- `CLOTUREE` : par le patient (« Terminer la session »), par expiration du temps, ou par le pro. Le compte-rendu est obligatoire côté pro avant clôture définitive.

## 3. Événements clés (UI → backend)

| Événement UI (maquette) | Appel attendu |
|---|---|
| « Initier la consultation » | `POST /consultations` `{soignantId, preConsultationId}` |
| Confirmation pro reçue | push/SSE `consultation.confirmee` → activer le bouton « Régler » |
| « Payer N F » | `POST /paiements` `{consultationId, operateur: mtn|airtel, msisdn}` → attente webhook |
| Message envoyé | `POST /sessions/:id/messages` (optimiste : statut `pending` local) |
| « +5 min » | `POST /sessions/:id/prolongations` |
| « Terminer la session » | `POST /sessions/:id/cloture` |
| « Dévoiler & réserver · 500 F » | `POST /devoilements` `{ordonnanceId|medicaments[], zone}` → paiement → pharmacies révélées + `reservationId` (TTL 24 h) |
| « Pris » (rappel médicament) | `POST /rappels/:id/prises` |
| Urgence | appel téléphonique natif + partage de position approximative **[À TRANCHER : numéro du service de garde]** |

## 4. Données affichées (entités minimales)

- `Patient` {id, nom, téléphone (identifiant), zone, allergies[], groupe sanguin}
- `Soignant` {id, nom, spécialité, zone, vérifié, enLigne, note, avis, tarifs[], délaiRéponse, bio, stats}
- `Consultation` {id, patient, soignant, état, montant, durée, timestamps}
- `Session` {id, consultationId, début, duréeRestante, messages[]}
- `Message` — voir `05-fondations-techniques.md` §Messagerie
- `Ordonnance` {id, code ORD-AAAA-NNNNN, médicaments[{nom, posologie, durée}], signature, QR, validité 30 j, état}
- `Réservation` {id, RSV-NNNN, pharmacie, ordonnanceId, expiration, état}
- `EntréeDossier` {type: consultation|ordonnance|délivrance|triage|résultat, date, référence}

## 5. Règles UI spécifiques (vues dans la maquette — à conserver)

- Le **flux médecins est sans prix** (les tarifs ne se découvrent que sur le profil — choix produit).
- Recherche + chips de spécialité filtrent localement la liste (côté serveur en prod : `GET /soignants?q=&specialite=&zone=`).
- Boutons « initier » désactivés si le pro est hors ligne.
- Écran QR : fond **blanc forcé** quel que soit le thème + invite « luminosité au maximum ».
- Onboarding : téléphone = identifiant unique, OTP 4 chiffres auto-rempli (SMS Retriever), pas de mot de passe.
- Bascule thème sombre/clair persistée (`ulamu-theme`) — sombre par défaut.
- Notifications : titres génériques uniquement (« Nouveau message ») — jamais de contenu médical.

## 6. Hors maquette — à construire

- Récupération de compte (changement de numéro) **[À TRANCHER]**
- Carnet familial : gestion des proches (la tuile existe, l'écran non)
- Réglages (langue future, notifications, confidentialité)
- États réseau : bannière hors-ligne globale + file d'attente d'envoi (voir `05` §Offline)
- CGU / consentement à l'inscription **[À TRANCHER : texte juridique]**
