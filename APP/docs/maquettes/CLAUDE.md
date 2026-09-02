# ULAMU — refonte web (maquettes)

Source de vérité : `uploads/plan_refonte_web_shadcn.md` (23 écrans, 5 groupes), la charte
`uploads/Charte Graphique/` (CG-01→11), le patrimoine `uploads/patrimoine-web/`, et le codebase
monté `web/` (tokens réels dans `web/src/styles/globals.css`).

> ## ⚠️ Périmètre — trois acteurs depuis le 02/09/2026 (D-051)
>
> ULAMU a **trois acteurs** : le **patient** (mobile), le **soignant** et l'**administration** (web).
> Le compte « membre de structure » (`FACILITY_MEMBER`) est **retiré du produit**.
>
> **Conséquences pour ces maquettes, qui ne sont PAS modifiées** — ce sont des artefacts de
> conception, et les corriger effacerait ce que le projet a envisagé :
>
> - **D1 « Ma pharmacie », D2 « Stock », D3 « Délivrance », D4 « Réservations »** sont **hors
>   produit**. Elles ne seront pas construites. *(Elles étaient déjà « hors MVP, écartées » au §3 du
>   plan d'exécution ; ce n'est plus un report.)*
> - **A2 « Inscription »** montre une étape « type de compte » avec le choix « Structure /
>   Pharmacie ». **Cette étape n'existe plus depuis le 24/08/2026** : il ne restait qu'un choix, et
>   on ne fait pas choisir entre une option et rien.
>
> La pharmacie reste un **objet** du modèle — la recherche de médicaments du patient en dépend —
> mais plus un titulaire de compte.

## Arbitrages tranchés par le porteur (10/08/2026)

| Sujet | Décision |
|---|---|
| Neutres & rayons | `globals.css` fait foi : gris froids (#F4F6F8 clair, #0D1117 sombre), **rayons plafonnés à 10 px** (contre les 14 px de CG-03/CG-07) |
| Lignes de tableau | **Alternance douce** (principe ⑤ du plan) malgré l'interdit CG-03/05/07 |
| Densité | **Dense — lignes 44 px** (Linear), contre « aéré 64 px » de CG-03 |
| Verre dépoli | sidebar, topbar, toasts **+ menus, dialogues et cartes** (comme `globals.css`) |
| Polices | Les **trois** de CG-02 conservées : Plus Jakarta Sans / Inter / JetBrains Mono |
| Tableau de bord | **Un seul écran adaptatif** selon le rôle |
| Livraison | **Un fichier par écran**, bascule clair/sombre + sélecteur d'état intégrés |
| Interactivité | Maquettes **cliquables** (onglets, menus, étapes) |
| Ordre | Étape 1 du plan : B1 coquille + A1 connexion, puis soignant, pharmacie, admin |

## Règles non négociables

- Auth : carrousel gauche 42 % / formulaire droite 58 %, 5 illustrations et textes du patrimoine,
  rythme 700 / +400+600 / 3000 / 500 ms, fond `#091849`, `frost-grain.png`, repli sous 860 px.
- Logo ULAMU repris au caractère près de `uploads/patrimoine-web/composants/Logo.tsx`.
- Cobalt `#2756A6` seule couleur de marque ; aucun dégradé sauf remplissage d'area chart (0.18→0).
- Icônes : Lucide, SVG inline, `viewBox="0 0 16 16"`, stroke 1.4 (nav) / 1.5 (boutons) / 2.0
  (emphase). Jamais d'emoji ni de caractère Unicode comme icône.
- Focus ring unique : `outline:3px solid rgba(39,86,166,.30)`, offset 2 px.
- Contenu réaliste en français, Brazzaville / Congo-Brazzaville, montants en XAF.
- Grain assumé (body, boutons, verre) ; ombre réservée à ce qui flotte.
- Chaque écran : clair + sombre, et les 4 états (plein, chargement, vide, erreur).
- Assets du carrousel déjà copiés dans `assets/auth/`.
