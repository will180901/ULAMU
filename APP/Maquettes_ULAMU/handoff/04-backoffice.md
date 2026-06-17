# 04 — Back-office ULAMU (M16)

> Maquette : `ui_kits/backoffice/`. Acteur : équipe ULAMU (rôles internes — superviseure dans la maquette). Accès restreint, chaque action tracée au journal.

## Écrans
| Route | Écran |
|---|---|
| `/` | Pilotage : KPIs réseau, courbe d'activité, alertes opérationnelles |
| `/verifications` | File des dossiers de badge vérifié |
| `/litiges` | Litiges ouverts / clos |
| `/structures` | Annuaire du réseau (états de fraîcheur, vérification) |
| `/journal` | Journal inaltérable (lecture seule) |

## 1. Vérifications (M03) — workflow

```
Dépôt (pro/structure) → FILE → EXAMEN (documents + signaux de risque)
  → ACCORDÉ (badge actif, visible des patients)
  | REJETÉ (motif obligatoire transmis au demandeur, signalement conservé)
```

- Signaux de risque automatiques : numéro d'ordre invérifiable, document illisible, doublon d'identité. Affichés en rouge dans la file et la modale.
- Toute décision = {décideur, horodatage, motif} → journal. La maquette l'affiche : « Décision tracée au journal inaltérable, avec votre identité ».
- **[À TRANCHER : vérification auprès de l'ordre des médecins — manuelle (appel) ou intégration ?]**
- **[À TRANCHER : renouvellement périodique du badge ?]**

## 2. Litiges

Principe produit : **le remboursement est automatique (machine), l'arbitrage humain ne porte que sur les comptes.**
- Types vus en maquette : session non honorée (récidive ⇒ proposition de suspension), réservation non tenue par une pharmacie (avertissement), contestation de compte-rendu (conciliation).
- Actions : avertir / suspendre / réactiver un compte ; clôturer un litige. Chaque action tracée.
- **[À TRANCHER : barème de sanctions (n récidives ⇒ suspension) et procédure d'appel]**

## 3. Pilotage

- KPIs : patients inscrits, consultations/jour, volume (GMV), taux de litiges — agrégats à définir côté data.
- Alertes opérationnelles automatiques : litige en attente d'arbitrage, structure gelée (fraîcheur), pics d'usage.
- Bandeau d'objectif du pilote (S9/24, 500 consultations/semaine) : configurable.

## 4. Journal (M04)

- Append-only, chaque écriture chaînée par empreinte (hash précédent ⊕ contenu). Lecture seule **y compris pour l'équipe ULAMU** (affiché dans la maquette).
- Événements journalisés (vus dans les maquettes) : `verification.decision`, `litige.remboursement`, `ordonnance.signature`, `session.cloture`, `paiement.capture`, `delivrance.confirmation`, `resultat.validation`, actions des membres de structures.
- **[À TRANCHER : technologie (table append-only + hash chain suffit ; pas besoin de blockchain) et politique de rétention]**
