# Modèle de Menaces — ULAMU

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — revue D-040 |
| Documents liés | [[decisions_architecture]] · [[../00_cadrage/registre_risques|registre_risques]] · [[../01_architecture_fonctionnelle/exigences_non_fonctionnelles|ENF-07]] |

> Actifs → attaquants → scénarios → contre-mesures. À re-balayer avant chaque release et après le pentest pré-lancement.

---

## 1. Actifs à protéger (par ordre de criticité)

1. **Le Carnet** — données de santé (loi n° 29-2019, données sensibles)
2. **Les flux d'argent** — paiements, gains, retraits (M13)
3. **Le contenu des sessions** — confidences médicales (P3 : la confidentialité se voit)
4. **L'identité des professionnels** — badges, contrats (la confiance de la plateforme)
5. **Le secret commercial des pharmacies** — stocks, positions (le modèle D-009)

## 2. Attaquants considérés

| Profil | Motivation |
|---|---|
| Fraudeur opportuniste | Consultations gratuites, faux remboursements, dévoilements sans payer |
| Faux professionnel | Exercer sans diplôme, vendre de faux soins |
| Voleur de téléphone | Accéder au compte et au Carnet de la victime |
| Pharmacie/professionnel malveillant | Contourner la commission, fausser les strikes, espionner un concurrent |
| Initié (membre de l'équipe) | Lire des données médicales, détourner des fonds |
| Attaquant technique externe | Exfiltrer la base, rançonner, défigurer |

## 3. Scénarios et contre-mesures

| # | Scénario | Contre-mesures (existantes → à construire) |
|---|---|---|
| T-01 | **SIM swap / vol de numéro** → prise de compte | OTP double (ancien + nouveau) pour changer de numéro (CU-01-05) ; TOTP (D-027) ; alerte sur les deux numéros ; procédure support à identité renforcée |
| T-02 | **Téléphone volé déverrouillé** → lecture du Carnet | Verrou app PIN/biométrie (ENF-07) ; cache chiffré (clé liée au compte, purgée à la déconnexion à distance CU-01-06) ; pas de contenu médical dans les notifications |
| T-03 | **Faux diplômes** → faux médecin vérifié | Posture stricte D-029 ; vérification humaine (M03) ; signalements + révocation en cascade < 1 min ; contact Ordre des médecins (plan réglementaire) pour contrôle croisé |
| T-04 | **QR d'ordonnance copié/falsifié** | Le QR n'est qu'une clé — l'état vit côté serveur (RM-09-02) ; délivrance exigeant la connexion (RM-09-03) ; double délivrance impossible par construction |
| T-05 | **Rejeu d'ordres financiers** (réseau instable ou malveillance) | Idempotence absolue (RM-13-04, ADR-12) ; réconciliation quotidienne (EF-13-09) ; alertes d'écart < 24 h |
| T-06 | **Admin curieux** → lecture de données médicales | Barrière technique RM-16-02 (aucun chemin d'accès au Carnet/sessions depuis le back-office) ; RM-04-03 (audit sans contenu médical) ; toute consultation admin auditée (EF-04-04) ; TOTP obligatoire (RM-01-06) |
| T-07 | **Exfiltration de la base** | Chiffrement au repos (ADR-07, disques + sauvegardes) ; secrets gérés hors code ; moindre privilège réseau ; médias en URLs signées courtes ; journalisation des accès |
| T-08 | **Espionnage de stock entre pharmacies** | RM-11-05 (jamais de stock visible d'une autre structure) ; recherche anonyme agrégée seulement ; dévoilement payé tracé au compte patient (RM-12-05) — un concurrent qui sonde paie et laisse des traces |
| T-09 | **Contournement de la plateforme** (paiement hors ULAMU après contact) | Pas de coordonnées échangées avant session payée ; valeur intégrée (ordonnance valide uniquement en session, Carnet, garanties) ; commission douce 10 % (R-05) |
| T-10 | **Faux signalements « produit non disponible »** (gratter des re-dévoilements) | Contestation pharmacie + arbitrage (EF-12-07) ; plafond de garanties par patient à surveiller au pilote ; patterns détectés via l'audit |
| T-11 | **Brute force / credential stuffing** | PM-18 (blocage progressif) ; PM-19 (limite OTP) ; mots de passe hachés état de l'art (RM-01-02) ; TLS partout |
| T-12 | **Interception réseau** (Wi-Fi public, proxy opérateur) | TLS 1.2+ exclusif (ENF-07) ; épinglage de certificat sur mobile à évaluer ; aucun secret en query string |
| T-13 | **Faux ULAMU** (app clonée, phishing SMS) | Communication officielle sur les canaux uniques ; les SMS ULAMU ne contiennent jamais de lien de connexion ; signature de l'app (store officiel) |
| T-14 | **Indisponibilité ciblée** (le jour du lancement) | ENF-05 ; limitation de débit par IP/compte ; pages dégradées plutôt qu'erreurs ; runbook d'incident (modèle opérationnel) |

## 4. Règles de développement sécurisé (synthèse pour la Référence Technique)

1. Aucun secret dans le code ni dans le dépôt ; gestionnaire de secrets dès le premier jour.
2. Validation des entrées côté serveur partout (le client est indicatif — RM-02-03).
3. Dépendances surveillées (alertes de vulnérabilités), mises à jour mensuelles.
4. Journaux applicatifs **sans données médicales ni mots de passe** (alignés RM-04-03).
5. Comptes d'infrastructure : MFA, moindre privilège, accès production tracés.
6. **Pentest externe avant le lancement public** (condition du [[../01_architecture_fonctionnelle/plan_releases|plan de releases]] à ajouter aux préalables).

---

*Phase 3 — 2/5 · Précédent : [[decisions_architecture]] · Suivant : [[strategie_offline_sync]] · Index : [[../00_HOME|HOME]]*
