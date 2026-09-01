/**
 * E7 — Comptes et procédures support. D'après `docs/maquettes/E7 - Comptes.dc.html`, M16 et M02.
 *
 * L'écran où l'administration suspend, bannit, réactive — et où elle trace ce qu'elle a fait pour
 * une personne qui l'a appelée. Les décisions les plus lourdes de la plateforme après la
 * vérification : un compte suspendu disparaît de l'annuaire, un compte banni ne revient pas.
 *
 * ── L'écart qui commande tout le reste : il n'existe aucune LISTE de comptes ───────────────────
 *
 * La maquette montre un tableau de 1 284 comptes, paginé, avec quatre tuiles qui les comptent par
 * statut. **Rien de tout cela n'existe côté serveur, et c'est délibéré** : `GET /admin/accounts`
 * exige un terme de recherche et refuse de répondre sans lui (RM-16-02, « données minimales »). Un
 * administrateur cherche un compte précis parce qu'on l'a appelé à son sujet ; il ne parcourt pas
 * l'annuaire des inscrits de la plateforme.
 *
 * Construire les tuiles aurait demandé un décompte par statut sur toute la table — c'est-à-dire
 * inventer la route que la règle refuse. L'écran est donc une **recherche**, et il dit pourquoi.
 *
 * ── Les autres écarts ─────────────────────────────────────────────────────────────────────────
 *
 * 1. **« Durée de la suspension : 7 / 15 / 30 jours » retiré** (famille 3, groupe D). `AccountSanction`
 *    n'a **aucun champ de durée** : type, motif, demandeur, approbateur, statut, dates. Une
 *    suspension dure **jusqu'à réactivation** par un administrateur. Un sélecteur promettrait une
 *    libération automatique qui n'arrive jamais — et le suspendu l'attendrait.
 * 2. **« Bannir » n'est pas un bouton qui bannit.** EF-16-07 : c'est une DEMANDE, qu'un second
 *    administrateur distinct doit approuver — le serveur refuse l'auto-approbation. L'écran le dit
 *    avant le clic, pas après.
 * 3. **Colonnes « Arrondissement » et « Dernière activité » retirées.** La recherche renvoie le
 *    nom, le téléphone, le type et le statut — rien d'autre (RM-16-02). Les réclamer pour garnir un
 *    tableau ferait une requête par ligne, sur des données que la règle restreint exprès.
 * 4. **Le motif de la sanction, affiché sous le statut, n'est pas servi** par la recherche. Il vit
 *    dans `AccountSanction`, qu'aucune route ne lit pour un compte donné. Omis plutôt qu'inventé.
 * 5. **`USR-2026-00312` retiré** — ce format n'existe pas, les identifiants sont des UUID.
 *
 * ── Les procédures support, ajoutées ici (famille 4, point 10) ─────────────────────────────────
 *
 * Exigence MVP écrite (EF-16-03, CU-16-04), serveur prêt, aucun écran. Elles vivent ici parce que
 * c'est ici qu'on cherche le compte concerné.
 *
 * **RM-16-01 commande la formulation entière de ce bloc : M16 guide et journalise, il n'agit pas.**
 * Ouvrir une procédure ne change ni un numéro, ni un propriétaire, ni un carnet — cela enregistre ce
 * qu'un administrateur a fait par ailleurs. La phrase est imposée par l'alignement, et elle est
 * affichée en permanence, pas une fois.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Ban, ClipboardCheck, Plus, Search, ShieldOff, UserCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { Avis, Carte, Pilule, Segments, type TonPilule } from '@/components/ulamu/parts'
import {
  api,
  ApiError,
  type AdminAccount,
  type SupportProcedure,
  type SupportProcedureType,
} from '@/lib/api'

const messageDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez dans un moment.')

const dateFr = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const ETATS_COMPTE: Record<string, { libelle: string; ton: TonPilule }> = {
  ACTIVE: { libelle: 'Actif', ton: 'succes' },
  SUSPENDED: { libelle: 'Suspendu', ton: 'alerte' },
  BANNED: { libelle: 'Banni', ton: 'erreur' },
  CLOSED: { libelle: 'Clôturé', ton: 'neutre' },
  PENDING: { libelle: 'En attente', ton: 'info' },
}

const TYPES_COMPTE: Record<string, string> = {
  PATIENT: 'Patient',
  PROFESSIONAL: 'Soignant',
  FACILITY_MEMBER: 'Structure',
  ADMIN: 'Administration',
}

/** Les quatre procédures, dites en langage clair — pas en code d'énumération. */
const PROCEDURES: Record<SupportProcedureType, { titre: string; aide: string; etapes: string[] }> = {
  PHONE_CHANGE: {
    titre: 'Changement de numéro sans accès',
    aide: "La personne a perdu son numéro et ne peut plus recevoir de code. Elle n'a aucun moyen de se connecter.",
    etapes: [
      'Identité vérifiée par pièce justificative',
      'Ancien numéro confirmé injoignable',
      'Nouveau numéro confirmé par la personne',
      'Changement effectué dans le compte',
    ],
  },
  OWNER_UNREACHABLE: {
    titre: 'Titulaire de structure injoignable',
    aide: "Une officine n'a plus de titulaire actif : personne ne peut plus délivrer ni gérer son stock.",
    etapes: [
      'Tentatives de contact documentées',
      'Second membre de la structure identifié',
      'Pièce justificative de la structure reçue',
      'Transfert de titularité effectué',
    ],
  },
  RECORD_TRANSFER: {
    titre: 'Transfert de carnet de santé',
    aide: 'Le carnet d’une personne à charge doit passer sous son propre compte, ou changer de responsable.',
    etapes: [
      'Consentement du titulaire actuel recueilli',
      'Identité du nouveau responsable vérifiée',
      'Portée du transfert précisée par écrit',
      'Transfert effectué',
    ],
  },
  OTHER: {
    titre: 'Autre intervention',
    aide: "Un cas qui n'entre dans aucune des trois procédures prévues.",
    etapes: ['Demande reçue et qualifiée', 'Vérifications effectuées', 'Intervention réalisée'],
  },
}

