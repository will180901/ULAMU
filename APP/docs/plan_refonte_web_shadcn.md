# Plan de refonte — Application web ULAMU sur shadcn/ui

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-08-09 |
| Statut | 🟡 Proposé — à valider par le porteur |
| Remplace | [`plan_frontend_web_2026-08-05.md`](plan_frontend_web_2026-08-05.md) *(conservé pour l'historique)* |
| Périmètre | `APP/apps/web` **uniquement** |

---

## 0. Comment lire ce document

Il a **deux lecteurs** :

1. **Claude Design**, qui produira **toutes les maquettes** à partir de ce plan. Les sections 1 à 6 sont sa commande.
2. **Le développeur** (moi), qui construira les interfaces **en suivant ces maquettes**. La section 7 est mon ordre de bataille.

> ⚠️ **Ce que ce plan ne touche PAS, sous aucun prétexte :**
> - **L'API** (`apps/api`) — aucun endpoint, aucun contrat, aucune ligne
> - **L'application mobile** (`apps/mobile`) — React Native, sans aucun code partagé avec le web
> - **Le déploiement** — `render.yaml` reste tel quel : `npm install && npm run build`, publication de `dist`

---

## 1. ⛔ Les deux règles intangibles

**À lire avant tout le reste.** Ces deux éléments sont les seuls du web actuel qui plaisent au porteur. Ils survivent au grand ménage, à l'identique.

### Règle 1 — Les écrans d'authentification gardent leur mise en page

Les quatre écrans (`/login`, `/inscription`, `/mot-de-passe-oublie`, `/configuration-totp`) conservent **exactement** :

- **Zone gauche** : le carrousel d'illustrations avec son animation, ses **5 illustrations existantes** (`slide-online-doctor`, `slide-prescription`, `slide-medicine`, `slide-pharmacist`, `slide-insurance`) et **ses textes actuels** (« Trouvez un soignant vérifié », « Payez en toute transparence », « Retirez-les en pharmacie en toute confiance »…), ainsi que ses points de pagination.
- **Zone droite** : le logo, le sous-titre, les champs du formulaire, les liens.
- Le **fond mesh gradient animé** et le **grain** qui les habillent.

Ce qui **peut** changer : les composants internes (champs, boutons, alertes) deviennent des composants shadcn. La **structure et l'atmosphère**, non.

### Règle 2 — Le logo ULAMU est conservé

Le logo (marque + mot-symbole « ulamu ») reste tel qu'il est aujourd'hui, dans la barre latérale comme sur les écrans d'authentification. Aucune réinterprétation.

---

## 2. L'intention de design

### La référence

**Linear.** Interface dense mais respirante, monochrome, où la couleur ne sert qu'à porter du sens.

### Les sept principes

**① Monochrome pour la structure, couleur pour le sens.**
Surfaces, bordures, textes, icônes : gris. La couleur (cobalt ULAMU) est réservée à ce qui *signifie* — l'élément actif, un statut, une action primaire. Le rouge, l'ambre et le vert ne servent qu'aux états : erreur, alerte, succès. Une interface où tout est coloré est une interface où rien ne ressort.

**② Des bordures visibles, pas suggérées.**
Chaque carte, chaque bouton, chaque champ porte une bordure fine que l'œil voit réellement — pas un `rgba` à 4 % qui disparaît sur un écran d'officine mal calibré. C'est la bordure qui structure, pas l'ombre.

**③ Du grain, franchement.**
Le grain sérigraphié de la charte (`CG-04`) est présent et **assumé** : sur les surfaces, la barre latérale, la topbar. Subtil mais perceptible. C'est la signature visuelle d'ULAMU.

**④ Du verre dépoli là où ça flotte.**
Barre latérale, topbar, menus, dialogues : fond translucide avec flou d'arrière-plan. Ce qui flotte doit se voir flotter.

**⑤ Des listes qui se lisent.**
Alternance de lignes en teintes douces, hauteur de ligne confortable, pagination propre en bas. Une liste de 40 lignes sans alternance est illisible au bout de dix.

**⑥ Une hiérarchie typographique nette.**
Titres nettement plus lourds que le corps. Les valeurs numériques et les codes en monospace. Aucun palier inventé hors de l'échelle.

**⑦ Le vide est un matériau.**
Espacements généreux, respiration entre les blocs. Une interface dense n'est pas une interface serrée.

### Les interdits

- ❌ Aucun dégradé (sauf remplissage de graphique)
- ❌ Aucune ombre portée sur un élément posé à plat — l'ombre est réservée à ce qui flotte
- ❌ Aucun rayon supérieur à 10 px
- ❌ Aucun noir pur ni blanc pur — encre douce
- ❌ Aucune couleur seule pour porter une information (toujours icône + texte)
- ❌ Aucune animation au-delà de 350 ms

---

## 3. La base technique

### La commande d'installation

Depuis `APP/apps/web`, dossier vidé de ses interfaces :

✅ **Exécuté le 09/08/2026.** Voici les commandes réellement passées — elles diffèrent de la première
rédaction de ce plan, et les écarts sont documentés dessous parce qu'ils se reproduiraient.

```bash
npx shadcn@latest init --base radix --preset nova --yes --force --no-reinstall
npx shadcn@latest add --all --yes
```

- `npx`, pas `pnpm dlx` — `render.yaml` déploie le web avec `npm install`. Introduire pnpm ici
  obligerait à modifier la configuration Render, ce qu'on s'est justement engagé à ne pas faire.
- **Pas de `--template vite`.** Cette option échafaude un projet NEUF ; sur un dossier existant elle
  écrirait par-dessus le nôtre. Sans elle, le CLI détecte seul (« Found Vite », « Tailwind v4 »).
- `--preset nova` — les préréglages s'appellent `nova, vega, maia, lyra, mira, luma, sera, rhea` et
  **pas** `radix-nova` : la base et le préréglage sont deux options distinctes. Nova retenu parce
  qu'il utilise **Lucide**, la bibliothèque d'icônes déjà installée dans le projet.
- **Aucun code à générer sur `ui.shadcn.com/create`** : `baseColor` vaut déjà `neutral` par défaut.
- `--yes --force --no-reinstall` — sans ces trois options le CLI ouvre des invites interactives et
  reste bloqué dans un terminal non interactif.

**Un obstacle à connaître.** `init` échoue avec « Could not load the workspace config » tant que
`tsconfig.json` ne contient pas l'alias. Chez nous il vivait dans `tsconfig.app.json` (fichier
solution à la racine, qui ne porte que des `references`). Corrigé en déclarant aussi à la racine :

