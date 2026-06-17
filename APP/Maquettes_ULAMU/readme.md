# ULAMU — Design System

> **ULAMU** est une plateforme de santé numérique de confiance pour le **Congo-Brazzaville**. Elle numérise le parcours de soin réel — celui que chaque Congolais connaît déjà — étape par étape : inscription et dossier médical gratuits à vie, consultation par messagerie chronométrée payée par Mobile Money *après* la poignée de main, ordonnance signée à QR code, recherche de médicaments par dévoilement-réservation, suivi des malades chroniques. Langue : **français uniquement** au lancement.

Ce dépôt est le **système de design** d'ULAMU : tokens CSS, fontes, composants React réutilisables, et UI kits haute-fidélité des deux produits.

---

## 1. Contexte produit

ULAMU couvre **deux surfaces** distinctes (décision D-012 : *mobile = patients, desktop = tous les autres*) :

| Produit | Plateforme | Acteurs | Navigation |
|---|---|---|---|
| **App patient** | Mobile (Android 8+, 2 Go RAM, écran 5") | Patients | 3 onglets **Accueil / Consultations / Mon espace** + bouton **Urgence** flottant (D-013) |
| **App professionnel** | Desktop | Soignants (prescripteurs & non-prescripteurs), structures (pharmacies, labos), équipe ULAMU | **Sidebar 240px** + topbar contextuelle |

**Mécanismes signatures** (ce qui rend ULAMU unique) :
- **La poignée de main avant paiement** (D-007) — aucun paiement tant que le pro n'a pas confirmé.
- **La session chronométrée** (D-006) — décompteur visible en permanence, prolongation gratuite. → composant `SessionTimer`.
- **Le dévoilement-réservation** (D-009) — disponibilité des médicaments anonyme gratuite, précise et garantie quand on la paie.
- **Le dossier médical à vie** — chaque acte enrichit l'historique du patient.
- **Le badge « vérifié »** (M03) — actif de confiance qui protège les soignants. → composant `VerifiedBadge`.

**Contraintes UX issues du cahier des charges :** décompteur de session toujours visible ; états « hors ligne » sur les écrans concernés ; jamais de contenu médical sur écran verrouillé/notifications ; boutons « initier » uniquement si le pro est en ligne ; QR lisibles en plein soleil ; **vocal en première classe** (faible littératie) ; app légère (économie de data).

### Sources fournies
- **`Charte Graphique/`** — 11 documents HTML de référence (CG-01 Couleurs & tokens · CG-02 Typographie · CG-03 Espacements & grilles · CG-04 Effets & atmosphère · CG-05 Composants fondamentaux · CG-06 Navigation · CG-07 Données & contenu · CG-08 Feedback · CG-09 Animations · CG-10 Iconographie & assets · CG-11 États & accessibilité). **Source de vérité des tokens et composants.**
- **`cahier_des_charges/`** — coffre Obsidian (vision, personas, 16 modules, ADRs). Phase 4 UX/UI hors périmètre (D-039) : maquettes par le porteur, dans le respect de la charte.

Ces dossiers sont montés en lecture seule chez le porteur ; ils ne sont pas inclus ici mais référencés pour traçabilité.

---

## 2. Fondamentaux de contenu (copywriting)

- **Langue : français**, exclusivement. Vouvoiement du patient et du professionnel (« Vous êtes hors ligne », « Décrivez votre motif »).
- **Ton : clair, rassurant, direct, jamais condescendant.** On explique la mécanique de confiance en une phrase (« Aucun franc n'est débité tant que le médecin n'a pas confirmé »).
- **Casse : phrase normale.** Titres en *sentence case* (« Poignées de main à confirmer »), jamais en ALL CAPS sauf micro-labels mono (`PRO`, `ORD-412`, codes).
- **Vocabulaire métier ubiquitaire** (à respecter) : *poignée de main*, *session*, *compte-rendu*, *dévoilement*, *réservation*, *dossier*, *carnet*, *ordonnance*, *délivrance*, *triage*, *structure*, *titulaire*.
- **Chiffres & argent : format français.** Espace comme séparateur de milliers, devise **F** (FCFA) suffixée : `5 000 F`, `12 000 F`. Pourcentages avec espace : `+12 %`.
- **Codes & identifiants** en `JetBrains Mono` : `ORD-2026-00412`, durées `30 min`, mesures `13/8`, `36,8 °C` (virgule décimale française).
- **Emoji : interdits**, partout — ni dans l'UI, ni dans les contenus, ni comme icône. Toute icône passe par le composant `Icon` (SVG).
- **Exemples réalistes** : noms congolais (Mireille Nkounkou, Dr Armel Konaté, Nadège Loemba), lieux (Talangaï, Poto-Poto, Pointe-Noire, Madingou), opérateurs (MTN MoMo, Airtel Money).

---

## 3. Fondations visuelles

**Thème par défaut : SOMBRE.** Le système supporte clair (`[data-theme="light"]`) et sombre (`:root` / `[data-theme="dark"]`). Tout est piloté par tokens — voir `tokens/`.

- **Couleur.** Accent unique **Bleu Cobalt** `--accent-500 #2756A6` (hover `#1F479A`), échelle 50→900. Neutres Zinc. Sémantiques success (vert `#3D9A5C`/`#4CAF6E`), warning (ambre `#C49128`), error (rouge `#C44040`), info (= accent). **Une seule teinte d'accent** — pas de seconde couleur de marque.
- **Typographie.** Display **Plus Jakarta Sans** (700/800, tracking négatif sur grandes tailles) · Corps **Inter** (400/500) · Mono **JetBrains Mono** (codes, IDs, chiffres, mesures). Échelle nommée display-2xl→caption + code (voir `tokens/typography.css`).
- **Espacement.** Base **4px**, échelle `--sp-1`→`--sp-32`. Cards padding ≥ `--sp-5` (20px). Gap KPI = `--sp-4`. Sections séparées d'au moins `--sp-8`.
- **Rayons.** `sm 4` · `md 6` (boutons, inputs, logo mark) · `lg 10` (cards) · `xl 14` (grands panneaux) · `full`.
- **Grain sérigraphié — signature.** Overlay SVG *fractalNoise* à deux niveaux : un brouillard global sur le `body` (opacité `--grain-opacity` 0.035 clair / 0.055 sombre) **et** un grain plus marqué sur **chaque bouton** (`--grain-btn` 0.06 / 0.09) via un calque interne. C'est l'effet « affiche sérigraphiée » caractéristique d'ULAMU.
- **Surfaces glass.** Topbar (blur 12px), sidebar (blur 14px), toasts, overlays : `--glass-bg` semi-transparent + `backdrop-filter: blur()` + bord `--glass-border`. Toujours un fallback de couleur opaque.
- **Ombres.** 4 paliers `--shadow-sm/md/lg/xl`, plus prononcés en sombre. Cards = sm (md au survol) ; dropdowns = md ; toasts/menus = lg ; modales/drawers = xl. Jamais d'ombre xl sur un élément en flux.
- **Dégradés : quasi interdits.** Aucun dégradé bleu-violet, aucun fond/bouton/badge en dégradé. **Seule exception** : le remplissage des *area charts* (dégradé vertical, même teinte que la courbe, opacité 0.18→0).
- **Cartes.** `--bg-elevated`, bord `--border-subtle`, rayon `lg`, ombre `sm`, grain optionnel. Survol interactif : `translateY(-2px)` + ombre `md`.
- **Mouvement.** Durées tokenisées `--dur-fast 150` / `--dur-base 200` (défaut) / `--dur-moderate 250` / `--dur-slow 350`. Easing : `ease-out` (entrées), `ease-in` (sorties), **`--ease-spring` cubic-bezier(.34, 1.56, .64, 1)** pour toggles, coches, toasts, modales. **Press = `scale(0.97)` en 80ms** (feedback quasi-instantané). Jamais de boucle décorative infinie, jamais > 400ms sur une interaction courante. Skeleton shimmer = 1400ms infini (seule exception).
- **Focus.** Anneau `3px rgba(39,86,166,0.30)`, offset 2px, sur tout élément interactif.
- **Layout.** Sidebar 240px (réduite 56px) ; topbar 56px ; contenu max 1140px, padding `--sp-12` haut / `--sp-16` bas / `--sp-8` côtés. Sur mobile, la sidebar devient une bottom navigation.

---

## 4. Fontes — note d'intégration

Les trois familles (**Plus Jakarta Sans**, **Inter**, **JetBrains Mono**) sont disponibles **à l'identique sur Google Fonts** : aucune substitution n'a été nécessaire. Elles sont chargées via `@import` Google Fonts dans `tokens/fonts.css`.

> **À décider avec le porteur** : pour un usage hors-ligne / production souveraine, remplacer l'`@import` par des `@font-face` pointant des `.woff2` auto-hébergés. Les binaires n'ont pas été fournis ; dites-le-moi et je les intègre.

---

## 5. Iconographie

- **Système : Lucide Icons, SVG exclusivement.** `stroke: currentColor`, `stroke-linecap/linejoin: round`. Jamais d'`<img>`, jamais d'icon-font, **jamais d'emoji ni de caractère Unicode** comme icône (interdiction totale dans la charte CG-10).
- **Grille & trait.** Le système ULAMU dessine ses icônes sur une grille **16×16** ; trait **1.5** par défaut (1.4 en grande taille / nav, **2** pour `plus`/`check` et états critiques).
- **Tailles.** `xs 12` (badges) · `sm 14` (boutons) · `md 16` (nav — défaut) · `lg 20` (titres/KPI) · `xl 24` (empty states).
- **Implémentation.** Le catalogue est embarqué et auto-suffisant (offline) dans **`components/core/icons.js`** (~70 icônes : navigation, actions, états, **médical** — stethoscope, ordonnance, pill, heart-pulse, shield-check… — communication/données). On l'utilise via le composant **`<Icon name="…" />`**. Couleur par contexte : `currentColor` (hérite), blanc sur bouton primaire, `--accent-500` actif, dot sémantique sur les états.
- **Illustrations** (empty states) : outline monochrome `--text-tertiary` + un seul point focal en accent. Jamais de fill coloré hors point focal.
- **Logo.** Mark = carré rayon `md` fond `--accent-500`, glyphe blanc (goutte/silhouette de soin stylisée). Logotype **« ulamu »** en minuscules, Plus Jakarta Sans 700, tracking -0.3px. Taille mark standard 28px (min 20). Fond jamais transparent ni dégradé. Variantes : `assets/logo-mark.svg`, `logo-glyph.svg`, `logo-full.svg`, `logo-full-dark.svg`, `favicon.svg`.

---

## 6. Index du dépôt

**Entrée globale**
- `styles.css` — point d'entrée (liste d'`@import` uniquement). Les consommateurs lient ce seul fichier.
- `tokens/` — `fonts.css` · `colors.css` · `typography.css` · `spacing.css` · `effects.css` · `base.css`.
- `assets/` — logos (mark, glyph, full clair/sombre), favicon.

