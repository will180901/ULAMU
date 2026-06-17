# ULAMU — Application PATIENTS (React Native)

App React Native **0.76** (Android d'abord — ADR-04). **Projet autonome** installé avec **npm**
(hors workspace pnpm, pour rester sur le flux React Native standard, sans friction Metro/symlinks).

## ✅ Ce qui marche aujourd'hui (slice « Socle + Auth »)
- Écran d'accueil (Bienvenue) → **Créer un compte** / **Se connecter**
- **Inscription** : téléphone → code SMS (OTP) → mot de passe + profil → compte créé + session
- **Connexion** : téléphone + mot de passe → session
- Session **persistante** (on reste connecté au redémarrage) ; **déconnexion**
- Tout est branché sur le backend `apps/api` (module M01).

> Les onglets Accueil / Consultations / Mon Espace (D-013) arriveront aux prochains découpages.

## 🛠️ Prérequis (sur ta machine)
1. **Node.js** ≥ 18 (tu as v24 — parfait).
2. **Android Studio** installé, avec :
   - un **SDK Android** (Android 13/API 33 conseillé) ;
   - un **émulateur** (AVD) créé **ou** un téléphone Android en mode développeur branché en USB.
   - Le **JDK 17** fourni par Android Studio suffit.
3. Le **backend démarré** (sinon l'app n'a personne à qui parler) :
   ```
   # depuis la racine du dépôt
   docker compose -f infra/docker-compose.dev.yml up -d   # base de données
   pnpm --filter @ulamu/api prisma:seed                   # paramètres + admin (1ère fois)
   pnpm --filter @ulamu/api dev                            # API sur http://localhost:3000
   ```

## ▶️ Lancer l'app
```
cd apps/mobile
npm install                 # 1ère fois (télécharge React Native & co.)
npm start                   # démarre Metro (le "serveur" JS) — laisse ce terminal ouvert
```
Puis, **au choix** :
- **Android Studio** : ouvrir le dossier `apps/mobile/android`, attendre la synchro Gradle, choisir un émulateur, cliquer ▶️ **Run**.
- **ou en ligne de commande** (émulateur déjà lancé) : dans un 2ᵉ terminal, `npm run android`.

### Adresse du backend
- **Émulateur** : `http://10.0.2.2:3000` (déjà configuré dans `src/config.ts` — `10.0.2.2` = le « localhost » de ton PC vu depuis l'émulateur).
- **Téléphone physique** : remplace par l'IP Wi-Fi de ton PC (ex. `http://192.168.1.20:3000`) dans `src/config.ts`.

## 🗂️ Structure
```
App.tsx                  # point d'entrée (SafeArea + AuthProvider + navigation)
src/
├── config.ts            # URL du backend
├── theme.ts             # couleurs/espacements (charte Claude Design, accent #2756A6)
├── components/ui.tsx     # boutons, champs, écran… réutilisables
├── lib/                 # SOCLE vendoré (copie de packages/contracts + packages/shared) :
│   ├── contracts.ts      #   types M01 + routes + erreurs
│   ├── validation.ts     #   numéro Congo, mot de passe, OTP, âge
│   ├── api-client.ts     #   client fetch typé (Bearer, erreurs normalisées)
│   └── auth-state.ts     #   machine d'états d'auth (pure)
├── services/            # api.ts (client + jeton), session.ts (stockage AsyncStorage)
├── state/AuthContext.tsx # contexte d'auth (restore, login, register, logout)
├── navigation/          # aiguillage loading → anonyme → connecté
└── screens/             # Welcome, Login, Register, Home
```

## ⚠️ Notes
- `src/lib/` est une **copie** du socle partagé (`packages/contracts`, `packages/shared`) — à re-lier au workspace plus tard ; pour l'instant on privilégie un projet RN simple à lancer.
- Le jeton de session est stocké via **AsyncStorage (non chiffré)** : à **durcir en production** (react-native-keychain), cf. `strategie_offline_sync.md`.
- 🎨 UI : reproduire le rendu des maquettes officielles (`Maquettes_ULAMU/`) — jamais leur code (D-044).
