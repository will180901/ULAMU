/**
 * Dossier de vérification — M03, CU-03-01/02/03.
 *
 * C'est l'écran qui manquait pour que l'inscription professionnelle mène quelque part. `CU-01-02`
 * impose une redirection **obligatoire** vers le dépôt du dossier à la création du compte, et
 * `RM-02-04` rend le compte invisible de l'annuaire tant que ce dossier n'existe pas. Jusqu'ici
 * l'inscription atterrissait sur un tableau de bord vide : le professionnel ne pouvait donc **jamais
 * devenir opérationnel**, quel que soit le temps qu'il passait dans l'application.
 *
 * L'écran suit la machine d'états du serveur plutôt que d'en inventer une : `DRAFT` → dépôt possible,
 * `SUBMITTED`/`IN_REVIEW` → attente, `NEEDS_INFO`/`REJECTED` → motifs affichés et pièces à nouveau
 * modifiables, `VERIFIED` → signature du contrat. Le serveur reste seul juge : la liste de pièces
 * affichée n'est qu'un guide pour éviter un aller-retour inutile.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BadgeCheck, FileCheck2, FileUp, ShieldCheck, Upload } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { StatusPill, type StatusTone } from '@/components/ulamu/StatusPill'
import { ErrorState, LoadingState } from '@/components/ulamu/ScreenState'
import { api, ApiError, REQUIRED_DOCS, type DocumentKind, type VerificationCase, type VerificationStatus } from '@/lib/api'

/** Libellés humains. Les codes serveur ne sortent jamais à l'écran — « NEEDS_INFO » n'est pas une phrase. */
const STATUT: Record<VerificationStatus, { texte: string; ton: StatusTone; explication: string }> = {
  DRAFT: {
    texte: 'À compléter',
    ton: 'neutral',
    explication: "Ajoutez les pièces demandées, puis déposez votre dossier. Tant qu'il n'est pas déposé, vous n'apparaissez pas dans l'annuaire.",
  },
  SUBMITTED: { texte: 'Déposé', ton: 'info', explication: "Votre dossier attend d'être pris en charge par l'équipe de vérification." },
  IN_REVIEW: { texte: 'En cours d’examen', ton: 'info', explication: 'Un vérificateur examine actuellement vos pièces.' },
  NEEDS_INFO: { texte: 'Complément demandé', ton: 'warning', explication: 'Il manque quelque chose. Le motif est indiqué ci-dessous.' },
  REJECTED: { texte: 'Refusé', ton: 'error', explication: 'Le motif est indiqué ci-dessous. Vous pouvez corriger vos pièces et redéposer.' },
  VERIFIED: { texte: 'Vérifié', ton: 'success', explication: 'Il reste à signer votre contrat pour pouvoir exercer.' },
  REVOKED: { texte: 'Révoqué', ton: 'error', explication: 'Votre badge a été retiré. Le motif est indiqué ci-dessous.' },
}

const PIECE: Record<DocumentKind, string> = {
  ID: 'Pièce d’identité',
  DIPLOMA: 'Diplôme',
  LICENSE: 'Autorisation d’exercice',
  PHOTO: 'Photo de profil',
  ADDRESS_PROOF: 'Justificatif de localisation',
}

/** Les états où le serveur accepte encore des pièces (m03.policies `canAddDocuments`). */
const MODIFIABLE: VerificationStatus[] = ['DRAFT', 'NEEDS_INFO', 'REJECTED']

/** Lit un fichier en base64 sans son préfixe `data:` — c'est ce qu'attend l'API (comme les avatars). */
function versBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(new Error('Lecture du fichier impossible'))
    r.readAsDataURL(f)
  })
}

