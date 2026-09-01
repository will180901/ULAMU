/**
 * E5 — Pilotage. D'après `docs/maquettes/E5 - Pilotage.dc.html`, M16 (EF-16-05) et M04.
 *
 * Les indicateurs du pilote, l'intégrité du journal d'audit, et la couverture du territoire.
 *
 * ── Ce que le serveur a dû apprendre à dire (S6) ───────────────────────────────────────────────
 *
 * La couverture par arrondissement. La maquette écrit six lignes **en dur** — « Bacongo 78
 * soignants · 21 officines » — et conclut : « moins d'un soignant vérifié pour 8 000 habitants ».
 *
 * Deux choses distinctes s'y mélangeaient. Les **effectifs sont calculables** : chaque fiche
 * professionnelle et chaque structure portent leur arrondissement. La **population ne l'est pas** —
 * aucune donnée de recensement n'existe, et ULAMU n'a aucune raison d'en détenir. Le tableau devient
 * donc vrai ; la phrase sur les habitants disparaît avec le chiffre qu'elle supposait.
 *
 * Ce bloc a été gardé — et c'est le seul coût serveur de toute la famille 3 — parce que c'est **la
 * seule dimension territoriale du produit**, sur un sujet d'accès aux soins.
 *
 * ── Les écarts à la maquette ──────────────────────────────────────────────────────────────────
 *
 * 1. **Les huit indicateurs deviennent les sept du pilote.** `getPilotKpis` sert EXACTEMENT les
 *    sept critères de succès du plan de sortie, avec leur cible. Ceux de la maquette — comptes
 *    actifs, officines actives, volume encaissé, taux de réclamation — ne sont mesurés nulle part.
 * 2. **Aucune tendance « vs juillet ».** Aucune série historique n'existe pour ces agrégats : ils
 *    sont calculés à l'instant de la lecture. Même renoncement qu'en B2, pour la même raison.
 * 3. **Le graphique « semaines 27 à 32 » retiré.** Rien ne découpe ces agrégats par semaine.
 * 4. **Le tableau « Respect des délais réglementaires » perd trois colonnes sur quatre**
 *    (famille 3, groupe E). Ni la médiane, ni le hors-délai, ni le taux de tenue ne sont mesurés :
 *    le serveur expose sept indicateurs, aucun ne mesure un délai de traitement. Il reste **deux
 *    lignes vraies** — les dossiers en retard en ce moment, et le taux de remboursement automatique.
 * 5. **« Remboursement sous 15 j » retiré** (famille 1, point 5). Trois défauts en une ligne : le
 *    remboursement automatique est **immédiat** (EF-13-04), la ligne parlait en fait du
 *    remboursement *manuel* dont aucune échéance n'existe au cahier, et médiane comme taux de tenue
 *    ne sont mesurés nulle part. Un chiffre **inventé**, pas erroné.
 * 6. **« Arrêté au 13 août, 07:00 » retiré** : rien n'est arrêté à une heure — tout est calculé à
 *    la lecture. L'écran affiche l'heure de SA lecture.
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, CheckCircle2, Inbox, MapPin, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Avis, Carte, Pilule } from '@/components/ulamu/parts'
import { api, type PilotKpi } from '@/lib/api'
import { SqueletteTuiles } from '@/components/ulamu/Squelette'

const nombre = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

const valeurDe = (k: PilotKpi) => (k.unit === '%' ? `${k.value} %` : nombre(k.value))
const cibleDe = (k: PilotKpi) => (k.unit === '%' ? `${k.target} %` : nombre(k.target))

// ── Un indicateur du pilote ────────────────────────────────────────────────

function Indicateur({ kpi }: { kpi: PilotKpi }) {
  const atteint = kpi.status === 'OK'
  /* Une proportion bornée à 100 % : un indicateur à 150 % de sa cible ne doit pas déborder la barre. */
  const part = Math.min(100, kpi.target > 0 ? Math.round((kpi.value / kpi.target) * 100) : 0)

  return (
    <div className="min-w-0 flex-1 basis-56 rounded-[10px] border border-border bg-card p-3.5">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">
        {kpi.label}
      </p>
      <p className="mt-1 flex items-baseline gap-2">
        <span
          className={
            'font-[family-name:var(--font-display)] text-[26px] font-bold leading-none ' +
            (atteint ? 'text-[var(--succes-texte)]' : 'text-foreground')
          }
        >
          {valeurDe(kpi)}
        </span>
        <span className="text-[11px] text-[var(--texte-tertiaire)]">sur {cibleDe(kpi)}</span>
      </p>

      <span aria-hidden="true" className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <span
          className={'block h-full rounded-full ' + (atteint ? 'bg-[var(--succes-texte)]' : 'bg-[var(--ap-400)]')}
          style={{ width: `${part}%` }}
        />
      </span>

      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--texte-tertiaire)]">
        {atteint ? (
          <CheckCircle2 size={11} strokeWidth={2} aria-hidden="true" className="text-[var(--succes-texte)]" />
        ) : (
          <AlertTriangle size={11} strokeWidth={2} aria-hidden="true" className="text-[var(--alerte-texte)]" />
        )}
        {atteint ? 'Cible atteinte' : `${part} % de la cible`}
      </p>
    </div>
  )
}

