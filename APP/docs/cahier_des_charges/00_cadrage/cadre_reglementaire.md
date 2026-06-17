# Cadre Réglementaire — ULAMU (Congo-Brazzaville)

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) |
| Documents liés | [[vision]] · [[registre_decisions]] (Q-003) |

> ⚖️ Ce document recense le droit applicable identifié par recherche documentaire. **Il ne remplace pas l'avis d'un avocat congolais**, qui devra valider chaque point marqué ⚠️ avant le lancement.

---

## 1. Protection des données personnelles — ✅ loi identifiée

**Loi n° 29-2019 du 10 octobre 2019** portant protection des données à caractère personnel ([texte officiel PDF](https://www.sgg.cg/JO/2019/congo-jo-2019-45.pdf), [fiche ministérielle](https://www.economie.gouv.cg/fr/content/loi-n%C2%B029-2019-du-10-octobre-2019-portant-protection-des-donn%C3%A9es-%C3%A0-caract%C3%A8re-personnel)).

**Implications pour ULAMU :**
- Les données de santé sont par nature des **données sensibles** (⚠️ confirmer l'article exact et le régime applicable : consentement renforcé, déclaration ou autorisation préalable).
- Obligations attendues : consentement explicite, finalités déclarées, droits d'accès/rectification/suppression, sécurité des traitements.
- ⚠️ **Vérifier si l'autorité de contrôle prévue par la loi est opérationnelle** et quelle formalité (déclaration/autorisation) s'impose à une plateforme de santé.
- ⚠️ Vérifier s'il existe une **exigence de localisation/hébergement** des données sur le territoire.

## 2. Transactions et signature électroniques — ✅ cadre identifié

- **Loi n° 37-2019 du 12 décembre 2019** relative aux transactions électroniques : commerce électronique, **signature électronique**, certification ([référentiel LIZIBA](https://liziba.cg/en/cadre-legal-et-reglementaire-2/)).
- **Décret n° 2014-596 du 3 novembre 2014** sur la signature électronique en matière d'échanges électroniques ([texte PDF](https://liziba.cg/wp-content/uploads/2020/11/Decret-n%C2%B02014-596-du-3-nov.2014-signature-electronique-en-matiere-d_echanges-electroniques.pdf)).

**Implications pour ULAMU :**
- 🟢 Nos **contrats numériques signés** (D-011) ont une base légale : la signature électronique est reconnue.
- ⚠️ Vérifier les conditions de validité (signature simple vs certifiée, prestataires de certification agréés — la GUOT/ADEN semblent actives sur la certification).
- ⚠️ L'**ordonnance numérique signée** (D-014) : valide comme document électronique, mais sa reconnaissance comme *ordonnance médicale* dépend du droit pharmaceutique (point 4).

## 3. Cybersécurité — ✅ cadre identifié

Lois congolaises de 2020 sur la **cybersécurité** et la **lutte contre la cybercriminalité** (en vigueur depuis juin 2020 ; ⚠️ confirmer les numéros exacts, probablement n° 26-2020 et 27-2020).

**Implications :** obligations de sécurisation des systèmes ; les sanctions pénales contre l'accès frauduleux protègent aussi ULAMU. Régulateur télécoms : **ARPCE** ; économie numérique : **ADEN**.

## 4. Télémédecine et exercice de la médecine — ❌ vide juridique probable

**Aucun texte spécifique à la télémédecine n'a été identifié** au Congo-Brazzaville (les recherches ne remontent que des projets pilotes : Pan-African e-Network).

**Implications pour ULAMU — le point le plus sensible du projet :**
- ⚠️ Consulter le **Ministère de la Santé et de la Population** et l'**Ordre national des médecins** : la consultation à distance par messagerie est-elle un acte médical autorisé ? À quelles conditions (identification du médecin, compte-rendu, responsabilité) ?
- Un vide juridique n'interdit pas — mais il expose. **Stratégie recommandée** : se rapprocher tôt des autorités (l'État a une stratégie « Congo Digital 2025 » favorable), positionner ULAMU comme partenaire de la santé publique, et documenter chaque acte (notre traçabilité native est un atout).
- Notre exigence de **compte-rendu obligatoire** (D-021) et la **vérification des professionnels** sont des arguments de sérieux face au régulateur.

## 5. Pharmacie et médicament — ⚠️ à vérifier en priorité

- ⚠️ Identifier l'autorité pharmaceutique compétente (l'ancien cahier citait « ANRP ou équivalent » — **à confirmer**) et l'**Ordre des pharmaciens du Congo**.
- ⚠️ La **délivrance sur ordonnance numérique QR** : vérifier qu'aucun texte n'impose l'ordonnance papier. Parade transitoire si besoin : l'ordonnance ULAMU est aussi **exportable en PDF imprimable**.
- 🟢 Notre modèle ne vend **pas de médicaments en ligne** (pas de e-commerce pharmaceutique) : on localise et réserve, la délivrance reste physique en officine — risque réglementaire bien plus faible.

## 6. Paiements Mobile Money — ⚠️ cadre CEMAC

- Les paiements relèvent du droit **CEMAC/BEAC** (⚠️ confirmer : règlement de 2018 sur les services de paiement et la monnaie électronique).
- ULAMU encaisse pour le compte des professionnels (commission) : ⚠️ vérifier si ce rôle d'intermédiaire exige un statut (établissement de paiement, partenariat avec un agrégateur agréé). **Recommandation** : passer par un **agrégateur licencié** (MTN MoMo API / Airtel Money / agrégateur régional) plutôt que de détenir les fonds nous-mêmes.

## 7. Plan d'action réglementaire (avant lancement)

| # | Action | Quand |
|---|---|---|
| 1 | Avocat congolais : valider points ⚠️ (données de santé, formalités, signature) | Avant tout développement sensible |
| 2 | Prise de contact Ministère de la Santé + Ordre des médecins (télémédecine) | Pendant la conception |
| 3 | Identifier l'autorité pharmaceutique + règles de délivrance | Avant le module Pharmacie |
| 4 | Choisir un agrégateur de paiement agréé CEMAC | Avant le module Paiement |
| 5 | Rédiger CGU, politique de confidentialité, contrats types (D-011) avec l'avocat | Avant le lancement |

---

*Précédent : [[etude_concurrence]] · Suivant : modele_economique (à rédiger) · Index : [[../00_HOME|HOME]]*
