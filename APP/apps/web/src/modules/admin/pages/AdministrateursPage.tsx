/**
 * E4 — Administrateurs. D'après `docs/maquettes/E4 - Administrateurs.dc.html` et M02 (EF-02-08).
 *
 * Qui administre ULAMU, et avec quel pouvoir. Réservé au super-administrateur.
 *
 * ── L'écart qui commande l'écran : un administrateur a UN sous-rôle, pas une combinaison ────────
 *
 * La maquette montre une **matrice** — quatre colonnes cochables par ligne — et l'annonce en toutes
 * lettres : « un sous-rôle s'attribue et se révoque séparément ». C'est faux.
 * `AdminRoleAssignment` porte **une seule ligne par compte**, avec **un seul** `role` : attribuer
 * Finance à quelqu'un qui a Vérification ne l'ajoute pas, cela le **remplace** (`upsert`).
 *
 * Une matrice de cases aurait donc menti au geste près : on coche Finance en croyant renforcer un
 * vérificateur, et on lui retire l'instruction des dossiers. L'écran affiche **un rôle**, et le
 * changer se dit « changer », pas « ajouter ».
 *
 * ── Les autres écarts ─────────────────────────────────────────────────────────────────────────
 *
 * 1. **« Modération » n'existe pas.** Les quatre sous-rôles sont `SUPER_ADMIN`,
 *    `ADMIN_VERIFICATION`, `ADMIN_FINANCE` et `ADMIN_MAP` (couverture territoriale). La modération
 *    des signalements relève du super-administrateur.
 * 2. **« Dernier accès · il y a 2 h » retiré.** `listAdmins` sert le compte, son rôle et qui l'a
 *    attribué — pas la dernière connexion. `LoginSession` existe, aucune route ne l'expose par
 *    compte administrateur.
 * 3. **« Suspendre » retiré de cet écran.** Suspendre un compte passe par E7 avec son motif
 *    obligatoire, sa notification au titulaire et sa trace : le doubler ici donnerait deux chemins
 *    pour une même décision, dont un sans motif.
 * 4. **La création passe en second** (famille 3, groupe D). L'action principale est **d'attribuer un
 *    rôle à un compte existant** : c'est le geste courant, et c'est celui qu'EF-02-08 décrit. La
 *    création reste possible, plus bas, avec ses **vrais champs** — et la phrase honnête sur le mot
 *    de passe provisoire, que la maquette passait sous silence en ne demandant que nom et téléphone.
 *
 * ── Le journal des habilitations ──────────────────────────────────────────────────────────────
 *
 * La maquette le montre avec ses motifs. Il n'a pas de table propre : il vit dans le **journal
 * d'audit**, sous trois actions (`m02.admin.created`, `role_assigned`, `role_revoked`). Le filtre
 * serveur étant un égal exact, l'écran fait trois lectures et les fusionne.
 *
 * ⚠️ **Lire le journal laisse une trace** (RM-04-02) : chaque ouverture de cet écran s'inscrit
 * elle-même au journal. C'est voulu, et c'est dit.
 */
import { useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, History, KeyRound, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Avis, Carte, Pilule, type TonPilule } from '@/components/ulamu/parts'
import { Liste } from '@/components/ulamu/Liste'
import { api, ApiError, type AdminRole, type AuditEntry, type PlatformAdmin } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

const messageDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez dans un moment.')

const dateHeureFr = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** Les quatre sous-rôles réels, avec ce que chacun ouvre. « Modération » n'en fait pas partie. */
const ROLES: Array<{ cle: AdminRole; label: string; aide: string; ton: TonPilule }> = [
  {
    cle: 'SUPER_ADMIN',
    label: 'Super-administrateur',
    aide: 'Tout, y compris les paramètres métier et les habilitations',
    ton: 'erreur',
  },
  {
    cle: 'ADMIN_VERIFICATION',
    label: 'Vérification',
    aide: 'Instruire les dossiers, décider des badges, suspendre un compte',
    ton: 'info',
  },
  { cle: 'ADMIN_FINANCE', label: 'Finance', aide: 'Remboursements manuels et rapprochement', ton: 'succes' },
  { cle: 'ADMIN_MAP', label: 'Couverture territoriale', aide: 'Pilotage de la carte et des arrondissements', ton: 'alerte' },
]

const ROLE_PAR_CLE = new Map(ROLES.map((r) => [r.cle, r]))