const ETATS_PROCEDURE: Record<SupportProcedure['status'], { libelle: string; ton: TonPilule }> = {
  OPEN: { libelle: 'Ouverte', ton: 'alerte' },
  COMPLETED: { libelle: 'Close', ton: 'succes' },
  CANCELLED: { libelle: 'Annulée', ton: 'neutre' },
}

// ── Une action motivée sur un compte ───────────────────────────────────────

/**
 * Suspendre, réactiver, demander un bannissement.
 *
 * Chaque décision exige un motif (RM-16-03) : il est inscrit au journal d'audit ET notifié au
 * titulaire. Le formulaire ne se contente donc pas d'un champ — il rappelle, avant la validation,
 * ce que la décision fait réellement.
 */
function ActionCompte({
  compte,
  action,
  onFini,
  onAnnuler,
}: {
  compte: AdminAccount
  action: 'suspend' | 'reactivate' | 'ban'
  onFini: () => void
  onAnnuler: () => void
}) {
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)

  const executer = useMutation<void, unknown, void>({
    // Les trois routes ne renvoient pas la même chose — la demande de bannissement rend
    // l'identifiant de la sanction. L'écran n'en fait rien : l'approbation vient d'un AUTRE
    // administrateur, sur un autre poste, et c'est tout l'objet d'EF-16-07.
    mutationFn: async () => {
      const raison = motif.trim()
      if (action === 'suspend') await api.suspendAccount(compte.accountId, raison)
      else if (action === 'reactivate') await api.reactivateAccount(compte.accountId, raison)
      else await api.requestBan(compte.accountId, raison)
    },
    onSuccess: onFini,
    onError: (e) => setErreur(messageDe(e)),
  })

  const titre =
    action === 'suspend' ? 'Suspendre ce compte' : action === 'reactivate' ? 'Réactiver ce compte' : 'Demander le bannissement'

  return (
    <div className="mt-2 rounded-lg border border-border bg-secondary p-3">
      <p className="text-[13px] font-semibold text-foreground">
        {titre} — {compte.displayName}
      </p>

      {action === 'suspend' ? (
        /*
          Famille 3, groupe D : aucune durée. `AccountSanction` n'a pas de champ pour en porter une,
          et rien ne réactive automatiquement. Le sélecteur « 7 / 15 / 30 jours » de la maquette
          promettait une libération qui n'arrive jamais — et le suspendu l'aurait attendue.
        */
        <p className="mt-1 text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
          La suspension dure <strong className="text-foreground">jusqu'à réactivation</strong> par un
          administrateur : aucune durée n'est fixée, rien ne se rouvre tout seul.
        </p>
      ) : action === 'ban' ? (
        /* EF-16-07 : ce bouton ne bannit pas, il DEMANDE. Le dire avant le clic. */
        <Avis ton="alerte">
          Ceci n'applique pas le bannissement : cela le <strong>demande</strong>. Un second
          administrateur, différent de vous, devra l'approuver — et le bannissement, lui, est définitif.
        </Avis>
      ) : (
        <p className="mt-1 text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
          Le compte retrouve immédiatement l'accès qu'il avait avant sa suspension.
        </p>
      )}

      <div className="mt-2.5">
        <Label htmlFor="motif-compte" className="mb-1.5 block text-[13px]">
          Motif
        </Label>
        <Textarea
          id="motif-compte"
          rows={3}
          maxLength={2000}
          value={motif}
          placeholder="Ce que vous avez constaté, et sur quoi vous vous appuyez"
          className="resize-none bg-card"
          onChange={(e) => setMotif(e.target.value)}
        />
        <p className="mt-1 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
          Ce motif est inscrit au journal d'audit et <strong>notifié au titulaire</strong> : il le lira.
        </p>
      </div>

      {erreur ? (
        <div className="mt-2">
          <Avis ton="erreur">{erreur}</Avis>
        </div>
      ) : null}

      <div className="mt-2.5 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={action === 'reactivate' ? 'default' : 'destructive'}
          onClick={() => executer.mutate()}
          disabled={executer.isPending || motif.trim().length < 3}
        >
          {executer.isPending ? 'Enregistrement…' : titre}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onAnnuler}>
          Renoncer
        </Button>
      </div>
    </div>
  )
}

