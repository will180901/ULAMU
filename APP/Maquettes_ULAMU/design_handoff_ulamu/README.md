# Handoff : Plateforme ULAMU — implémentation de A à Z

> **Pour le développeur (ou Claude Code).** Ce document transforme les maquettes du design system ULAMU en spécification d'implémentation. Il est auto-suffisant : un développeur qui n'a pas suivi la conception doit pouvoir démarrer avec ce seul dossier + le contenu du projet.

---

## 1. Vue d'ensemble

**ULAMU** est une plateforme de télésanté pour la République du Congo (pilote : Brazzaville). Elle connecte quatre familles d'acteurs autour d'un dossier de soin unique :

1. **Patients** (mobile-first, Android low-end, réseau instable, paiement Mobile Money) ;
2. **Soignants** prescripteurs et non-prescripteurs (cockpit web desktop) ;
3. **Structures** : pharmacies et laboratoires (web desktop) ;
4. **Équipe ULAMU** : back-office de supervision (web desktop).

Le modèle de confiance repose sur : badge **vérifié** des soignants (vérification manuelle des diplômes), **poignée de main** (consentement mutuel) avant tout paiement, **session chronométrée** payée à l'acte, **journal inaltérable** des écritures sensibles, et remboursement automatique en cas de litige.

Sources de cadrage fournies par le client (montées en lecture seule pendant la conception) :
- `cahier_des_charges/` — 16 modules fonctionnels (M01–M16), décisions D-001…D-009, personas, modèle économique, document 18 (messagerie chiffrée, statut RÉALISÉ côté spec).
- `Charte Graphique/` — 11 documents CG (couleurs, typo, iconographie, grain, thèmes).

## 2. Nature des fichiers de ce paquet

Les fichiers de ce projet sont des **références de design écrites en HTML/JSX** (prototypes interactifs), **pas du code de production**. La mission est de **recréer ces écrans dans l'environnement cible** (voir §3) en réutilisant ses conventions — pas de copier-coller le HTML. Les `.jsx` des maquettes montrent la structure exacte, les états et la logique d'interaction attendue ; ils simulent le backend (données en dur, `setTimeout` pour les latences).

## 3. Environnement cible recommandé

Aucun codebase de production n'existe encore. Recommandation (à valider avec le client) :
- **App patient** : React Native ou Flutter (Android d'abord), ou PWA si le budget l'exige — exigence forte : fonctionnement dégradé hors-ligne et sur 2G/3G.
- **Surfaces web** (pro, pharmacie, labo, back-office) : React + le design system de ce projet (les tokens CSS sont directement réutilisables ; les composants `components/**/*.jsx` sont des références propres à adapter).
- **Backend** : à spécifier (voir §10 — points ouverts). Le document 18 du cahier des charges est le gabarit de spec à suivre pour chaque module.

## 4. Fidélité

**Haute fidélité (hifi).** Couleurs, typographies, espacements, rayons, ombres et micro-interactions sont définitifs et doivent être reproduits au pixel à partir des tokens (§8). Les **données** affichées (noms, montants, KPIs) sont fictives.

## 5. Les cinq surfaces — écrans, états, flux

Chaque surface a son dossier dans `ui_kits/` avec un `index.html` lançable (ouvrir dans un navigateur) et des `.jsx` lisibles. **La maquette EST la spec d'interaction** : ouvrez-la et cliquez en lisant ce qui suit.

### 5.1 App patient — `ui_kits/patient_mobile/` (mobile 390×844)

| Écran | Fichier | Spec |
|---|---|---|
| Onboarding | `onboarding.jsx` | Bienvenue → téléphone (+242) → OTP 6 chiffres (auto-focus, renvoi) → prénom → accueil. Persisté (`ulamu-onboarded`). Vocal-first : gros boutons, peu de texte. |
| Accueil / flux soignants | `screens.jsx` | Cartes profil « réseau social » : bannière cobalt grainée (grise si hors ligne) avec filigrane d'icône métier, avatar 58px à cheval, badge « Disponible maintenant » + temps de réponse, bio, stats (note·avis / patients / expérience), CTA « Voir le profil ». **Jamais de prix dans le flux** (les tarifs varient ; ils ne s'affichent que sur le profil). Badge « Très demandée » à côté de l'avatar. |
| Profil soignant & poignée de main | `flow.jsx` | Tarifs (première consultation / suivi), durée. Demande → consentement mutuel → **paiement Mobile Money simulé** → session. |
| Session de consultation | `session.jsx` + `chat.jsx` | **Messagerie complète** (voir §6) + chronomètre de session dans l'en-tête (alerte < 2 min), ordonnance reçue dans le fil, fin de session → compte-rendu. |
| Ordonnance & QR | `screens2.jsx` | Ordonnance signée avec **QR de délivrance**, dévoilement de pharmacies (500 F), réservation 24 h. |
| Pharmacies / dossier / réglages | `tabs.jsx`, `screens2.jsx` | Recherche de médicament → dévoilement → réservation. Dossier médical chronologique. Bascule thème sombre/clair. |

