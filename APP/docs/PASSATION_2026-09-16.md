# Passation — 16 septembre 2026

*À lire en premier. Elle remplace la passation du 15/09 sur tout ce qu'elle recouvre ; le reste y
reste valable.*

---

## 1. Où en est le projet, en trois phrases

Le web est au **chantier 147**. La journée du 16/09 a porté sur **les documents** — le contrat de
partenariat, sa mise en page imprimée, sa lecture à l'écran, sa signature — et sur **le canal par
lequel partent les codes à usage unique**.

**ULAMU n'a aujourd'hui aucun soignant visible par les patients.** L'annuaire est à zéro. Ce n'est
pas une panne : c'est la conséquence attendue d'une réédition de contrat, et il manque trois gestes
pour le rouvrir (§3).

---

## 2. ⚠️ Ce qui ne se négocie pas

* **Tu ne pousses jamais sur GitHub** — c'est le porteur qui pousse.
* **Tu ne saisis jamais de mot de passe**, ni le code PIN du téléphone.
* **On vérifie le web sur `ulamu-web.onrender.com`, jamais en local.** Du code non poussé n'est pas
  testable.
* **Avant de travailler** : dire en bref et sans jargon ce qu'on va faire et pourquoi.
* **Proposer, recommander, attendre la validation** avant de commencer. Le porteur tranche.
* **Si un test est nécessaire, le faire soi-même** — `adb` pour le téléphone, le navigateur intégré
  pour le web. Ne lui demander que ce qui coûte de l'argent ou demande son doigt.
* Il travaille en **listes de 2–3 gestes**, déteste l'attente, et lit mal les messages longs.

### Interdits hérités, payés au prix fort

* **Jamais `prisma migrate dev`** — a effacé la base de production le 23/08/2026.
* **Jamais démarrer l'API en local contre la production** — les `@Cron` écrivent.
* **`render.yaml` fait foi.**
* **Jamais de corps JSON sur un GET.**

---

## 3. 🔴 Ce qu'il reste à faire, tout de suite

**Rien n'est poussé depuis le chantier 145.** Le `git push` du 16/09 a échoué sur
`Could not resolve host: github.com` — une coupure réseau, pas un problème de dépôt.

1. **Pousser** (chantiers 146 et 147 + la réparation du journal).
2. **En administrateur** : dossier d'Armel Konaté → **« Rééditer avec le nouveau texte du
   contrat »**. Son contrat porte le modèle `2026-09`, le courant est `2026-09.2`.
3. **En Armel** : lire le contrat jusqu'en bas, cocher **Lu et approuvé**, recopier son nom, recevoir
   le code **par email**, signer. **L'annuaire rouvre.**

⚠️ Tant que l'étape 2 n'est pas faite, le contrat affiche encore
« CONTRAT DE PARTENARIAT ULAMU Version 2 — modèle 2026-09 » : **cette ligne est dans le texte
scellé**, elle ne disparaît qu'avec une nouvelle version.

---

## 4. Ce que la journée du 16/09 a changé

### Les documents imprimés (chantiers 141 à 145, 147)

* **Pagination mesurée** : le gabarit rend le corps une fois, invisible, mesure chaque bloc et le
  répartit en autant de feuilles A4 que nécessaire. Chaque page porte son en-tête complet, son pied
  et « Page 2 sur 4 ». *L'écran est devenu identique au papier.*
