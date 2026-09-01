/**
 * E3 — Paramètres métier. D'après `docs/maquettes/E3 - Parametres metier.dc.html` et M16.
 *
 * L'écran où un seuil de la plateforme se change sans migration de base. Réservé au super-admin.
 *
 * ── Ce que le serveur a dû apprendre à dire (S5) ───────────────────────────────────────────────
 *
 * Changer le taux de commission **ré-édite tous les contrats signés** (D-022). La version ré-éditée
 * est **non signée** : chacun de ces soignants **cesse immédiatement de pouvoir exercer** — il
 * disparaît de l'annuaire et ne reçoit plus aucune demande — jusqu'à sa re-signature dans C1.
 *
 * L'écran ne pouvait pas connaître ce nombre : `updateParameter` le renvoie APRÈS coup. Le
 * super-administrateur validait donc à l'aveugle. `GET /parameters/:key/impact` le sert avant.
 *
 * ── Les écarts à la maquette ──────────────────────────────────────────────────────────────────
 *
 * 1. **La case « je comprends les conséquences » est remplacée par les conséquences.** C'est tout
 *    l'objet de S5. Une case morale ne dit rien : elle demande d'assumer sans informer. À la place,
 *    le nombre réel de contrats et ce qui arrive à ceux qui les ont signés.
 * 2. **« Un préavis de 30 jours leur est légalement dû » retiré** (famille 2, point 5). Le serveur
 *    **REFUSE** une date d'effet future : *« différé non géré au MVP… le différé arrive en V1 »*,
 *    et le code dit pourquoi — *« pour ne pas mentir sur le contrat »*. Un écran qui promet trente
 *    jours proposerait un geste que le serveur rejette par une erreur.
 * 3. **Les six familles et les noms de paramètres de la maquette sont inventés.**
 *    `COMMISSION_SOIGNANT_PCT`, `JOUR_VERSEMENT_MENSUEL`, `SEUIL_VERSEMENT_MIN_XAF` n'existent pas :
 *    les paramètres s'appellent PM-01 à PM-40 et portent **leur propre description** en base. On
 *    affiche celle-là, plutôt qu'un intitulé réécrit qui divergerait au premier ajout.
 * 4. **« Jour de versement mensuel » et « Seuil minimal de versement » n'existent pas non plus** —
 *    le versement mensuel n'existe pas (famille 1, point 2) et aucun minimum de retrait n'est fixé
 *    (point 3). Deux paramètres pour deux mécanismes absents.
 * 5. **« 40 paramètres en 6 familles » n'est pas écrit** : l'écran compte ce que le serveur renvoie.
 *
 * ⚠️ **Cet écran et C1 forment une seule fonctionnalité** : c'est ici que l'avenant se déclenche, et
 * là-bas qu'il se re-signe. Les tester séparément ne prouve rien.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, History, Save, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Avis, Carte, Pilule } from '@/components/ulamu/parts'
import { api, ApiError, type PlatformParameter } from '@/lib/api'

const messageDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez dans un moment.')

const dateHeureFr = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// ── Le formulaire de changement ────────────────────────────────────────────

/**
 * Changer un paramètre.
 *
 * Trois choses avant le bouton : la valeur actuelle, ce que le changement casse, et le motif — qui
 * part au journal d'audit avec le nom de l'administrateur, l'ancienne et la nouvelle valeur.
 */