```json
"compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] } }
```

Sans effet sur `tsc -b`, puisque ce fichier ne compile rien lui-même.

**Résultat** : 62 composants dans `src/components/ui/`, plus `src/lib/utils.ts` et
`src/hooks/use-mobile.ts`.

### Le gestionnaire de paquets

Le dépôt est un **monorepo pnpm** (`pnpm-workspace.yaml`, `pnpm-lock.yaml`). Toutes les commandes de ce chantier utilisent **pnpm**, pas npm. *(Un `package-lock.json` parasite a été généré par erreur le 05/08 : à supprimer.)*

### L'injection de la charte

Le preset neutre pose la structure ; la charte ULAMU la colore. Concrètement, on remappe les variables shadcn sur les tokens ULAMU :

| Variable shadcn | Token ULAMU |
|---|---|
| `--primary` | cobalt `#2756A6` |
| `--background` / `--card` | fonds de la charte, clair et sombre |
| `--border` / `--input` | bordures de la charte |
| `--ring` | cobalt (anneau de focus unique) |
| `--radius` | 10 px maximum |
| `--destructive` | rouge d'erreur de la charte |

> Ce pont **existe déjà** dans `globals.css` (bloc « Pont shadcn ») et n'avait jamais servi. Il est repris tel quel.

---

## 4. Les tokens ULAMU à respecter

Extraits de la charte graphique (`APP/docs/Charte Graphique/`, CG-01 → CG-11). **Ce sont des contraintes, pas des suggestions.**

### Couleurs

- **Accent de marque** : cobalt `#2756A6` (400) / `#1F479A` (500 survol)
- **États** : succès, erreur, alerte, info — chacun avec fond, texte, accent et bordure propres
- **Thème sombre** : couleurs **recalculées**, pas éclaircies. Fond `#0D1117`, texte `#E6EDF3`
- **Tons** (bleu, violet, émeraude, ambre, cyan, rose) : réservés à la distinction des rôles, jamais décoratifs

