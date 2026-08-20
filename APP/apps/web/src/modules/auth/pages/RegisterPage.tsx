/**
 * A2 — Inscription. Refait d'après `docs/maquettes/A2 - Inscription.dc.html`.
 *
 * Réservée aux comptes PROFESSIONAL / FACILITY_MEMBER. Étapes : type de compte → identité → profil
 * professionnel (professionnels seulement) → sécurité → vérification par email. Le découpage en
 * étapes courtes existe pour que la carte d'authentification garde une hauteur tenable : une étape
 * unique à huit champs débordait.
 *
 * Pourquoi un code par EMAIL ici, alors que le web s'appuie sur le TOTP ailleurs : à l'inscription,
 * aucun secret TOTP n'existe encore pour ce compte — il n'y a rien à vérifier. L'email prouve
 * l'identité UNE fois, à la création.
 *
 * L'indicateur d'étapes est **cliquable en arrière seulement** : revenir corriger une faute de
 * frappe doit être immédiat, mais sauter en avant ferait soumettre des champs jamais remplis.
 */
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AlertCircle, Building2, Info, ShieldCheck, Stethoscope } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { api, ApiError, type ProfessionalCategory } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'
import { useLoadMeMutation } from '../hooks/useLogin'

type AccountType = 'PROFESSIONAL' | 'FACILITY_MEMBER'
type Step = 'type' | 'identity' | 'profile' | 'security' | 'otp'

/* Le parcours d'une structure saute l'étape « profil professionnel » : une officine n'a ni
   catégorie de soignant ni spécialité. L'indicateur compte donc 4 pastilles au lieu de 5. */
const STEPS: Record<AccountType | 'default', Step[]> = {
  PROFESSIONAL: ['type', 'identity', 'profile', 'security', 'otp'],
  FACILITY_MEMBER: ['type', 'identity', 'security', 'otp'],
  default: ['type', 'identity', 'security', 'otp'],
}
const LIBELLES: Record<Step, string> = {
  type: 'Type de compte',
  identity: 'Identité',
  profile: 'Profil professionnel',
  security: 'Sécurité',
  otp: 'Vérification',
}

/** Les six catégories de `CU-01-02`, ni plus ni moins. */
const CATEGORIES: Array<{ value: ProfessionalCategory; label: string }> = [
  { value: 'GENERAL_PRACTITIONER', label: 'Médecin généraliste' },
  { value: 'SPECIALIST', label: 'Spécialiste' },
  { value: 'DENTIST', label: 'Dentiste' },
  { value: 'MIDWIFE', label: 'Sage-femme' },
  { value: 'NURSE', label: 'Infirmier(ère)' },
  { value: 'COMMUNITY_HEALTH_WORKER', label: 'Agent de santé communautaire' },
]