function Changer({ parametre, onFini }: { parametre: PlatformParameter; onFini: () => void }) {
  const [valeur, setValeur] = useState(parametre.value)
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [confirme, setConfirme] = useState(false)

  /** S5 : ce que ce changement coûterait, lu AVANT de le faire. */
  const impact = useQuery({
    queryKey: ['parameter-impact', parametre.key],
    queryFn: () => api.parameterImpact(parametre.key),
    retry: false,
  })

  const enregistrer = useMutation({
    mutationFn: () =>
      api.updateParameter(parametre.key, {
        value: valeur.trim(),
        // Le serveur REFUSE une date future : « différé non géré au MVP ». L'écran envoie donc
        // l'instant présent, et le dit — plutôt que d'offrir un sélecteur qui produirait une erreur.
        effectiveAt: new Date().toISOString(),
        reason: motif.trim(),
      }),
    onSuccess: onFini,
    onError: (e) => setErreur(messageDe(e)),
  })

  const change = valeur.trim() !== parametre.value
  const casse = impact.data?.isRateParameter === true && (impact.data?.signedAgreements ?? 0) > 0
  const pret = change && motif.trim().length >= 3 && (!casse || confirme)

  return (
    <div className="mt-2 rounded-lg border border-border bg-secondary p-3">
      <p className="text-[13px] font-semibold text-foreground">Modifier {parametre.key}</p>
      <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--texte-secondaire)]">{parametre.description}</p>

      <div className="mt-2.5 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-40">
          <Label htmlFor="valeur-parametre" className="mb-1.5 block text-[13px]">
            Nouvelle valeur
          </Label>
          <Input
            id="valeur-parametre"
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            className="bg-card font-mono"
          />
        </div>
        <p className="text-[11px] text-[var(--texte-tertiaire)]">
          Actuellement : <span className="font-mono text-foreground">{parametre.value}</span>
        </p>
      </div>

      {/*
        S5 — la case morale de la maquette (« je comprends les conséquences ») est remplacée par les
        conséquences elles-mêmes. Le nombre vient du serveur, et il compte exactement ce que la
        ré-édition sélectionnera.
      */}
      {impact.isPending ? (
        <p className="mt-2 flex items-center gap-2 text-[11px] text-[var(--texte-tertiaire)]">
          <Spinner className="size-3" /> Vérification de l'impact…
        </p>
      ) : casse ? (
        <div className="mt-2.5">
          <Avis ton="erreur">
            Ce taux figure dans <strong>{impact.data?.signedAgreements} contrat
            {(impact.data?.signedAgreements ?? 0) > 1 ? 's' : ''} signé
            {(impact.data?.signedAgreements ?? 0) > 1 ? 's' : ''}</strong>. Le changement s'applique
            immédiatement : ces contrats seront ré-édités et notifiés dans la foulée, et chacun de ces
            soignants <strong>ne pourra plus exercer</strong> — ni apparaître dans l'annuaire, ni
            recevoir de demande — tant qu'il n'aura pas re-signé.
          </Avis>
          <label className="mt-2 flex cursor-pointer items-start gap-2 text-[12px] leading-[1.5] text-[var(--texte-secondaire)]">
            <input
              type="checkbox"
              checked={confirme}
              onChange={(e) => setConfirme(e.target.checked)}
              className="mt-0.5 size-3.5 shrink-0 accent-[var(--erreur-texte)]"
            />
            {/*
              La case reste — mais elle confirme un FAIT chiffré, pas une intention morale. La
              différence tient au texte qui la précède, pas à la case elle-même.
            */}
            Je confirme suspendre l'exercice de {impact.data?.signedAgreements} soignant
            {(impact.data?.signedAgreements ?? 0) > 1 ? 's' : ''} jusqu'à leur re-signature.
          </label>
        </div>
      ) : impact.data?.isRateParameter ? (
        <p className="mt-2 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
          Ce taux figure dans les contrats, mais aucun n'est signé pour l'instant : le changement ne
          suspend l'exercice de personne.
        </p>
      ) : (
        <p className="mt-2 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
          Ce paramètre n'apparaît pas dans les contrats : le changer ne ré-édite rien et ne suspend
          personne.
        </p>
      )}

      <div className="mt-2.5">
        <Label htmlFor="motif-parametre" className="mb-1.5 block text-[13px]">
          Motif
        </Label>
        <Textarea
          id="motif-parametre"
          rows={2}
          maxLength={2000}
          value={motif}
          placeholder="Pourquoi cette valeur change, et sur quelle décision"
          className="resize-none bg-card"
          onChange={(e) => setMotif(e.target.value)}
        />
        <p className="mt-1 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
          Il part au journal d'audit avec votre nom, l'ancienne et la nouvelle valeur (RM-16-03).
        </p>
      </div>

      {/*
        Famille 2, point 5. La maquette promet « un préavis de 30 jours légalement dû ». Le serveur
        REFUSE une date d'effet future — « pour ne pas mentir sur le contrat ». Offrir un sélecteur
        de date produirait une erreur à chaque usage.
      */}
      <p className="mt-2 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">
        Le changement prend effet <strong className="text-foreground">immédiatement</strong> : les
        effets différés ne sont pas gérés, et le serveur refuse une date future.
      </p>

      {erreur ? (
        <div className="mt-2">
          <Avis ton="erreur">{erreur}</Avis>
        </div>
      ) : null}

      <div className="mt-2.5 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={casse ? 'destructive' : 'default'}
          onClick={() => enregistrer.mutate()}
          disabled={enregistrer.isPending || !pret}
        >
          <Save size={13} strokeWidth={1.8} aria-hidden="true" />
          {enregistrer.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onFini}>
          Renoncer
        </Button>
      </div>

      {!change && motif.trim().length > 0 ? (
        <p className="mt-1.5 text-[11px] text-[var(--alerte-texte)]">La valeur est inchangée.</p>
      ) : null}
    </div>
  )
}

