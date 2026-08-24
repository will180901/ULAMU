/**
 * B3 · Langue & mentions légales.
 *
 * ⚠️ **Deux écarts, tous deux tracés au §9 du plan.**
 *
 * 1. La maquette propose un sélecteur Français / English. **Le projet n'a aucun système de
 *    traduction** — pas d'i18next, pas de fichiers de langue, pas une seule chaîne externalisée.
 *    Le bouton « English » n'aurait rien traduit du tout : il aurait juste changé de couleur. On dit
 *    donc ce qui est vrai, et la place reste prête pour le jour où les traductions existeront.
 *
 * 3. **La phrase sur l'hébergement disait le contraire de la réalité** (corrigé le 24/08/2026). Elle
 *    affirmait « hébergées au Congo-Brazzaville ». Or `render.yaml` déclare `region: frankfurt` et la
 *    base Neon vit en `eu-central-1` : tout est en Allemagne. Ce texte est accepté à l'inscription,
 *    donc il vaut PREUVE sous la loi n° 29-2019 — une preuve qui affirme un fait faux ne vaut rien,
 *    et pire, elle expose. La phrase dit maintenant où les données sont réellement.
 *
 *    ⚠️ Reste ouverte une question qui n'est pas la mienne : héberger des données de santé
 *    congolaises hors du Congo peut exiger une base légale de transfert. Le dire honnêtement est un
 *    préalable, pas une réponse. Noté au §7 du plan.
 *
 * 2. La maquette affiche « Version 1.0 · acceptée le 12 mars 2026 » sous chaque document. Le
 *    consentement EST enregistré à l'inscription (table `Consent`, preuve légale, loi n° 29-2019),
 *    mais **aucun endpoint ne le relit** : ni la version, ni la date. Les afficher voudrait dire les
 *    inventer — sur une preuve légale, c'est exclu. Les textes sont là, la date attend son endpoint.
 */
import { Globe, Info, Lock, ScrollText } from 'lucide-react'
import { Avis, Carte } from '@/components/ulamu/parts'

/** Textes de la maquette — ils sont le contenu produit, pas de l'habillage. */
const CGU = [
  "ULAMU met en relation des patients, des professionnels de santé vérifiés et des officines au Congo-Brazzaville. Le service ne remplace ni les urgences, ni une consultation présentielle lorsque l'état du patient l'exige.",
  "Le professionnel s'engage à ne répondre qu'aux demandes relevant de sa compétence et de sa vérification, et à orienter sans délai vers une structure adaptée dans le cas contraire.",
  'Toute décision médicale prise via la plateforme reste sous la responsabilité du professionnel qui la signe.',
]

const CONFIDENTIALITE = [
  'Les données de santé sont traitées conformément à la loi n° 29-2019 sur la protection des données à caractère personnel. Elles sont chiffrées au repos comme en transit, et hébergées sur des serveurs situés en Allemagne (Francfort, Union européenne).',
  "Seuls les professionnels engagés dans une consultation ont accès au dossier concerné, et chaque accès est inscrit au journal d'audit, consultable par l'administration.",
  "La clôture d'un compte n'efface pas les comptes-rendus signés : leur conservation est une obligation légale.",
]

function Document({ paragraphes }: { paragraphes: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      {paragraphes.map((p) => (
        <p key={p.slice(0, 24)} className="text-[12px] leading-[1.6] text-[var(--texte-secondaire)]">
          {p}
        </p>
      ))}
    </div>
  )
}

export function SectionLegal() {
  return (
    <div className="flex flex-col gap-4">
      <Carte icone={Globe} titre="Langue de l'interface" sousTitre="Les documents médicaux restent rédigés dans leur langue d'origine">
        <p className="text-[13px] text-foreground">Français</p>
        <Avis ton="info">
          C'est aujourd'hui la seule langue disponible. Aucune traduction n'est encore intégrée à l'application : proposer
          un autre choix ne changerait rien à ce que vous lisez.
        </Avis>
      </Carte>

      <Carte icone={ScrollText} titre="Conditions générales d'utilisation" sousTitre="Acceptées lors de votre inscription">
        <Document paragraphes={CGU} />
      </Carte>

      <Carte icone={Lock} titre="Politique de confidentialité" sousTitre="Loi n° 29-2019 sur la protection des données">
        <Document paragraphes={CONFIDENTIALITE} />
      </Carte>

      <Carte icone={Info} titre="À propos" sousTitre="Ce que vous utilisez en ce moment">
        <dl className="flex flex-col gap-1.5 text-[12px]">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--texte-tertiaire)]">Application</dt>
            <dd className="font-mono text-foreground">ULAMU Web</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--texte-tertiaire)]">Pays de service</dt>
            <dd className="text-foreground">Congo-Brazzaville</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--texte-tertiaire)]">Support</dt>
            <dd className="text-foreground">support@ulamu.cg</dd>
          </div>
        </dl>
      </Carte>
    </div>
  )
}