/** Les trois actions d'habilitation, dites en français. */
const ACTIONS: Record<string, string> = {
  'm02.admin.created': 'Compte d’administration créé',
  'm02.admin.role_assigned': 'Sous-rôle attribué',
  'm02.admin.role_revoked': 'Sous-rôle révoqué',
}

const nomDe = (a: PlatformAdmin) =>
  [a.firstName, a.lastName].filter(Boolean).join(' ') || a.username || '(compte sans profil)'

// ── Changer le rôle d'un administrateur ────────────────────────────────────

function ChangerRole({ admin, onFini, onAnnuler }: { admin: PlatformAdmin; onFini: () => void; onAnnuler: () => void }) {
  const [role, setRole] = useState<AdminRole>(admin.role ?? 'ADMIN_VERIFICATION')
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)

  const attribuer = useMutation({
    mutationFn: () => api.assignAdminRole(admin.accountId, role, motif.trim() || undefined),
    onSuccess: onFini,
    onError: (e) => setErreur(messageDe(e)),
  })

  const change = role !== admin.role

  return (
    <div className="mt-2 rounded-lg border border-border bg-secondary p-3">
      <p className="text-[13px] font-semibold text-foreground">Changer le sous-rôle de {nomDe(admin)}</p>

      {/*
        « Changer », jamais « ajouter » : l'attribution est un `upsert` sur une ligne unique. La
        maquette proposait quatre cases indépendantes — cocher Finance sur un vérificateur lui
        aurait retiré l'instruction des dossiers sans que rien ne le dise.
      */}
      <p className="mt-1 text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
        Un compte porte <strong className="text-foreground">un seul</strong> sous-rôle. Celui que vous
        choisissez remplace l'actuel
        {admin.role ? ` (${ROLE_PAR_CLE.get(admin.role)?.label ?? admin.role})` : ' — ce compte n’en a aucun'}.
      </p>

      <div className="mt-2.5">
        <Label htmlFor="role-admin" className="mb-1.5 block text-[13px]">
          Sous-rôle
        </Label>
        {/*
          Ce que chaque rôle ouvre est désormais DANS l'option, pas sous le champ : on lisait
          l'explication du rôle déjà choisi, il fallait donc choisir pour savoir ce qu'on choisissait.
        */}
        <Liste
          id="role-admin"
          valeur={role}
          onChange={setRole}
          options={ROLES.map((r) => ({ cle: r.cle, label: r.label, aide: r.aide }))}
        />
      </div>

      <div className="mt-2.5">
        <Label htmlFor="motif-role" className="mb-1.5 block text-[13px]">
          Motif
        </Label>
        <Textarea
          id="motif-role"
          rows={2}
          maxLength={300}
          value={motif}
          placeholder="Prise de fonction, renfort, réorganisation…"
          className="resize-none bg-card"
          onChange={(e) => setMotif(e.target.value)}
        />
        <p className="mt-1 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
          Il figure au journal des habilitations, avec votre nom. Le serveur l'accepte vide — mais une
          habilitation sans raison est ingérable six mois plus tard.
        </p>
      </div>

      {erreur ? (
        <div className="mt-2">
          <Avis ton="erreur">{erreur}</Avis>
        </div>
      ) : null}

      <div className="mt-2.5 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => attribuer.mutate()} disabled={attribuer.isPending || !change}>
          {attribuer.isPending ? 'Enregistrement…' : 'Attribuer ce sous-rôle'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onAnnuler}>
          Renoncer
        </Button>
      </div>
      {!change ? <p className="mt-1.5 text-[11px] text-[var(--texte-tertiaire)]">C'est déjà son sous-rôle.</p> : null}
    </div>
  )
}

// ── Créer un compte d'administration ───────────────────────────────────────

/**
 * La création, en SECOND (famille 3, groupe D).
 *
 * La maquette ne demandait que nom et téléphone. Le serveur exige en plus un nom d'utilisateur et
 * **un mot de passe** — ce qui veut dire que le super-administrateur choisit le mot de passe de
 * quelqu'un d'autre. C'est exactement ce que la plateforme interdit ailleurs : « un compte ne peut
 * être créé que par son titulaire ».
 *
 * On ne peut pas supprimer ce champ, le serveur le réclame. Ce qu'on peut, c'est **ne pas taire ce
 * qu'il implique** : ce mot de passe est provisoire, il doit être transmis par un autre canal que
 * cet écran, et changé à la première connexion.
 */
