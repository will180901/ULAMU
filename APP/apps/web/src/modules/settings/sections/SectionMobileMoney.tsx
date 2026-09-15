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
import { BadgeCheck, Check, TriangleAlert, Wallet } from 'lucide-react'

import airtelLogo from '@/assets/operateur-airtel.svg'
import mtnLogo from '@/assets/operateur-mtn.svg'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avis, Carte } from '@/components/ulamu/parts'
import { api, type MomoNumber, type MomoOperator } from '@/lib/api'
import { chiffresSeuls, NUMERO_LONGUEUR, numeroLocalValide, refusDuNumero } from '@/lib/numero'
import { messageErreur } from '@/lib/message-erreur'

/** Les deux opérateurs du pays, dans l'ordre où on les cite. Le libellé est celui des écrans de paiement. */
const OPERATEURS: { code: MomoOperator; nom: string; prefixe: string; logo: string; fond: string }[] = [
  /*
    ⚠️ **Le cadre jaune de MTN n'est pas une décoration.** Le logo publié est une forme NOIRE : c'est
    ainsi qu'il se pose sur le jaune de la marque, et le poser sur blanc donnerait un ovale que
    personne ne reconnaîtrait. Airtel porte déjà son rouge et n'a besoin d'aucun fond.

    *Deux marques, deux façons d'exister — les forcer dans le même gabarit les abîmerait toutes les
    deux.* Provenance et conditions d'usage : `apps/mobile/assets/images/OPERATEURS.md`.
  */
  { code: 'MTN_MOMO', nom: 'MTN MoMo', prefixe: '06', logo: mtnLogo, fond: '#FFCB05' },
  { code: 'AIRTEL_MONEY', nom: 'Airtel Money', prefixe: '05', logo: airtelLogo, fond: '#FFFFFF' },
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
  operateur: { code: MomoOperator; nom: string; prefixe: string; logo: string; fond: string }
  actuel: MomoNumber | null
  enCours: boolean
  onChange: () => void
}) {
  const [edition, setEdition] = useState(false)
  const [saisie, setSaisie] = useState('')
  /* La preuve se fait en deux temps : demander le code, puis le saisir. */
  const [codeDemande, setCodeDemande] = useState(false)
  const [code, setCode] = useState('')

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

  const demanderCode = useMutation({
    mutationFn: () => api.requestMomoVerification(operateur.code),
    onSuccess: () => setCodeDemande(true),
  })

  const confirmerCode = useMutation({
    mutationFn: (c: string) => api.confirmMomoVerification(operateur.code, c),
    onSuccess: () => {
      setCodeDemande(false)
      setCode('')
      onChange()
    },
  })

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border"
            style={{ background: operateur.fond }}
          >
            <img src={operateur.logo} alt="" className="max-h-4 max-w-[22px]" />
          </span>
          <span className="min-w-0">
            <span className="block ul-intitule">{operateur.nom}</span>
            <span className="block ul-aide">
              {enCours
                ? 'Lecture…'
                : actuel
                  ? actuel.msisdn
                  : `Aucun numéro — commence habituellement par ${operateur.prefixe}`}
            </span>
            {/*
              ⚠️ **L'état de la preuve se voit sur la ligne, pas dans un écran à part.** Un numéro
              non vérifié paie très bien ; il ne peut simplement pas RECEVOIR. *Dire à quoi un
              numéro sert déjà, et à quoi il ne sert pas encore, évite de le croire cassé.*
            */}
            {actuel ? (
              actuel.verified ? (
                <span className="mt-1 flex items-center gap-1 text-[11.5px] text-[var(--succes-texte)]">
                  <BadgeCheck size={12} strokeWidth={2} aria-hidden="true" />
                  Vérifié — utilisable pour recevoir vos gains
                </span>
              ) : (
                <span className="mt-1 block text-[11.5px] leading-[1.45] text-[var(--texte-tertiaire)]">
                  Non vérifié — ce numéro peut payer, mais pas recevoir un retrait.
                </span>
              )
            ) : null}
          </span>
        </span>

        {!edition ? (
          <span className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEdition(true)}>
              {actuel ? 'Modifier' : 'Enregistrer'}
            </Button>
            {actuel && !actuel.verified ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => demanderCode.mutate()}
                disabled={demanderCode.isPending}
              >
                Vérifier
              </Button>
            ) : null}
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
            if (numeroLocalValide(saisie)) enregistrer.mutate(saisie)
          }}
        >
          <span className="min-w-0 flex-1 basis-48">
            {/*
              ⚠️ **Chiffres seulement, neuf au plus** (chantier 116, demande du porteur). Le champ
              acceptait n'importe quoi, et le refus n'arrivait qu'après un aller-retour au serveur.
              *Une règle connue des deux côtés se dit à la frappe ; une règle connue d'un seul côté
              se dit en retard.*
            */}
            <Input
              autoFocus
              value={saisie}
              onChange={(e) => setSaisie(chiffresSeuls(e.target.value).slice(0, NUMERO_LONGUEUR))}
              placeholder={`${operateur.prefixe}6124590`}
              aria-label={`Numéro ${operateur.nom}`}
              inputMode="numeric"
              maxLength={NUMERO_LONGUEUR}
            />
          </span>
          <Button type="submit" size="sm" disabled={!numeroLocalValide(saisie) || enregistrer.isPending}>
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
          {/*
            Le format se dit AVANT la faute, et ce qui manque se dit PENDANT : deux messages
            différents parce qu'ils ne répondent pas à la même question. *« Numéro invalide »
            n'apprend rien à qui ne sait pas s'il en manque un chiffre ou si le premier est faux.*
          */}
          <span className="basis-full ul-aide">
            {refusDuNumero(saisie) ?? '9 chiffres, commençant par 0 — ex. 066124590.'}
          </span>
        </form>
      ) : null}

      {/*
        Le code part AU NUMÉRO LUI-MÊME, jamais à celui du compte : c'est ce numéro-là qu'on cherche
        à prouver. *Envoyer la preuve à l'endroit qu'on veut vérifier est toute l'idée.*
      */}
      {codeDemande ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (code.length === 6) confirmerCode.mutate(code)
          }}
        >
          <span className="min-w-0 flex-1 basis-40">
            <Input
              autoFocus
              value={code}
              onChange={(e) => setCode(chiffresSeuls(e.target.value).slice(0, 6))}
              placeholder="123456"
              aria-label={`Code reçu sur le numéro ${operateur.nom}`}
              inputMode="numeric"
              maxLength={6}
            />
          </span>
          <Button type="submit" size="sm" disabled={code.length !== 6 || confirmerCode.isPending}>
            Confirmer
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setCodeDemande(false)}>
            Annuler
          </Button>
          <span className="basis-full ul-aide">
            Un code à 6 chiffres vient d'être envoyé par SMS sur {actuel?.msisdn}.
          </span>
        </form>
      ) : null}

      {demanderCode.isError ? <Avis ton="erreur">{messageErreur(demanderCode.error)}</Avis> : null}
      {confirmerCode.isError ? <Avis ton="erreur">{messageErreur(confirmerCode.error)}</Avis> : null}
      {enregistrer.isError ? <Avis ton="erreur">{messageErreur(enregistrer.error)}</Avis> : null}
      {retirer.isError ? <Avis ton="erreur">{messageErreur(retirer.error)}</Avis> : null}
    </div>
  )
}
