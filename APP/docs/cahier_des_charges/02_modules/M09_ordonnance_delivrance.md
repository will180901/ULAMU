# MODULE M09 — Ordonnance & Délivrance

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-034 |
| Release | MVP — Chantier 4 |
| Domaine | D5 Prescription |
| Dépendances | M06, M11 |

---

## 1. Mission et périmètre

Remplacer l'ordonnance papier — perdue, illisible, falsifiable — par un document **signé, infalsifiable et traçable** de la prescription jusqu'à la délivrance en pharmacie.

**Hors-périmètre explicite :**
- Demandes d'examens de laboratoire → M10 (V1)
- Recherche de la pharmacie qui a les produits → M12
- Gestion du stock → M11 (M09 lui envoie l'événement de délivrance, C3)

## 2. Acteurs

| Acteur | Usage |
|---|---|
| Prescripteur | Crée, annule ses ordonnances (en session uniquement) |
| Patient | Reçoit, présente le QR, suit les statuts |
| Membre de pharmacie (droit « délivrance », M02) | Scanne, vérifie, délivre |
| Le Système | Garde-fou allergies, signature, expiration, traçabilité |

## 3. Exigences fonctionnelles

| ID | Exigence |
|---|---|
| EF-09-01 | Création **uniquement depuis une session active** (D-014), par un **prescripteur** uniquement ; la sage-femme prescrit dans son domaine (liste encadrée du référentiel). |
| EF-09-02 | **Lignes de prescription** : médicament choisi dans le **référentiel** (DCI + noms commerciaux), posologie, durée, quantité. Ligne **hors référentiel** possible en texte libre — marquée comme telle, sans garde-fou automatique, remontée à l'Équipe ULAMU pour enrichir le référentiel. |
| EF-09-03 | **Garde-fou allergies** : à chaque ligne, comparaison automatique avec les allergies actives du Carnet (M07). Alerte bloquante → le prescripteur ne peut continuer qu'avec une **confirmation explicite motivée**, tracée (C5). *Garde-fou, pas verrou.* |
| EF-09-04 | **Scellement** : à la validation, document signé (plateforme + identité du prescripteur), **QR unique**, versé au Carnet (C2), patient notifié (C4). PDF imprimable disponible (transition papier, [[../00_cadrage/cadre_reglementaire|cadre réglementaire]] §5). |
| EF-09-05 | **Présentation en pharmacie** : QR affiché depuis l'app **même hors ligne** (D-025) ou sur PDF imprimé. |
| EF-09-06 | **Scan et vérification** : le membre de pharmacie scanne → le serveur renvoie l'état réel (lignes, quantités restantes, validité). **La vérification et la délivrance exigent une connexion côté pharmacie** — c'est ce qui rend la double délivrance impossible. |
| EF-09-07 | **Délivrance totale ou partielle** : quantités saisies par ligne ; le solde reste délivrable ailleurs (multi-pharmacies) ; chaque délivrance décrémente le stock (C3) et s'inscrit au Carnet (C2). |
| EF-09-08 | **Statuts** : active → partielle → délivrée / **expirée** (PM-10, 30 jours) / **annulée** (par le prescripteur, motif obligatoire, QR invalidé, patient notifié). |
| EF-09-09 | Historique complet pour le patient (onglet Consultations, D-013) : ordonnances actives, à mi-parcours, terminées. |

## 4. Cas d'utilisation

### CU-09-01 — Prescrire en session
- *Étant donné* une session active, *quand* le prescripteur ajoute « Amoxicilline 500 mg, 3×/jour, 7 jours », *alors* le garde-fou compare aux allergies actives du Carnet ; sans alerte, la ligne s'ajoute.
- *Étant donné* une allergie active à la pénicilline, *alors* alerte bloquante affichant l'entrée du Carnet en cause ; le prescripteur renonce ou confirme avec motif — tout est tracé.
- *Étant donné* la validation finale, *alors* scellement, QR, Carnet, notification — en < 5 s.

### CU-09-02 — Délivrer en pharmacie
- *Étant donné* un membre avec droit « délivrance » dans une pharmacie vérifiée, *quand* il scanne le QR, *alors* il voit lignes et quantités **restantes** (jamais le reste du Carnet — RM-09-04).
- *Quand* il saisit les quantités délivrées, *alors* confirmation, stock décrémenté (C3), entrée au Carnet (C2), statut mis à jour, patient notifié.
- *Étant donné* une ordonnance déjà entièrement délivrée, *alors* le scan l'affiche clairement — nouvelle délivrance impossible.

### CU-09-03 — Délivrance partielle multi-pharmacies
- *Étant donné* une pharmacie qui n'a que 2 lignes sur 3, *alors* délivrance partielle ; le patient peut relancer une recherche (M12) sur le solde uniquement.

### CU-09-04 — Annuler une ordonnance
- *Étant donné* un prescripteur et sa propre ordonnance non entièrement délivrée, *quand* il annule avec motif, *alors* QR invalidé en < 1 min, patient notifié, lignes non délivrées inertes.

### CU-09-05 — Expiration
- *Étant donné* PM-10 atteint, *alors* statut « expirée » automatique, QR inerte, patient prévenu à J-7 et J-1 (C4) — il peut redemander via une session de suivi.

## 5. Données du module

**Référencées :** Ordonnance, LignePrescription, Medicament ([[../01_architecture_fonctionnelle/modele_donnees_global|dictionnaire]] §D5).

**Propres au module :**
| Entité | Attributs clés | Règles |
|---|---|---|
| Delivrance | ordonnance, pharmacie, membre, lignes et quantités, horodatage | Immuable ; émet C3 et C2 |
| PassageOutreAllergie | ordonnance, ligne, allergie en cause, motif, prescripteur | Trace du garde-fou (C5) |
| LigneHorsReferentiel | ordonnance, texte libre, signalée le | File d'enrichissement du référentiel |

## 6. Règles métier

| ID | Règle |
|---|---|
| RM-09-01 | Seul un prescripteur prescrit ; la sage-femme dans son domaine encadré. Jamais hors session (D-014). |
| RM-09-02 | L'état d'une ordonnance vit **côté serveur** — le QR n'est qu'une clé, jamais une preuve en soi. |
| RM-09-03 | Délivrance : structure vérifiée (D-029) + membre avec droit (M02) + connexion active, sans exception. |
| RM-09-04 | Le scan ne révèle **que l'ordonnance** — jamais le Carnet du patient à la pharmacie. |
| RM-09-05 | Une ordonnance annulée ou expirée ne se réactive pas — on en crée une nouvelle (immutabilité). |
| RM-09-06 | Traçabilité de bout en bout : qui a prescrit, quand, qui a délivré, quoi, où. |

## 7. Interfaces

| Sens | Contrat |
|---|---|
| Consomme | Contexte de session active (M06) ; allergies actives (M07) ; référentiel Medicament |
| Expose | **C3** — événement de délivrance → M11 (décrément du stock) |
| Expose | **C2** — ordonnance et délivrances → Carnet (M07) ; contenu d'ordonnance active → M12 (recherche par ordonnance) |
| Émet | Notifications (C4) ; audit complet (C5) |

## 8. Exigences non fonctionnelles spécifiques

- Garde-fou allergies : réponse < **1 s** (il est dans le geste de prescription).
- Scan QR → affichage de l'état : < **3 s** sur la connexion de la pharmacie.
- QR lisible sur écran fissuré ou en plein soleil (taille et contraste — exigence UX, Phase 4).

## 9. Risques et points ouverts

| Point | Détail |
|---|---|
| ⚠️ Référentiel médicaments | Sa qualité conditionne le garde-fou et la recherche M12 — constitution initiale (source à choisir) au modèle opérationnel, Phase 3 |
| ⚠️ Validité légale | L'ordonnance numérique reste à sécuriser juridiquement (Q-003 / plan réglementaire) — le PDF imprimable est la passerelle transitoire |
| 💡 Renouvellement chronique | Ordonnances renouvelables (hypertension, diabète) : reporté en V1 — nouvelle entrée au backlog |
| ❓ Q-004 (rappel) | « Produit réservé mais plus en stock à l'arrivée » — sera tranché au module M12 |

---

*Phase 2 — module 8/12 · Précédent : [[M07_carnet]] · Suivant : M11 Stocks & Catalogues · Index : [[../00_HOME|HOME]]*
