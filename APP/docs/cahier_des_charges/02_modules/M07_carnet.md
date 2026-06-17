# MODULE M07 — Carnet

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-033 |
| Release | MVP — Chantier 3 |
| Domaine | D4 Carnet |
| Dépendances | M01 |

---

## 1. Mission et périmètre

La **mémoire médicale à vie** du patient : gratuit pour toujours (D-020), propriété du patient, alimenté par chaque acte de soin, lisible même sans réseau. Le « carnet qu'on ne perd jamais » — l'argument marketing fondateur ([[../00_cadrage/vision|vision]] §2).

**Hors-périmètre explicite :**
- Missions de triage (saisie terrain des constantes) → M08 (V1)
- Fiche urgence et QR d'urgence → M15 (V1)
- L'accès des professionnels en session → règles définies en M06 (RM-06-05)

## 2. Acteurs

| Acteur | Usage |
|---|---|
| Patient | Lit tout, déclare allergies/antécédents, gère ses personnes à charge, exporte |
| Professionnel | Lit en session active uniquement ; écrit via compte-rendu/ordonnance/résultats (C2) |
| Le Système | Crée le Carnet, range les entrées, calcule la fiche synthèse |

## 3. Exigences fonctionnelles

| ID | Exigence |
|---|---|
| EF-07-01 | **Création automatique** du Carnet à l'inscription patient (événement M01). |
| EF-07-02 | **Types d'entrées** : compte-rendu, ordonnance, résultats d'examens, constantes, allergie, antécédent, vaccination, note personnelle. Chaque entrée porte sa **provenance** : *déclarée par le patient* / *constatée par un professionnel* / *produite par le système*. |
| EF-07-03 | **Consultation par le patient** : fiche synthèse en tête (groupe sanguin, allergies actives, maladies chroniques), puis chronologie filtrable par type. |
| EF-07-04 | **Immutabilité** : aucune entrée modifiée ni supprimée — une correction est une nouvelle entrée qui remplace l'ancienne, l'historique reste visible. |
| EF-07-05 | **Écritures par les modules autorisés** (C2) : M06 (comptes-rendus), M09 (ordonnances), M10 (résultats), M08 (constantes, V1). |
| EF-07-06 | Le patient peut **déclarer** allergies, antécédents, vaccinations et notes personnelles — clairement marqués « déclaré par le patient » jusqu'à confirmation éventuelle par un professionnel en session. |
| EF-07-07 | **Hors ligne** : lecture complète du Carnet en cache chiffré local (D-025), synchronisé à chaque connexion. |
| EF-07-08 | **Export PDF signé** par la plateforme : Carnet complet ou par période — gratuit, depuis Mon Espace. |
| EF-07-09 | **Carnet familial** (réponse à Q-007) ❓ : un patient peut créer des **sous-profils « personnes à charge »** (enfants mineurs, personnes dépendantes), chacun avec son **propre Carnet**. Le tuteur initie et paie les sessions « pour » la personne à charge ; le compte-rendu va au bon Carnet. **À la majorité (18 ans), l'enfant crée son compte et revendique son Carnet** (transfert avec OTP du tuteur) — sa mémoire médicale le suit. |
| EF-07-10 | **Clôture de compte** : le Carnet est conservé (durée légale PM-31 ❓), inaccessible à tous sauf obligation légale ; export proposé avant clôture ; restauré si réactivation (PM-21). |

## 4. Cas d'utilisation

