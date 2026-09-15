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
  /*
    ⚠️ **Ancre changée EN CONSCIENCE au chantier 122.** Elle exigeait « Choisissez votre
    consultation ». Ce mot nommait le TYPE de l'offre là où le soignant en choisit librement le
    nom : « CONSULTATION / Bilan santé » disait deux choses à la fois. Ce que la ligne défend n'a
    pas changé — le titre invite à choisir dès qu'il y a un choix —, seule la formulation a cessé
    de nommer ce que quelqu'un d'autre nomme.
  */
  [
    /À vous de choisir/,
    'chantiers 120 et 122 — le titre dit que c’est À LUI de choisir, sans nommer une offre que le soignant nomme lui-même',
  ],
  [
    /Ce qu['’]il propose/,
    '⚠️ et quand il n’y a qu’une offre, le titre la décrit sans prétendre la nommer — un titre qui nomme entre en concurrence avec celui qui nomme vraiment',
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
  /*
    ⚠️ **Chantier 121 — ce que le serveur servait et que la fiche jetait.**

    Trois données exigées par le cahier des charges, servies par l'API depuis toujours, affichées
    nulle part : la biographie (EF-05-01), le taux de confirmation (EF-05-01), la répartition des
    notes et les commentaires (EF-05-07).

    ⚠️ Ces quatre lignes existent parce que l'injection de fautes du 15/09 a montré que **rien** ne
    les retenait : on pouvait les retirer de l'écran sans qu'un seul test tombe. *Une donnée qu'on
    vient d'ajouter est exactement celle que la prochaine refonte retirera sans le savoir.*
  */
  [
    /dit de sa pratique/,
    'chantier 121 — la biographie : la seule ligne de la fiche où le soignant parle en son nom, tout le reste est calculé sur lui',
  ],
  [
    /doctor\.confirmPct/,
    '⚠️ EF-05-01 — le taux de confirmation : le délai dit en combien de temps il répond, le taux dit S’IL répond',
  ],
  [
    /disent ses patients/,
    'chantier 121 — EF-05-07 : les avis sont le seul élément de preuve qui ne vienne ni du soignant ni de la plateforme',
  ],
  [
    /doctor\.ratingDistribution\[String\(note\)\]/,
    '⚠️ la RÉPARTITION, pas seulement la moyenne : « 3,5 » né de deux avis moyens n’est pas « 3,5 » né d’un enthousiasme et d’un désastre',
  ],
  [
    /Object\.keys\(doctor\?\.ratingDistribution/,
    '⚠️ l’échelle des notes se lit dans ce que le serveur envoie (PM-13), jamais écrite en dur — une règle recopiée est une règle qui dérive',
  ],
]);

/*
  ⚠️ **Le prix manquait sur la carte de l'annuaire — chantier 121, 15/09/2026.**

  CU-05-01 l'exige mot pour mot : chaque résultat montre « photo, badge, note, **prix de l'offre la
  moins chère**, présence ». Une règle de maquette l'avait emporté sur le cahier des charges, et
  comparer trois soignants demandait six navigations.

  Et le prix affiché doit être celui d'une CONSULTATION : jusqu'au 15/09, dès qu'un soignant
  publiait un tarif de suivi, la carte annonçait ce tarif-là — mesuré en production, « 15 min ·
  3 000 F » pour une consultation de 30 min à 5 000 F. Le serveur ne sert plus que des
  consultations (`m05.prix-dappel.spec.ts`) ; ici on garde ce que l'écran en fait.
*/
/*
  ⚠️ **Tous les avis, et ce qu'on ne dit JAMAIS d'eux — chantier 124, 15/09/2026.**

  On ne pouvait lire que dix avis, toujours les dix mêmes. Cet écran les ouvre tous. Ces lignes
  gardent les trois décisions qui le rendent honnête : le total est dit, la personne n'est jamais
  nommée, et les notes sans commentaire restent visibles.
*/
verrouiller('Tous les avis (chantier 124)', 'screens/AvisScreen.tsx', [
  [
    /avis affichés sur/,
    '⚠️ on dit toujours où l’on en est : un total affiché sans dire ce qu’on en montre est la moitié d’une information',
  ],
  [
    /Tous les avis sont affichés/,
    'et quand on a tout lu, on le dit — sinon on continue de faire défiler dans le vide',
  ],
  [
    /consultationsWithPro > 1[\s\S]{0,120}revenu/,
    '⚠️ la FIDÉLITÉ à la place du nom : un patient qui revient est le signal le plus fort qui existe, et il ne nomme personne',
  ],
  [
    /Avis vérifié[\s\S]{0,40}consultation payée/,
    'à la première consultation, on dit ce qu’on peut dire : que l’avis est adossé à une consultation réellement payée',
  ],
  [
    /noté sans écrire/,
    '⚠️ une note sans commentaire compte dans la moyenne : la cacher ferait deux totaux qui ne se répondent pas',
  ],
  [
    /setScore\(actif \? null : note\)/,
    '⚠️ les barres sont des BOUTONS — « qu’est-ce qui s’est mal passé chez les mécontents ? » est la seule question qu’on se pose vraiment',
  ],
  [
    /Object\.keys\(distribution\)/,
    'l’échelle des notes se lit dans ce que le serveur envoie (PM-13), jamais écrite en dur',
  ],
]);

verrouiller('Accueil — la carte du soignant (chantier 121)', 'screens/HomeScreen.tsx', [
  [
    /formatXaf\(d\.price\)/,
    '⚠️ CU-05-01 — le prix est sur la carte : c’est le premier critère de choix, et le seul qu’il fallait ouvrir une fiche pour connaître',
  ],
  [
    /d\.consultationCount > 1 \?/,
    '⚠️ « à partir de » n’apparaît que s’il y a VRAIMENT plusieurs consultations — sinon il fait chercher un tarif moins cher qui n’existe pas',
  ],
  [
    /tout compris/,
    '⚠️ chantier 122 — sous le prix, ce qu’on peut GARANTIR (prix final, commission incluse, D-010) plutôt qu’un mot de catégorie qui contredirait le nom choisi par le soignant',
  ],
  [
    /Pas de consultation/,
    'sans offre active il n’y a rien à réserver, et la carte le dit plutôt que d’afficher un zéro ou le prix d’autre chose',
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
