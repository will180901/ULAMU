# Étude de l'Existant & de la Concurrence — ULAMU

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) |
| Documents liés | [[vision]] · [[personas_parcours]] |

> Étude basée sur des recherches web (juin 2026). Les chiffres cités proviennent des sources listées en bas. À compléter par une enquête terrain à Brazzaville/Pointe-Noire.

---

## 1. Le vrai concurrent n°1 : l'informel

Avant toute startup, ULAMU affronte les **pratiques actuelles** :
- **WhatsApp** : des patients envoient déjà photos et questions à « un médecin qu'on connaît » — gratuit, sans cadre, sans dossier, sans ordonnance valable.
- **Le bouche-à-oreille** pour trouver un médicament de pharmacie en pharmacie.
- **L'automédication** et les vendeurs de rue.

➡️ ULAMU ne doit pas être « mieux qu'une autre app » mais **mieux que WhatsApp + la débrouille** : plus sûr (médecins vérifiés, ordonnance valable), plus efficace (médicament localisé et réservé), avec une mémoire (dossier à vie).

## 2. Panorama des acteurs régionaux

| Acteur | Pays | Modèle | Ce qu'on en apprend |
|---|---|---|---|
| **Waspito** | Cameroun, Côte d'Ivoire | Réseau social santé + consultations **vidéo** avec médecins vérifiés ; ~650 000 utilisateurs, 950 médecins, 60 000 consultations ; 5,2 M$ levés ; mini-cliniques hybrides avec des infirmières (partenariat La Poste CIV) | Le modèle hybride en ligne + relais humains de terrain fonctionne — proche de notre triage terrain (D-018). La vidéo exige une connectivité que le Congo n'a pas partout : notre choix du **chat chronométré** est plus réaliste. |
| **SALUS** | RD Congo | Plateforme de santé digitale | Un voisin direct existe — à étudier de près (« à vérifier » : périmètre exact). |
| **Congo Medika** | RD Congo | Réservation de consultations à domicile | La demande de soins à domicile existe dans le bassin du Congo. |
| **mPharma** | Ghana, Nigeria, Zambie | Infrastructure de gestion des stocks de médicaments reliant patients, hôpitaux, pharmacies | La disponibilité des médicaments est un problème continental ; personne ne l'a résolu au Congo-B. |
| **Alliance Pharma** | Burkina Faso | App de localisation de médicaments avec pharmacies partenaires | Valide notre intuition... mais ils **affichent** la pharmacie gratuitement — notre modèle dévoilement-réservation (D-009) est plus monétisable, à condition de rester perçu comme un service. |
| **PharMap** | Bénin | Recherche de médicaments via WhatsApp, réponse en ~10 min | La simplicité d'accès prime : notre recherche doit être aussi simple qu'un message WhatsApp. |
| **AS PHARM** | Afrique francophone | « Super app » de gestion d'officine | Les pharmacies s'équipent en logiciels : notre espace structure doit être au niveau, ou s'interfacer un jour. |

## 3. Et au Congo-Brazzaville précisément ?

- **Aucun acteur dominant identifié** sur la téléconsultation ou la localisation de médicaments (à confirmer par enquête terrain — c'est notre fenêtre d'opportunité).
- L'État a une stratégie numérique (« Congo Digital 2025 ») : un terrain institutionnel favorable, mais la connectivité rurale reste faible (~23 % d'usage d'internet en zone rurale africaine en 2024).
- Le Pan-African e-Network a familiarisé l'hôpital congolais avec la télémédecine (formation continue).

## 4. Différenciateurs ULAMU (face à ce panorama)

1. **La poignée de main avant paiement** (D-007) — aucun acteur étudié ne garantit que le médecin est là *avant* que l'argent parte. C'est notre signature confiance.
2. **Dévoilement + réservation 24 h** (D-009) — les concurrents donnent l'info gratuitement (difficile à monétiser) ou pas du tout. Nous vendons une **garantie**, pas une donnée.
3. **Le dossier médical à vie, propriété du patient** — personne ne le propose dans la zone.
4. **Chat chronométré plutôt que vidéo** — réaliste pour la connectivité congolaise, économe en data (P1).
5. **Toute la chaîne sur une plateforme** : consultation → ordonnance QR → labo → pharmacie → suivi. Les concurrents ne couvrent qu'un maillon.

## 5. Menaces à surveiller

| Menace | Probabilité | Parade |
|---|---|---|
| Waspito s'étend au Congo-B (déjà en expansion francophone) | Moyenne | Vitesse d'exécution + ancrage local (contrats pharmacies/labos = barrière à l'entrée) |
| Les patients restent sur WhatsApp (gratuit) | Élevée | Le gratuit ULAMU (dossier, rappels, recherche anonyme) doit suffire à les faire entrer ; la qualité fait le reste |
| Pharmacies refusent de tenir le stock à jour | Élevée | Les dévoilements = clients garantis ; contrat gagnant-gagnant (P7) |
| Un acteur local inconnu existe déjà | Inconnue | Enquête terrain avant lancement (action à inscrire au [[registre_risques]]) |

---

## Sources

- [TechCrunch — Waspito seed extension](https://techcrunch.com/2023/11/22/waspito-gets-seed-extension/) · [Empower Africa — Waspito](https://empowerafrica.com/cameroonian-health-startup-waspito-secures-2-5-million-seed-extension-to-expand-telemedicine-services/) · [Business in Cameroon — Waspito](https://www.businessincameroon.com/health/2411-13537-cameroonian-startup-waspito-secures-xaf1-5-billion-to-expand-footprint)
- [SALUS RDC](https://www.salus.science/) · [We Are Tech — Congo Medika](https://www.wearetech.africa/fr/fils/solutions/rdc-congo-medika-permet-de-reserver-des-consultations-medicales-a-domicile)
- [Proparco — mPharma](https://www.proparco.fr/en/article/warehouse-patient-mpharmas-approach-increasing-accessibility-medicines-africa) · [We Are Tech — Alliance Pharma](https://www.wearetech.africa/fr/fils/solutions/alliance-pharma-facilite-la-recherche-de-medicaments-en-ligne-au-burkina-faso) · [PharMap](https://www.warketingdigital.net/pharmap) · [AS PHARM](https://as-pharm.com/)
- [Ministère Postes & Télécoms Congo — Congo Digital 2025](https://postetelecom.gouv.cg/congo-brazza-congo-digital-2025-la-strategie-nationale-de-developpement-du-numerique-officiellement-presentee-document/) · [We Are Tech — télémédecine déserts médicaux](https://www.wearetech.africa/fr/fils/actualites/tech/e-sante-la-telemedecine-une-reponse-aux-deserts-medicaux-en-afrique-subsaharienne)

---

*Précédent : [[personas_parcours]] · Suivant : cadre_reglementaire (à rédiger) · Index : [[../00_HOME|HOME]]*
