/**
 * Mes numéros Mobile Money — chantier 114, 14/09/2026.
 *
 * ── ⚠️ Ce que cet écran répare ────────────────────────────────────────────────────────────────
 *
 * Signalé par le porteur : *« normalement on enregistre les numéros selon les opérateurs
 * disponibles dans le système — MTN et Airtel — pour éviter les erreurs dans les transactions. »*
 *
 * C'était pire que décrit. L'ordre de débit partait vers le numéro de **connexion**, quel que soit
 * l'opérateur choisi au moment de payer : un compte enregistré sur un numéro Airtel qui cliquait
 * « MTN MoMo » envoyait la demande vers un portefeuille MTN sur un numéro qui n'en a pas.
 *
 * > **Un numéro de connexion prouve qui on est ; un numéro Mobile Money reçoit de l'argent. Ce
 * > n'est pas le même métier, et c'était le même champ.**
 *
 * ── Ce que l'écran dit, et ce qu'il se garde de dire ──────────────────────────────────────────
 *
 * Il dit **à quoi sert** chaque numéro (« c'est lui qui sera débité si vous choisissez cet
 * opérateur »), et il **prévient** quand le préfixe ne ressemble pas à l'opérateur — sans rien
 * interdire : la portabilité existe, un 05 peut vivre chez MTN. *Un préfixe qui interdit se trompe
 * le jour où l'opérateur ouvre une nouvelle tranche ; un préfixe qui prévient ne se trompe jamais
 * tout à fait.*
 *
 * Il dit aussi ce qui se passe **sans rien enregistrer** : le paiement retombe sur le numéro de
 * connexion, comme avant. *Un repli tu est un piège ; un repli annoncé est un choix.*
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Smartphone, TriangleAlert, Wallet } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avis, Carte } from '@/components/ulamu/parts'
import { api, type MomoNumber, type MomoOperator } from '@/lib/api'
import { messageErreur } from '@/lib/message-erreur'

/** Les deux opérateurs du pays, dans l'ordre où on les cite. Le libellé est celui des écrans de paiement. */
const OPERATEURS: { code: MomoOperator; nom: string; prefixe: string }[] = [
  { code: 'MTN_MOMO', nom: 'MTN MoMo', prefixe: '06' },
  { code: 'AIRTEL_MONEY', nom: 'Airtel Money', prefixe: '05' },
]

export function SectionMobileMoney() {
  const client = useQueryClient()
  const numeros = useQuery({ queryKey: ['momo'], queryFn: () => api.myMomoNumbers(), retry: false })

  return (
    <Carte
      icone={Wallet}
      titre="Mobile Money"
      sousTitre="Les numéros qui paient et qui reçoivent — un par opérateur"
    >
      <div className="flex flex-col gap-5">
        <p className="ul-aide">
          C'est le numéro enregistré ici qui sera débité quand vous choisirez cet opérateur. Sans
          numéro enregistré, la demande part sur le numéro de votre compte — celui de la connexion.
        </p>

        {numeros.isError ? <Avis ton="erreur">{messageErreur(numeros.error)}</Avis> : null}

        {OPERATEURS.map((op) => (
          <LigneOperateur
            key={op.code}
            operateur={op}
            actuel={numeros.data?.find((n) => n.operator === op.code) ?? null}
            enCours={numeros.isPending}
            onChange={() => client.invalidateQueries({ queryKey: ['momo'] })}
          />
        ))}
      </div>
    </Carte>
  )
}

function LigneOperateur({
  operateur,
  actuel,
  enCours,
  onChange,
}: {
  operateur: { code: MomoOperator; nom: string; prefixe: string }
  actuel: MomoNumber | null
  enCours: boolean
  onChange: () => void
}) {
  const [edition, setEdition] = useState(false)
  const [saisie, setSaisie] = useState('')

  const enregistrer = useMutation({
    mutationFn: (msisdn: string) => api.setMomoNumber(operateur.code, msisdn),
    onSuccess: () => {
      setEdition(false)
      setSaisie('')
      onChange()
    },
  })

  const retirer = useMutation({
    mutationFn: () => api.removeMomoNumber(operateur.code),
    onSuccess: onChange,
  })

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <Smartphone size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-[var(--texte-tertiaire)]" />
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-foreground">{operateur.nom}</span>
            <span className="block ul-aide">
              {enCours
                ? 'Lecture…'
                : actuel
                  ? actuel.msisdn
                  : `Aucun numéro — commence habituellement par ${operateur.prefixe}`}
            </span>
          </span>
        </span>

        {!edition ? (
          <span className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEdition(true)}>
              {actuel ? 'Modifier' : 'Enregistrer'}
            </Button>
            {actuel ? (
              <Button variant="ghost" size="sm" onClick={() => retirer.mutate()} disabled={retirer.isPending}>
                Retirer
              </Button>
            ) : null}
          </span>
        ) : null}
      </div>

      {/*
        ⚠️ Le doute s'affiche sur le numéro ENREGISTRÉ, pas seulement pendant la saisie : on peut
        avoir enregistré un numéro douteux il y a un mois et ne s'en apercevoir qu'au refus d'une
        transaction. *Un avertissement qui ne vit que le temps d'un formulaire ne protège que ce
        jour-là.*
      */}
      {actuel && !actuel.looksRight ? (
        <p className="flex items-start gap-1.5 text-[11.5px] leading-[1.45] text-[var(--alerte-texte)]">
          <TriangleAlert size={12} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0" />
          Ce numéro ne commence pas par {operateur.prefixe} — vérifiez qu'il est bien chez{' '}
          {operateur.nom}. (Un numéro peut avoir été porté d'un opérateur à l'autre : dans ce cas,
          tout va bien.)
        </p>
      ) : null}

      {edition ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (saisie.trim()) enregistrer.mutate(saisie.trim())
          }}
        >
          <span className="min-w-0 flex-1 basis-48">
            <Input
              autoFocus
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              placeholder={`${operateur.prefixe} 12 34 56 7`}
              aria-label={`Numéro ${operateur.nom}`}
              inputMode="tel"
            />
          </span>
          <Button type="submit" size="sm" disabled={!saisie.trim() || enregistrer.isPending}>
            <Check size={14} strokeWidth={2} aria-hidden="true" />
            Enregistrer
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setEdition(false)
              setSaisie('')
            }}
          >
            Annuler
          </Button>
        </form>
      ) : null}

      {enregistrer.isError ? <Avis ton="erreur">{messageErreur(enregistrer.error)}</Avis> : null}
      {retirer.isError ? <Avis ton="erreur">{messageErreur(retirer.error)}</Avis> : null}
    </div>
  )
}