### Typographie — `CG-02`, référentiel **fermé**

> *« Aucune police utilisée dans l'interface ne doit être hors de ce référentiel. »*

| Famille | Rôle |
|---|---|
| **Plus Jakarta Sans** | titres, KPI, logo |
| **Inter** | corps, labels, tableaux, aides |
| **JetBrains Mono** | codes d'ordonnance, identifiants, valeurs techniques, libellés de section |

**16 paliers** définis, chacun avec taille + poids + interlignage : `display-2xl` 40/800/1.1 … `caption` 11/400/1.45, `code` 13/400/1.6.

> 💡 **Recommandation sur les « polices rares ».** Le porteur souhaitait des polices plus caractérielles. Ma recommandation est de **garder ces trois-là** : Inter est précisément la police d'interface de Linear, et Plus Jakarta Sans apporte déjà le caractère sur les titres. En changer imposerait d'amender `CG-02` officiellement — faisable, mais c'est une décision de marque, pas de mise en œuvre. **À trancher avant les maquettes si le porteur y tient.**

### Rayons, espacement, mouvement

- **Rayons** : 4 / 6 / 8 / 10 px — **plafond 10 px**
- **Espacement** : base 4 px
- **Durées** : 80 ms (appui) · 150 ms (micro-retour) · 200 ms (survol) · 250 ms (menus) · 350 ms (plafond)
- **Courbes** : `ease-out` à l'entrée, `ease-in` à la sortie, toujours symétriques
- **`prefers-reduced-motion`** : obligatoire

### Structure — `CG-06`

- **Barre latérale** : étendue 240 px · réduite 56 px (icônes + infobulle) · cachée en surimpression sur mobile. Glass + grain **obligatoires**. Item 32 px, fond actif `rgba(39,86,166,0.12)`, libellés de groupe en **monospace majuscule**.
- **Topbar** : 56 px, **sticky** et **grain** obligatoires, recherche 280 px avec raccourci.
- **Menus** : fond élevé, bordure 1 px, rayon 10 px, **ombre obligatoire** (« jamais plat »), item 36 px. Actions destructives **en bas, en couleur danger, précédées d'un séparateur**.

---

## 5. Les écrans à maquetter

**23 écrans**, répartis en 5 groupes. Pour chacun : à quoi il sert, ce qu'on y voit, les composants shadcn à privilégier.

### Groupe A — Authentification (4 écrans) — ⛔ règle 1

Mise en page **imposée** : carrousel animé à gauche, formulaire à droite.

| # | Écran | Contenu | Composants |
|---|---|---|---|
| A1 | **Connexion** | identifiant ou email, mot de passe, lien mot de passe oublié, bouton, lien inscription. Second écran pour le code TOTP. Encart « session expirée » si retour forcé | `Field`, `Input`, `Button`, `Alert`, `Input OTP` |
| A2 | **Inscription** | 5 étapes : type de compte (2 grandes cartes cliquables) → identité → profil pro → sécurité **+ case CGU bloquante** → code email | `Card`, `Field`, `Select`, `Checkbox`, `Input OTP`, `Progress`/`Tabs` |
| A3 | **Mot de passe oublié** | identifiant, code d'authentificateur, nouveau mot de passe, puis écran de confirmation | `Field`, `Input OTP`, `Alert` |
| A4 | **Configuration 2FA** | obligatoire avant tout accès : QR code, saisie du code, **codes de secours affichés une seule fois** | `Card`, `Input OTP`, `Alert`, `Kbd` |

### Groupe B — Coquille et commun (3 écrans)

