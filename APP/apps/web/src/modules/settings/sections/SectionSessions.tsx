/**
 * B3 · Sessions & appareils — les postes connectés, et la clôture du compte.
 *
 * C'est la seule section de B3 dont le serveur savait déjà tout faire : lister, marquer la session
 * courante, révoquer. Une seule chose manquait, ajoutée dans le même palier : les trois prérequis de
 * clôture, que la maquette affiche et que rien ne vérifiait — un appel direct à l'API fermait un
 * compte au milieu d'une consultation.
 *
 * Deux règles tenues ici :
 *  • la session COURANTE n'a pas de bouton « Déconnecter ». On ne se ferme pas la porte au nez ;
 *    « Se déconnecter » existe dans le menu, et il fait autre chose (il nettoie l'état local).
 *  • le dialogue de clôture exige de taper CLÔTURER. Un compte fermé ne se rouvre pas.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Laptop, MonitorSmartphone, Smartphone, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { accord } from '@/lib/accord'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avis, Carte, Critere } from '@/components/ulamu/parts'
import { api, ApiError, type SessionInfo } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'
import { SqueletteCartes } from '@/components/ulamu/Squelette'

const messageDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez dans un moment.')

/** « Il y a 3 heures » plutôt qu'une date : ce qui compte est la fraîcheur, pas l'horodatage. */
function depuis(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60000)
  if (min < 2) return 'À l’instant'
  if (min < 60) return `Il y a ${min} ${accord(min, 'minute')}`
  const h = Math.round(min / 60)
  if (h < 24) return `Il y a ${h} heure${h > 1 ? 's' : ''}`
  const j = Math.round(h / 24)
  return `Il y a ${j} jour${j > 1 ? 's' : ''}`
}

/** L'icône vient du client déclaré à la connexion — la seule information dont on dispose vraiment. */
function IconeClient({ client }: { client: string }) {
  const Icone = client === 'mobile' ? Smartphone : client === 'web' ? Laptop : MonitorSmartphone
  return <Icone size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-muted-foreground" />
}