// ── L'historique d'un paramètre ────────────────────────────────────────────

function Historique({ cle }: { cle: string }) {
  const histoire = useQuery({
    queryKey: ['parameter-history', cle],
    queryFn: () => api.parameterHistory(cle),
    retry: false,
  })

  if (histoire.isPending) {
    return (
      <p className="flex items-center gap-2 py-2 text-[11px] text-[var(--texte-tertiaire)]">
        <Spinner className="size-3" /> Lecture de l'historique…
      </p>
    )
  }
  if (histoire.isError) return <Avis ton="erreur">{messageDe(histoire.error)}</Avis>
  if ((histoire.data ?? []).length === 0) {
    return <p className="py-2 text-[11px] text-[var(--texte-tertiaire)]">Jamais modifié depuis l'installation.</p>
  }

  return (
    <ol className="flex flex-col gap-2">
      {(histoire.data ?? []).map((c) => (
        <li key={c.id} className="border-l-2 border-border pl-2.5">
          <p className="text-[12px] text-foreground">
            <span className="font-mono text-[var(--texte-tertiaire)]">{c.oldValue}</span> →{' '}
            <span className="font-mono font-semibold">{c.newValue}</span>
          </p>
          <p className="text-[11px] text-[var(--texte-tertiaire)]">{dateHeureFr(c.createdAt)}</p>
          <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--texte-secondaire)]">{c.reason}</p>
        </li>
      ))}
    </ol>
  )
}

// ── Écran ──────────────────────────────────────────────────────────────────

