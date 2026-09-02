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
 * 2. ~~La version et la date acceptées manquaient~~ — **corrigé le 24/08/2026**. `ConsentRecord`
 *    était rempli depuis toujours et AUCUN endpoint ne le relisait : l'écran affichait les textes
 *    sans pouvoir dire à quelle version on avait consenti, ni quand. Une preuve légale qu'on ne peut
 *    pas produire ne prouve rien. `GET /accounts/me/consents` la produit maintenant.
 */
import { useQuery } from '@tanstack/react-query'
import { Globe, Info, Lock, ScrollText } from 'lucide-react'
import { api } from '@/lib/api'
import { Avis, Carte } from '@/components/ulamu/parts'
import { Link } from 'react-router-dom'
import { ROUTE_AIDE, PAYS_DE_SERVICE } from '@/config/contact.config'
import { useSessionStore } from '@/state/session.store'

/**
 * Textes de la maquette — ils sont le contenu produit, pas de l'habillage.
 *
 * ⚠️ **Ces textes sont ACCEPTÉS à l'inscription : ils valent preuve.** Une phrase fausse ici expose
 * autant qu'un fait faux ailleurs — c'est la leçon du « hébergées au Congo-Brazzaville » corrigé le
 * 24/08. La mention des officines est retirée le 02/09/2026 (chantier 26) : ULAMU ne met plus en
 * relation que des patients et des professionnels de santé vérifiés.
 */
const CGU = [
  "ULAMU met en relation des patients et des professionnels de santé vérifiés au Congo-Brazzaville. Le service ne remplace ni les urgences, ni une consultation présentielle lorsque l'état du patient l'exige.",
  "Le professionnel s'engage à ne répondre qu'aux demandes relevant de sa compétence et de sa vérification, et à orienter sans délai vers une structure adaptée dans le cas contraire.",
  'Toute décision médicale prise via la plateforme reste sous la responsabilité du professionnel qui la signe.',
]

const CONFIDENTIALITE = [
  'Les données de santé sont traitées conformément à la loi n° 29-2019 sur la protection des données à caractère personnel. Elles sont chiffrées au repos comme en transit, et hébergées sur des serveurs situés en Allemagne (Francfort, Union européenne).',
  "Seuls les professionnels engagés dans une consultation ont accès au dossier concerné, et chaque accès est inscrit au journal d'audit, consultable par l'administration.",
  "La clôture d'un compte n'efface pas les comptes-rendus signés : leur conservation est une obligation légale.",
]

/**
 * La mention de version, lue en base — jamais écrite en dur.
 *
 * C'est la trace de ce à quoi CETTE personne a consenti, à cette date. Un texte figé dans le code
 * dirait la version d'aujourd'hui, pas celle qu'elle a acceptée.
 */
function Acceptation({ type }: { type: 'CGU' | 'PRIVACY' }) {
  const consentements = useQuery({ queryKey: ['consents'], queryFn: () => api.myConsents(), retry: false })
  const ligne = consentements.data?.find((c) => c.documentType === type)
  if (!ligne) return null
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--texte-tertiaire)]">
      Version {ligne.documentVersion} · acceptée le{' '}
      {new Date(ligne.acceptedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
    </p>
  )
}

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
  const moi = useSessionStore((s) => s.me)

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
        <Acceptation type="CGU" />
        <Document paragraphes={CGU} />
      </Carte>

      <Carte icone={Lock} titre="Politique de confidentialité" sousTitre="Loi n° 29-2019 sur la protection des données">
        <Acceptation type="PRIVACY" />
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
            <dd className="text-foreground">{PAYS_DE_SERVICE}</dd>
          </div>
          {/*
            Les données sont hébergées AILLEURS que le pays desservi. Les deux lignes se suivent
            exprès : séparées, on croit que « pays de service » répond à la question de
            l'hébergement — c'est précisément le raccourci que faisait la maquette.
          */}
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--texte-tertiaire)]">Hébergement des données</dt>
            <dd className="text-foreground">Francfort, Allemagne</dd>
          </div>
          {/*
            Ici figurait `support@ulamu.cg` — une adresse dont le domaine n'appartient pas au projet,
            que personne ne relevait, sur un texte accepté à l'inscription et valant donc preuve.
            Un lien vers le formulaire est la seule ligne qui soit vraie sans rien acheter.
          */}
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--texte-tertiaire)]">Support</dt>
            <dd className="text-foreground">
              <Link to={ROUTE_AIDE} className="underline underline-offset-2">
                Écrire à l’administration
              </Link>
            </dd>
          </div>
          {/*
            L'identifiant du compte, que la maquette écrit « USR-2026-00312 ». Ce format n'existe
            pas : les identifiants sont des UUID. Les huit premiers caractères suffisent à
            identifier un compte auprès de l'administration, et c'est à cela qu'il sert ici.
          */}
          {moi?.accountId ? (
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--texte-tertiaire)]">Identifiant du compte</dt>
              <dd className="font-mono text-foreground">{moi.accountId.slice(0, 8).toUpperCase()}</dd>
            </div>
          ) : null}
        </dl>
      </Carte>
    </div>
  )
}
