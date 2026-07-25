/**
 * Configuration TOTP obligatoire — écran bloquant affiché après connexion tant que totpEnabled
 * est faux (PROFESSIONAL/FACILITY_MEMBER/ADMIN, cf. App.tsx). Jamais de SMS pour la sécurité web
 * (règle à respecter) : le QR code est généré localement (lib `qrcode`), le secret ne quitte jamais
 * le navigateur vers un tiers.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { ShieldCheck, Copy, Check } from 'lucide-react'
import { Card } from '@/components/ulamu/Card'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { api, ApiError } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

type Step = 'loading' | 'scan' | 'backup-codes' | 'error'

export function TotpSetupPage() {
  const navigate = useNavigate()
  const setMe = useSessionStore((s) => s.setMe)
  const startedRef = useRef(false)
  const [step, setStep] = useState<Step>('loading')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setup = useMutation({ mutationFn: () => api.setupTotp() })
  const confirm = useMutation({ mutationFn: (c: string) => api.confirmTotp(c) })

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    setup.mutate(undefined, {
      onSuccess: async (res) => {
        setSecret(res.secret)
        setQrDataUrl(await QRCode.toDataURL(res.provisioningUri, { margin: 1, width: 220 }))
        setStep('scan')
      },
      onError: () => setStep('error'),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const res = await confirm.mutateAsync(code)
      setBackupCodes(res.backupCodes)
      setStep('backup-codes')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code invalide — réessayez.')
    }
  }

  const finish = async () => {
    const me = await api.me()
    setMe(me)
    navigate('/dashboard', { replace: true })
  }

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--fond-page)', padding: 'var(--espace-5)' }}>
      <div style={{ width: 460, maxWidth: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--espace-6)' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, color: 'var(--texte-primaire)' }}>ULAMU</div>
        </div>
        <Card>
          <Card.Header
            icon={<ShieldCheck size={20} color="var(--ap-500)" />}
            title="Sécurisez votre compte"
            subtitle="La double authentification (TOTP) est obligatoire pour tous les comptes professionnels."
          />
          <Card.Body>
            {step === 'loading' ? (
              <p style={{ fontSize: 'var(--font-size-body-sm)', color: 'var(--texte-secondaire)' }}>Préparation…</p>
            ) : step === 'error' ? (
              <p style={{ fontSize: 'var(--font-size-body-sm)', color: 'var(--erreur-texte)' }}>
                Impossible de préparer la configuration TOTP. Rechargez la page.
              </p>
            ) : step === 'scan' ? (
              <form onSubmit={submitCode} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espace-4)' }}>
                <p style={{ fontSize: 'var(--font-size-body-sm)', color: 'var(--texte-secondaire)' }}>
                  1. Scannez ce QR code avec Google Authenticator, Authy ou une application équivalente.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR code TOTP"
                      width={200}
                      height={200}
                      style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--bordure-normale)' }}
                    />
                  ) : null}
                </div>
                <div>
                  <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--texte-tertiaire)', marginBottom: 4 }}>Ou saisissez ce code manuellement :</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code
                      style={{
                        flex: 1,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--font-size-body-sm)',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--fond-surface-2)',
                        wordBreak: 'break-all',
                      }}
                    >
                      {secret}
                    </code>
                    <Button type="button" variant="secondary" size="sm" onClick={copySecret} iconLeft={copied ? <Check size={13} /> : <Copy size={13} />}>
                      {copied ? 'Copié' : 'Copier'}
                    </Button>
                  </div>
                </div>
                <p style={{ fontSize: 'var(--font-size-body-sm)', color: 'var(--texte-secondaire)' }}>2. Entrez le code à 6 chiffres généré par l'application.</p>
                <Field label="Code TOTP" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} autoFocus required />
                {error ? <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--erreur-texte)' }}>{error}</div> : null}
                <Button type="submit" size="lg" loading={confirm.isPending} disabled={confirm.isPending}>
                  Activer la double authentification
                </Button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--espace-4)' }}>
                <p style={{ fontSize: 'var(--font-size-body-sm)', color: 'var(--texte-secondaire)' }}>
                  Notez ces 10 codes de secours dans un endroit sûr — ils ne seront plus jamais affichés. Chacun permet une seule
                  récupération de compte si vous perdez votre application d'authentification.
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                    padding: 'var(--espace-3)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--fond-surface-2)',
                  }}
                >
                  {backupCodes.map((c) => (
                    <code key={c} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-body-sm)', color: 'var(--texte-primaire)' }}>
                      {c}
                    </code>
                  ))}
                </div>
                <Button size="lg" onClick={finish}>
                  J'ai sauvegardé mes codes — continuer
                </Button>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}
