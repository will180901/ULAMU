/**
 * @format
 * Ce que les écrans du patient DOIVENT dire — le filet de la refonte. Chantier 68, 07/09/2026.
 *
 * ── Pourquoi ce fichier existe ────────────────────────────────────────────────────────────────
 *
 * Une refonte graphique réécrit les écrans. C'est précisément le moment où des phrases disparaissent
 * sans que personne ne s'en aperçoive — non par négligence, mais parce qu'elles ressemblent à du
 * texte d'habillage. Elles n'en sont pas : chacune de celles qui suivent a été écrite pour réparer
 * un défaut précis, souvent après l'avoir vu en production.
 *
 * ⚠️ **Ce sont des garanties, des refus de promettre, ou des conséquences qu'on doit à quelqu'un
 * AVANT qu'il agisse.** Une refonte qui les perd ne fait pas un écran plus beau : elle fait un écran
 * qui ment à nouveau.
 *
 * ── Comment s'en servir ───────────────────────────────────────────────────────────────────────
 *
 * C'est la LISTE À RELIRE avant de toucher un écran. Chaque cas dit ce que la phrase défend. Une
 * refonte peut reformuler — mais elle doit alors changer ce test EN CONSCIENCE, et la nouvelle
 * formulation doit dire la même chose.
 *
 * *Supprimer une ligne d'ici est une décision. La laisser tomber d'un écran ne l'était pas.*
 *
 * Le jumeau web vit dans `apps/web/src/test/promesses-tenues.test.ts`.
 */
import {describe, expect, it} from '@jest/globals';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

/**
 * Le texte d'un écran, lisible comme une phrase.
 *
 * ⚠️ Le JSX COUPE les phrases sur plusieurs lignes selon la largeur du fichier : chercher une phrase
 * telle qu'on la lit à l'écran échoue sur un retour à la ligne invisible. On aplatit donc les
 * espaces, et on normalise les apostrophes typographiques.
 */
const ecran = (rel: string): string =>
  readFileSync(resolve(__dirname, '..', 'src', rel), 'utf8')
    .replace(/’/g, "'")
    .replace(/[  ]/g, ' ')
    .replace(/\s+/g, ' ');

/**
 * `[motif, ce que la phrase défend]`.
 *
 * ⚠️ Le motif ancre **deux mots-clés séparés par du texte libre**, jamais une phrase entière.
 * Réécrire autour reste possible ; supprimer l'idée ne l'est pas. Exiger une phrase mot pour mot
 * finirait par interdire de mieux la dire — c'est le pendant de la leçon du chantier 16 : *un test
 * qui interdit des mots finit par interdire les explications.*
 *
 * Le filet web (`apps/web/src/test/promesses.test.ts`) suit exactement la même règle.
 */
type Promesse = [RegExp, string];

function verrouiller(nom: string, chemin: string, promesses: Promesse[]): void {
  describe(nom, () => {
    const source = ecran(chemin);
    for (const [motif, defend] of promesses) {
      it(defend, () => {
        // Un booléen, pas la source : une assertion sur mille lignes déverse le fichier entier dans
        // le rapport d'échec, et la phrase manquante s'y perd.
        expect(motif.test(source)).toBe(true);
      });
    }
  });
}

