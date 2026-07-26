# Phase 4 — UX/UI : maquettes réalisées par le porteur

**Décision du porteur (D-039, 2026-06-10 ; complétée D-044, 2026-06-11)** : les maquettes ont été **réalisées par le porteur avec Claude Design**, en respectant la **charte graphique existante**.

## 🎨 Les maquettes officielles (D-044)

> ✅ **Disponibles localement : `Maquettes_ULAMU/`** (export Claude Design déposé par le porteur le 2026-06-11 — readme, tokens, composants, kits UI, guidelines, handoff). C'est la source de vérité UI du projet.
> Lien d'origine, si re-téléchargement nécessaire :
> ```
> Fetch this design file, read its readme, and implement the relevant aspects of the design.
> https://api.anthropic.com/v1/design/h/INheG-l8XbBDYXnP1VlUdg
> Implement: the designs in this project
> ```

**Règles d'usage :**
1. Ces maquettes doivent être **respectées au mieux — voire améliorées** dans l'exécution (qualité supérieure bienvenue, trahison interdite).
2. Si un écran ou un état **manque** dans les maquettes (erreur, vide, hors ligne, chargement…), on le **complète** pendant la réalisation, dans le même langage visuel, et on le note ici.
3. Les contraintes du cahier des charges (liste ci-dessous) prévalent en cas de conflit — tout écart est signalé au porteur avant d'être tranché.
4. **Les maquettes sont une référence visuelle, jamais du code de production.** Leur code (artefacts Claude Design) ne sera **pas** transformé en application : l'interface est ré-implémentée de zéro dans la stack actée ([[../03_conception_transverse/decisions_architecture|ADR]]) — React Native pour le mobile, React (Vite) pour le web, sur l'API NestJS. On reproduit le **rendu** (couleurs, dispositions, composants, parcours), pas le fichier.

📁 `docs/Charte Graphique/` (11 documents HTML) :
CG-01 Couleurs & tokens · CG-02 Typographie · CG-03 Espacements & grilles · CG-04 Effets & atmosphère · CG-05 Composants fondamentaux · CG-06 Navigation & structure · CG-07 Données & contenu · CG-08 Feedback & communication · CG-09 Animations & transitions · CG-10 Iconographie & assets · CG-11 États & accessibilité

## Contraintes issues du cahier des charges à respecter dans les maquettes

- **Mobile patient** : 3 onglets (Accueil / Consultations / Mon Espace) + bouton Urgence flottant (D-013)
- Décompteur de session visible en permanence (D-006) ; états « hors ligne » sur tous les écrans concernés (ENF-04)
- Jamais de contenu médical sur écran verrouillé / notifications (ENF-07)
- Boutons « initier » uniquement si professionnel en ligne (EF-05-06) ; compte à rebours de confirmation (PM-07)
- QR (ordonnance, dévoilement) lisibles en plein soleil et sur écran abîmé (M09 §8)
- Plancher matériel : Android 8, 2 Go RAM, écran 5" (ENF-01) ; faible littératie : icônes + vocal en première classe ([[../00_cadrage/personas_parcours|P2]])

*Index : [[../00_HOME|HOME]]*
