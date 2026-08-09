# Patrimoine web — ce qui survit à la refonte shadcn

> Sauvegardé le 09/08/2026, juste avant la table rase de `apps/web`.
> Ce dossier est **hors compilation** : Vite ne le construit pas, oxlint ne le lit pas, Vitest ne le
> teste pas. Il ne peut donc rien casser. Il sert de **référence** pendant la reconstruction.

## Pourquoi ce dossier existe

La refonte supprime les 23 écrans, les 12 composants maison et 1534 lignes de CSS. Deux choses ne
doivent **pas** disparaître dans l'opération — ce sont les deux règles posées par le propriétaire du
projet. Le reste du dossier `web` peut brûler ; ce qui suit, non.

---

## RÈGLE 1 — La mise en page des écrans d'authentification

**Zone gauche** : carrousel + animation. **Zone droite** : les champs du formulaire.
Mêmes illustrations, mêmes textes affichés.

### Les 5 illustrations et leurs textes

L'ordre compte : c'est le parcours d'un patient ULAMU, du besoin au paiement.

| # | Fichier | Texte affiché |
|---|---------|---------------|
| 1 | `slide-online-doctor.png` | Trouvez un soignant vérifié |
| 2 | `slide-prescription.png` | Recevez votre ordonnance signée |
| 3 | `slide-medicine.png` | Réservez vos médicaments tout près |
| 4 | `slide-pharmacist.png` | Retirez-les en pharmacie en toute confiance |
| 5 | `slide-insurance.png` | Payez en toute transparence |

### Le rythme de l'animation

Repris à l'identique du mobile. L'image apparaît en fondu, **puis** le texte en entier — jamais
lettre par lettre, c'est un choix explicite —, le tout tient, puis s'efface.

```
fondu image 700ms · texte à +400ms sur 600ms · maintien 3000ms · sortie 500ms
```

Six formes floues dérivent en fond sur trois trajectoires (`ulamu-mesh-drift-1/2/3`), par-dessus un
fond `#091849`, sous un voile de verre dépoli + grain pré-composé (`frost-grain.png`).

---

## RÈGLE 2 — Le logo ULAMU

`composants/Logo.tsx`. Carré cobalt `#2756A6` arrondi (rayon 7 sur 32), figure stylisée sur un socle,
puis le mot-symbole « ulamu ». C'est le **même glyphe que l'app mobile** — pas une réinterprétation.
La variante `light` inverse les deux couleurs pour les fonds sombres.

---

## ⚠️ À NE JAMAIS SUPPRIMER — et ce n'est pas ici

Les 12 images vivent dans `apps/web/src/assets/auth/` et **y restent**. Elles ne sont pas copiées
ici : 1,8 Mo dupliqué dans le dépôt à chaque `git push`, pour des fichiers qui n'ont aucune raison
d'être supprimés — ce sont des ressources, pas des interfaces.

```
apps/web/src/assets/auth/
  slide-*.png      (5)   les illustrations du carrousel      — RÈGLE 1
  mesh-blob-*.png  (6)   les formes floues du fond animé
  frost-grain.png  (1)   le voile verre dépoli + grain
```

**La table rase ne touche pas à ce dossier.**

---

## Contenu de la sauvegarde

| Fichier | Rôle pendant la reconstruction |
|---|---|
| `composants/AuthCarousel.tsx` | À reprendre **tel quel**. Ne dépend d'aucun composant maison — seulement de React et des images. Il survivra sans modification. |
| `composants/AuthLayout.tsx` | Modèle de la mise en page gauche/droite. À réécrire avec shadcn, en gardant les proportions (42 % / 58 %) et le repli sous 860 px. |
| `composants/Logo.tsx` | À reprendre **tel quel**. SVG pur, aucune dépendance. |
| `pages-auth/*.tsx` | **Référence des textes**, pas du style. Connexion, inscription, mot de passe oublié, configuration TOTP. Les libellés, messages d'erreur et intitulés de champs sont à conserver ; l'habillage sera refait en shadcn. |
| `auth.css` | Extrait littéral des blocs CSS de `globals.css` : coquille d'auth, repli responsive, grain, trajectoires du mesh, et les jetons de grain sans lesquels le reste ne rend rien. |

## Note sur `auth.css`

Les trois `@keyframes ulamu-mesh-drift-*` sont **copiés au caractère près**, pas retapés. Chaque
motif visite 3 des 8 points cardinaux avant de revenir à l'origine ; les trois pris ensemble
couvrent les 8 directions. Une virgule déplacée dans un pourcentage, et l'animation ne ressemble
plus au mobile — d'où l'extraction automatique plutôt que manuelle.
