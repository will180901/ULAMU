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
import { api, type LegalDocument } from '@/lib/api'
import { Avis, Carte } from '@/components/ulamu/parts'
import { Link } from 'react-router-dom'
import { ROUTE_AIDE, PAYS_DE_SERVICE } from '@/config/contact.config'
import { useSessionStore } from '@/state/session.store'

/**
 * La mention de version, lue en base — jamais écrite en dur.
 *
 * C'est la trace de ce à quoi CETTE personne a consenti, à cette date. Un texte figé dans le code
 * dirait la version d'aujourd'hui, pas celle qu'elle a acceptée.
 *
 * ⚠️ Chantier 62 : quand la version ACCEPTÉE diffère de la version COURANTE, on le dit. Sans cela,
 * quelqu'un lit le texte d'aujourd'hui en croyant relire ce qu'il a signé.
 */
function Acceptation({ type, versionCourante }: { type: 'CGU' | 'PRIVACY'; versionCourante?: string }) {
  const consentements = useQuery({ queryKey: ['consents'], queryFn: () => api.myConsents(), retry: false })
  const ligne = consentements.data?.find((c) => c.documentType === type)
  if (!ligne) return null
  const perimee = versionCourante !== undefined && versionCourante !== ligne.documentVersion
  return (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--texte-tertiaire)]">
        Version {ligne.documentVersion} · acceptée le{' '}
        {new Date(ligne.acceptedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      {perimee ? (
        <Avis ton="info">
          Vous avez accepté la version {ligne.documentVersion} ; le texte ci-dessous est la version{' '}
          {versionCourante}, en vigueur aujourd'hui.
        </Avis>
      ) : null}
    </>
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

/**
 * Un texte servi par le serveur, et ce qu'on dit quand il n'arrive pas.
 *
 * Un écran vide se prendrait pour « il n'y a rien à lire » — sur un document qui vaut preuve, c'est
 * le pire malentendu possible. *Une lecture qui échoue n'est ni un zéro ni un « non ».*
 */
function TexteServi({ doc, enCours }: { doc?: LegalDocument; enCours: boolean }) {
  if (doc) return <Document paragraphes={doc.paragraphs} />
  if (enCours) return <p className="text-[12px] text-[var(--texte-tertiaire)]">Lecture du document…</p>
  return (
    <Avis ton="erreur">
      Ce document n'a pas pu être chargé. Il n'est pas absent : seul son affichage manque. Réessayez
      dans un moment.
    </Avis>
  )
}

export function SectionLegal() {
  const moi = useSessionStore((s) => s.me)
  /*
    Les textes viennent du SERVEUR depuis le chantier 62 : c'est ce qui rend vraie la version
    enregistrée en preuve. Recopiés ici, ils pouvaient changer sans que la version bouge — et tous
    les consentements passés se mettaient alors à désigner un texte qui n'était plus celui qu'on
    avait lu.
  */
  const documents = useQuery({ queryKey: ['legal-documents'], queryFn: () => api.legalDocuments(), retry: false })
  const docDe = (type: 'CGU' | 'PRIVACY') => documents.data?.documents.find((d) => d.type === type)

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
        <Acceptation type="CGU" versionCourante={docDe('CGU')?.version} />
        <TexteServi doc={docDe('CGU')} enCours={documents.isPending} />
      </Carte>

      <Carte icone={Lock} titre="Politique de confidentialité" sousTitre="Loi n° 29-2019 sur la protection des données">
        <Acceptation type="PRIVACY" versionCourante={docDe('PRIVACY')?.version} />
        <TexteServi doc={docDe('PRIVACY')} enCours={documents.isPending} />
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