* ⚠️ **Deux défauts trouvés APRÈS un « ça marche »** : 32 mm de texte coupés (les marges entre blocs
  n'étaient pas comptées), et le tableau d'une ordonnance qui était **un seul bloc** — une
  prescription longue se faisait rogner.
* **`GroupeImprimable`** : un tableau se coupe entre deux lignes et **réimprime son en-tête de
  colonnes** sur la page suivante.
* **Le contrat est devenu un acte** : plus de chiffre en vitrine, plus de cases d'identité qui
  répétaient le préambule, référence descendue en pied, titre centré, **clôture avec la date de
  signature**, filigrane « PROJET » + marque ULAMU tant qu'il n'est pas signé.
* **Écarté sciemment** : « Fait à Brazzaville » (le siège d'ULAMU n'est établi nulle part et la
  signature est électronique) et une case « Pour la Plateforme » (personne n'y appose rien).

### Le contrat à l'écran (chantiers 135, 144, 146)

* **Zone de lecture à hauteur fixe** : la carte ne défile plus sans fin, et **arriver en bas
  déverrouille « Lu et approuvé »**, qui commande le bouton de signature.
* **Barre de progression et « Article 5 sur 11 »**, à la place du sommaire (écarté par le porteur).
* **Plus aucun numéro de version à l'écran** ; une bulle dit ce qui a changé et ce que ça coûte.
* **« Voir le contrat que j'avais signé »** — on ne peut pas rester sur l'ancien, mais on peut le
  relire et l'imprimer.

### Les codes à usage unique (chantiers 138-139)

* ⚠️ **Aucun SMS ne quitte ce déploiement** : la seule passerelle branchée est celle de
  développement. Le constat existait dans le code depuis le 07/09, **tiré à un seul endroit**.
* Tous les codes destinés au titulaire passent par **l'email**, par une décision écrite une fois
  (`requestOtpToOwner`). Pas de repli SMS : un refus explicite, qui dit quoi faire.
* **`MOMO_VERIFY` garde le SMS** : il prouve la ligne qui **reçoit l'argent**. Conséquence assumée —
  **vérifier un numéro de retrait est impossible** tant qu'il n'y a pas de vraie passerelle.
* Le **changement de numéro** exige un seul code, par email. Le nouveau numéro est **déclaré, pas
  prouvé** (décision du porteur).
* **Brevo fonctionne** (vérifié le 16/09 : *Envoyé → Délivré*). L'expéditeur est une adresse Gmail —
  à surveiller.

### Divers

* **Chantier 140** : toute saisie de code à 6 chiffres se fait en **cases séparées**, par un champ
  commun. Quatre composants installés n'étaient branchés nulle part.
* **Chantier 139** : le bloc « Numéro de téléphone » affirmait que les retraits en partaient — faux
  depuis le chantier 117. **Deux filets gardaient ce mensonge.**

---

## 5. ⚠️ Les pièges de cette journée, à ne pas repayer

* **`npm run build` avant chaque commit, web ET api.** `npx tsc --noEmit` ne regarde pas les mêmes
  fichiers que `tsc -b` : un objet de test incomplet a fait échouer un déploiement pendant dix
  minutes, **sans que rien ne le signale**. *Un déploiement Render qui échoue laisse l'ancien paquet
  en place et tout a l'air normal.*
* **Pour constater un déploiement** : comparer l'empreinte du paquet servi (`index-XXXX.js`) et le
  `startedAt` de `/health` à l'heure du commit. Jamais le temps écoulé.
* **Un filet ne doit pas lire la prose comme du code.** Trois fois de suite, un garde-fou a attrapé
  le commentaire qui EXPLIQUE une règle au lieu du code qui l'applique. `sansCommentaires()` existe
  maintenant dans `impression.test.tsx`.
* **Du code défensif que rien ne peut déclencher ne protège de rien.** Deux fois : une garde
  `!texteServi ||` (chantier 137) et une garantie « arrivé en bas, on est au dernier » (chantier
  146). L'injection de fautes les a démasquées ; les deux ont été retirées.
* **Un test peut garder une erreur.** Le cas nommé « dit que les retraits y partent » a défendu une
  phrase fausse pendant deux jours. *Une promesse qu'on garde après qu'elle a cessé d'être vraie
  n'est plus une promesse : c'est un mensonge sous surveillance.*
* **Fins de ligne** : `PLAN_EXECUTION_WEB.md` est en CRLF, `packages/shared` et ses copies en LF.
  Toujours détecter avant d'écrire.
* **`PYTHONIOENCODING=utf-8`** avant tout python qui imprime du français.
* **Les accents graves et `\n` se font manger** par le shell dans `python -c "…"`. Passer par un
  fichier de script.

---

## 6. Ce qui reste dans le plan

**Les documents** : le **carnet** imprimable (4ᵉ document), **l'impression depuis le téléphone**
(route par jeton), et les documents **du mobile** à la même rigueur.

**Passe médecin** : l'écran *Ordonnance*, et la colonne de droite de *Ma vérification* (deux
horloges l'une sous l'autre, séparées par une carte sans rapport).

**Passe admin** : 7 écrans, 36 descriptions de paramètres qui portent encore des codes techniques.

---

## 7. 🔴 Sur le bureau du porteur

* **PM-20 → 2592000** et **PM-29 → 0** (les patients sont déconnectés toutes les 30 minutes).
* **Mot de passe super-admin + TOTP**, et **suspendre les comptes de démonstration**.
* **Sauvegarder `SECRETBOX_KEY`** — voir `docs/procedure_sauvegarde_SECRETBOX_KEY.md`.
* **Révoquer la clé Brevo** exposée sur une capture le 16/09, si ce n'est pas déjà fait.
* **Une passerelle SMS réelle** : sans elle, aucun retrait d'argent ne peut aboutir (le numéro
  Mobile Money ne peut pas être vérifié).
* **Un nom de domaine** : l'expéditeur des emails est une adresse Gmail, ce que les messageries
  finissent par refuser.
* **Hébergement hors Congo**, **modèle économique**, et les **5 000 F gelés depuis le 28/08**.