function Appareil({ s, onRevoke, enCours }: { s: SessionInfo; onRevoke: (id: string) => void; enCours: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5">
      <IconeClient client={s.client} />
      <span className="min-w-0 flex-1 basis-40">
        <span className="block text-[13px] font-medium text-foreground">
          {s.deviceLabel ?? (s.client === 'mobile' ? 'ULAMU Mobile' : 'ULAMU Web')}
          {s.current ? (
            <span className="ml-2 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Cet appareil
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-[11px] text-[var(--texte-tertiaire)]">
          {s.client} · {depuis(s.lastActiveAt)}
        </span>
      </span>
      {s.current ? (
        <span className="text-[11px] text-[var(--texte-tertiaire)]">Session en cours</span>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => onRevoke(s.id)} disabled={enCours}>
          Déconnecter
        </Button>
      )}
    </li>
  )
}

// ── Clôture ─────────────────────────────────────────────────────────────────

function BlocCloture() {
  const [ouvert, setOuvert] = useState(false)
  const [motDePasse, setMotDePasse] = useState('')
  const [otp, setOtp] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [canal, setCanal] = useState<{ channel: 'email' | 'sms'; hint: string } | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const deconnecter = useSessionStore((s) => s.logout)

  const prerequis = useQuery({ queryKey: ['close-prerequisites'], queryFn: () => api.closePrerequisites() })
  const bloquee = (prerequis.data ?? []).some((p) => !p.ok)

  const envoyerCode = useMutation({
    mutationFn: () => api.requestCloseOtp(),
    onSuccess: (r) => {
      setCanal(r)
      setErreur(null)
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  const cloturer = useMutation({
    mutationFn: () => api.closeAccount({ password: motDePasse, otpCode: otp.trim() }),
    // Le serveur a déjà révoqué toutes les sessions ; l'état local doit suivre, sinon l'application
    // continuerait d'afficher un compte qui n'existe plus jusqu'au premier 401.
    onSuccess: () => deconnecter('volontaire'),
    onError: (e) => setErreur(messageDe(e)),
  })

  return (
    <Carte icone={Trash2} ton="danger" titre="Clôturer mon compte" sousTitre="Action irréversible · trois conditions à remplir">
      <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
        La clôture ferme l'accès et révoque tous vos appareils. Les comptes-rendus déjà signés sont conservés : leur
        conservation est une obligation légale, et les effacer priverait vos patients de leur dossier.
      </p>

      {prerequis.isPending ? (
        <p className="flex items-center gap-2 text-[12px] text-[var(--texte-tertiaire)]">
          <Spinner className="size-3.5" /> Vérification des conditions…
        </p>
      ) : prerequis.isError ? (
        <Avis ton="erreur">Les conditions n'ont pas pu être vérifiées. Par prudence, la clôture reste indisponible.</Avis>
      ) : (
        <div className="flex flex-col gap-1">
          {prerequis.data.map((p) => (
            <Critere key={p.key} ok={p.ok} label={p.label} />
          ))}
        </div>
      )}

      <div>
        <Button
          type="button"
          variant="destructive"
          disabled={bloquee || prerequis.isPending || prerequis.isError}
          onClick={() => {
            setErreur(null)
            setCanal(null)
            setMotDePasse('')
            setOtp('')
            setConfirmation('')
            setOuvert(true)
          }}
        >
          Clôturer mon compte
        </Button>
      </div>
      {bloquee ? (
        <p className="text-[11px] text-[var(--texte-tertiaire)]">
          La clôture reste indisponible tant qu'une condition n'est pas remplie.
        </p>
      ) : null}

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clôturer définitivement ce compte</DialogTitle>
            <DialogDescription>
              Cette action ne peut pas être annulée. Un code de confirmation vous sera envoyé pour prouver que la
              demande vient bien de vous.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {canal ? (
              <Avis ton="info">
                Code envoyé {canal.channel === 'email' ? 'à' : 'au'} {canal.hint}.
              </Avis>
            ) : (
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => envoyerCode.mutate()} disabled={envoyerCode.isPending}>
                  {envoyerCode.isPending ? 'Envoi…' : 'Recevoir le code de confirmation'}
                </Button>
              </div>
            )}

            <div>
              <Label htmlFor="cloture-mdp" className="mb-1.5 block text-[13px]">
                Mot de passe
              </Label>
              <Input
                id="cloture-mdp"
                type="password"
                autoComplete="current-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cloture-otp" className="mb-1.5 block text-[13px]">
                Code reçu
              </Label>
              <Input id="cloture-otp" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cloture-mot" className="mb-1.5 block text-[13px]">
                Saisissez CLÔTURER pour confirmer
              </Label>
              <Input id="cloture-mot" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
            </div>

            {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={
                cloturer.isPending || confirmation.trim().toUpperCase() !== 'CLÔTURER' || motDePasse.length === 0 || otp.trim().length !== 6
              }
              onClick={() => cloturer.mutate()}
            >
              {cloturer.isPending ? 'Clôture…' : 'Clôturer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Carte>
  )
}

// ── Section ─────────────────────────────────────────────────────────────────

export function SectionSessions() {
  const qc = useQueryClient()
  const [erreur, setErreur] = useState<string | null>(null)

  const sessions = useQuery({ queryKey: ['sessions'], queryFn: () => api.sessions() })

  const revoquer = useMutation({
    mutationFn: (id: string) => api.revokeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
    onError: (e) => setErreur(messageDe(e)),
  })

  // Pas d'endpoint « tout révoquer » côté serveur : on boucle. `allSettled` plutôt que `all` — si un
  // appareil échoue, les autres doivent quand même tomber, c'est un geste de sécurité.
  const revoquerTout = useMutation({
    mutationFn: async (ids: string[]) => {
      const r = await Promise.allSettled(ids.map((id) => api.revokeSession(id)))
      const rates = r.filter((x) => x.status === 'rejected').length
      if (rates > 0) throw new Error(`${rates} appareil(s) n'ont pas pu être déconnectés.`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
    onError: (e) => {
      void qc.invalidateQueries({ queryKey: ['sessions'] })
      setErreur(e instanceof Error ? e.message : messageDe(e))
    },
  })

  const autres = (sessions.data ?? []).filter((s) => !s.current)

  return (
    <div className="flex flex-col gap-4">
      <Carte
        icone={MonitorSmartphone}
        titre="Appareils connectés"
        sousTitre="Une session inactive plus de 30 minutes est fermée automatiquement"
      >
        {sessions.isPending ? (
          <SqueletteCartes nombre={2} hauteur={72} libelle="Lecture des appareils…" />
        ) : sessions.isError ? (
          <>
            <Avis ton="erreur">
              La liste des appareils n'a pas pu être chargée. Aucune déconnexion à distance n'est possible tant qu'elle
              n'est pas à jour.
            </Avis>
            <div>
              <Button type="button" size="sm" variant="outline" onClick={() => sessions.refetch()}>
                Réessayer
              </Button>
            </div>
          </>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {sessions.data.map((s) => (
                <Appareil key={s.id} s={s} onRevoke={(id) => revoquer.mutate(id)} enCours={revoquer.isPending || revoquerTout.isPending} />
              ))}
            </ul>
            {autres.length > 0 ? (
              <div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setErreur(null)
                    revoquerTout.mutate(autres.map((s) => s.id))
                  }}
                  disabled={revoquerTout.isPending}
                >
                  {revoquerTout.isPending ? 'Déconnexion…' : 'Déconnecter tous les autres'}
                </Button>
              </div>
            ) : (
              <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                Seule la session que vous utilisez est ouverte. C'est la situation la plus sûre sur un poste partagé.
              </p>
            )}
            <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
              La session courante ne se ferme pas d'ici — utilisez « Se déconnecter » dans le menu.
            </p>
          </>
        )}
        {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
      </Carte>

      <BlocCloture />
    </div>
  )
}
