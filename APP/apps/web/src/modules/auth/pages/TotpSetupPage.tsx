/**
 * Configuration TOTP — écran **bloquant** affiché après la première connexion tant que
 * `totpEnabled` est faux, pour tout compte non-patient (`App.tsx`, `needsTotpSetup`).
 *
 * C'est cet écran qui rend tenable la règle « jamais de SMS ni de code par email pour récupérer un
 * compte web » : sans lui, quiconque n'aurait pas configuré d'authentificateur se retrouverait sans
 * aucune voie de récupération. Les deux se tiennent, on ne peut pas retirer l'un sans l'autre.
 *
 * Le QR code est généré **localement** (lib `qrcode`) : le secret ne part jamais vers un service
 * tiers pour être transformé en image.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { AlertCircle, Check, Copy, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ulamu/Card'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { LoadingState, ErrorState } from '@/components/ulamu/ScreenState'
import { api, ApiError } from '@/lib/api'
import { Logo } from '@/components/ulamu/Logo'
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
    /**
     * CU-01-02 : « à la création, redirection **obligatoire** vers le dépôt du dossier de
     * vérification ». Et `RM-02-04` : sans ce dossier, le compte reste invisible de l'annuaire.
     * Envoyer un professionnel fraîchement inscrit sur un tableau de bord vide, comme on le faisait,
     * revenait à lui cacher la seule action qui puisse le rendre opérationnel.
     *
     * Les comptes d'administration, eux, n'ont pas de dossier à déposer : ils vont au tableau de bord.
     */
    const aUnDossier = me.accountType === 'PROFESSIONAL' || me.accountType === 'FACILITY_MEMBER'
    navigate(aUnDossier ? '/verification' : '/dashboard', { replace: true })
  }

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="ul-totp">
      <div className="ul-totp__inner">
        <div className="ul-totp__logo">
          <Logo size={30} />
        </div>
        <Card>
          <Card.Header
            icon={<ShieldCheck size={20} color="var(--ap-500)" />}
            title="Sécurisez votre compte"
            subtitle="La double authentification (TOTP) est obligatoire pour tous les comptes professionnels."
          />
          <Card.Body>
            {step === 'loading' ? (
              /* L'état de chargement partagé, qui avoue sa lenteur au bout de 4 s : c'est le premier
                 appel après connexion, donc précisément celui qui réveille le serveur endormi. */
              <LoadingState label="Préparation…" onRetry={() => window.location.reload()} />
            ) : step === 'error' ? (
              <ErrorState
                title="Configuration indisponible"
                description="Impossible de préparer la double authentification pour le moment."
                onRetry={() => window.location.reload()}
              />
            ) : step === 'scan' ? (
              <form onSubmit={submitCode} className="ul-totp__body">
                <p className="ul-totp__step">
                  1. Scannez ce QR code avec Google Authenticator, Authy ou une application équivalente.
                </p>

                <div className="ul-totp__qr">
                  {qrDataUrl ? <img src={qrDataUrl} alt="QR code de configuration TOTP" width={200} height={200} /> : null}
                </div>

                <div>
                  <p className="t-caption" style={{ color: 'var(--texte-tertiaire)', margin: '0 0 4px' }}>
                    Ou saisissez ce code manuellement :
                  </p>
                  <div className="ul-totp__secret-row">
                    <code className="ul-totp__secret">{secret}</code>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={copySecret}
                      iconLeft={copied ? <Check size={13} /> : <Copy size={13} />}
                    >
                      {copied ? 'Copié' : 'Copier'}
                    </Button>
                  </div>
                </div>

                <p className="ul-totp__step">2. Entrez le code à 6 chiffres généré par l'application.</p>
                <Field label="Code TOTP" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} autoFocus required />

                {error ? (
                  <p className="ul-auth__error" role="alert">
                    <AlertCircle size={13} aria-hidden="true" /> {error}
                  </p>
                ) : null}

                <Button type="submit" size="lg" loading={confirm.isPending}>
                  Activer la double authentification
                </Button>
              </form>
            ) : (
              <div className="ul-totp__body">
                <p className="ul-totp__step">
                  Notez ces {backupCodes.length} codes de secours dans un endroit sûr — ils ne seront{' '}
                  <strong>plus jamais affichés</strong>. Chacun permet une seule récupération de compte si vous perdez
                  votre application d'authentification.
                </p>
                <div className="ul-totp__codes">
                  {backupCodes.map((c) => (
                    <code key={c}>{c}</code>
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