// ── Écran ──────────────────────────────────────────────────────────────────

export function PilotagePage() {
  const kpis = useQuery({ queryKey: ['pilot-kpis'], queryFn: () => api.pilotKpis(), retry: false })
  const couverture = useQuery({ queryKey: ['coverage'], queryFn: () => api.coverage(), retry: false })
  const integrite = useQuery({ queryKey: ['audit-integrity'], queryFn: () => api.auditIntegrity(), retry: false })

  /**
   * La file de vérification, pour la seule ligne du tableau « délais » qui soit mesurée : combien de
   * dossiers sont en retard **en ce moment**. Le serveur calcule `overdue` par dossier ; le reste du
   * tableau de la maquette — médiane, hors-délai historique, taux de tenue — n'existe nulle part.
   */
  const file = useQuery({ queryKey: ['verification-queue'], queryFn: () => api.verificationQueue(), retry: false })

  const liste = kpis.data ?? []
  const atteints = liste.filter((k) => k.status === 'OK').length
  const enRetard = (file.data?.items ?? []).filter((it) => it.overdue).length
  const tauxRemboursement = liste.find((k) => k.key.includes('REMBOURSEMENT'))

  const maxCouverture = Math.max(1, ...(couverture.data ?? []).map((c) => c.professionals + c.facilities))

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <Activity size={18} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">
            Pilotage
          </h1>
          {/*
            « Arrêté au 13 août, 07:00 » suppose un instantané figé. Rien ne l'est : tout est calculé
            au moment de la lecture, et c'est cette heure-là qui compte.
          */}
          <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">
            {liste.length > 0 ? `${atteints} critère${atteints > 1 ? 's' : ''} sur ${liste.length} atteint${atteints > 1 ? 's' : ''} · ` : ''}
            calculé à l'instant, {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </span>
      </div>

      {kpis.isPending ? (
        <SqueletteTuiles nombre={4} libelle="Calcul des indicateurs…" />
      ) : kpis.isError ? (
        <div className="mx-auto max-w-lg py-8">
          <Carte icone={AlertTriangle} titre="Les indicateurs n'ont pas pu être calculés" sousTitre="Rien n'est perdu">
            <div>
              <Button type="button" onClick={() => kpis.refetch()}>
                Réessayer
              </Button>
            </div>
          </Carte>
        </div>
      ) : (
        <>
          {/*
            Les SEPT critères du pilote, servis avec leur cible. Ceux de la maquette — comptes
            actifs, volume encaissé, taux de réclamation — ne sont mesurés nulle part, et aucune
            série historique n'existe pour les « vs juillet ».
          */}
          <div className="mb-4 flex flex-wrap gap-3">
            {liste.map((k) => (
              <Indicateur key={k.key} kpi={k} />
            ))}
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
            <section aria-label="Couverture du territoire" className="min-w-0 flex-1">
              <Carte icone={MapPin} titre="Couverture par arrondissement" sousTitre="Soignants exerçants et officines actives">
                {couverture.isPending ? (
                  <p className="flex items-center gap-2 py-4 text-[12px] text-[var(--texte-tertiaire)]">
                    <Spinner className="size-3.5" /> Comptage…
                  </p>
                ) : couverture.isError ? (
                  <Avis ton="erreur">La couverture n'a pas pu être calculée.</Avis>
                ) : (couverture.data ?? []).length === 0 ? (
                  <p className="py-4 text-center text-[12px] text-[var(--texte-tertiaire)]">
                    Aucun soignant exerçant ni officine active n'est encore rattaché à un arrondissement.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {(couverture.data ?? []).map((c) => {
                      const total = c.professionals + c.facilities
                      return (
                        <li key={c.district}>
                          <p className="flex flex-wrap items-baseline gap-2">
                            <span className="min-w-0 flex-1 text-[13px] font-medium text-foreground">{c.district}</span>
                            <span className="text-[12px] text-[var(--texte-secondaire)]">
                              {c.professionals} soignant{c.professionals > 1 ? 's' : ''} · {c.facilities} officine
                              {c.facilities > 1 ? 's' : ''}
                            </span>
                          </p>
                          <span aria-hidden="true" className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                            <span
                              className="block h-full rounded-full bg-[var(--ap-400)]"
                              style={{ width: `${Math.round((total / maxCouverture) * 100)}%` }}
                            />
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/*
                  Famille 3, groupe E. La maquette conclut : « moins d'un soignant vérifié pour
                  8 000 habitants ». Aucune donnée de recensement n'existe, et ULAMU n'a aucune
                  raison d'en détenir. La comparaison disparaît ; le classement, lui, dit déjà où la
                  couverture manque.
                */}
                <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                  « Soignant » désigne ici un dossier vérifié dont le contrat est signé : ceux qui
                  peuvent réellement recevoir une demande. Les arrondissements sont classés du mieux
                  au moins couvert — aucune comparaison à la population n'est faite, ULAMU ne détient
                  aucune donnée de recensement.
                </p>
              </Carte>
            </section>

            <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-96">
              <Carte icone={ShieldCheck} titre="Intégrité du journal" sousTitre="Chaînage cryptographique (EF-04-03)">
                {integrite.isPending ? (
                  <p className="flex items-center gap-2 py-2 text-[12px] text-[var(--texte-tertiaire)]">
                    <Spinner className="size-3.5" /> Vérification…
                  </p>
                ) : integrite.isError ? (
                  <Avis ton="erreur">La vérification n'a pas pu être lancée.</Avis>
                ) : integrite.data?.ok ? (
                  <>
                    <Avis ton="succes">
                      Chaîne intacte : les {nombre(integrite.data.checked)} entrées vérifiées se
                      succèdent sans rupture.
                    </Avis>
                    <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                      Chaque entrée porte l'empreinte de la précédente : en retirer une casserait la
                      chaîne de façon visible et irréparable.
                    </p>
                  </>
                ) : (
                  <Avis ton="erreur">
                    Rupture détectée
                    {integrite.data?.brokenAtSeq ? ` à l'entrée ${integrite.data.brokenAtSeq}` : ''}. Le journal a
                    été altéré : prévenez immédiatement le responsable de la plateforme.
                  </Avis>
                )}
                {/*
                  La maquette annonce « Entrées scellées · Ruptures · Actions sans motif ·
                  Suppressions tentées ». Seuls les deux premiers existent : `auditIntegrity` renvoie
                  `ok`, `checked` et le rang de rupture. Les deux autres ne sont comptés nulle part —
                  et « suppressions tentées » supposerait qu'on enregistre des tentatives qui n'ont
                  aucun chemin pour se produire.
                */}
              </Carte>

              <Carte icone={Inbox} titre="Respect des délais" sousTitre="Ce qui est réellement mesuré">
                {/*
                  Famille 3, groupe E. La maquette montre quatre colonnes — limite, médiane, hors
                  délai, taux de tenue — sur trois processus. Aucune de ces colonnes n'est mesurée :
                  le serveur expose sept indicateurs, dont aucun ne mesure un délai de traitement.
                  Restent deux lignes vraies.
                */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border bg-secondary px-2.5 py-2">
                    <span className="min-w-0 flex-1 text-[12px] text-[var(--texte-secondaire)]">
                      Dossiers de vérification en retard
                      <span className="block text-[11px] text-[var(--texte-tertiaire)]">
                        en ce moment, au-delà de {file.data?.targetHours ?? '—'} h
                      </span>
                    </span>
                    <span
                      className={
                        'text-[19px] font-bold tabular-nums ' +
                        (enRetard > 0 ? 'text-[var(--erreur-texte)]' : 'text-foreground')
                      }
                    >
                      {file.isPending ? '…' : enRetard}
                    </span>
                  </div>

                  {tauxRemboursement ? (
                    <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border bg-secondary px-2.5 py-2">
                      <span className="min-w-0 flex-1 text-[12px] text-[var(--texte-secondaire)]">
                        {tauxRemboursement.label}
                        <span className="block text-[11px] text-[var(--texte-tertiaire)]">
                          cible {cibleDe(tauxRemboursement)}
                        </span>
                      </span>
                      <span className="text-[19px] font-bold tabular-nums text-foreground">
                        {valeurDe(tauxRemboursement)}
                      </span>
                    </div>
                  ) : null}
                </div>

                <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                  Les délais médians et les taux de tenue ne sont mesurés par aucun indicateur : les
                  afficher demanderait de les calculer, pas de les lire. Le remboursement automatique,
                  lui, est immédiat côté ULAMU — le délai que voit le patient est celui de son
                  opérateur.
                </p>

                <div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/admin/verification">Voir la file de vérification</Link>
                  </Button>
                </div>
              </Carte>
            </aside>
          </div>

          <p className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--texte-tertiaire)]">
            <Pilule ton="info">Agrégats seuls</Pilule>
            Aucune donnée individuelle ne sort de cet écran : que des compteurs et des taux (RM-16-05).
          </p>
        </>
      )}
    </div>
  )
}