| # | Écran | Contenu | Composants |
|---|---|---|---|
| B1 | **Coquille applicative** | barre latérale 3 états + **bloc utilisateur en pied** (avatar, nom, rôle) ouvrant un menu : *Mes paramètres · Thème · Se déconnecter* (en bas, danger, après séparateur). Topbar : recherche ⌘K, notifications à pastille, réglages | `Sidebar`, `Dropdown Menu`, `Avatar`, `Command`, `Tooltip`, `Separator` |
| B2 | **Tableau de bord** | **dépend du rôle**. Soignant : demandes en attente, consultations du jour, gains du mois. Pharmacie : réservations à servir, alertes de stock, délivrances. Admin : file de vérification, KPIs | `Card`, `Chart`, `Badge`, `Empty` |
| B3 | **Mes paramètres** | appareils connectés (déconnexion à distance, **la session courante n'a pas de bouton**), changement de numéro en 2 étapes, clôture de compte | `Table`/`Item`, `Field`, `Alert Dialog`, `Alert` |

### Groupe C — Espace soignant (6 écrans)

| # | Écran | Contenu | Composants |
|---|---|---|---|
| C1 | **Ma vérification** | statut du dossier, 4 pièces à téléverser avec état, dépôt bloqué si incomplet, motif de refus, **contrat + signature** | `Card`, `Badge`, `Progress`, `Field`, `Alert` |
| C2 | **Ma vitrine** | présence (3 états côte à côte avec leur conséquence), profil public (spécialité, arrondissement, biographie), offres de soin (liste, création, retrait) | `Toggle Group`, `Textarea`, `Table`, `Dialog`, `Badge` |
| C3 | **Demandes** ⭐ | poignées de main entrantes, **compte à rebours visible**, confirmer / refuser **avec motif obligatoire**. Section « en attente de paiement » | `Card`, `Badge`, `Button`, `Textarea`, `Empty` |
| C4 | **Consultations** | historique, filtrable, groupé | `Table`, `Tabs`, `Pagination`, `Badge` |
| C5 | **Consultation** ⭐ | fil de discussion avec le patient, **minuteur serveur**, pré-consultation, compte-rendu de fin | `Message`, `Message Scroller`, `Bubble`, `Textarea`, `Attachment` |
| C6 | **Mes gains** | solde, historique des versements, demande de retrait en 2 étapes | `Card`, `Chart`, `Table`, `Pagination` |

### Groupe D — Espace pharmacie (4 écrans)

| # | Écran | Contenu | Composants |
|---|---|---|---|
| D1 | **Ma pharmacie** | la structure, **membres et droits** (stock / délivrance / statistiques, un par un), invitation, **transfert de titularité en 2 codes** | `Table`, `Checkbox`, `Dialog`, `Field`, `Alert` |
| D2 | **Stock** | lots, **FEFO**, dates de péremption, alertes de fraîcheur, saisie d'entrées et de sorties | `Data Table`, `Pagination`, `Badge`, `Date Picker` |
| D3 | **Délivrance** | scan du QR d'ordonnance, lignes à servir, **délivrance partielle** | `Input`, `Table`, `Checkbox`, `Alert` |
| D4 | **Réservations** | file du comptoir, compte à rebours, « marquer servie ». **Jamais d'identité de patient** | `Card`, `Badge`, `Empty` |

### Groupe E — Espace administration (7 écrans)

Chaque sous-rôle ne voit que son domaine.

| # | Écran | Sous-rôle | Contenu | Composants |
|---|---|---|---|---|
| E1 | **File de vérification** | Vérification | dossiers triés par urgence, prise en charge, décision motivée | `Data Table`, `Sheet`, `Badge`, `Textarea` |
| E2 | **Supervision financière** | Finance | remboursements à trancher (**double validation : pas sa propre demande**), historique, réconciliation avec rapport d'écarts | `Table`, `Alert`, `Card`, `Badge` |
| E3 | **Paramètres métier** | Super | 40 paramètres, valeur courante, modification **avec motif obligatoire**, historique, **avertissement sur les taux contractuels** | `Data Table`, `Collapsible`, `Field`, `Alert` |
| E4 | **Administrateurs** | Super | comptes et sous-rôles, attribution, révocation (**jamais soi-même**), création | `Table`, `Toggle Group`, `Dialog`, `Alert` |
| E5 | **Pilotage** | Super | les 7 indicateurs du pilote, intégrité du journal d'audit | `Card`, `Chart`, `Badge` |
| E6 | **Signalements** | Super | modération, **hors délai mis en avant** | `Data Table`, `Badge`, `Pagination` |
| E7 | **Comptes** | Super | recherche, suspension, réactivation, bannissement | `Data Table`, `Alert Dialog`, `Badge` |

### Les états à maquetter pour chaque écran

Un écran sans ses états est une maquette incomplète :

- **Chargement** — squelettes reproduisant la structure finale, jamais un rond qui tourne seul
- **Vide** — icône + titre + description courte + **une action** (jamais d'état vide sans sortie)
- **Erreur** — icône + message + bouton réessayer
- **Plein** — le cas normal

---

## 6. 📋 Consignes pour la génération des maquettes

*Cette section est la commande à donner à Claude Design.*

### Le contexte

> ULAMU est une plateforme de santé numérique au Congo-Brazzaville. L'application web sert les **professionnels de santé**, les **pharmacies** et l'**administration** — jamais les patients, qui ont leur application mobile.
>
> Le dossier de travail est `APP/apps/web`. Il utilise **shadcn/ui avec Radix UI**, tous les composants installés. La charte graphique du projet est dans `APP/docs/Charte Graphique/` (CG-01 à CG-11).

### Le niveau d'exigence

> Produis des maquettes de **qualité professionnelle**, du niveau d'une équipe de designers produit chevronnés. La référence est **Linear** : dense, monochrome, précis, sans esbroufe.
>
> Chaque écran doit être **complet** : pas de zone « à définir », pas de texte factice évident. Utilise du contenu réaliste en français, avec des noms et des montants congolais crédibles (XAF, arrondissements de Brazzaville).

### Les contraintes absolues

> 1. **Les écrans d'authentification gardent leur mise en page** : carrousel animé à gauche, formulaire à droite, mêmes illustrations, mêmes textes.
> 2. **Le logo ULAMU est conservé** tel quel.
> 3. **Trois polices seulement** : Plus Jakarta Sans (titres), Inter (corps), JetBrains Mono (codes).
> 4. **Cobalt `#2756A6`** comme unique couleur de marque. Le reste est monochrome.
> 5. **Rayons plafonnés à 10 px.** Aucun dégradé. Bordures visibles. Grain assumé. Verre dépoli sur ce qui flotte.
> 6. **Clair ET sombre** pour chaque écran.
> 7. **Les quatre états** de chaque écran : chargement, vide, erreur, plein.

### Ce qu'il faut livrer

> Une maquette par écran (23 écrans), en clair et en sombre, plus les états. Nomme chaque fichier avec le code de l'écran de ce plan : `A1-connexion-clair`, `C3-demandes-vide`, etc.

---

## 7. Ordre de construction *(après réception des maquettes)*

| Étape | Contenu | Pourquoi cet ordre |
|---|---|---|
| **0** | Vider les interfaces, installer shadcn, injecter la charte, remettre pnpm d'équerre | Rien ne se construit sans le socle |
| **1** | Coquille + authentification | La coquille porte tous les écrans ; l'auth est la porte d'entrée et sa règle 1 est la plus sensible |
| **2** | Espace soignant | Le cœur du produit, et le plus utilisé |
| **3** | Espace pharmacie | Dépend du soignant : sans ordonnance, rien à délivrer |
| **4** | Espace administration | Aucun autre travail n'en dépend |

**Règle à chaque étape** : les tests restent verts, le déploiement ne casse jamais, on commite avant de passer à la suite.

---

## 8. Décisions déjà prises

| Décision | Choix | Date |
|---|---|---|
| Socle de composants | **Radix UI** | 09/08/2026 |
| Preset shadcn | **Neutre**, charte injectée après | 09/08/2026 |
| Stratégie | **Table rase** des interfaces web, reconstruction complète | 09/08/2026 |
| Maquettes | Produites **toutes en une fois** par Claude Design, à partir de ce plan | 09/08/2026 |

## 9. Décisions restant à prendre

| # | Question | Recommandation |
|---|---|---|
| 1 | **Les polices** : garder les trois de `CG-02`, ou amender la charte pour des polices plus rares ? | **Garder les trois.** Inter est la police de Linear ; changer impose d'amender `CG-02` officiellement |
| 2 | **Le tableau de bord** : un seul écran adaptatif, ou trois écrans distincts par rôle ? | **Un seul, adaptatif.** Trois écrans divergeraient à la première évolution |

---

*Plan proposé le 2026-08-09 · Statut : en attente de validation · Remplace `plan_frontend_web_2026-08-05.md`*
