/**
 * Le référentiel des médicaments (M11, EF-09-02).
 *
 * ── Pourquoi ce fichier existe séparément du seed ──────────────────────────────────────────────
 *
 * Il était dans `seed.ts`, avec six entrées. Six, c'est assez pour un test automatisé et beaucoup
 * trop peu pour une démonstration : le médecin tape « para », trouve un résultat, tape « quinine »
 * et n'en trouve aucun — l'écran a l'air cassé alors qu'il fonctionne. **Option B, validée par le
 * porteur le 25/08 : porter le référentiel à une soixantaine de médicaments courants.**
 *
 * Le fichier est isolé pour une raison précise : le seed complet CRÉE des comptes de démonstration,
 * et le porteur a fait le ménage le 28/08 pour n'en garder que deux. Le relancer les ferait tous
 * revenir. La liste vit donc à part, et `scripts/referentiel-medicaments.ts` l'insère seule, sans
 * toucher à quoi que ce soit d'autre.
 *
 * ── Ce que cette liste est, et ce qu'elle n'est pas ────────────────────────────────────────────
 *
 * C'est un référentiel de DÉMONSTRATION, construit sur les traitements les plus courants en
 * pratique de ville à Brazzaville : paludisme, infections respiratoires et digestives, parasitoses,
 * douleur, hypertension, diabète, asthme. Il n'a aucune valeur réglementaire et ne remplace pas la
 * liste nationale des médicaments essentiels du Congo — une vraie mise en service devra la charger.
 * C'est écrit ici pour que personne ne le découvre trop tard.
 *
 * Les noms commerciaux servent la recherche : `searchCatalog` compare le terme saisi à la DCI ET
 * aux noms commerciaux. Un médecin qui tape « Doliprane » doit trouver le paracétamol.
 *
 * ⚠️ **Les noms commerciaux servent AUSSI de garde-fou allergies** (EF-09-03). La comparaison de
 * `matchingAllergies` se fait par inclusion de chaînes entre l'allergie déclarée au Carnet et les
 * libellés du médicament — DCI et noms commerciaux. Or l'allergie la plus courante se déclare
 * « pénicilline », un nom de CLASSE que ne porte aucune DCI : ni Amoxicilline, ni Cloxacilline, ni
 * Augmentin ne contiennent ce mot. Le garde-fou laissait donc passer le cas d'école.
 *
 * Le modèle `Medicament` n'a pas de champ « classe thérapeutique », et en ajouter un serait une
 * migration — hors du périmètre de la reconstruction. Le mot « pénicilline » est donc placé dans
 * `commercialNames`, où le garde-fou le lit. Ce n'est pas un nom de marque : c'est une étiquette de
 * classe logée dans le seul champ que la comparaison regarde. **La DCI, elle, reste exacte** — c'est
 * elle qui s'affiche sur l'ordonnance.
 *
 * La limite générale demeure, et l'écran C7 la dit en toutes lettres : cette comparaison est utile,
 * elle n'est pas exhaustive. Une allergie « sulfamides » n'attrapera pas « Cotrimoxazole ».
 */

export interface MedicamentDeReference {
  dci: string;
  commercialNames: string[];
  form: string;
  dosage: string;
}

