# MODULE M15 — Urgence

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-041 (close Q-006) |
| Release | **V1** (D-026) |
| Domaine | D9 Urgence |
| Dépendances | M07 (uniquement — il doit survivre même si tout le reste tombe) |

---

## 1. Mission et périmètre

Sauver des minutes quand tout va mal : rendre les **informations vitales** du patient accessibles en quelques secondes — par lui-même ou par un tiers qui le trouve inconscient. **Jamais monétisé, jamais désactivé.**

**Hors-périmètre explicite :**
- Dispatch d'ambulances ou mise en relation médicale d'urgence (hors de notre responsabilité au lancement)
- Le partage complet du Carnet (la fiche ne montre que le vital)

## 2. Exigences fonctionnelles

| ID | Exigence |
|---|---|
| EF-15-01 | **Bouton flottant** accessible partout dans l'app patient, **2 taps maximum** pour déclencher (D-013). |
| EF-15-02 | **Fiche Urgence** : extrait vital du Carnet, recalculé à chaque synchronisation — identité, âge, groupe sanguin, allergies actives, maladies chroniques, traitements en cours, contact d'urgence. **Rien d'autre.** |
| EF-15-03 | **Auto-déclenchement** : fiche plein écran (luminosité max) + boutons d'appel direct — contact d'urgence et numéros d'urgence locaux. |
| EF-15-04 | **QR Urgence temporaire** : généré en un geste, valable **PM-38 (4 h)**, non révocable une fois généré (un secouriste ne doit jamais tomber sur un lien mort). |
| EF-15-05 | **Carte imprimée** (option) : format portefeuille avec QR permanent, généré depuis Mon Espace, **révocable à tout moment** (régénération = ancien QR mort). |
| EF-15-06 | **Lecture par un tiers sans compte** : le scan ouvre une page en lecture seule. Le QR embarque aussi les **données vitales minimales** en clair structuré — lisibles même si le téléphone du tiers n'a pas de réseau. |
| EF-15-07 | **Hors ligne complet côté patient** : fiche et QR disponibles depuis le cache chiffré (D-025), même sans réseau, même app fermée depuis des jours. |
| EF-15-08 | **Référentiel public des services d'urgence** : hôpitaux avec service d'urgence, numéros utiles (pompiers, SAMU local, police) — géré par l'Équipe ULAMU, consultable gratuitement par tous, **hors modèle de dévoilement** (ce ne sont pas des partenaires commerciaux). |
| EF-15-09 | Chaque consultation de la fiche par un tiers (quand le réseau le permet) est **notifiée au patient et tracée** (C5). |

## 3. Cas d'utilisation

### CU-15-01 — Auto-déclenchement
- *Étant donné* un patient en difficulté, *quand* il tape le bouton flottant puis « Urgence », *alors* en < 2 s : fiche plein écran, boutons d'appel, accès au référentiel des urgences proches — avec ou sans réseau.

### CU-15-02 — Lecture par un tiers
- *Étant donné* un patient inconscient avec sa carte imprimée, *quand* un secouriste scanne, *alors* il voit la fiche vitale en lecture seule — sans compte ; si son téléphone est hors ligne, les données embarquées dans le QR s'affichent quand même.
- *Quand* le réseau revient, *alors* le patient est notifié de la consultation (EF-15-09).

### CU-15-03 — Gérer sa carte imprimée
- *Étant donné* une carte perdue, *quand* le patient révoque depuis Mon Espace, *alors* l'ancien QR devient inerte en < 1 min et une nouvelle carte est générable.

### CU-15-04 — État du compte indifférent
- *Étant donné* un compte suspendu ou un litige en cours, *alors* le bouton, la fiche et le QR **fonctionnent normalement** — seule la clôture définitive du compte les éteint.

## 4. Données du module

**Référencées :** FicheUrgence ([[../01_architecture_fonctionnelle/modele_donnees_global|dictionnaire]] §D9), Carnet (lecture extraite).

**Propres au module :**
| Entité | Attributs clés | Règles |
|---|---|---|
| QRUrgence | patient, type (temporaire / carte), jeton, expiration, révoqué | Temporaire : non révocable (PM-38) ; carte : révocable |
| ConsultationUrgence | QR, horodatage, lieu approximatif si disponible | Trace + notification (EF-15-09) |
| ServiceUrgence | nom, type, position, téléphones, horaires | Référentiel public, géré par l'Équipe ULAMU (M16) |

## 5. Règles métier

| ID | Règle |
|---|---|
| RM-15-01 | L'urgence fonctionne **quel que soit l'état du compte** (sauf clôture définitive) — aucune exception. |
| RM-15-02 | **Jamais monétisé** ([[../00_cadrage/modele_economique|garde-fous]]) — aucun paiement, aucune publicité, jamais. |
| RM-15-03 | La fiche n'expose que le vital — jamais le Carnet complet, jamais l'historique des consultations. |
| RM-15-04 | Le module ne dépend que de M07 : il doit rester opérationnel même si paiements, recherche et sessions sont en panne. |
| RM-15-05 | Les données embarquées dans le QR sont limitées au strict vital (compromis assumé confidentialité/survie, tracé en D-041). |

## 6. Interfaces

| Sens | Contrat |
|---|---|
| Consomme | Données vitales du Carnet (M07) — lecture extraite, recalculée à la synchro |
| Expose | Page publique de lecture de fiche (sans authentification, jeton QR) |
| Émet | Notifications de consultation (C4) ; traces (C5) |

## 7. Risques et points ouverts

| Point | Détail |
|---|---|
| ⚠️ Données dans le QR | Le QR imprimé contient des données de santé en clair structuré — le patient en est informé clairement à la génération (consentement explicite, loi 29-2019) |
| ⚠️ Référentiel des urgences | Sa constitution initiale (liste des hôpitaux de Brazzaville avec urgences réelles) = travail terrain du modèle opérationnel |

---

*V1 — module 13/16 · Suivant : [[M08_missions_triage]] · Index : [[../00_HOME|HOME]]*
