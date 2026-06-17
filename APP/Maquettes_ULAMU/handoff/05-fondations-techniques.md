# 05 — Fondations techniques transverses

> Ce document couvre ce que les maquettes **simulent** et qu'il faut construire pour de vrai. Chaque section référence la maquette qui montre le comportement attendu.

## 1. Consommer le design system

- Lier **`styles.css`** (racine du dépôt) : tokens couleurs (sombre par défaut + `[data-theme="light"]`), typo (Plus Jakarta Sans / Inter / JetBrains Mono via Google Fonts — auto-héberger en production), espacements, ombres, grain, durées/easing.
- Les composants `components/` (Button avec grain, Input, Badge, SessionTimer, VerifiedBadge…) sont la **référence cosmétique** ; les `.d.ts` donnent les contrats de props. En prod : réimplémenter dans la stack cible en conservant les tokens.
- Icônes : catalogue SVG embarqué `components/core/icons.js` (style Lucide 16×16, `currentColor`). **Jamais d'emoji ni d'icon-font.**
- Thème : attribut `data-theme` sur `<html>`, persisté (`localStorage ulamu-theme` dans les maquettes), bascule dans le menu utilisateur (desktop) / en-tête (mobile).

## 2. Authentification & comptes

- Patient : téléphone = identifiant, OTP SMS 4 chiffres, pas de mot de passe (maquette onboarding). Sessions longues + re-vérification pour actions sensibles. **[À TRANCHER : durée de session, ré-auth]**
- Pro / structures / admin : **[À TRANCHER : OTP aussi, ou mot de passe + 2FA pour desktop ?]**
- Rôles : patient · soignant (prescripteur | non-prescripteur) · structure (titulaire | membre, par capacité) · admin ULAMU. Contrôles côté serveur systématiques (anti-IDOR : tout accès vérifie l'appartenance).

## 3. Paiements Mobile Money (MTN MoMo, Airtel Money)

- Séquence D-007 : confirmation pro **avant** `requestToPay` ; le patient valide avec son code secret **sur son téléphone, jamais dans l'app** (affiché dans la maquette).
- Webhooks de confirmation ; états : initié / confirmé / échoué / remboursé.
- **Remboursement automatique** : session non honorée, réservation non tenue → déclenché par la machine, journalisé.
- Reçu systématique ; « jamais un franc de plus que le prix affiché » (écran Mes paiements).
- **[À TRANCHER : agrégateur vs intégrations directes ; gestion de l'escrow (capture immédiate + remboursement, ou pré-autorisation si disponible)]**

## 4. QR signés (ordonnances, demandes d'examens, réservations)

- Payload signé serveur (type JWS) : `{type, id, patientId, émetteur, expiration}` — vérifiable hors base puis confirmé en ligne au scan.
- Anti-rejeu : statut « déjà délivrée / déjà honorée » vérifié serveur (modale pharmacie : « jamais délivrée »).
- Affichage : zone **blanche forcée**, contraste max, code humain de secours (ORD-2026-00412) si la caméra échoue.

## 5. Messagerie de session (contrat complet — voir doc source `uploads/18-messagerie-interne-chiffree.md`)

Adaptation ULAMU implémentée dans les maquettes (mobile `chat.jsx`/`session.jsx`, desktop `chat-pro.jsx`/`cockpit.jsx`) :
- **1-à-1 uniquement** (pas de groupes), **pas de réactions emoji** (charte).
- Accusés 3 états : envoyé ✓ / remis ✓✓ / lu ✓✓ coloré + récap « Lu à HH:MM » ; propagation temps réel (SSE/WebSocket) + invalidation de cache.
- Envoi optimiste (opacité 0,75 + « envoi… ») ; pagination 50/page ; regroupement par auteur < 4 min ; séparateurs de date sticky.
- Réponses/citations (aperçu 120 car., clic = scroll vers l'original) ; édition ≤ 15 min (« modifié · ») ; suppression « pour moi » (masquage par utilisateur) et « pour tous » ≤ 15 min **avec trace « Message supprimé »** (choix ULAMU : traçabilité médicale).
- Notes vocales : enregistreur 44 barres, max 300 s, envoi direct ; lecteur 36 barres, seek, vitesses 1×/1,5×/2×.
- Médias : 10 fichiers max/message ; image ≤ 8 Mo (compression canvas), vidéo ≤ 16 Mo et ≤ 120 s, audio/document ≤ 16 Mo ; aperçu avant envoi (légende, miniatures) ; album en bulle (grilles 1/2/3/4/+N) ; lecteur plein-cadre **local à la zone de fil**.
- Sécurité : chiffrement au repos AES-256-GCM (clé versionnée), validation MIME + signature binaire, noms de fichiers assainis, rate-limit envoi (~40/min/utilisateur).
- Spécifique ULAMU : le fil appartient à une **session chronométrée** — décompteur toujours visible, prolongation, clôture avec compte-rendu ; bulle « ordonnance signée » riche dans le fil.

## 6. Hors-ligne & réseau (exigence terrain)

- File d'attente d'envoi persistante (messages, prises de rappel) avec rejeu à la reconnexion — l'optimiste de la maquette le préfigure.
- Cache local : dossier médical, ordonnances + QR (consultables sans réseau), catalogue.
- Bannière « Vous êtes hors ligne — synchronisation au retour du réseau » (composant Banner, déjà montré).
- **[À TRANCHER : périmètre offline exact du MVP — lecture seule (dossier/QR) vs file d'écriture complète]**

## 7. Notifications

- Canaux : push (FCM) + SSE in-app + SMS de secours pour les événements critiques (confirmation de poignée de main). **[À TRANCHER : budget SMS]**
- **Jamais de contenu médical** dans une notification (titre générique « Nouveau message » — règle affichée dans la maquette Notifications).

## 8. Sécurité & conformité

- Chiffrement au repos du contenu médical ; TLS partout ; anti-IDOR systématique ; rate-limits.
- Journal inaltérable (M04) : append-only + chaînage d'empreintes (cf. `04-backoffice.md`).
- Verrouillage app : pas d'aperçu de contenu médical en multitâche/écran verrouillé.
- **[À TRANCHER : cadre réglementaire santé Congo-Brazzaville — voir `cahier_des_charges/00_cadrage/cadre_reglementaire.md` du porteur]**

## 9. Performance (budget)

- Cible : Android 8+, 2 Go RAM, 3G. Bundle initial léger, images compressées côté client avant envoi, pas de dépendances lourdes, polices sous-ensemble latin.
- Animations : tokens `--dur-*` (150–350 ms), spring uniquement sur les micro-feedbacks ; aucune boucle décorative.

## 10. Liste consolidée des [À TRANCHER]

1. Délai d'expiration d'une poignée de main + politique de non-réponse pro
2. Nombre max de prolongations de session
3. Gabarit du compte-rendu (libre vs structuré)
4. Visibilité d'un pro non encore vérifié
5. Délivrance partielle en pharmacie ; format d'import de stock
6. Politique de remboursement du dévoilement (cas par cas)
7. Référentiel des intervalles biologiques (labo)
8. Matrice de droits des membres de structure
9. Vérification ordre des médecins : manuelle ou intégrée ; renouvellement du badge
10. Barème de sanctions litiges + appel
11. Auth desktop (OTP vs mot de passe + 2FA) ; durées de session
12. Intégration MoMo : agrégateur vs direct ; escrow
13. Périmètre offline du MVP ; budget SMS
14. Numéro du service de garde (Urgence) ; texte CGU
15. Auto-hébergement des polices (production souveraine)
