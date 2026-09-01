# Outils de revue — hors build, hors production

Trois fichiers pour **regarder l'application** sans se connecter et sans toucher à la production.
`tsconfig.app.json` n'inclut que `src`, et Vite ne construit que depuis `src` : rien d'ici ne part
dans le site déployé.

## Pourquoi ils existent

Deux contraintes, qui ne changeront pas :

1. **On ne saisit jamais de mot de passe.** Impossible donc de se connecter pour atteindre les
   écrans protégés.
2. **`DATABASE_URL` désigne la base Neon de PRODUCTION.** Le projet n'a pas de base locale, par
   choix assumé. Toute revue qui parle « à l'API » parle donc au vrai service.

D'où une fausse API locale et une session fabriquée : les mêmes écrans, aucune donnée réelle.

## `api-de-revue.mjs`

Un serveur HTTP sur le port **5174** qui répond aux routes de l'application avec des données
représentatives — textes longs, montants à quatre chiffres, listes non vides. C'est là que la mise
en page casse, pas sur des valeurs courtes.

```
node apps/web/outils/api-de-revue.mjs
```

Puis, dans `apps/web/.env.local` (déjà ignoré par git via `*.local`) :

```
VITE_API_URL=http://localhost:5174
```

⚠️ **Supprimez ce `.env.local` en fin de revue.** Sinon l'application continue de parler à la fausse
API sans que rien ne le signale.

### Les interrupteurs

| Adresse | Effet |
|---|---|
| `/__role/ADMIN` · `/__role/PROFESSIONAL` | change le type du compte servi par `/v1/accounts/me` |
| `/__etat/plein` | les données ci-dessus |
| `/__etat/vide` | les mêmes réponses, **toutes listes vidées** |
| `/__etat/erreur` | **500** sur toute route `/v1/` |
| `/__etat/lent` | les données, après **4 s** — c'est ainsi qu'on voit les squelettes |
| `/__casser/1` | sert des formes inattendues, pour éprouver les garde-fous |
| `/__auditeur.js` · `/__auditeur2.js` | sert les deux auditeurs ci-dessous, à charger dans la page |

### La session fabriquée

À exécuter dans la console de la page, **avant** de charger un écran protégé :

```js
sessionStorage.setItem('ulamu-web-session', JSON.stringify({
  state: {
    token: 'jeton-de-revue',
    me: { accountId: 'a1b2c3d4-0000-0000-0000-000000000001', accountType: 'ADMIN',
          username: 'dr.armel', phone: '+242069000110', firstName: 'Armel', lastName: 'Konaté',
          adminRole: 'SUPER_ADMIN', totpEnabled: true },
    isAuthenticated: true,
  },
  version: 0,
}))
```

`accountType: 'PROFESSIONAL'` + `adminRole: null` pour l'espace soignant. Le magasin ne se réhydrate
qu'**au chargement de la page** : écrire la session ne suffit pas, il faut recharger ensuite.

## `auditeur-mise-en-page.js` — les défauts

`window.__AUDIT__()` relève, sur l'écran courant : débordement horizontal de la page, éléments qui
dépassent le bord droit, texte rogné par sa propre boîte, recouvrement barre/contenu, texte de la
couleur de son fond, tailles sous 11 px, cibles tactiles sous 32 px.

Il **ignore délibérément** ce qui vit dans un conteneur à défilement — d'où le second.

## `auditeur-responsive.js` — l'adaptation

`window.__RESP__()` juge ce que le premier laisse passer : conteneurs à défilement horizontal **et
de combien**, tableaux et leur largeur réelle, colonnes restées côte à côte, grilles restées à
plusieurs colonnes.

C'est lui qui a trouvé que le registre cachait 549 px hors écran sur un téléphone, alors que le
premier auditeur ne signalait rien.

Les deux exposent aussi `window.__ALLER__('/chemin')`, qui navigue **sans recharger** — donc sans
perdre l'auditeur.

## Deux pièges d'outillage, payés cher

- **Ne jamais envoyer de corps JSON sur une requête `GET`** en sondant l'API déployée : Cloudflare,
  en amont de Render, la rejette par intermittence avec une page HTML « 400 Bad Request » qui ne
  vient pas de l'application. Deux heures perdues à chercher une régression inexistante.
- **Les captures d'écran du volet de développement ne sont fiables qu'en dessous de ~1024 px.**
  Au-delà, l'image est réduite au point d'être illisible. Mesurer par script, pas à l'œil.