### CU-07-01 — Consulter son Carnet
- *Étant donné* un patient connecté, *alors* fiche synthèse < 2 s depuis le cache, chronologie filtrable ; chaque entrée montre auteur, provenance, date, source (lien vers la session/ordonnance d'origine).
- *Étant donné* l'absence de réseau, *alors* tout le Carnet reste lisible (bandeau « hors ligne », EF-07-07).

### CU-07-02 — Déclarer une allergie
- *Étant donné* une déclaration patient (ex. « pénicilline »), *alors* entrée créée, marquée « déclarée », immédiatement prise en compte par le garde-fou allergies (M09) — *on protège d'abord, on confirme ensuite.*
- *Étant donné* un professionnel en session qui confirme l'allergie, *alors* nouvelle entrée « constatée » liée à la première.

### CU-07-03 — Recevoir une entrée (C2, transversal)
- *Étant donné* un compte-rendu déposé (M06), *alors* entrée créée en < 5 s, patient notifié (C4), fiche synthèse recalculée si nécessaire.

### CU-07-04 — Créer un sous-profil
- *Étant donné* un patient majeur, *quand* il crée « Bébé Grâce, née 2024 », *alors* un Carnet distinct naît ; lors d'une poignée de main, le tuteur précise « pour Grâce » — le professionnel le sait avant de confirmer.

### CU-07-05 — Revendiquer son Carnet à 18 ans
- *Étant donné* un sous-profil devenu majeur, *quand* il s'inscrit (M01) et que le tuteur confirme par OTP, *alors* le Carnet est transféré au nouveau compte — historique intact, audit C5.
- *Cas sensible :* tuteur décédé/injoignable → procédure support avec justificatifs (M16).

### CU-07-06 — Exporter en PDF
- *Étant donné* une demande d'export, *alors* PDF signé numériquement (empreinte vérifiable), filigrané « émis par ULAMU le … », téléchargeable et partageable hors plateforme sous la responsabilité du patient.

## 5. Données du module

**Référencées :** Carnet, EntreeCarnet ([[../01_architecture_fonctionnelle/modele_donnees_global|dictionnaire]] §D4).

**Propres au module :**
| Entité | Attributs clés | Règles |
|---|---|---|
| SousProfil | tuteur, identité, naissance, carnet propre, statut (à charge / transféré) | Q-007 ; transfert à la majorité |
| FicheSynthese | carnet, groupe sanguin, allergies actives, maladies chroniques | Vue calculée depuis les entrées, jamais saisie directement |
| ExportCarnet | carnet, période, généré le, empreinte | Chaque export est tracé (C5) |

## 6. Règles métier

| ID | Règle |
|---|---|
| RM-07-01 | Un patient (ou sous-profil) = un Carnet, exactement. |
| RM-07-02 | Immutabilité totale (EF-07-04) — la mémoire médicale ne se réécrit pas. |
| RM-07-03 | La provenance d'une entrée est toujours visible — une déclaration patient n'est jamais présentée comme un diagnostic. |
| RM-07-04 | **Le patient voit tout** : aucune entrée de son Carnet ne lui est cachée. |
| RM-07-05 | Accès professionnel = session active uniquement, lecture seule, tracé (RM-06-05). |
| RM-07-06 | Sous-profil : seul le tuteur y accède jusqu'au transfert ; après transfert, le tuteur perd l'accès. |
| RM-07-07 | Après clôture du compte : conservation légale (PM-31), aucun accès commercial, jamais. |

## 7. Interfaces

| Sens | Contrat |
|---|---|
| Consomme | Événement « compte patient créé » (M01) ; écritures C2 (M06, M09, M10, M08-V1) |
| Expose | Lecture en session active → M06 ; allergies actives → M09 (garde-fou) ; données critiques → M15 (V1) |
| Émet | Notifications de nouvelle entrée (C4) ; audit des accès et exports (C5) |

## 8. Exigences non fonctionnelles spécifiques

- Fiche synthèse : < **2 s** depuis le cache local (c'est l'écran le plus consulté de Mon Espace).
- Cache chiffré : intégralité du Carnet ≤ **50 Mo** par patient (compression des médias, ENF-02).
- Export PDF : généré en < **30 s** pour 5 ans d'historique.

## 9. Risques et points ouverts

| Point | Détail |
|---|---|
| ❓ EF-07-09 | **Carnet familial : valider le modèle** (sous-profils + transfert à 18 ans) — close Q-007 |
| ❓ PM-31 | Conservation du Carnet après clôture : proposition **10 ans** (standard médical) — à confirmer avec l'avocat |
| ⚠️ Qualité des déclarations | Une allergie déclarée à tort bloque des prescriptions (M09) — le professionnel peut passer outre avec confirmation explicite (garde-fou, pas verrou) |
| ⚠️ Très gros Carnets | Patients chroniques sur 10 ans : pagination et archivage à froid à prévoir en Phase 3 |

---

*Phase 2 — module 7/12 · Précédent : [[M06_poignee_session]] · Suivant : M09 Ordonnance & Délivrance · Index : [[../00_HOME|HOME]]*