// ── Les procédures support ─────────────────────────────────────────────────

function NouvelleProcedure({ onFini }: { onFini: () => void }) {
  const [type, setType] = useState<SupportProcedureType>('PHONE_CHANGE')
  const [justification, setJustification] = useState('')
  const [franchies, setFranchies] = useState<Set<string>>(new Set())
  const [erreur, setErreur] = useState<string | null>(null)

  const modele = PROCEDURES[type]

  const ouvrir = useMutation({
    mutationFn: () =>
      api.openSupportProcedure({
        type,
        justification: justification.trim(),
        steps: modele.etapes.filter((e) => franchies.has(e)).map((label) => ({ label })),
      }),
    onSuccess: () => {
      setJustification('')
      setFranchies(new Set())
      setErreur(null)
      onFini()
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  const basculer = (etape: string) =>
    setFranchies((s) => {
      const n = new Set(s)
      if (n.has(etape)) n.delete(etape)
      else n.add(etape)
      return n
    })

  return (
    <Carte icone={ClipboardCheck} titre="Ouvrir une procédure" sousTitre="Elle trace votre intervention, elle ne l'exécute pas">
      {/*
        RM-16-01, imposée par l'alignement et affichée en PERMANENCE : M16 guide et journalise, il
        n'agit pas. Un administrateur qui croirait qu'ouvrir une procédure change un numéro
        laisserait la personne sans rien — c'est le seul malentendu que ce bloc peut produire.
      */}
      <Avis ton="info">
        Cette procédure <strong>enregistre votre intervention, elle ne change rien par elle-même</strong>.
        Les modifications se font dans le compte concerné ; ici, on en garde la trace.
      </Avis>

      <div>
        <Label htmlFor="type-procedure" className="mb-1.5 block text-[13px]">
          Type de situation
        </Label>
        <NativeSelect
          id="type-procedure"
          value={type}
          onChange={(e) => {
            setType(e.target.value as SupportProcedureType)
            setFranchies(new Set())
          }}
        >
          {(Object.keys(PROCEDURES) as SupportProcedureType[]).map((t) => (
            <option key={t} value={t}>
              {PROCEDURES[t].titre}
            </option>
          ))}
        </NativeSelect>
        <p className="mt-1 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">{modele.aide}</p>
      </div>

      <div>
        <p className="mb-1.5 text-[13px] font-medium text-foreground">Étapes franchies</p>
        <ul className="flex flex-col gap-1.5">
          {modele.etapes.map((etape) => (
            <li key={etape}>
              <label className="flex cursor-pointer items-start gap-2 text-[12px] leading-[1.5] text-[var(--texte-secondaire)]">
                <input
                  type="checkbox"
                  checked={franchies.has(etape)}
                  onChange={() => basculer(etape)}
                  className="mt-0.5 size-3.5 shrink-0 accent-[var(--ap-500)]"
                />
                {etape}
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[11px] text-[var(--texte-tertiaire)]">
          Chaque étape cochée est horodatée et signée à votre nom par le serveur.
        </p>
      </div>

      <div>
        <Label htmlFor="justification-procedure" className="mb-1.5 block text-[13px]">
          Justification
        </Label>
        <Textarea
          id="justification-procedure"
          rows={3}
          maxLength={2000}
          value={justification}
          placeholder="Qui a demandé quoi, et ce qui vous a permis de vérifier"
          className="resize-none"
          onChange={(e) => setJustification(e.target.value)}
        />
      </div>

      {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}

      <div>
        <Button type="button" onClick={() => ouvrir.mutate()} disabled={ouvrir.isPending || justification.trim().length < 3}>
          <Plus size={14} strokeWidth={1.8} aria-hidden="true" />
          {ouvrir.isPending ? 'Ouverture…' : 'Ouvrir la procédure'}
        </Button>
      </div>
    </Carte>
  )
}

// ── Écran ──────────────────────────────────────────────────────────────────

export function ComptesPage() {
  const [terme, setTerme] = useState('')
  const [recherche, setRecherche] = useState('')
  const [cible, setCible] = useState<{ compte: AdminAccount; action: 'suspend' | 'reactivate' | 'ban' } | null>(null)
  const [ongletProc, setOngletProc] = useState<SupportProcedure['status']>('OPEN')
  const qc = useQueryClient()

  const comptes = useQuery({
    queryKey: ['admin-accounts', recherche],
    queryFn: () => api.searchAccounts(recherche),
    // Le serveur refuse une recherche vide (RM-16-02) : on ne l'appelle pas pour rien.
    enabled: recherche.trim().length > 0,
    retry: false,
  })

  const procedures = useQuery({
    queryKey: ['support-procedures', ongletProc],
    queryFn: () => api.supportProcedures({ status: ongletProc }),
    retry: false,
  })

  const rafraichir = () => {
    setCible(null)
    void qc.invalidateQueries({ queryKey: ['admin-accounts'] })
  }

  const resultats = comptes.data ?? []

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
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">Comptes</h1>
          <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">
            Recherchez le compte concerné · suspension, réactivation, bannissement
          </p>
        </span>
      </div>

      <Carte icone={Search} titre="Chercher un compte" sousTitre="Par nom ou par numéro de téléphone">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setRecherche(terme)
          }}
        >
          <div className="min-w-0 flex-1 basis-64">
            <Label htmlFor="recherche-compte" className="mb-1.5 block text-[13px]">
              Nom ou téléphone
            </Label>
            <Input
              id="recherche-compte"
              value={terme}
              onChange={(e) => setTerme(e.target.value)}
              placeholder="Makaya, ou +242 06…"
            />
          </div>
          <Button type="submit" disabled={terme.trim().length === 0}>
            Chercher
          </Button>
        </form>

        {/*
          La maquette montre 1 284 comptes dans un tableau paginé, et quatre tuiles qui les comptent.
          Aucune route ne les liste : `GET /admin/accounts` EXIGE un terme et refuse sans lui. Ce
          n'est pas un manque, c'est la règle — RM-16-02, données minimales. Le dire évite qu'on
          cherche un écran qui n'existera jamais.
        */}
        <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
          Les comptes ne se parcourent pas : on en cherche un, parce qu'on a une raison de le
          chercher. C'est une règle de la plateforme, pas une limite de cet écran.
        </p>
      </Carte>

      {recherche.trim().length > 0 ? (
        <div className="mt-4">
          {comptes.isPending ? (
            <p className="flex items-center gap-2 py-6 text-[13px] text-[var(--texte-tertiaire)]">
              <Spinner className="size-4" /> Recherche…
            </p>
          ) : comptes.isError ? (
            <Avis ton="erreur">{messageDe(comptes.error)}</Avis>
          ) : resultats.length === 0 ? (
            <Carte icone={Search} titre="Aucun compte trouvé" sousTitre={`Rien ne correspond à « ${recherche} »`}>
              <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
                La recherche porte sur le nom et le numéro de téléphone. Un compte sans profil rempli
                ne se trouve que par son numéro.
              </p>
            </Carte>
          ) : (
            <div className="overflow-x-auto rounded-[10px] border border-border">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-[color-mix(in_srgb,var(--fond-surface-2)_55%,transparent)]">
                    {['Titulaire', 'Type', 'Statut', ''].map((t, i) => (
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
                  {resultats.map((c) => {
                    const etat = ETATS_COMPTE[c.status] ?? { libelle: c.status, ton: 'neutre' as TonPilule }
                    const definitif = c.status === 'BANNED' || c.status === 'CLOSED'
                    return (
                      <tr key={c.accountId} className="border-b border-border align-top last:border-b-0">
                        <td className="px-3 py-3">
                          <span className="block text-[13px] font-medium text-foreground">{c.displayName}</span>
                          {/* Le téléphone est ce qui identifie sans ambiguïté — pas un « USR-2026-… » inventé. */}
                          <span className="block font-mono text-[11px] text-[var(--texte-tertiaire)]">{c.phone}</span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-[13px] text-[var(--texte-secondaire)]">
                          {TYPES_COMPTE[c.type] ?? c.type}
                        </td>
                        <td className="px-3 py-3">
                          <Pilule ton={etat.ton}>{etat.libelle}</Pilule>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-right">
                          {definitif ? (
                            <span className="text-[12px] text-[var(--texte-tertiaire)]">Définitif</span>
                          ) : (
                            <span className="flex flex-wrap justify-end gap-1.5">
                              {c.status === 'SUSPENDED' ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCible({ compte: c, action: 'reactivate' })}
                                >
                                  <UserCheck size={13} strokeWidth={1.8} aria-hidden="true" />
                                  Réactiver
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCible({ compte: c, action: 'suspend' })}
                                >
                                  <ShieldOff size={13} strokeWidth={1.8} aria-hidden="true" />
                                  Suspendre
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setCible({ compte: c, action: 'ban' })}
                              >
                                <Ban size={13} strokeWidth={1.8} aria-hidden="true" />
                                Bannir
                              </Button>
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {cible ? (
            <ActionCompte
              compte={cible.compte}
              action={cible.action}
              onFini={rafraichir}
              onAnnuler={() => setCible(null)}
            />
          ) : null}
        </div>
      ) : null}

      {/*
        La phrase de bas de page de la maquette. Elle est VRAIE, et c'est la seule de tout l'écran
        qui explique ce qu'une sanction laisse intact — un point que ni le cahier ni le code ne
        disent ailleurs à un administrateur.
      */}
      <div className="mt-4">
        <Carte icone={AlertTriangle} titre="Ce qu'une sanction fait, et ne fait pas" ton="danger">
          <p className="text-[12px] leading-[1.6] text-[var(--texte-secondaire)]">
            Une suspension est réversible, un bannissement ne l'est pas. Dans les deux cas, les
            consultations en cours se terminent normalement et les comptes-rendus signés sont
            conservés : la loi impose leur archivage, quel que soit le sort du compte. Chaque décision
            exige un motif, inscrit au journal d'audit et notifié au titulaire.
          </p>
        </Carte>
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        <section aria-label="Procédures support" className="flex min-w-0 flex-1 flex-col gap-4">
          <Carte
            icone={ClipboardCheck}
            titre="Procédures support"
            sousTitre="Les interventions faites pour quelqu'un, tracées"
            action={
              <Segments
                label="Filtrer les procédures"
                valeur={ongletProc}
                onChange={setOngletProc}
                options={[
                  { cle: 'OPEN' as SupportProcedure['status'], label: 'Ouvertes' },
                  { cle: 'COMPLETED' as SupportProcedure['status'], label: 'Closes' },
                  { cle: 'CANCELLED' as SupportProcedure['status'], label: 'Annulées' },
                ]}
              />
            }
          >
            {procedures.isPending ? (
              <p className="flex items-center gap-2 py-4 text-[12px] text-[var(--texte-tertiaire)]">
                <Spinner className="size-3.5" /> Lecture…
              </p>
            ) : procedures.isError ? (
              <Avis ton="erreur">{messageDe(procedures.error)}</Avis>
            ) : (procedures.data ?? []).length === 0 ? (
              <p className="py-4 text-center text-[12px] text-[var(--texte-tertiaire)]">
                {ongletProc === 'OPEN'
                  ? 'Aucune procédure ouverte. Celles que vous ouvrez apparaissent ici jusqu’à leur clôture.'
                  : 'Aucune procédure dans cet état.'}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {(procedures.data ?? []).map((p) => {
                  const modele = PROCEDURES[p.type]
                  const etat = ETATS_PROCEDURE[p.status]
                  return (
                    <li key={p.id} className="rounded-lg border border-border bg-card p-3">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 flex-1 text-[13px] font-medium text-foreground">
                          {modele?.titre ?? p.type}
                        </span>
                        <Pilule ton={etat.ton}>{etat.libelle}</Pilule>
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--texte-tertiaire)]">Ouverte le {dateFr(p.createdAt)}</p>
                      <p className="mt-1.5 text-[12px] leading-[1.55] whitespace-pre-wrap text-[var(--texte-secondaire)]">
                        {p.justification}
                      </p>
                      {p.steps.length > 0 ? (
                        <ul className="mt-2 flex flex-col gap-1">
                          {p.steps.map((s, i) => (
                            <li key={`${s.label}-${i}`} className="flex gap-2 text-[11px] text-[var(--texte-tertiaire)]">
                              <span aria-hidden="true" className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--succes-texte)]" />
                              <span>
                                {s.label}
                                <span className="block font-mono text-[10px]">{dateFr(s.at)}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </Carte>
        </section>

        <aside className="w-full shrink-0 lg:w-96">
          <NouvelleProcedure onFini={() => void qc.invalidateQueries({ queryKey: ['support-procedures'] })} />
        </aside>
      </div>
    </div>
  )
}