export function VerificationPage() {
  const [dossier, setDossier] = useState<VerificationCase | null>(null)
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState<DocumentKind | null>(null)
  const [depot, setDepot] = useState(false)

  const charger = useCallback(async () => {
    setEtat('chargement')
    try {
      setDossier(await api.verificationMine())
      setEtat('pret')
    } catch {
      setEtat('erreur')
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const requises = useMemo<DocumentKind[]>(
    () => (dossier ? REQUIRED_DOCS[dossier.subjectKind] : []),
    [dossier],
  )
  const fournies = useMemo(() => new Set(dossier?.documents.map((d) => d.kind) ?? []), [dossier])
  const manquantes = requises.filter((k) => !fournies.has(k))
  const modifiable = dossier ? MODIFIABLE.includes(dossier.status) : false

  const televerser = async (kind: DocumentKind, fichier: File) => {
    setErreur(null)
    setEnCours(kind)
    try {
      await api.verificationUpload({ kind, fileBase64: await versBase64(fichier), mime: fichier.type || 'application/octet-stream' })
      await charger()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Téléversement impossible — réessayez.')
    } finally {
      setEnCours(null)
    }
  }

  const deposer = async () => {
    setErreur(null)
    setDepot(true)
    try {
      setDossier(await api.verificationSubmit())
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Dépôt impossible — réessayez.')
    } finally {
      setDepot(false)
    }
  }

  if (etat === 'chargement') return <LoadingState label="Chargement de votre dossier…" onRetry={charger} />
  if (etat === 'erreur' || !dossier) return <ErrorState onRetry={charger} />

  const s = STATUT[dossier.status]
  const dernierMotif = dossier.decisions[0]

  return (
    <div>
      <PageHeader
        icon={<ShieldCheck size={20} />}
        title="Mon dossier de vérification"
        subtitle="Votre badge conditionne votre visibilité dans l’annuaire et votre droit d’exercer sur ULAMU."
      />

      <section className="ul-card" aria-labelledby="statut-titre">
        <div className="ul-card__head">
          <h2 id="statut-titre" className="t-display-sm" style={{ margin: 0 }}>
            Statut
          </h2>
          <StatusPill tone={s.ton}>{s.texte}</StatusPill>
        </div>
        <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
          {s.explication}
        </p>

        {dernierMotif ? (
          <div className="ul-notice ul-notice--warning" role="note">
            <p className="t-label-md" style={{ margin: 0 }}>
              Motif de la dernière décision
            </p>
            <p className="t-text-sm" style={{ margin: 0 }}>
              {dernierMotif.reasons}
            </p>
          </div>
        ) : null}
      </section>

      <section className="ul-card" aria-labelledby="pieces-titre">
        <div className="ul-card__head">
          <h2 id="pieces-titre" className="t-display-sm" style={{ margin: 0 }}>
            Pièces justificatives
          </h2>
          <span className="t-caption" style={{ color: 'var(--texte-tertiaire)' }}>
            {requises.length - manquantes.length} / {requises.length}
          </span>
        </div>

        <ul className="ul-doclist">
          {requises.map((kind) => (
            <LigneDocument
              key={kind}
              kind={kind}
              fournie={fournies.has(kind)}
              modifiable={modifiable}
              enCours={enCours === kind}
              onFichier={(f) => televerser(kind, f)}
            />
          ))}
        </ul>

        {erreur ? (
          <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
            {erreur}
          </p>
        ) : null}

        {modifiable ? (
          <Button onClick={deposer} loading={depot} disabled={depot || manquantes.length > 0}>
            <FileCheck2 size={16} /> Déposer mon dossier
          </Button>
        ) : null}
        {modifiable && manquantes.length > 0 ? (
          <p className="t-caption" style={{ color: 'var(--texte-tertiaire)', margin: 0 }}>
            Il manque encore : {manquantes.map((k) => PIECE[k]).join(' · ')}.
          </p>
        ) : null}
      </section>

      {dossier.agreement ? (
        <section className="ul-card" aria-labelledby="contrat-titre">
          <div className="ul-card__head">
            <h2 id="contrat-titre" className="t-display-sm" style={{ margin: 0 }}>
              Contrat
            </h2>
            <StatusPill tone={dossier.agreement.signedAt ? 'success' : 'warning'}>
              {dossier.agreement.signedAt ? 'Signé' : 'À signer'}
            </StatusPill>
          </div>
          <p className="t-text-sm" style={{ color: 'var(--texte-secondaire)', margin: 0 }}>
            Version {dossier.agreement.version} — commission de {dossier.agreement.commissionPct} %.
          </p>
          {/* `integrity: false` = le texte régénéré ne correspond plus au sceau. On ne l'affiche
              JAMAIS comme s'il était conforme : mieux vaut ne rien montrer qu'un contrat douteux. */}
          {dossier.agreement.integrity === false ? (
            <div className="ul-notice ul-notice--error" role="alert">
              <p className="t-text-sm" style={{ margin: 0 }}>
                Ce contrat ne peut pas être affiché : son texte ne correspond plus à son sceau d’intégrité.
                Contactez l’équipe ULAMU avant toute signature.
              </p>
            </div>
          ) : null}

          {/* La signature manquait : l'écran annonçait « il reste à signer votre contrat pour pouvoir
              exercer » sans offrir le moindre moyen de le faire. Les routes existaient pourtant.
              Jamais proposée si le sceau est rompu — on ne fait pas signer un texte douteux. */}
          {!dossier.agreement.signedAt && dossier.agreement.integrity !== false ? (
            <SignatureContrat onSigne={charger} />
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

/* ── Signature du contrat — M03, CU-03-03 ────────────────────────────────────────────────────────
   Signer engage : c'est ce contrat qui fixe la commission et autorise à exercer sur la plateforme.
   Le serveur exige donc **mot de passe ET code** — les deux, comme pour une clôture de compte. Ce
   n'est pas une case à cocher.                                                                   */

function SignatureContrat({ onSigne }: { onSigne: () => void }) {
  const [etape, setEtape] = useState<'repos' | 'confirmation'>('repos')
  const [motDePasse, setMotDePasse] = useState('')
  const [code, setCode] = useState('')
  const [indice, setIndice] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const demanderCode = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      const res = await api.verificationSignStart()
      // `debugCode` n'existe qu'en mode démonstration (OTP_ECHO côté API). On l'affiche quand il est
      // là plutôt que de laisser chercher un email qui n'a pas été envoyé.
      setIndice(res.debugCode ? `Mode démonstration — code : ${res.debugCode}` : null)
      setEtape('confirmation')
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Envoi du code impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  const signer = async () => {
    setErreur(null)
    setOccupe(true)
    try {
      await api.verificationSign({ password: motDePasse, otpCode: code })
      onSigne()
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Signature impossible — vérifiez vos informations.')
    } finally {
      setOccupe(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espace-3)' }}>
      <div className="ul-notice" role="note">
        <p className="t-text-sm" style={{ margin: 0 }}>
          Signer ce contrat vous autorise à exercer sur ULAMU et fixe la commission prélevée sur chaque
          consultation. Un exemplaire horodaté reste consultable ici.
        </p>
      </div>

      {etape === 'repos' ? (
        <div>
          <Button onClick={demanderCode} loading={occupe} disabled={occupe}>
            <FileCheck2 size={15} /> Recevoir le code de signature
          </Button>
        </div>
      ) : (
        <>
          {indice ? (
            <p className="t-caption" style={{ color: 'var(--info-texte)', margin: 0 }}>
              {indice}
            </p>
          ) : null}
          <Field label="Votre mot de passe" type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          <Field
            label="Code reçu"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            hint="Mot de passe ET code : signer engage, ce n’est pas une case à cocher."
          />
          <div style={{ display: 'flex', gap: 'var(--espace-2)' }}>
            <Button onClick={signer} loading={occupe} disabled={occupe || !motDePasse || code.length < 6}>
              Signer le contrat
            </Button>
            <Button variant="ghost" onClick={() => setEtape('repos')} disabled={occupe}>
              Annuler
            </Button>
          </div>
        </>
      )}

      {erreur ? (
        <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
          {erreur}
        </p>
      ) : null}
    </div>
  )
}

/** Une ligne de la liste des pièces : état, et bouton de téléversement si le dossier l'accepte. */
function LigneDocument({
  kind,
  fournie,
  modifiable,
  enCours,
  onFichier,
}: {
  kind: DocumentKind
  fournie: boolean
  modifiable: boolean
  enCours: boolean
  onFichier: (f: File) => void
}) {
  const input = useRef<HTMLInputElement>(null)

  return (
    <li className="ul-docrow">
      <span className={['ul-docrow__icon', fournie ? 'is-done' : ''].filter(Boolean).join(' ')}>
        {fournie ? <BadgeCheck size={16} /> : <FileUp size={16} />}
      </span>
      <span className="ul-docrow__label">{PIECE[kind]}</span>
      <StatusPill tone={fournie ? 'success' : 'neutral'}>{fournie ? 'Fournie' : 'Manquante'}</StatusPill>

      {modifiable ? (
        <>
          {/* Le champ natif reste dans le DOM (accessible, déclenché par le bouton) plutôt que
              masqué derrière un faux bouton : le clavier et les lecteurs d'écran y accèdent. */}
          <input
            ref={input}
            type="file"
            accept="image/*,application/pdf"
            className="ul-visually-hidden"
            aria-label={`Téléverser : ${PIECE[kind]}`}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onFichier(f)
              e.target.value = '' // permet de re-choisir le même fichier après une erreur
            }}
          />
          <Button variant="ghost" size="sm" loading={enCours} onClick={() => input.current?.click()}>
            <Upload size={14} /> {fournie ? 'Remplacer' : 'Ajouter'}
          </Button>
        </>
      ) : null}
    </li>
  )
}