export function ParametresMetierPage() {
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [modifie, setModifie] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const qc = useQueryClient()

  const parametres = useQuery({ queryKey: ['parameters'], queryFn: () => api.parameters(), retry: false })

  const apresChangement = (cle: string) => {
    setModifie(null)
    setConfirmation(cle)
    void qc.invalidateQueries({ queryKey: ['parameters'] })
    void qc.invalidateQueries({ queryKey: ['parameter-history', cle] })
    void qc.invalidateQueries({ queryKey: ['parameter-impact', cle] })
  }

  const liste = parametres.data ?? []

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <SlidersHorizontal size={18} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">
            Paramètres métier
          </h1>
          {/* Compté sur ce que le serveur renvoie — la maquette annonce « 40 en 6 familles ». */}
          <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">
            {/*
              Le sous-titre ne compte QUE si le serveur a répondu. Tant qu'il n'a pas répondu — ou
              qu'il a échoué — il n'y a pas « 0 » : il n'y a pas de nombre. Écrire 0 en cas de panne
              disait « rien à traiter » à un administrateur dont la file était peut-être pleine.
              Constaté le 01/09/2026 pendant la relecture visuelle, en servant des 500 à l'écran.
            */}
            {parametres.isSuccess ? (
              <>
                {liste.length} paramètre{liste.length > 1 ? 's' : ''} ·{' '}
              </>
            ) : null}
            toute modification part au journal d'audit
          </p>
        </span>
      </div>

      {confirmation ? (
        <div className="mb-4">
          <Avis ton="succes">{confirmation} a été modifié. Le changement est déjà en vigueur.</Avis>
        </div>
      ) : null}

      {parametres.isPending ? (
        <p className="flex items-center gap-2 py-8 text-[13px] text-[var(--texte-tertiaire)]">
          <Spinner className="size-4" /> Lecture des paramètres…
        </p>
      ) : parametres.isError ? (
        <div className="mx-auto max-w-lg py-8">
          <Carte icone={AlertTriangle} titre="Les paramètres n'ont pas pu être lus" sousTitre="Rien n'a été modifié">
            <div>
              <Button type="button" onClick={() => parametres.refetch()}>
                Réessayer
              </Button>
            </div>
          </Carte>
        </div>
      ) : (
        <>
          {/*
            La phrase de bas de page de la maquette, qui est VRAIE — et remontée en tête, parce
            qu'elle conditionne tout ce qui suit.
          */}
          <div className="mb-4">
            <Carte icone={AlertTriangle} titre="Avant de changer quoi que ce soit" ton="danger">
              <p className="text-[12px] leading-[1.6] text-[var(--texte-secondaire)]">
                Toute modification exige un motif et part au journal d'audit avec votre nom, l'ancienne
                et la nouvelle valeur. Le taux de commission engage en plus les contrats déjà signés :
                le changer les ré-édite, et suspend l'exercice de leurs titulaires jusqu'à
                re-signature. Le nombre exact vous est donné avant de valider.
              </p>
            </Carte>
          </div>

          <div className="overflow-x-auto rounded-[10px] border border-border">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-[color-mix(in_srgb,var(--fond-surface-2)_55%,transparent)]">
                  {['Paramètre', 'Effet', 'Valeur', 'Dernière modification', ''].map((t, i) => (
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
                {liste.map((p) => (
                  <tr key={p.key} className="border-b border-border align-top last:border-b-0">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-mono text-[13px] font-medium text-foreground">{p.key}</span>
                    </td>
                    {/*
                      La description vient de la BASE. La maquette réécrit des intitulés
                      (`COMMISSION_SOIGNANT_PCT`) qui n'existent pas : les recopier ici créerait une
                      seconde vérité, à diverger au premier paramètre ajouté.
                    */}
                    <td className="px-3 py-3 text-[12px] leading-[1.5] text-[var(--texte-secondaire)]">{p.description}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-mono text-[13px] font-semibold text-foreground">{p.value}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[12px] text-[var(--texte-tertiaire)]">
                      {dateHeureFr(p.updatedAt)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right">
                      <span className="flex flex-wrap justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setOuvert((v) => (v === p.key ? null : p.key))}
                        >
                          <History size={13} strokeWidth={1.8} aria-hidden="true" />
                          Historique
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setModifie((v) => (v === p.key ? null : p.key))
                            setConfirmation(null)
                          }}
                        >
                          Modifier
                        </Button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {modifie ? (
            <Changer
              key={modifie}
              parametre={liste.find((p) => p.key === modifie) as PlatformParameter}
              onFini={() => apresChangement(modifie)}
            />
          ) : null}

          {ouvert ? (
            <div className="mt-4">
              <Carte icone={History} titre={`Historique de ${ouvert}`} sousTitre="Insertion seule — rien ne s'efface">
                <Historique cle={ouvert} />
              </Carte>
            </div>
          ) : null}

          <p className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--texte-tertiaire)]">
            <Pilule ton="info">Super-administrateur</Pilule>
            Ces réglages sont réservés à votre rôle : le serveur refuse toute autre signature.
          </p>
        </>
      )}
    </div>
  )
}
