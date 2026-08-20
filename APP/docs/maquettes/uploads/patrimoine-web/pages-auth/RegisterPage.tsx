/**
 * Inscription web — réservée aux comptes PROFESSIONAL / FACILITY_MEMBER.
 *
 * Étapes : type de compte → identité → profil professionnel (professionnels seulement) → sécurité →
 * vérification par email. Le découpage en étapes courtes existe pour que la carte d'authentification
 * garde une hauteur tenable : l'ancienne étape unique à huit champs débordait.
 *
 * Pourquoi un code par EMAIL ici, alors que le web n'utilise que le TOTP ailleurs : à l'inscription,
 * aucun secret TOTP n'existe encore pour ce compte — il n'y a rien à vérifier. L'email sert
 * uniquement à prouver l'identité UNE fois, à la création. Le TOTP prend le relais ensuite, et lui
 * seul, pour la connexion et la réinitialisation de mot de passe.
 *
 * ⚠️ Manque connu, inscrit au plan (tâche 1.1) : le **consentement aux CGU et à la politique de
 * confidentialité** exigé par `EF-01-08` au titre de la loi n° 29-2019. L'app mobile le demande, pas
 * celle-ci. Ce n'est pas un défaut d'ergonomie mais une non-conformité, et elle se corrige en même
 * temps que la redirection vers le dossier de vérification M03 (tâche 1.3).
 */
import { useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { AlertCircle, Building2, ShieldCheck, Stethoscope } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { Select } from '@/components/ulamu/Select'
import { Stepper } from '@/components/ulamu/Stepper'
import { api, ApiError, type ProfessionalCategory } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'
import { useLoadMeMutation } from '../hooks/useLogin'

type AccountType = 'PROFESSIONAL' | 'FACILITY_MEMBER'
type Step = 'type' | 'identity' | 'profile' | 'security' | 'otp'

const STEPS: Record<AccountType | 'default', Step[]> = {
  PROFESSIONAL: ['type', 'identity', 'profile', 'security', 'otp'],
  FACILITY_MEMBER: ['type', 'identity', 'security', 'otp'],
  default: ['type', 'identity', 'security', 'otp'],
}
const LABELS: Record<AccountType | 'default', string[]> = {
  PROFESSIONAL: ['Type de compte', 'Identité', 'Profil professionnel', 'Sécurité', 'Vérification'],
  FACILITY_MEMBER: ['Type de compte', 'Identité', 'Sécurité', 'Vérification'],
  default: ['Type de compte', 'Identité', 'Sécurité', 'Vérification'],
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
  const labels = LABELS[accountType ?? 'default']
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

  const goToOtp = async (e: React.FormEvent) => {
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

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await register.mutateAsync()
      await loadMe.mutateAsync(res.sessionToken)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Inscription impossible — réessayez.')
    }
  }

  const busy = requestOtp.isPending || register.isPending || loadMe.isPending
  const erreur = error ? (
    <p className="ul-auth__error" role="alert">
      <AlertCircle size={13} aria-hidden="true" /> {error}
    </p>
  ) : null

  return (
    <AuthLayout subtitle="Créez votre compte ULAMU — professionnels de santé et structures/pharmacies.">
      <Stepper steps={labels} currentIndex={currentIndex} />

      <div key={step} className="ulamu-step-fade">
        {step === 'type' ? (
          <div className="ul-auth__form">
            <TypeCard
              icon={<Stethoscope size={20} />}
              title="Professionnel de santé"
              description="Médecin, spécialiste, dentiste, sage-femme, infirmier(ère)…"
              onClick={() => {
                setAccountType('PROFESSIONAL')
                setStep('identity')
              }}
            />
            <TypeCard
              icon={<Building2 size={20} />}
              title="Structure / Pharmacie"
              description="Titulaire ou membre d'une officine."
              onClick={() => {
                setAccountType('FACILITY_MEMBER')
                setStep('identity')
              }}
            />
            <p className="ul-auth__foot">
              Déjà un compte ?{' '}
              <Link to="/login" className="ul-auth__link">
                Se connecter
              </Link>
            </p>
          </div>
        ) : step === 'identity' ? (
          <form
            className="ul-auth__form"
            onSubmit={(e) => {
              e.preventDefault()
              setStep(accountType === 'PROFESSIONAL' ? 'profile' : 'security')
            }}
          >
            <Field label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+242…" autoFocus required />
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              hint="Votre code de vérification y sera envoyé."
              required
            />
            <Field label="Nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <div className="ul-auth__row">
              <Field label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              <Field label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>

            <Button type="submit" size="lg">
              Continuer
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep('type')}>
              Retour
            </Button>
          </form>
        ) : step === 'profile' ? (
          <form
            className="ul-auth__form"
            onSubmit={(e) => {
              e.preventDefault()
              setStep('security')
            }}
          >
            <Select label="Catégorie" value={category} onChange={(v) => setCategory(v as ProfessionalCategory)} options={CATEGORIES} required />
            <Field label="Spécialité (optionnel)" value={specialty} onChange={(e) => setSpecialty(e.target.value)} autoFocus />

            <Button type="submit" size="lg">
              Continuer
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep('identity')}>
              Retour
            </Button>
          </form>
        ) : step === 'security' ? (
          <form onSubmit={goToOtp} className="ul-auth__form">
            <Field
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint="8 caractères minimum, lettres et chiffres"
              minLength={8}
              autoFocus
              required
            />
            <Field
              label="Confirmez le mot de passe"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPassword && password !== confirmPassword ? 'Ne correspond pas' : undefined}
              required
            />

            {/* EF-01-08 / loi n° 29-2019 — consentement explicite, jamais pré-coché, bloquant.
                Les versions citées sont celles que le serveur enregistre réellement, pour que
                l'utilisateur sache à QUOI il consent et pas seulement QU'IL consent. */}
            <label className="ul-check">
              <input
                type="checkbox"
                className="ul-check__box saris-focus-ring"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                required
              />
              <span className="ul-check__text">
                J’accepte les <strong>conditions générales d’utilisation</strong> (v1.0) et la{' '}
                <strong>politique de confidentialité</strong> (v1.0) d’ULAMU, et le traitement de mes données de santé
                qu’elles décrivent.
              </span>
            </label>

            {erreur}

            <Button type="submit" size="lg" loading={busy} disabled={busy || !acceptTerms}>
              Continuer
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep(accountType === 'PROFESSIONAL' ? 'profile' : 'identity')}>
              Retour
            </Button>
          </form>
        ) : (
          <form onSubmit={submitRegister} className="ul-auth__form">
            <p className="ul-auth__note">
              <ShieldCheck size={16} aria-hidden="true" /> Vérification de l'adresse email
            </p>
            {otpInfo ? (
              <p className="ul-auth__note" style={{ color: 'var(--info-texte)' }}>
                {otpInfo}
              </p>
            ) : null}
            <Field label="Code reçu par email" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} maxLength={6} autoFocus required />

            {erreur}

            <Button type="submit" size="lg" loading={busy}>
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

function TypeCard({ icon, title, description, onClick }: { icon: ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="ul-typecard saris-focus-ring">
      <span className="ul-typecard__icon" aria-hidden="true">
        {icon}
      </span>
      <span>
        <span className="ul-typecard__title" style={{ display: 'block' }}>
          {title}
        </span>
        <span className="ul-typecard__desc" style={{ display: 'block' }}>
          {description}
        </span>
      </span>
    </button>
  )
}
