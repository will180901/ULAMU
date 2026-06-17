# 02 — Cockpit professionnel (desktop)

> Maquette : `ui_kits/professionnel_desktop/index.html` (+ `desktop.jsx`, `pages.jsx`, `chat-pro.jsx`, `cockpit.jsx`).
> Acteurs : soignants prescripteurs (médecins) et non-prescripteurs (infirmiers, sages-femmes…). Les non-prescripteurs n'ont **pas** l'onglet Ordonnance.

## 1. Carte des écrans

| Route | Écran |
|---|---|
| `/` | Tableau de bord : KPIs, poignées de main à confirmer, gains hebdo (area chart), agenda du soir, avis récents |
| `/consultations` | En attente / Historique (comptes-rendus manquants signalés) |
| `/patients` | Patients rencontrés en session (accès limité au cadre de soin) |
| `/agenda` | Créneaux de disponibilité, fermeture de créneau, passage hors ligne auto |
| `/ordonnances` | Historique signées (états : réservée / délivrée / expirée) + QR |
| `/gains` | Solde, courbe, transactions (commission visible), retrait MoMo |
| `/annuaire` | Vitrine publique : visibilité, tarifs éditables, badge vérifié |
| `/session/:id` | **Cockpit** : dossier patient (gauche 360 px) + messagerie enrichie (droite) |

Layout : sidebar 240 px (entête / corps / pied avec **menu utilisateur** : rôle, thème, paramètres, déconnexion) + topbar (fil d'Ariane, recherche, chronomètre de session si active, switch En ligne/Hors ligne, cloche).

## 2. Présence En ligne / Hors ligne

- Le switch topbar pilote la visibilité dans les recherches patient. Hors ligne ⇒ bannière d'avertissement sur le tableau de bord + boutons « initier » désactivés côté patient.
- Passage hors ligne **automatique** à la fin du dernier créneau d'agenda.
- `PATCH /soignants/me/presence {enLigne}` + heartbeat. **[À TRANCHER : présence = manuelle seule ou heartbeat + manuel]**

## 3. Poignée de main (côté pro)

- Carte de demande : motif, âge, zone, temps d'attente, antécédents en chips, montant.
- « Confirmer » → `POST /consultations/:id/confirmation` → la session se crée, en attente du paiement patient ; le cockpit s'ouvre.
- « Plus tard » → la demande reste en file **[À TRANCHER : délai avant expiration + pénalité éventuelle de non-réponse]**.

## 4. Cockpit de session

**Panneau dossier (gauche)** :
- Identité + constantes (chips tension/pouls/température, issues du dernier triage).
- Bannière rouge **allergie** (garde-fou).
- Onglet Dossier : pré-consultation, antécédents, « ouvrir le dossier complet ».
- Onglet Ordonnance : lignes médicament (nom + posologie), ajout/retrait, **vérification automatique des allergies** (`POST /ordonnances/verification` → conflits[]) ; bannière verte « aucun conflit » sinon blocage rouge ; « Signer (QR) » → `POST /ordonnances` → carte ORD signée transmise dans le fil du patient.

**Messagerie (droite)** — voir `05` §Messagerie pour le contrat complet. Spécifique pro :
- Récapitulatif « Lu à HH:MM » sous le dernier message envoyé.
- Menu contextuel **au survol** (desktop) : Répondre / Copier / Modifier / Supprimer pour tous / pour moi.
- Bouton « Compte-rendu » : rédaction obligatoire avant clôture ; versé au dossier patient. **[À TRANCHER : gabarit du compte-rendu — champs libres ou structurés]**
- Aperçu média avant envoi **dans la colonne droite uniquement** (le dossier reste visible).

## 5. Gains

- Crédit après chaque acte : montant net (commission contractuelle déduite, affichée par transaction).
- « Retirer vers MoMo » → `POST /retraits {montant, msisdn}` ; états : en cours / versé / échoué.
- Le contrat de commission « jamais modifiée sans préavis » est affiché — c'est un engagement produit.

## 6. Vérification (M03) — côté pro

- À l'inscription : dépôt diplôme + numéro d'ordre + pièce d'identité → file du back-office.
- Tant que non vérifié : profil invisible des patients **[À TRANCHER : ou visible sans badge ?]**.
- L'annuaire affiche l'état du dossier de vérification.

## 7. Hors maquette — à construire

- Onboarding pro (dépôt de dossier) ; gestion fine des tarifs (création de prestations) ; téléconsultation vidéo (affichée « V1 » dans la maquette = hors MVP) ; statistiques détaillées ; multi-appareils.
