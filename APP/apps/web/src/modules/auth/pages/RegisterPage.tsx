/**
 * Inscription web — réservée aux PROFESSIONAL/FACILITY_MEMBER (mêmes routes que la Phase 0 backend).
 * Étapes : type de compte → identité → profil professionnel (PROFESSIONAL uniquement) → sécurité →
 * vérification OTP. Découpé en étapes courtes pour que la carte AuthLayout garde une hauteur correcte
 * (l'ancienne étape unique "Informations" avec 8 champs débordait).
 */
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Stethoscope, Building2, ShieldCheck } from 'lucide-react'
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
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [category, setCategory] = useState<ProfessionalCategory>('GENERAL_PRACTITIONER')
  const [specialty, setSpecialty] = useState('')

  const [otpCode, setOtpCode] = useState('')
  const [otpInfo, setOtpInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const steps = STEPS[accountType ?? 'default']
  const labels = LABELS[accountType ?? 'default']
  const currentIndex = steps.indexOf(step)

  const requestOtp = useMutation({ mutationFn: () => api.requestOtp({ phone, purpose: 'REGISTRATION' }) })
  const register = useMutation({
    mutationFn: () =>
      accountType === 'PROFESSIONAL'
        ? api.registerProfessional({
            phone,
            username,
            otpCode,
            password,
            firstName,
            lastName,
            category,
            specialty: specialty.trim() || undefined,
            client: 'desktop',
            deviceLabel: 'ULAMU Web',
          })
        : api.registerFacilityMember({ phone, username, otpCode, password, firstName, lastName, client: 'desktop', deviceLabel: 'ULAMU Web' }),
  })
  const loadMe = useLoadMeMutation()

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const goToSecurity = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('security')
  }

  const goToOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    try {
      const res = await requestOtp.mutateAsync()
      setOtpInfo(res.debugCode ? `Mode démo — code : ${res.debugCode}` : 'Code envoyé par SMS.')
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

  return (
    <AuthLayout subtitle="Créez votre compte ULAMU — professionnels de santé et structures/pharmacies.">
      <Stepper steps={labels} currentIndex={currentIndex} />

      <div key={step} className="ulamu-step-fade">
        {step === 'type' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espace-3)' }}>
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
            <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--texte-tertiaire)', textAlign: 'center', marginTop: 'var(--espace-2)' }}>
              Déjà un compte ? <Link to="/login" style={{ color: 'var(--ap-400)', fontWeight: 600 }}>Se connecter</Link>
            </p>
          </div>
        ) : step === 'identity' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setStep(accountType === 'PROFESSIONAL' ? 'profile' : 'security')
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espace-3)' }}
          >
            <Field label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+242…" autoFocus required />
            <Field label="Nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <div style={{ display: 'flex', gap: 'var(--espace-3)' }}>
              <div style={{ flex: 1 }}>
                <Field label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>

            <Button type="submit" size="lg">
              Continuer
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep('type')}>
              Retour
            </Button>
          </form>
        ) : step === 'profile' ? (
          <form onSubmit={goToSecurity} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espace-3)' }}>
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
          <form onSubmit={goToOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espace-3)' }}>
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

            {error ? <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--erreur-texte)' }}>{error}</div> : null}

            <Button type="submit" size="lg" loading={busy} disabled={busy}>
              Continuer
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep(accountType === 'PROFESSIONAL' ? 'profile' : 'identity')}>
              Retour
            </Button>
          </form>
        ) : (
          <form onSubmit={submitRegister} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espace-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-body-sm)', color: 'var(--texte-secondaire)' }}>
              <ShieldCheck size={16} /> Vérification du téléphone
            </div>
            {otpInfo ? <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--info-texte)' }}>{otpInfo}</div> : null}
            <Field label="Code reçu par SMS" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} maxLength={6} autoFocus required />

            {error ? <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--erreur-texte)' }}>{error}</div> : null}

            <Button type="submit" size="lg" loading={busy} disabled={busy}>
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

function TypeCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false)
        setPressed(false)
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      className="saris-focus-ring"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--espace-3)',
        textAlign: 'left',
        padding: 'var(--espace-4)',
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${hover ? 'var(--ap-300)' : 'var(--bordure-normale)'}`,
        background: hover ? 'var(--ap-50)' : 'var(--fond-surface)',
        boxShadow: hover ? 'var(--ombre-1)' : 'none',
        cursor: 'pointer',
        transform: pressed ? 'scale(0.99)' : 'scale(1)',
        transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.04s ease',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-md)',
          background: hover ? 'var(--ap-100)' : 'var(--ap-50)',
          color: 'var(--ap-700)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.15s ease',
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 'var(--font-size-body)', fontWeight: 600, color: 'var(--texte-primaire)' }}>{title}</div>
        <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--texte-secondaire)' }}>{description}</div>
      </div>
    </button>
  )
}