Règle transverse : **aucun contenu médical sur écran verrouillé** (notifications neutres).

### 5.2 Cockpit professionnel — `ui_kits/professionnel_desktop/` (1280×800)

- `desktop.jsx` — **Sidebar « shadcn »** : entête (logo + badge PRO) / corps défilable (nav Activité & Gestion + carte Gains du jour) / **pied : bouton menu utilisateur** (identité + rôle, bascule de thème Switch, Paramètres, Mon profil public, Se déconnecter en rouge ; fermeture au clic extérieur ; animation spring).
- `pages.jsx` — Tableau de bord (KPIs, demandes de poignée de main à confirmer), Consultations, Patients, Agenda, Ordonnances, Gains, Annuaire.
- `cockpit.jsx` + `chat-pro.jsx` — session de consultation : dossier patient + ordonnance signable (QR) à gauche, **messagerie enrichie** (§6, variante desktop : menu contextuel au survol) à droite. Le compte-rendu est obligatoire en fin de session.

### 5.3 Espace pharmacie — `ui_kits/structure_pharmacie/` (1280×800)

`pharmacie.jsx` + `pharmacie2.jsx` — réservations 24 h, **délivrance par scan QR** (modale : scan animé → « Ordonnance authentique » → confirmation → bannière succès), stock par lots avec **règle de fraîcheur** (structure gelée si stock non mis à jour > 48 h), gains des dévoilements, membres (titulaire + équipe, droits limités M02).

### 5.4 Espace laboratoire — `ui_kits/structure_labo/` (1280×800)

`labo.jsx` + `labo2.jsx` — demandes d'examens prescrites via ULAMU, **accueil patient par scan QR** (demande authentique, identité confirmée, tubes étiquetés), saisie des analytes puis **validation par le biologiste seul** (valeurs hors référence signalées « Élevé » en warning), versement au dossier + notification du prescripteur, catalogue (tarifs/délais/visibilité), gains (crédités à la validation), membres.

### 5.5 Back-office ULAMU — `ui_kits/backoffice/` (1280×800)