verrouiller('Réglages', 'screens/SettingsScreen.tsx', [
  [
    /autres appareils connectés seront déconnectés/,
    'chantier 58 — on change son mot de passe quand on craint que quelqu’un d’autre connaisse l’ancien : ce qui va arriver doit se savoir AVANT',
  ],
  [
    /Ferme les autres appareils/,
    'le sous-titre de la ligne : la conséquence est annoncée avant même d’ouvrir la feuille',
  ],
  [
    /réponse arrive dans l['’]application/,
    'chantier 61 — la réponse du support se lit ici : un formulaire qui n’en rend aucune est pire qu’une adresse morte',
  ],
  [
    /CGU, confidentialité/,
    'chantier 62 — la preuve de consentement doit être consultable par l’intéressé',
  ],
]);

verrouiller('Signaler', 'components/FeuilleSignalement.tsx', [
  [
    /Votre nom ne sera jamais montré/,
    'RM-04-04 — dit AVANT le formulaire : c’est cette garantie qui décide si l’on ose signaler',
  ],
  [
    /aucune information médicale/,
    'un signalement n’est pas un dossier de soin, et il est lu par l’administration',
  ],
  [
    /décide de l['’]ordre[\s\S]{0,80}traitera/,
    'le motif n’est pas décoratif : c’est lui qui donne la priorité (CU-04-04)',
  ],
]);

verrouiller('Aide', 'screens/AideScreen.tsx', [
  [
    /n['’]envoie pas de courriel de support/,
    'chantier 61 — la réponse se lit dans l’application, pas dans une boîte que personne ne relève',
  ],
  [
    /pas votre mot de passe[\s\S]{0,120}demandera jamais/,
    'écrit là où l’on est précisément tenté de l’écrire : en demandant de l’aide pour se connecter',
  ],
  [
    /vous avez envoyées sont conservées/,
    'une lecture qui échoue n’est ni un zéro ni un « non » : sans cette phrase, on croit avoir perdu ses demandes',
  ],
]);

verrouiller('Mentions légales', 'screens/MentionsLegalesScreen.tsx', [
  [
    /Francfort, Allemagne/,
    'l’hébergement RÉEL — le texte disait « au Congo-Brazzaville » jusqu’au 24/08/2026, sur un document accepté à l’inscription',
  ],
  [
    /Version \{[\s\S]{0,80}acceptée le/,
    'la preuve : à quelle version et quand — une preuve qu’on ne peut pas produire ne prouve rien',
  ],
]);

verrouiller('Recours', 'screens/RecoursScreen.tsx', [
  [
    /prouve que le compte est le vôtre/,
    'chantier 63 — l’identité se prouve par un code, jamais par une session qu’on ne délivre pas à un compte suspendu',
  ],
  [
    /réponse arrivera par email/,
    'la réponse arrivera par email puisque la personne ne peut pas ouvrir l’application — dit AVANT d’envoyer',
  ],
]);

verrouiller('Fiche du soignant', 'screens/DoctorScreen.tsx', [
  [
    /ne propose pas de consultation/,
    'chantier 65 — « Sur devis » décrivait un mécanisme qui n’existe pas, et le bouton menait à une impasse',
  ],
  /*
    ⚠️ **Chantier 120 — le patient choisit, et il ne paie qu'une fois.**

    Le téléphone imposait la première offre standard du soignant : les autres n'étaient jamais
    montrées. Ces quatre lignes gardent les trois choses qui font que le choix est un vrai choix.
  */
  [
    /Choisissez votre consultation/,
    'chantier 120 — le titre dit que c’est À LUI de choisir ; sans cela, une liste de prix se lit comme un tarif affiché',
  ],
  [
    /payez qu['’]une seule fois[\s\S]{0,80}couvre toute la consultation/,
    '⚠️ la demande du porteur, mot pour mot : « lorsqu’on paie, on paie une seule fois » — dit là où l’on choisit, pas après',
  ],
  [
    /Inclus, sans supplément/,
    'chantier 120 — ce qui porte un prix dans la même colonne se lit comme ce qu’on peut choisir : l’ordonnance gratuite en sort',
  ],
  [
    /ne s['’]achète pas ici[\s\S]{0,120}après un compte-rendu/,
    '⚠️ le tarif de SUIVI est annoncé mais pas cochable — le chantier 65 avait déjà réparé une fois qu’il se vendait comme une première consultation',
  ],
  [
    /offerId: offreChoisie\.id/,
    '⚠️ c’est bien l’offre COCHÉE qui part au serveur, pas la première de la liste',
  ],
  [
    /offreChoisie != null \? formatXaf\(offreChoisie\.priceXaf\)/,
    '⚠️ le prix du bas est celui de l’offre cochée : le chiffre sur lequel on appuie et celui qu’on paiera sont le même',
  ],
]);

verrouiller('Inscription', 'screens/RegisterScreen.tsx', [
  [
    /politique de confidentialité/,
    'chantier 62 — la case parlait de chiffrement pendant que le serveur enregistrait un consentement aux CGU',
  ],
  [
    /Lire les deux documents/,
    'on ne fait pas accepter un texte qu’aucun chemin ne donne à voir',
  ],
]);

/*
  ⚠️ **Ce qui se voit avant de payer ne se découvre pas après.**

  Jusqu'au 14/09, l'écran de paiement demandait l'opérateur et ne disait jamais sur quel numéro la
  demande partirait : elle partait sur le numéro de CONNEXION du compte. Un compte Airtel qui
  choisissait « MTN MoMo » envoyait la demande vers un portefeuille qui n'existe pas — et la seule
  chose que la personne voyait était une demande qui n'arrivait jamais.

  Le carnet (chantier 113) a réglé le fond ; ces lignes gardent le fait qu'on le MONTRE.
*/
verrouiller('Paiement — le numéro débité (chantier 115)', 'screens/PayScreen.tsx', [
  [/Débité sur/, "⚠️ l'écran annonce le numéro qui sera débité, avant de payer"],
  [/Numéro de votre compte/, "⚠️ et il dit quand c'est le numéro du compte, faute d'enregistrement"],
  [/Numéro enregistré pour cet opérateur/, "et quand c'est celui du carnet"],
  [/momoNumbers\(\)/, "le carnet est bien lu par cet écran"],
  [/looksRight/, "le doute sur l'opérateur se répète au dernier moment où il peut servir"],
]);