function CreerAdmin({ onFini }: { onFini: () => void }) {
  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<AdminRole>('ADMIN_VERIFICATION')
  const [erreur, setErreur] = useState<string | null>(null)

  const creer = useMutation({
    mutationFn: () => api.createAdmin({ phone: phone.trim(), username: username.trim(), password, firstName, lastName, role }),
    onSuccess: () => {
      setPhone('')
      setUsername('')
      setPassword('')
      setFirstName('')
      setLastName('')
      setErreur(null)
      onFini()
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  const complet =
    phone.trim().length > 0 &&
    username.trim().length >= 3 &&
    password.length >= 8 &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0

  return (
    <Carte icone={UserPlus} titre="Créer un compte d'administration" sousTitre="En dernier recours — préférez habiliter un compte existant">
      <Avis ton="alerte">
        Vous allez choisir le <strong>mot de passe de quelqu'un d'autre</strong>. Il est provisoire :
        transmettez-le de vive voix ou par un canal qui n'est pas cet écran, et demandez à la personne
        de le changer à sa première connexion.
      </Avis>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-0 flex-1 basis-40">
          <Label htmlFor="admin-prenom" className="mb-1.5 block text-[13px]">
            Prénom
          </Label>
          <Input id="admin-prenom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="min-w-0 flex-1 basis-40">
          <Label htmlFor="admin-nom" className="mb-1.5 block text-[13px]">
            Nom
          </Label>
          <Input id="admin-nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-0 flex-1 basis-40">
          <Label htmlFor="admin-tel" className="mb-1.5 block text-[13px]">
            Téléphone
          </Label>
          <Input id="admin-tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+242 06…" />
        </div>
        <div className="min-w-0 flex-1 basis-40">
          <Label htmlFor="admin-identifiant" className="mb-1.5 block text-[13px]">
            Nom d'utilisateur
          </Label>
          <Input id="admin-identifiant" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-0 flex-1 basis-44">
          <Label htmlFor="admin-mdp" className="mb-1.5 block text-[13px]">
            Mot de passe provisoire
          </Label>
          <Input
            id="admin-mdp"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-[var(--texte-tertiaire)]">Huit caractères au minimum.</p>
        </div>
        <div className="min-w-0 flex-1 basis-44">
          <Label htmlFor="admin-role" className="mb-1.5 block text-[13px]">
            Sous-rôle
          </Label>
          <Liste
            id="admin-role"
            valeur={role}
            onChange={setRole}
            options={ROLES.map((r) => ({ cle: r.cle, label: r.label, aide: r.aide }))}
          />
        </div>
      </div>

      {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}

      <div>
        <Button type="button" onClick={() => creer.mutate()} disabled={creer.isPending || !complet}>
          {creer.isPending ? 'Création…' : 'Créer le compte'}
        </Button>
      </div>
    </Carte>
  )
}

// ── Le journal des habilitations ───────────────────────────────────────────

function JournalHabilitations() {
  /*
    Le filtre serveur est un égal EXACT : trois actions, trois lectures. Les fusionner ici coûte
    moins qu'une route dédiée, et garde le journal d'audit comme source unique.
  */
  const lectures = useQueries({
    queries: Object.keys(ACTIONS).map((action) => ({
      queryKey: ['audit', action],
      queryFn: () => api.auditLog({ action, limit: 20 }),
      retry: false,
    })),
  })

  const enCours = lectures.some((l) => l.isPending)
  const echec = lectures.find((l) => l.isError)
  const entrees: AuditEntry[] = lectures
    .flatMap((l) => l.data?.items ?? [])
    // `seq` est un entier servi en texte : on trie du plus récent au plus ancien.
    .sort((a, b) => Number(b.seq) - Number(a.seq))
    .slice(0, 20)

  return (
    <Carte icone={History} titre="Journal des habilitations" sousTitre="Toute attribution ou révocation est tracée">
      {/* RM-04-02 : consulter le journal s'inscrit AU journal. Le dire, pas le cacher. */}
      <p className="text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
        Ces lignes viennent du journal d'audit, en insertion seule. Ouvrir cet écran y laisse
        elle-même une trace à votre nom.
      </p>

      {enCours ? (
        <p className="flex items-center gap-2 py-2 text-[12px] text-[var(--texte-tertiaire)]">
          <Spinner className="size-3.5" /> Lecture du journal…
        </p>
      ) : echec ? (
        <Avis ton="erreur">{messageDe(echec.error)}</Avis>
      ) : entrees.length === 0 ? (
        <p className="py-2 text-[12px] text-[var(--texte-tertiaire)]">
          Aucune habilitation enregistrée depuis l'installation.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {entrees.map((e) => (
            <li key={e.seq} className="border-l-2 border-border pl-2.5">
              <p className="text-[12px] font-medium text-foreground">{ACTIONS[e.action] ?? e.action}</p>
              <p className="text-[11px] text-[var(--texte-tertiaire)]">{dateHeureFr(e.createdAt)}</p>
              {/*
                Le motif vit dans le `context` du journal, dont la forme dépend de l'action. On le
                lit défensivement : une entrée sans motif ne doit pas casser la liste.
              */}
              {typeof (e.context as { reason?: unknown })?.reason === 'string' ? (
                <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--texte-secondaire)]">
                  « {String((e.context as { reason: string }).reason)} »
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </Carte>
  )
}

// ── Écran ──────────────────────────────────────────────────────────────────

export function AdministrateursPage() {
  const [modifie, setModifie] = useState<string | null>(null)
  const [creation, setCreation] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const moi = useSessionStore((s) => s.me)
  const qc = useQueryClient()

  const admins = useQuery({ queryKey: ['admins'], queryFn: () => api.admins(), retry: false })

  const revoquer = useMutation({
    mutationFn: (accountId: string) => api.revokeAdminRole(accountId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admins'] }),
    onError: (e) => setErreur(messageDe(e)),
  })

  const rafraichir = () => {
    setModifie(null)
    setCreation(false)
    void qc.invalidateQueries({ queryKey: ['admins'] })
    void qc.invalidateQueries({ queryKey: ['audit'] })
  }

  const liste = admins.data ?? []
  const monId = moi?.accountId ?? ''

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <Users size={18} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">
            Administrateurs
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">
            {/*
              Le sous-titre ne compte QUE si le serveur a répondu. Tant qu'il n'a pas répondu — ou
              qu'il a échoué — il n'y a pas « 0 » : il n'y a pas de nombre. Écrire 0 en cas de panne
              disait « rien à traiter » à un administrateur dont la file était peut-être pleine.
              Constaté le 01/09/2026 pendant la relecture visuelle, en servant des 500 à l'écran.
            */}
            {admins.isSuccess ? (
              <>
                {liste.length} compte{liste.length > 1 ? 's' : ''} d'administration ·{' '}
              </>
            ) : null}
            un sous-rôle chacun
          </p>
        </span>
      </div>

      {admins.isPending ? (
        <p className="flex items-center gap-2 py-8 text-[13px] text-[var(--texte-tertiaire)]">
          <Spinner className="size-4" /> Lecture des habilitations…
        </p>
      ) : admins.isError ? (
        <div className="mx-auto max-w-lg py-8">
          <Carte icone={AlertTriangle} titre="Les administrateurs n'ont pas pu être lus" sousTitre="Rien n'a été modifié">
            <div>
              <Button type="button" onClick={() => admins.refetch()}>
                Réessayer
              </Button>
            </div>
          </Carte>
        </div>
      ) : (
        <>
          {/* Les quatre sous-rôles RÉELS. « Modération » n'existe pas au modèle. */}
          <div className="mb-4 flex flex-wrap gap-3">
            {ROLES.map((r) => {
              const n = liste.filter((a) => a.role === r.cle).length
              return (
                <div key={r.cle} className="min-w-0 flex-1 basis-48 rounded-[10px] border border-border bg-card p-3.5">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">
                    {r.label}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-[26px] font-bold leading-none text-foreground">
                    {n}
                  </p>
                  <p className="mt-1.5 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">{r.aide}</p>
                </div>
              )
            })}
          </div>

          {/*
            La correction la plus importante de l'écran, dite avant le tableau : la maquette annonce
            « un sous-rôle s'attribue et se révoque séparément » et montre quatre cases par ligne.
            Le modèle n'en porte qu'un.
          */}
          <div className="mb-4">
            <Carte icone={ShieldCheck} titre="Un compte, un sous-rôle" sousTitre="EF-02-08">
              <p className="text-[12px] leading-[1.6] text-[var(--texte-secondaire)]">
                Un compte d'administration porte <strong>exactement un</strong> sous-rôle : lui en
                attribuer un autre remplace le précédent, il ne s'y ajoute pas. Le super-administrateur
                voit et peut tout — les autres n'accèdent qu'à leur domaine. Vous ne pouvez pas
                révoquer votre propre rôle : le serveur le refuse, pour qu'il reste toujours quelqu'un
                pour administrer.
              </p>
            </Carte>
          </div>

          {erreur ? (
            <div className="mb-4">
              <Avis ton="erreur">{erreur}</Avis>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-[10px] border border-border">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-[color-mix(in_srgb,var(--fond-surface-2)_55%,transparent)]">
                  {['Administrateur', 'Sous-rôle', 'Attribué le', ''].map((t, i) => (
                    <th
                      key={t || `action-${i}`}
                      scope="col"
                      className="px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]"
                    >
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {liste.map((a) => {
                  const r = a.role ? ROLE_PAR_CLE.get(a.role) : null
                  const cestMoi = a.accountId === monId
                  /*
                    Le dernier titulaire de son sous-rôle. La maquette prévoyait « une case grisée
                    signale le dernier porteur d'un sous-rôle » ; la phrase avait été retirée le
                    01/09 faute de mécanisme derrière. Le serveur refuse désormais (dette 8ter) —
                    l'écran peut donc le dire AVANT le clic, au lieu de laisser découvrir un refus.

                    Le compte est lu de la liste déjà chargée : aucune route de plus.
                  */
                  const dernierDeSonRole = a.role !== null && liste.filter((x) => x.role === a.role).length === 1
                  return (
                    <tr key={a.accountId} className="border-b border-border align-top last:border-b-0">
                      <td className="px-3 py-3">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-medium text-foreground">{nomDe(a)}</span>
                          {cestMoi ? <Pilule ton="info">Vous</Pilule> : null}
                        </span>
                        <span className="block font-mono text-[11px] text-[var(--texte-tertiaire)]">{a.phone}</span>
                      </td>
                      <td className="px-3 py-3">
                        {r ? (
                          <Pilule ton={r.ton}>{r.label}</Pilule>
                        ) : (
                          /* `role: null` — le compte existe mais n'ouvre rien. Le dire vaut mieux
                             qu'une cellule vide, qu'on lirait comme un défaut d'affichage. */
                          <span className="text-[12px] text-[var(--alerte-texte)]">Aucun — n'accède à rien</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-[12px] text-[var(--texte-tertiaire)]">
                        {a.assignedAt ? dateHeureFr(a.assignedAt) : '—'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <span className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setModifie((v) => (v === a.accountId ? null : a.accountId))
                              setErreur(null)
                            }}
                          >
                            <KeyRound size={13} strokeWidth={1.8} aria-hidden="true" />
                            Changer le rôle
                          </Button>
                          {cestMoi ? (
                            /* Le serveur refuse l'auto-révocation. Ne pas proposer le bouton ET dire
                               pourquoi : un bouton grisé sans raison se lit comme une panne. */
                            <span className="self-center text-[11px] text-[var(--texte-tertiaire)]">
                              Votre compte est protégé
                            </span>
                          ) : dernierDeSonRole ? (
                            <span className="self-center text-right text-[11px] text-[var(--texte-tertiaire)]">
                              Dernier {r?.label ?? 'titulaire'} — nommez un remplaçant d'abord
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => revoquer.mutate(a.accountId)}
                              disabled={revoquer.isPending || a.role === null}
                            >
                              Révoquer
                            </Button>
                          )}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {modifie ? (
            <ChangerRole
              key={modifie}
              admin={liste.find((a) => a.accountId === modifie) as PlatformAdmin}
              onFini={rafraichir}
              onAnnuler={() => setModifie(null)}
            />
          ) : null}

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
            <section aria-label="Journal des habilitations" className="min-w-0 flex-1">
              <JournalHabilitations />
            </section>

            <aside className="w-full shrink-0 lg:w-96">
              {creation ? (
                <CreerAdmin onFini={rafraichir} />
              ) : (
                /*
                  Famille 3, groupe D : la création passe EN SECOND. Le geste courant est
                  d'habiliter un compte existant — c'est celui qu'EF-02-08 décrit, et celui qui
                  n'oblige personne à choisir le mot de passe d'autrui.
                */
                <Carte icone={UserPlus} titre="Besoin d'un compte de plus ?" sousTitre="Habiliter d'abord, créer ensuite">
                  <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
                    Si la personne a déjà un compte d'administration, changez son sous-rôle dans le
                    tableau : c'est immédiat et cela ne crée aucun identifiant de plus.
                  </p>
                  <div>
                    <Button type="button" size="sm" variant="outline" onClick={() => setCreation(true)}>
                      Créer un compte d'administration
                    </Button>
                  </div>
                </Carte>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