**Composants** (`components/`, namespace runtime `window.ULAMUDesignSystem_d14300`)
- `core/` — `Icon`, `Button`, `IconButton`, `Badge`, `Tag`, `Avatar`, `Card` (+ catalogue `icons.js`)
- `forms/` — `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `FormField`
- `feedback/` — `Banner`, `Toast`, `Tooltip`, `Modal`, `Skeleton`
- `navigation/` — `NavItem`, `Tabs`
- `domain/` — `SessionTimer` (décompteur D-006), `VerifiedBadge` (M03)

**UI kits** (`ui_kits/`)
- `auth/` — **authentification unifiée** (desktop) : panneau de marque immersif (cobalt grainé, photo illustrative via image-slot, preuves de confiance rotatives), sélection d'espace role-aware (Patient / Soignant / Structure / Équipe ULAMU), fil d'étapes pro (Rôle · Identité · Vérification · Accès), formulaires adaptatifs (téléphone sans mot de passe · email+mot de passe · double authentification ULAMU), OTP 6 cases (collage + auto-avance + renvoi), mot de passe oublié, demande d'accès structure (dépôt d'agrément → vérification), écran de succès. Thème clair/sombre partagé.
- `patient_mobile/` — app patient (Android) : **onboarding OTP**, accueil → recherche → **poignée de main → paiement MoMo → session chronométrée**, dévoilement-réservation, QR d'ordonnance, dossier, notifications, onglets + bouton Urgence. Bascule sombre/clair persistante.
- `professionnel_desktop/` — cockpit soignant : tableau de bord, consultations, patients, agenda, ordonnances, gains, annuaire + **session de consultation** (dossier patient + messagerie chiffrée + ordonnance).
- `structure_pharmacie/` — espace structure (Pharmacie du Marché) : réservations 24 h, **délivrance par scan QR**, stock vivant par lots (règle de fraîcheur), gains dévoilements, membres (titulaire + équipe).
- `structure_labo/` — espace laboratoire (Laboratoire Avenir) : demandes d'examens prescrites via ULAMU, **accueil patient par scan QR**, saisie + **validation des résultats par le biologiste** (valeurs hors normes signalées), versement au dossier + notification du prescripteur, catalogue d'examens, gains, membres.
- `backoffice/` — back-office ULAMU (M16) : pilotage du réseau (KPIs, activité, alertes opérationnelles), **file de vérification du badge vérifié** (examen des dossiers, accord/rejet tracés), litiges (remboursement auto + arbitrage), structures, **journal inaltérable** (M04).

**Specimens** (`guidelines/`) — cartes de fondation affichées dans l'onglet Design System (Type, Colors, Spacing, Brand).

**Handoff développeur** (`handoff/`) — spécifications d'implémentation par surface (écrans → routes → états → événements → données) + fondations techniques transverses et liste des décisions à trancher. Point d'entrée : `handoff/README.md`.

**Autres** — `SKILL.md` (skill Claude/agent), `readme.md` (ce fichier).

---

*Système dérivé de la Charte Graphique ULAMU (11 documents CG) et du cahier des charges (vision, personas, modules). Thème sombre par défaut. Français. Une teinte d'accent. Grain + glass. Pas de dégradés (hors area charts).*
