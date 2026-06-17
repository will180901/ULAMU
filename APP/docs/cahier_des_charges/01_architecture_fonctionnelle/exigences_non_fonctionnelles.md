# Exigences Non Fonctionnelles — ULAMU

| Champ | Valeur |
|---|---|
| Version | 1.0 |
| Date | 2026-06-10 |
| Statut | 🟢 Validé (2026-06-10) — D-025 |
| Documents liés | [[personas_parcours]] · [[registre_risques]] (R-09) · [[registre_decisions]] (Q-005) |

> Des chiffres, pas des slogans. Chaque exigence est **mesurable** et sera vérifiée avant chaque mise en production (stratégie de tests, Phase 3).

---

## ENF-01 — Plancher matériel (mobile patient)
- Android **8.0+**, **2 Go RAM**, écran 5", **150 Mo** d'espace libre.
- L'app doit rester utilisable sur ce plancher : c'est le téléphone de Mireille (P1), pas le nôtre.
- iOS : décision reportée au [[plan_releases]].

## ENF-02 — Poids et data (la donnée coûte cher au Congo)
- APK ≤ **25 Mo** ; app installée ≤ **60 Mo**.
- Une session de 30 min ≤ **5 Mo** de data (hors médias).
- Photos compressées automatiquement à ≤ **200 Ko** ; notes vocales ≤ **1 Mo/minute**.
- Mode « économie de données » : médias téléchargés à la demande seulement.

## ENF-03 — Performance sur réseau réel (référence : 3G instable)
- Ouverture de l'écran Accueil : < **3 s** en 3G.
- Envoi d'un message texte : < **2 s** en 3G.
- Recherche anonyme : résultats < **4 s** en 3G.
- Toute action affiche un retour visuel immédiat (< 200 ms) même si le réseau traîne.

## ENF-04 — Hors ligne (réponse à Q-005) ❓ à valider
**Disponible hors ligne (cache local chiffré) :**
- Lecture du **Carnet** complet ;
- **Ordonnances actives** avec leur QR (présentables en pharmacie même sans réseau) ;
- **Fiche urgence** et reçus ;
- **Rédaction de messages** dans une session active → file d'attente, envoi automatique à la reconnexion.

**Exige une connexion :** recherche, dévoilement, paiement, poignée de main, téléversements.

**Règle de session :** le décompteur court côté serveur. En cas de coupure réseau du **professionnel** en pleine session, le traitement équitable sera défini au module M06.

## ENF-05 — Disponibilité & reprise
- Disponibilité cible : **99,5 %/mois** (≈ 3 h 40 d'indisponibilité tolérée).
- Maintenance planifiée : annoncée **48 h** à l'avance, jamais aux heures de pointe (18 h-22 h).
- Sauvegardes : perte de données maximale (RPO) ≤ **24 h** ; reprise (RTO) ≤ **4 h**.
- Le Carnet et le journal financier : sauvegarde **quotidienne** vérifiée.

## ENF-06 — Capacité initiale (ville pilote)
- **10 000** comptes, **500 sessions/jour**, **50 sessions simultanées** sans dégradation.
- Architecture extensible horizontalement (la montée en charge ne doit pas exiger de réécriture).

## ENF-07 — Sécurité
- Chiffrement en transit (TLS 1.2+) **partout**, sans exception.
- Données au repos chiffrées ; cache mobile chiffré ; clés gérées proprement (détail : modèle de menaces, Phase 3).
- Verrouillage optionnel de l'app par PIN/biométrie (P3 — confidentialité visible).
- Desktop : déconnexion automatique après **30 min** d'inactivité.
- **Aucun contenu médical dans les notifications push** (« Vous avez un nouveau message » — jamais le texte).
- Conformité loi n° 29-2019 : consentement explicite à l'inscription, droits d'accès/rectification, registre des traitements ([[cadre_reglementaire]]).

## ENF-08 — Observabilité & support
- Toute panne majeure détectée en < **5 min** (supervision automatique).
- Support utilisateur : première réponse < **24 h** au lancement.
- Chaque paiement traçable de bout en bout en < **1 min** de recherche (Admin Finance).

## ENF-09 — Desktop professionnels
- Windows 10+ (Electron) ; fonctionne sur un PC bureautique modeste (4 Go RAM).
- Notification de poignée de main visible et sonore en < **5 s** après l'initiation patient (R-04 : la réactivité des professionnels est un risque majeur).

---

*Phase 1 — document 6/7 · Précédent : [[parametres_metier]] · Suivant : [[plan_releases]] (le MVP) · Index : [[../00_HOME|HOME]]*