export const REFERENTIEL_MEDICAMENTS: MedicamentDeReference[] = [
  // ── Antalgiques, antipyrétiques, anti-inflammatoires ──
  { dci: "Paracétamol", commercialNames: ["Doliprane", "Efferalgan", "Panadol"], form: "comprimé", dosage: "500 mg" },
  { dci: "Paracétamol", commercialNames: ["Doliprane sirop"], form: "sirop", dosage: "120 mg/5 ml" },
  { dci: "Ibuprofène", commercialNames: ["Advil", "Nurofen", "Brufen"], form: "comprimé", dosage: "400 mg" },
  { dci: "Diclofénac", commercialNames: ["Voltarène"], form: "comprimé", dosage: "50 mg" },
  { dci: "Acide acétylsalicylique", commercialNames: ["Aspirine", "Aspégic"], form: "comprimé", dosage: "500 mg" },
  { dci: "Tramadol", commercialNames: ["Contramal", "Topalgic"], form: "gélule", dosage: "50 mg" },
  { dci: "Prednisolone", commercialNames: ["Solupred"], form: "comprimé", dosage: "20 mg" },

  // ── Paludisme (première cause de consultation) ──
  { dci: "Artéméther + Luméfantrine", commercialNames: ["Coartem", "Riamet"], form: "comprimé", dosage: "20/120 mg" },
  { dci: "Artésunate + Amodiaquine", commercialNames: ["Coarsucam", "ASAQ"], form: "comprimé", dosage: "100/270 mg" },
  { dci: "Artésunate", commercialNames: ["Artesun"], form: "injectable", dosage: "60 mg" },
  { dci: "Quinine", commercialNames: ["Quinimax"], form: "comprimé", dosage: "500 mg" },
  { dci: "Sulfadoxine + Pyriméthamine", commercialNames: ["Fansidar"], form: "comprimé", dosage: "500/25 mg" },
  { dci: "Dihydroartémisinine + Pipéraquine", commercialNames: ["Eurartesim"], form: "comprimé", dosage: "40/320 mg" },

  // ── Antibiotiques ──
  { dci: "Amoxicilline", commercialNames: ["Clamoxyl", "Amoxil", "pénicilline"], form: "gélule", dosage: "500 mg" },
  { dci: "Amoxicilline + Acide clavulanique", commercialNames: ["Augmentin", "pénicilline"], form: "comprimé", dosage: "1 g/125 mg" },
  { dci: "Benzathine benzylpénicilline", commercialNames: ["Extencilline", "pénicilline"], form: "injectable", dosage: "2,4 MUI" },
  { dci: "Cloxacilline", commercialNames: ["Orbénine", "pénicilline"], form: "gélule", dosage: "500 mg" },
  { dci: "Azithromycine", commercialNames: ["Zithromax"], form: "comprimé", dosage: "500 mg" },
  { dci: "Érythromycine", commercialNames: ["Érythrocine"], form: "comprimé", dosage: "500 mg" },
  { dci: "Ciprofloxacine", commercialNames: ["Ciflox", "Ciproxine"], form: "comprimé", dosage: "500 mg" },
  { dci: "Ceftriaxone", commercialNames: ["Rocéphine"], form: "injectable", dosage: "1 g" },
  { dci: "Céfixime", commercialNames: ["Oroken"], form: "comprimé", dosage: "200 mg" },
  { dci: "Doxycycline", commercialNames: ["Vibramycine"], form: "gélule", dosage: "100 mg" },
  { dci: "Métronidazole", commercialNames: ["Flagyl"], form: "comprimé", dosage: "250 mg" },
  { dci: "Cotrimoxazole", commercialNames: ["Bactrim"], form: "comprimé", dosage: "800/160 mg" },
  { dci: "Gentamicine", commercialNames: ["Gentalline"], form: "injectable", dosage: "80 mg" },

  // ── Parasitoses intestinales ──
  { dci: "Albendazole", commercialNames: ["Zentel"], form: "comprimé", dosage: "400 mg" },
  { dci: "Mébendazole", commercialNames: ["Vermox"], form: "comprimé", dosage: "100 mg" },
  { dci: "Praziquantel", commercialNames: ["Biltricide"], form: "comprimé", dosage: "600 mg" },
  { dci: "Ivermectine", commercialNames: ["Mectizan", "Stromectol"], form: "comprimé", dosage: "3 mg" },

  // ── Hypertension et cœur ──
  { dci: "Amlodipine", commercialNames: ["Amlor"], form: "comprimé", dosage: "5 mg" },
  { dci: "Ramipril", commercialNames: ["Triatec"], form: "comprimé", dosage: "10 mg" },
  { dci: "Énalapril", commercialNames: ["Rénitec"], form: "comprimé", dosage: "20 mg" },
  { dci: "Losartan", commercialNames: ["Cozaar"], form: "comprimé", dosage: "50 mg" },
  { dci: "Hydrochlorothiazide", commercialNames: ["Esidrex"], form: "comprimé", dosage: "25 mg" },
  { dci: "Furosémide", commercialNames: ["Lasilix"], form: "comprimé", dosage: "40 mg" },
  { dci: "Aténolol", commercialNames: ["Ténormine"], form: "comprimé", dosage: "50 mg" },
  { dci: "Bisoprolol", commercialNames: ["Cardensiel", "Détensiel"], form: "comprimé", dosage: "5 mg" },
  { dci: "Méthyldopa", commercialNames: ["Aldomet"], form: "comprimé", dosage: "250 mg" },
  { dci: "Atorvastatine", commercialNames: ["Tahor"], form: "comprimé", dosage: "20 mg" },

  // ── Diabète ──
  { dci: "Metformine", commercialNames: ["Glucophage"], form: "comprimé", dosage: "850 mg" },
  { dci: "Glibenclamide", commercialNames: ["Daonil"], form: "comprimé", dosage: "5 mg" },
  { dci: "Gliclazide", commercialNames: ["Diamicron"], form: "comprimé", dosage: "60 mg" },
  { dci: "Insuline humaine isophane", commercialNames: ["Insulatard"], form: "injectable", dosage: "100 UI/ml" },

  // ── Voies respiratoires ──
  { dci: "Salbutamol", commercialNames: ["Ventoline"], form: "inhalateur", dosage: "100 µg/dose" },
  { dci: "Béclométasone", commercialNames: ["Bécotide"], form: "inhalateur", dosage: "250 µg/dose" },
  { dci: "Cétirizine", commercialNames: ["Zyrtec"], form: "comprimé", dosage: "10 mg" },
  { dci: "Loratadine", commercialNames: ["Clarityne"], form: "comprimé", dosage: "10 mg" },

  // ── Appareil digestif ──
  { dci: "Oméprazole", commercialNames: ["Mopral", "Losec"], form: "gélule", dosage: "20 mg" },
  { dci: "Métoclopramide", commercialNames: ["Primpéran"], form: "comprimé", dosage: "10 mg" },
  { dci: "Butylscopolamine", commercialNames: ["Buscopan"], form: "comprimé", dosage: "10 mg" },
  { dci: "Sels de réhydratation orale", commercialNames: ["SRO", "ORS"], form: "sachet", dosage: "20,5 g/l" },
  { dci: "Zinc sulfate", commercialNames: [], form: "comprimé", dosage: "20 mg" },

  // ── Carences, grossesse, appoint ──
  { dci: "Fer + Acide folique", commercialNames: ["Fumafer", "Tardyferon"], form: "comprimé", dosage: "200 mg/0,4 mg" },
  { dci: "Acide folique", commercialNames: [], form: "comprimé", dosage: "5 mg" },
  { dci: "Vitamine C (acide ascorbique)", commercialNames: ["Laroscorbine"], form: "comprimé", dosage: "500 mg" },
  { dci: "Vitamine A (rétinol)", commercialNames: [], form: "capsule", dosage: "200 000 UI" },

  // ── Peau et muqueuses ──
  { dci: "Kétoconazole", commercialNames: ["Nizoral"], form: "crème", dosage: "2 %" },
  { dci: "Fluconazole", commercialNames: ["Triflucan"], form: "gélule", dosage: "150 mg" },
  { dci: "Aciclovir", commercialNames: ["Zovirax"], form: "comprimé", dosage: "400 mg" },
  { dci: "Povidone iodée", commercialNames: ["Bétadine"], form: "solution", dosage: "10 %" },

  // ── VIH et tuberculose (traitements au long cours, suivis en ville) ──
  { dci: "Ténofovir + Lamivudine + Dolutégravir", commercialNames: ["TLD"], form: "comprimé", dosage: "300/300/50 mg" },
  { dci: "Isoniazide", commercialNames: [], form: "comprimé", dosage: "300 mg" },
  { dci: "Rifampicine", commercialNames: ["Rifadine"], form: "gélule", dosage: "300 mg" },
];