`admin.jsx` + `admin2.jsx` — pilotage (KPIs réseau, courbe d'activité, alertes opérationnelles), **file de vérification du badge** (dossiers avec documents ; signal de risque ; accord / rejet avec motif transmis ; tout tracé), litiges (remboursement automatique par la machine, l'humain n'arbitre que les comptes), structures, **journal inaltérable** (M04 — écritures chaînées par empreinte, lecture seule).

## 6. Messagerie de session (spec détaillée — commun mobile & desktop)

Implémentée d'après le document 18 du cahier des charges, adaptée au 1-à-1 médical. **Exclusions volontaires : pas de groupes, pas de réactions ni d'emoji, pas de stickers.**

- **Accusés 3 états** : `pending` (« envoi… », bulle opacité 0,75) → ✓ envoyé → ✓✓ remis (gris) → ✓✓ lu (coloré `#9DE0FF` sur bulle accent) + récapitulatif « Lu à HH:MM » sous le dernier message émis.
- **Notes vocales** : champ vide → bouton micro. Enregistreur : onde 44 barres animée (80 ms), point rouge pulsant, chrono, corbeille (annuler), envoi direct ; durée max 5 min. Lecteur : onde 36 barres cliquable (seek), tête de lecture, durée mono, **vitesse 1× / 1,5× / 2×** (chip visible pendant la lecture).
- **Réponses** : menu de bulle → carte de citation (barre accent 3px, nom, extrait) dans la bulle ; clic = défilement vers l'original.
- **Édition** : messages texte émis, fenêtre **15 min**, marqueur « modifié · ».
- **Suppression** : « pour moi » (retrait local) / « pour tout le monde » → trace **« Message supprimé »** en pointillés italiques (traçabilité médicale — jamais de disparition silencieuse).
- **Menu de bulle** : mobile = appui sur chevron → feuille d'actions en bas ; desktop = chevron au survol → popover ancré.
- **Médias** : trombone → Photos et vidéos / Document → **aperçu avant envoi** (légende, miniatures, note de compression) → album en bulle (grilles 1/2/3/4/+N) → lecteur plein-cadre local à la zone du fil (le dossier patient reste visible sur desktop) avec téléchargement.
- **Confort** : séparateurs de date sticky (« Aujourd'hui »), regroupement des messages consécutifs (marge 2px au lieu de 10px), bouton « descendre » flottant (visible si > 220px du bas), indicateur « en train d'écrire » (3 points animés), composeur auto-grandissant (Entrée = envoi, Maj+Entrée = saut de ligne, max 120px), envoi optimiste.
- **En-tête** : présence « ● en ligne » / « vu à HH:MM », mention « chiffré de bout en bout », chronomètre de session.

## 7. Thème & état partagés

- Thème **sombre par défaut**, bascule clair/sombre persistée dans `localStorage['ulamu-theme']` et partagée entre toutes les surfaces (attribut `data-theme` sur `<html>`).
- Onboarding patient persisté (`ulamu-onboarded`).
- En production : remplacer par préférence de compte + `prefers-color-scheme`.

## 8. Design tokens (source de vérité : `tokens/*.css`)

- **Accent bleu cobalt** : `--accent-500: #2756A6` (base), `#1F479A` (hover), échelle 50→900. Texte accent : `--accent-600` en clair, `--accent-300` en sombre.
- **Fonds sombre (défaut)** : base `#111113`, subtle `#18181B`, muted `#222226`, elevated `#2A2A2F`. **Clair** : `#FAFAFA` / `#F4F4F5` / `#EBEBEC` / `#FFFFFF`.
- **Sémantiques** : success/warning/error/info en 4 tokens chacun (bg/text/border/dot) — valeurs exactes dans `tokens/colors.css`.
- **Typo** : display **Plus Jakarta Sans** (700–800, letter-spacing négatif), body **Inter**, mono **JetBrains Mono** (IDs, montants, horodatages). Échelle 11→40px dans `tokens/typography.css`. Fichiers woff2 dans `assets/fonts/` + `@font-face` dans `tokens/fonts.css`.
- **Espacement** : base 4px (`--sp-1`…`--sp-32`). **Rayons** : 4/6/10/14px + full. Sidebar 240px, topbar 56px.
- **Effets** (`tokens/effects.css`) : ombres `--shadow-sm`→`--shadow-xl`, **grain sérigraphié signature** (`--grain-svg` en data-URI, opacité 0,035 clair / 0,055 sombre, 0,06–0,09 sur boutons accent), surfaces glass (`--glass-bg` + blur 12–14px), durées/`--ease-spring`.
- **Interdits de charte** : pas d'emoji, pas d'icônes ASCII, pas de dégradés décoratifs (seule exception : remplissage d'area-chart), pas de gradients bleu-violet.

## 9. Composants réutilisables (`components/`)

Namespace bundle : `window.ULAMUDesignSystem_d14300`. Chaque composant a son `.d.ts` (contrat de props) et souvent un `.prompt.md` (usage) :
- `core/` : Button (primary grainé / secondary / ghost / danger, sm–lg), IconButton, Badge (tones + dot + icon), Avatar (initiales + statut présence), Card (padding, interactive, grain), Tag, Icon (**système d'icônes SVG interne** dans `core/icons.js` — traits 1,5px ; ne pas substituer par une lib externe sans accord).
- `forms/` : Input (leftIcon), Textarea, Select, Checkbox, Radio, Switch, FormField.
- `feedback/` : Banner (4 tons), Modal (footer d'actions), Toast, Tooltip, Skeleton.
- `navigation/` : NavItem (badge compteur), Tabs.
- `domain/` : **VerifiedBadge** (pastille bleue ✓ — l'actif de confiance), **SessionTimer** (chronomètre mono avec seuil d'alerte).

## 10. Points ouverts à trancher avant développement (le « backend manquant »)

1. **API & données** : schéma (patients, soignants, structures, sessions, ordonnances, demandes d'examen, lots de stock, litiges, journal), API REST/GraphQL, temps réel (WebSocket) pour la messagerie et la présence.
2. **Auth** : OTP SMS réel (passerelle locale), sessions, rôles (patient / soignant / titulaire / membre / admin), récupération de compte.
3. **Paiement** : intégration MTN MoMo & Airtel Money (collecte à la poignée de main, séquestre pendant la session, reversement, remboursement auto), webhooks d'échec.
4. **Chiffrement de la messagerie** : protocole (le doc 18 décrit l'attendu), stockage des médias, rétention.
5. **QR signés** : format des jetons d'ordonnance / demande d'examen (signature serveur, expiration, anti-rejeu).
6. **Hors-ligne mobile** : files d'attente d'envoi, cache du dossier, dégradé 2G.
7. **Cas limites** : paiement échoué à mi-session, coupure réseau pendant un vocal, double réservation du même lot, expiration de réservation 24 h, récidive de litige.
8. **Écrans non maquettés** (volontairement) : réglages détaillés, édition réelle des tarifs/catalogues, CGU/consentements, notifications push.

## 11. Fichiers du paquet

- `readme.md` (racine projet) — guide de marque complet : fondements visuels, ton de copie, iconographie, index.
- `SKILL.md` — point d'entrée pour Claude Code (skill `ulamu-design`).
- `styles.css` → `tokens/*.css` — tokens (source de vérité).
- `components/**` — primitives React de référence.
- `ui_kits/{patient_mobile, professionnel_desktop, structure_pharmacie, structure_labo, backoffice}/` — les cinq maquettes interactives.
- `assets/` — logo, favicon, polices woff2.
- `guidelines/`, cartes `*.card.html` — spécimens visuels du Design System.

**Comment travailler** : ouvrir chaque `index.html`, dérouler le parcours, puis lire le `.jsx` correspondant comme spécification d'état et d'interaction. Implémenter module par module en suivant M01–M16 du cahier des charges, en validant chaque écran contre la maquette au pixel.