function Libelle({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-semibold leading-[1.4] text-muted-foreground">{children}</span>
}

function Aide({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">{children}</span>
}

function Erreur({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="m-0 flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2.5 text-xs leading-[1.5] text-[var(--erreur-texte)]"
    >
      <AlertCircle size={14} strokeWidth={2} className="shrink-0" aria-hidden="true" />
      {children}
    </p>
  )
}

/** Pastilles numérotées + barres de liaison + libellés, exactement comme la maquette. */
function Etapes({ steps, courant, aller }: { steps: Step[]; courant: number; aller: (s: Step) => void }) {
  return (
    <div className="mb-5">
      <div className="flex items-center">
        {steps.map((s, k) => {
          const atteinte = k <= courant
          return (
            <div key={s} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => atteinte && aller(s)}
                disabled={!atteinte}
                aria-current={k === courant ? 'step' : undefined}
                aria-label={`Étape ${k + 1} — ${LIBELLES[s]}`}
                className={
                  'flex size-[26px] shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ' +
                  (atteinte
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'cursor-default border-[var(--bordure-normale)] bg-secondary text-[var(--texte-tertiaire)]')
                }
              >
                {k + 1}
              </button>
              {/* La dernière barre reste transparente : elle ne relie rien, mais occupe la place pour
                  que toutes les pastilles gardent le même écartement. */}
              <span
                aria-hidden="true"
                className={
                  'mx-1 h-0.5 flex-1 rounded-sm transition-colors ' +
                  (k === steps.length - 1 ? 'bg-transparent' : k < courant ? 'bg-primary' : 'bg-[var(--bordure-normale)]')
                }
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex">
        {steps.map((s, k) => (
          <span
            key={s}
            className={
              'flex-1 text-center text-[11px] leading-[1.45] ' +
              (k <= courant ? 'text-foreground' : 'text-[var(--texte-tertiaire)] ') +
              (k === courant ? ' font-bold' : ' font-medium')
            }
          >
            {LIBELLES[s]}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Carte de choix du type de compte — tuile d'icône, titre, description (A2, étape 1). */
function CarteType({
  icon,
  titre,
  description,
  onClick,
}: {
  icon: React.ReactNode
  titre: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-[var(--bordure-normale)] bg-card p-4 text-left transition-all hover:border-[var(--ap-300)] hover:bg-[var(--ap-50)] hover:shadow-[var(--ombre-1)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--ap-50)] text-[var(--ap-700)]"
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-foreground">{titre}</span>
        <span className="block text-[11px] leading-[1.45] text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}

export function RegisterPage() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated)
  const [step, setStep] = useState<Step>('type')
  const [accountType, setAccountType] = useState<AccountType | null>(null)

  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [category, setCategory] = useState<ProfessionalCategory>('GENERAL_PRACTITIONER')
  const [specialty, setSpecialty] = useState('')

  /**
   * Consentement explicite aux CGU et à la confidentialité (EF-01-08, loi n° 29-2019).
   * Jamais pré-coché, et bloquant : un consentement par défaut n'en est pas un. Les versions citées
   * sont celles que le serveur enregistre réellement (CGU 1.0 / PRIVACY 1.0).
   */
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpInfo, setOtpInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const steps = STEPS[accountType ?? 'default']
  const currentIndex = steps.indexOf(step)

  const requestOtp = useMutation({ mutationFn: () => api.requestOtp({ email, purpose: 'REGISTRATION' }) })
  const register = useMutation({
    mutationFn: () =>
      accountType === 'PROFESSIONAL'
        ? api.registerProfessional({
            phone,
            email,
            username,
            otpCode,
            password,
            firstName,
            lastName,
            category,
            specialty: specialty.trim() || undefined,
            acceptTerms,
            client: 'web',
            deviceLabel: 'ULAMU Web',
          })
        : api.registerFacilityMember({ phone, email, username, otpCode, password, firstName, lastName, acceptTerms, client: 'web', deviceLabel: 'ULAMU Web' }),
  })
  const loadMe = useLoadMeMutation()

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const allerAuCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    try {
      const res = await requestOtp.mutateAsync()
      setOtpInfo(res.debugCode ? `Mode démo — code : ${res.debugCode}` : `Code envoyé à ${email}.`)
      if (res.debugCode) setOtpCode(res.debugCode)
      setStep('otp')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi du code impossible — réessayez.')
    }
  }

  const creerLeCompte = async () => {
    setError(null)
    try {
      const res = await register.mutateAsync()
      await loadMe.mutateAsync(res.sessionToken)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Inscription impossible — réessayez.')
    }
  }

  const occupe = requestOtp.isPending || register.isPending || loadMe.isPending
  const confirmationDivergente = confirmPassword.length > 0 && password !== confirmPassword

  return (
    <AuthLayout subtitle="Créez votre compte ULAMU — professionnels de santé et structures/pharmacies.">
      <Etapes steps={steps} courant={currentIndex} aller={setStep} />

      <div key={step} className="ulamu-step-fade">
        {step === 'type' ? (
          <div className="flex flex-col gap-3">
            <CarteType
              icon={<Stethoscope size={20} strokeWidth={1.5} />}
              titre="Professionnel de santé"
              description="Médecin, spécialiste, dentiste, sage-femme, infirmier(ère)…"
              onClick={() => {
                setAccountType('PROFESSIONAL')
                setStep('identity')
              }}
            />
            <CarteType
              icon={<Building2 size={20} strokeWidth={1.5} />}
              titre="Structure / Pharmacie"
              description="Titulaire ou membre d'une officine."
              onClick={() => {
                setAccountType('FACILITY_MEMBER')
                setStep('identity')
              }}
            />
            <p className="mt-1 text-center text-[11px] text-[var(--texte-tertiaire)]">
              Déjà un compte ?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        ) : step === 'identity' ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              setStep(accountType === 'PROFESSIONAL' ? 'profile' : 'security')
            }}
          >
            <label className="flex flex-col gap-1">
              <Libelle>Téléphone</Libelle>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+242…" autoComplete="tel" autoFocus required />
            </label>
            <label className="flex flex-col gap-1">
              <Libelle>Email</Libelle>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" autoComplete="email" required />
              <Aide>Votre code de vérification y sera envoyé.</Aide>
            </label>
            <label className="flex flex-col gap-1">
              <Libelle>Nom d'utilisateur</Libelle>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
            </label>
            <div className="flex gap-3">
              <label className="flex min-w-0 flex-1 flex-col gap-1">
                <Libelle>Prénom</Libelle>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" required />
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1">
                <Libelle>Nom</Libelle>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" required />
              </label>
            </div>

            <Button type="submit" size="lg" className="w-full">
              Continuer
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep('type')}>
              Retour
            </Button>
          </form>
        ) : step === 'profile' ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              setStep('security')
            }}
          >
            <label className="flex flex-col gap-1">
              <Libelle>Catégorie</Libelle>
              <NativeSelect value={category} onChange={(e) => setCategory(e.target.value as ProfessionalCategory)} required>
                {CATEGORIES.map((c) => (
                  <NativeSelectOption key={c.value} value={c.value}>
                    {c.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <label className="flex flex-col gap-1">
              <Libelle>Spécialité (optionnel)</Libelle>
              <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Cardiologie" autoFocus />
            </label>

            <Button type="submit" size="lg" className="w-full">
              Continuer
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep('identity')}>
              Retour
            </Button>
          </form>
        ) : step === 'security' ? (
          <form onSubmit={allerAuCode} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <Libelle>Mot de passe</Libelle>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                autoFocus
                required
              />
              <Aide>8 caractères minimum, lettres et chiffres</Aide>
            </label>
            <label className="flex flex-col gap-1">
              <Libelle>Confirmez le mot de passe</Libelle>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={confirmationDivergente || undefined}
                autoComplete="new-password"
                required
              />
              {/* CG-05 §07 : une erreur porte une icône ET du texte, jamais la seule couleur. */}
              {confirmationDivergente ? (
                <span className="flex items-center gap-1 text-[11px] leading-[1.45] text-[var(--erreur-texte)]">
                  <AlertCircle size={12} strokeWidth={2} aria-hidden="true" />
                  Ne correspond pas
                </span>
              ) : null}
            </label>

            {/* EF-01-08 / loi n° 29-2019 — consentement explicite, jamais pré-coché, bloquant.
                Les versions citées sont celles que le serveur enregistre réellement, pour que
                l'utilisateur sache à QUOI il consent et pas seulement QU'IL consent. */}
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-secondary p-3 transition-colors hover:border-[var(--bordure-normale)]">
              <input
                type="checkbox"
                className="mt-px size-[18px] shrink-0 accent-[var(--ap-400)]"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                required
              />
              <span className="text-[13px] leading-[1.55] text-muted-foreground">
                J’accepte les <strong className="text-foreground">conditions générales d’utilisation</strong> (v1.0) et la{' '}
                <strong className="text-foreground">politique de confidentialité</strong> (v1.0) d’ULAMU, et le traitement
                de mes données de santé qu’elles décrivent.
              </span>
            </label>

            {error ? <Erreur>{error}</Erreur> : null}

            <Button type="submit" size="lg" className="w-full" disabled={occupe || !acceptTerms}>
              {occupe ? <Spinner /> : null}
              Continuer
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep(accountType === 'PROFESSIONAL' ? 'profile' : 'identity')}>
              Retour
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void creerLeCompte()
            }}
            className="flex flex-col gap-3"
          >
            <p className="m-0 flex items-center gap-1.5 text-[13px] leading-[1.55] text-muted-foreground">
              <ShieldCheck size={16} strokeWidth={1.5} aria-hidden="true" />
              Vérification de l'adresse email
            </p>

            {otpInfo ? (
              <p className="m-0 flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2.5 text-xs leading-[1.5] text-[var(--info-texte)]">
                <Info size={14} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
                {otpInfo}
              </p>
            ) : null}

            <div>
              <Libelle>Code reçu par email</Libelle>
              <div className="mt-1.5">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} onComplete={() => void creerLeCompte()} autoFocus>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            {error ? <Erreur>{error}</Erreur> : null}

            <Button type="submit" size="lg" className="w-full" disabled={occupe}>
              {occupe ? <Spinner /> : null}
              Créer mon compte
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep('security')}>
              Retour
            </Button>
          </form>
        )}
      </div>
    </AuthLayout>
  )
}
