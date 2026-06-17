# MODULE M05 — Annuaire des Professionnels

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-031 |
| Release | MVP — Chantier 3 |
| Domaine | D3 Soin |
| Dépendances | M01, M02, M03 |

---

## 1. Mission et périmètre

La **vitrine de l'offre de soin** : profils publics des professionnels vérifiés, leurs offres de consultation, la recherche avec filtres. C'est le cœur de l'onglet **Accueil** de l'app patient (D-013).

**Hors-périmètre explicite :**
- La poignée de main et la session → M06 (M05 s'arrête au bouton « initier »)
- Recherche de médicaments et labos → M12
- Collecte des notations → M06 (M05 ne fait que les afficher)

## 2. Acteurs

| Acteur | Usage |
|---|---|
| Patient (et visiteur non connecté) | Cherche, compare, consulte les profils |
| Professionnel | Gère son profil public, ses offres, son statut de présence |
| Le Système | Calcule les indicateurs de réactivité et le classement |

## 3. Exigences fonctionnelles

| ID | Exigence |
|---|---|
| EF-05-01 | **Profil public** : nom, photo, catégorie, spécialité, Badge Vérifié, biographie, arrondissement, note moyenne + nombre d'avis, **indicateur de réactivité** (taux et délai moyen de confirmation des poignées de main), statut de présence. |
| EF-05-02 | **Gestion des offres** par le professionnel : libellé, durée (PM-09), prix (PM-06, commission incluse D-010), type (standard / suivi) ; activation/désactivation ; maximum d'offres actives (PM-25 ❓). |
| EF-05-03 | **Recherche et filtres** : catégorie, spécialité, prix maximum, note minimum, « disponible maintenant », arrondissement. Tri : pertinence (défaut), prix, note, réactivité. |
| EF-05-04 | **Vitrine consultable sans compte** : l'annuaire se parcourt avant inscription ; toute action (initier, suivre) exige la connexion. *(Acquisition : on montre la valeur avant de demander un compte.)* |
| EF-05-05 | **Statut de présence** : « en ligne » (connecté au desktop, disponible) / « absent » (déconnecté ou en mode Ne pas déranger). Le professionnel bascule en un clic. |
| EF-05-06 | **Bouton « initier » actif uniquement si le professionnel est en ligne** (la vision : on ne paie jamais un absent). Sinon : bouton « M'avertir quand il est disponible » → notification (C4). |
| EF-05-07 | **Affichage honnête des notations** : moyenne, répartition, derniers commentaires. Un commentaire peut être signalé (M04). |
| EF-05-08 | L'Accueil présente les professionnels par **onglets de catégories** (généralistes, spécialistes, dentistes, sages-femmes, infirmiers, agents) — D-013. |

## 4. Cas d'utilisation

### CU-05-01 — Rechercher un professionnel
- *Étant donné* un patient (même non connecté), *quand* il filtre « généraliste, ≤ 5 000 XAF, disponible maintenant », *alors* résultats en < 4 s (ENF-03), classés par pertinence, chacun montrant : photo, badge, note, prix de l'offre la moins chère, présence.
- *Étant donné* aucun résultat, *alors* suggestions d'élargissement (retirer un filtre, voir les non disponibles avec la cloche d'alerte).

### CU-05-02 — Consulter un profil
- *Étant donné* une fiche ouverte, *alors* tout EF-05-01 est visible, plus la liste des offres ; le bouton « initier » respecte EF-05-06.
- *Étant donné* un visiteur non connecté, *quand* il touche « initier », *alors* parcours d'inscription/connexion (M01) puis retour exact à la fiche.

### CU-05-03 — Gérer ses offres (professionnel)
- *Étant donné* un professionnel vérifié, *quand* il crée « Consultation 30 min — 5 000 XAF », *alors* validation PM-06/PM-09, visible immédiatement dans l'annuaire.
- *Étant donné* une offre désactivée, *alors* elle disparaît de l'annuaire mais l'historique des sessions passées la référence toujours.

### CU-05-04 — Basculer sa présence
- *Étant donné* un professionnel en ligne, *quand* il passe « Ne pas déranger », *alors* ses boutons « initier » se grisent chez tous les patients en < 1 min ; les poignées de main déjà confirmées ne sont pas affectées.
- *Étant donné* une fermeture de l'application desktop ou 15 min d'inactivité, *alors* passage automatique en « absent » (PM-26 ❓).

### CU-05-05 — Être averti de la disponibilité
- *Étant donné* une cloche posée sur un professionnel absent, *quand* il repasse en ligne, *alors* notification au patient (une seule par cloche, valable 7 jours).

## 5. Données du module

**Référencées :** ProfilProfessionnel, OffreConsultation, Notation ([[../01_architecture_fonctionnelle/modele_donnees_global|dictionnaire]]).

**Propres au module :**
| Entité | Attributs clés | Règles |
|---|---|---|
| StatutPresence | professionnel, état (en ligne / absent / ne pas déranger), depuis | Mis à jour par le desktop (battement de cœur) |
| IndicateursReactivite | professionnel, taux de confirmation, délai moyen, période | Calculés depuis les événements M06, recalcul quotidien |
| AlerteDisponibilite | patient, professionnel, posée le, expirée le | Une notification max par alerte |

## 6. Règles métier

| ID | Règle |
|---|---|
| RM-05-01 | Seuls les professionnels **vérifiés et sous contrat** apparaissent (C6, D-029). |
| RM-05-02 | **Le classement ne se vend pas** ([[../00_cadrage/modele_economique|garde-fous]]) : algorithme documenté = réactivité + note + activité récente. Aucun paramètre payant. |
| RM-05-03 | Les prix affichés sont finaux pour le patient (D-010). |
| RM-05-04 | Initiation impossible vers un professionnel absent (EF-05-06) — la poignée de main commence par la présence. |
| RM-05-05 | Un professionnel suspendu (M03/M16) disparaît de l'annuaire en < 1 min (cascade C6). |

## 7. Interfaces

| Sens | Contrat |
|---|---|
| Expose | Fiche professionnel + offre sélectionnée → M06 (départ de la poignée de main) |
| Consomme | Statut C6 (M03) ; événements de session pour les indicateurs (M06) ; notations (M06) ; présence (battement de cœur desktop, M01) |
| Émet | Demandes de notification cloche (C4) ; audit des actions sensibles (C5) |

## 8. Exigences non fonctionnelles spécifiques

- Vitrine et fiches : cache local (consultation fluide en 3G, ENF-03) — mais la **présence** et le bouton « initier » toujours rafraîchis en temps réel (jamais de bouton actif périmé).
- Photos de profil compressées (ENF-02).

## 9. Risques et points ouverts

| Point | Détail |
|---|---|
| ❓ PM-25 | Nombre maximum d'offres actives par professionnel : proposition **5** |
| ❓ PM-26 | Bascule automatique en « absent » après inactivité desktop : proposition **15 min** |
| ⚠️ Présence fiable | Le « battement de cœur » desktop doit être robuste — un « en ligne » faux ruine la promesse de la poignée de main (R-04) ; détail en Phase 3 |
| ⚠️ Premiers arrivés | Sans notes ni historique, les nouveaux vérifiés doivent rester visibles (boost de découverte temporaire dans l'algorithme, documenté RM-05-02) |

---

*Phase 2 — module 5/12 · Précédent : [[M04_audit_signalements]] · Suivant : M06 Poignée de main & Session ⭐ · Index : [[../00_HOME|HOME]]*
