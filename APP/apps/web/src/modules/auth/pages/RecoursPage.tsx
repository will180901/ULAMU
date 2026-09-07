/**
 * Écrire à l'administration sans pouvoir se connecter — chantier 63, 07/09/2026 (CU-16-04).
 *
 * ── Le défaut que cette page répare ────────────────────────────────────────────────────────────
 *
 * Un compte suspendu reçoit *« Contactez le support pour connaître le motif et les voies de
 * recours »*, et un compte clôturé lit *« contactez le support »* à la connexion. Mais la garde
 * refuse **chacune** de leurs requêtes, la seule voie de support existante exigeait une session, et
 * l'adresse des mentions légales n'existe pas.
 *
 * ⚠️ Une personne exclue était invitée **par écrit** à exercer un recours qu'aucun chemin ne lui
 * permettait d'exercer. Au regard de la loi n° 29-2019 acceptée à l'inscription, ce n'est pas un
 * défaut d'ergonomie.
 *
 * ── Pourquoi un code, et pas une session ───────────────────────────────────────────────────────
 *
 * On ne délivre pas de jeton à un compte suspendu : ce serait lui retirer le sens qu'il a. On
 * demande une preuve — un code envoyé à l'adresse du compte, que seul son titulaire relève. Cela
 * n'ouvre aucun pouvoir nouveau : qui relève cette boîte pouvait déjà réinitialiser le mot de passe.
 */
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { LifeBuoy } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { Liste } from '@/components/ulamu/Liste'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { Avis } from '@/components/ulamu/parts'
import { api, type SupportProcedureType } from '@/lib/api'
import { messageErreur } from '@/lib/message-erreur'

/**
 * Les mêmes sujets que le formulaire d'aide, moins celui qui ne mène nulle part.
 *
 * `OWNER_UNREACHABLE` n'est pas proposé : plus personne n'administre de structure depuis D-051, et
 * la procédure guidée qui traitait ces demandes a été retirée d'E7 le même jour. Une case qui mène à
 * une file morte est une promesse de réponse qu'on ne tiendra pas.
 */
const SUJETS: ReadonlyArray<{ cle: SupportProcedureType; label: string; aide: string }> = [
  { cle: 'OTHER', label: 'Contester une décision', aide: 'Suspension, clôture, ou toute autre mesure' },
  { cle: 'PHONE_CHANGE', label: 'J’ai perdu mon numéro', aide: 'Le code de connexion arrive sur une ligne que je n’ai plus' },
  { cle: 'RECORD_TRANSFER', label: 'Mon carnet de santé', aide: 'Transfert, correction ou accès à mon dossier' },
]

export function RecoursPage() {
  const [email, setEmail] = useState('')
  const [etape, setEtape] = useState<'email' | 'demande'>('email')
  const [code, setCode] = useState('')
  const [sujet, setSujet] = useState<SupportProcedureType>('OTHER')
  const [texte, setTexte] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoyee, setEnvoyee] = useState(false)

  const demanderCode = useMutation({
    mutationFn: () => api.requestOtp({ email: email.trim().toLowerCase(), purpose: 'SUPPORT_ACCESS' }),
    onSuccess: () => {
      setEtape('demande')
      setErreur(null)
    },
    onError: (e) => setErreur(messageErreur(e, "Le code n'a pas pu être envoyé. Réessayez dans un moment.")),
  })

  const envoyer = useMutation({
    mutationFn: () =>
      api.createSupportRequestWithoutSession({
        email: email.trim().toLowerCase(),
        otpCode: code,
        subject: sujet,
        body: texte.trim(),
      }),
    onSuccess: () => {
      setEnvoyee(true)
      setErreur(null)
    },
    onError: (e) => setErreur(messageErreur(e, "Votre demande n'a pas pu être envoyée. Réessayez dans un moment.")),
  })

  // 10 caractères : la borne du serveur, annoncée plutôt qu'apprise par un refus.
  const assezEcrit = texte.trim().length >= 10

  if (envoyee) {
    return (
      <AuthLayout titre="Demande envoyée" subtitle="L’administration l’examinera.">
        <Avis ton="succes">
          Votre demande est enregistrée. La réponse vous sera envoyée <strong>par email</strong>, à l’adresse de votre
          compte — vous n’avez pas besoin de pouvoir vous connecter pour la lire.
        </Avis>
        <Button type="button" className="w-full" onClick={() => (window.location.href = '/login')}>
          Revenir à la connexion
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      titre="Écrire à l’administration"
      subtitle="Pour contester une suspension, ou demander de l’aide quand la connexion vous est refusée."
    >
      <p className="flex items-start gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-[12px] leading-[1.5] text-muted-foreground">
        <LifeBuoy size={14} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>
          Un code sera envoyé à l’adresse de votre compte : c’est ce qui prouve qu’il est bien le vôtre. Aucune
          connexion n’est ouverte.
        </span>
      </p>

      {etape === 'email' ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email-recours">Adresse email de votre compte</Label>
            <Input
              id="email-recours"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
          <Button
            type="button"
            className="w-full"
            disabled={!email.includes('@') || demanderCode.isPending}
            onClick={() => demanderCode.mutate()}
          >
            {demanderCode.isPending ? <Spinner /> : null}
            Recevoir un code
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code-recours">Code reçu par email</Label>
            <InputOTP id="code-recours" maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sujet-recours">De quoi s’agit-il ?</Label>
            <Liste id="sujet-recours" valeur={sujet} onChange={setSujet} options={SUJETS} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="texte-recours">Votre demande</Label>
            <Textarea
              id="texte-recours"
              rows={5}
              maxLength={2000}
              value={texte}
              placeholder="Décrivez votre situation en quelques phrases."
              onChange={(e) => setTexte(e.target.value)}
            />
            <p className="text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
              {texte.trim().length} / 2000 caractères. N’écrivez pas votre mot de passe : l’administration ne vous le
              demandera jamais.
            </p>
          </div>

          {/* Dit AVANT d'envoyer : c'est ce qui décide d'écrire maintenant ou d'attendre. */}
          <Avis ton="info">
            Vous ne pouvez pas vous connecter : la réponse vous sera donc envoyée par email, et non déposée dans
            l’application.
          </Avis>

          {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}

          <Button
            type="button"
            className="w-full"
            disabled={code.length !== 6 || !assezEcrit || envoyer.isPending}
            onClick={() => envoyer.mutate()}
          >
            {envoyer.isPending ? <Spinner /> : null}
            Envoyer ma demande
          </Button>
        </div>
      )}
    </AuthLayout>
  )
}
