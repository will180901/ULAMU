# 03 — Espaces structures : Pharmacie & Laboratoire (desktop)

> Maquettes : `ui_kits/structure_pharmacie/` et `ui_kits/structure_labo/`.
> Modèle commun (M02) : une **structure** a un **titulaire** responsable (signe les contrats, valide) et des **membres** aux droits limités ; toutes les actions des membres sont tracées au journal (M04).

## A. Pharmacie

### Écrans
| Route | Écran |
|---|---|
| `/` | Tableau de bord : KPIs, réservations 24 h actives (compte à rebours), bouton « Scanner une ordonnance » |
| `/stock` | Stock vivant par lots : visibilité, péremption, quantités, états |
| `/delivrances` | Historique des scans (réservation → délivrée) |
| `/gains` | Solde (dévoilements 500 F), transactions, retrait MoMo |
| `/membres` | Titulaire + membres et leurs droits |

### Flux de délivrance (cœur du métier — modale 3 phases dans la maquette)
```
SCAN QR → vérification serveur → ORDONNANCE AUTHENTIQUE (jamais délivrée, lots proposés)
        → « Confirmer la délivrance » → stock décrémenté + réservation clôturée
        + écriture au dossier patient + ligne de délivrance
```
- `POST /delivrances/verification {qrPayload}` → {ordonnance, patient, médicaments↔lots, déjàDélivrée?}
- Rejets : QR falsifié, ordonnance expirée (30 j), déjà délivrée → message d'erreur explicite. **[À TRANCHER : délivrance partielle autorisée ?]**
- `POST /delivrances {ordonnanceId, lignes[{lot, qte}]}` — atomique avec le décrément de stock.

### Stock & règle de fraîcheur (anti-R-03)
- Lot = {médicament, code lot, péremption, quantité}. États dérivés : en stock / péremption proche / épuisé.
- **Règle de fraîcheur** : stock non mis à jour depuis 48 h ⇒ structure **masquée des recherches anonymes** (bannière d'avertissement dans la maquette). La délivrance par scan met à jour automatiquement (donc maintient la fraîcheur).
- Import de stock (CSV) prévu — bouton présent. **[À TRANCHER : format d'import]**

### Réservations
- Issues du dévoilement payant côté patient : TTL **24 h**, stock bloqué.
- Expiration : stock libéré + notification patient. **[À TRANCHER : remboursement du dévoilement si non-retrait imputable au patient ? La maquette promet « garanti ou remboourné » côté patient quand la *pharmacie* fait défaut.]**

## B. Laboratoire

### Écrans
| Route | Écran |
|---|---|
| `/` | Tableau de bord : KPIs, demandes d'examens (états), « Accueillir un patient » |
| `/resultats` | Saisie (technicien) + **validation (biologiste titulaire uniquement)** |
| `/catalogue` | Examens proposés : famille, délai, tarif, visibilité prescripteurs |
| `/gains`, `/membres` | comme pharmacie |

### Flux d'une demande d'examens
```
Prescription (cockpit pro) → demande EX-AAAA-NNNN payée via ULAMU
→ ACCUEIL : scan QR demande → identité confirmée → prélèvement enregistré (tubes étiquetés)
→ SAISIE des analytes (technicien) → À VALIDER
→ VALIDATION (signature biologiste) → versé au dossier + prescripteur notifié + gain crédité
```
- Saisie : chaque analyte = {valeur, unité, intervalle de référence, drapeau normal/élevé/bas calculé}. Les valeurs hors normes sont **signalées** (badge warning) mais l'interprétation reste au prescripteur.
- Seul le **titulaire biologiste** peut valider (contrôle de rôle strict) ; la validation est une signature électronique tracée.
- Référentiel des intervalles : **[À TRANCHER : barème par âge/sexe, source du référentiel]**.
- Délais affichés au catalogue = engagement visible des prescripteurs au moment de la demande.

## C. Commun aux structures

- Sidebar : carte d'identité de la structure (nom + badge vérifié + quartier) ; pied avec menu utilisateur (rôle affiché).
- Gains : crédités à l'acte (délivrance / validation) ; retrait MoMo ; commission contractuelle incluse et visible.
- Membres : invitation par téléphone, droits par capacité (délivrer / stock / accueil / saisie / valider). **[À TRANCHER : matrice de droits exacte]**
- Vérification de la structure (licence d'exploitation) par le back-office avant visibilité.
