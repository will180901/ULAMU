# Décisions d'Architecture (ADR) — ULAMU

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — revue D-040 (3 ADR ⚠️ à confirmer) |
| Documents liés | [[../01_architecture_fonctionnelle/plan_modules|plan_modules]] · [[../01_architecture_fonctionnelle/exigences_non_fonctionnelles|ENF]] |

> Une entrée par décision structurante : contexte → décision → conséquences. Les choix marqués ⚠️ exigent une vérification avant d'être définitifs.

---

## ADR-01 — Monolithe modulaire (pas de microservices)
**Contexte :** 16 modules, petite équipe, ville pilote (ENF-06 : 10 000 comptes).
**Décision :** un seul backend, découpé en interne selon les 16 modules — chaque module dans son dossier, communiquant par les contrats C1-C7 (interfaces internes + événements), jamais par accès direct aux données d'un autre module.
**Conséquences :** déploiement simple, frontières prêtes pour une extraction future en services si la charge l'exige (ENF-06 : extensible sans réécriture).

## ADR-02 — TypeScript de bout en bout
**Contexte :** mobile et web déjà fixés (D-012) ; un seul développeur principal.
**Décision :** TypeScript partout — backend, web, mobile. Un seul langage, des types partagés (contrats C1-C7 et entités du dictionnaire générés depuis une source commune).
**Conséquences :** vélocité maximale, moins d'erreurs d'interface ; recrutement futur sur un seul profil.

## ADR-03 — Backend Node.js (NestJS) + PostgreSQL
**Décision :** NestJS (structure modulaire native qui épouse nos 16 modules, injection de dépendances, discipline) ; **PostgreSQL** comme unique base de vérité (transactions ACID indispensables à M13 et M11) ; **Redis** pour files d'événements, présence et compteurs de session.
**Conséquences :** RM-13-02/RM-13-04 (journal + idempotence) s'appuient sur les transactions ; les entrées immuables (Carnet, audit) sont des tables en insertion seule.

## ADR-04 — Mobile patient : React Native
**Contexte :** ENF-01/02 (Android 8, 2 Go RAM, APK ≤ 25 Mo) ; cohérence TypeScript (ADR-02).
**Décision :** React Native (sans Expo Go en production, build optimisé Hermes) — Android d'abord (D-026).
**Alternative écartée :** Flutter (excellent, mais second langage — Dart — pour une équipe d'une personne déjà sur TS).
**Conséquences :** budget poids à surveiller dès le premier build (seuil d'alerte : 22 Mo) ; iOS en V2 quasi gratuit.

## ADR-05 — Interface professionnels/structures/admin : Web React + Vite (acte D-012)
**Décision :** l'interface professionnels/structures/admin est une application web (React + Vite), sans wrapper Electron — notifications sonores via l'API Web Notifications du navigateur (ENF-09), badge de présence géré côté serveur (PM-26).
**Conséquences :** un seul déploiement web, pas d'auto-update client à gérer (mise à jour immédiate au déploiement serveur).

## ADR-06 — Temps réel : WebSocket
**Décision :** canal WebSocket (Socket.io) pour : initiations/confirmations de poignée de main, messages de session, décompteur, présence. Repli automatique en polling long si le réseau bloque les WebSockets.
**Conséquences :** le décompteur affiché est resynchronisé par le serveur (RM-06-02) ; battement de cœur de présence M05 porté par ce canal.

## ADR-07 — Médias : stockage objet chiffré
**Décision :** photos, vocaux, documents et PDF dans un stockage objet compatible S3, chiffrés au repos, servis par URL signées à durée courte ; jamais de média en base.
**Conséquences :** ENF-02 (compression) appliquée côté client avant envoi ; purge liée aux rétentions PM-24/PM-31.

## ADR-08 — Notifications : FCM + rappels locaux
**Décision :** push via Firebase Cloud Messaging ; les **rappels de médicaments sont programmés localement** sur l'appareil (RM-14-05) — indépendants du réseau ET des aléas FCM sur les téléphones d'entrée de gamme.
**Conséquences :** double mécanisme assumé ; le centre in-app reste la vérité consultable (PM-37).

## ADR-09 — Paiements : agrégateur Mobile Money ⚠️
**Décision de principe :** ne jamais intégrer MTN et Airtel en direct — passer par un **agrégateur agréé CEMAC** couvrant le Congo-B (candidats à comparer : CinetPay, FlutterWave, SingPay… critères : couverture MTN+Airtel Congo, **API de remboursement** (critère vital pour D-008), frais, webhooks fiables, statut réglementaire).
**Conséquences :** action 4 du [[../00_cadrage/cadre_reglementaire|plan réglementaire]] avant le Chantier 2 ; RM-13-03 (ULAMU ne détient pas les fonds).

## ADR-10 — Hébergement ⚠️
**Décision de principe :** cloud avec région proche (Afrique du Sud ou Europe de l'Ouest — latence Brazzaville correcte dans les deux cas) ; **la résidence des données de santé doit être tranchée par l'avis juridique** ([[../00_cadrage/cadre_reglementaire|§1]]) avant tout choix définitif.
**Conséquences :** l'architecture ne suppose aucune région ; sauvegardes chiffrées dans une seconde région (ENF-05).

## ADR-11 — Événements internes : motif « outbox »
**Décision :** chaque module écrit ses événements (C3, C5, C7, notifications C4) dans une table de sortie au sein de **la même transaction** que son action métier ; un relayeur les distribue ensuite (Redis).
**Conséquences :** zéro événement perdu (exigence M04 « aucune perte »), zéro audit incohérent — la promesse d'inaltérabilité commence ici.

## ADR-12 — API : REST versionnée + clés d'idempotence
**Décision :** API REST `/v1/…` ; toute opération d'écriture accepte une **clé d'idempotence** générée par le client (UUID) — fondement de RM-13-04 et de la file offline (messages rejoués sans doublon).
**Conséquences :** contrat naturel avec la file de synchronisation ([[strategie_offline_sync]]).

## ADR-13 — Référentiel Medicament : source initiale ⚠️
**Décision de principe :** amorcer avec la liste nationale des médicaments essentiels (OMS/Congo) enrichie des noms commerciaux courants ; entretien par l'Équipe ULAMU via la file « lignes hors référentiel » (M09).
**Conséquences :** qualité du garde-fou allergies et de la recherche M12 ; vérifier la disponibilité d'une liste officielle congolaise exploitable.

---

*Phase 3 — 1/5 · Suivant : [[modele_menaces]] · Index : [[../00_HOME|HOME]]*
