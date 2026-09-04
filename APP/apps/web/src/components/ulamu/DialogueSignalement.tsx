/**
 * Signaler — la porte d'entrée de la modération. Chantier 41, 04/09/2026.
 *
 * ── Ce qui manquait, et ce que ça coûtait ─────────────────────────────────────────────────────
 *
 * `POST /v1/reports` existait depuis le premier jour, et **aucun client ne l'appelait**. Ni le web,
 * ni le mobile. Conséquence : tout M04 était construit — la file de modération, le tri par gravité,
 * la décision motivée, l'avertissement, la transmission — et **l'écran d'administration
 * « Signalements » serait resté vide à jamais**, faute d'une porte d'entrée.
 *
 * Sur une plateforme de santé, ce n'est pas une fonctionnalité manquante : c'est la voie de recours.
 *
 * ── Les trois choix de cet écran ──────────────────────────────────────────────────────────────
 *
 * **1. On dit à l'avance que l'identité du signaleur est protégée.** `redactReportForAdmin`
 * (RM-04-04) retire le `reporterId` avant que l'administration ne voie quoi que ce soit — c'est une
 * garantie du serveur, pas une promesse d'interface. Il faut la dire : sans elle, un médecin qui
 * consulte le même patient toutes les semaines n'ose pas signaler.
 *
 * **2. On dit à l'avance que la réponse reviendra.** Quand l'administration tranche, le serveur
 * notifie l'auteur (`m04.report.resolved`, l'issue sans le détail des sanctions, CU-04-03). Cette
 * notification n'atteignait personne avant le chantier 37 ; elle arrive maintenant dans la cloche.
 * *Le projet a déjà tranché ce point ailleurs : « la réponse revient dans l'application — c'est ce
 * qui distingue un formulaire d'un trou noir ».*
 *
 * **3. Le motif est une LISTE, jamais un champ libre seul.** C'est le code du motif qui décide de
 * l'ordre de traitement dans la file — le harcèlement passe devant le spam (CU-04-04). Un
 * signalement sans code serait un signalement sans priorité, donc traité en dernier.
 *
 * ── Ce que cet écran ne fait pas ──────────────────────────────────────────────────────────────
 *
 * Il n'offre pas de signaler une STRUCTURE. Le serveur l'accepte encore — la valeur décrit des
 * lignes qui peuvent exister en base — mais les structures sont sorties du produit le 02/09
 * (D-051). Offrir ce choix serait offrir une porte qui ne mène nulle part.
 */
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Flag, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avis } from '@/components/ulamu/parts'
import { api, type ReportReasonCode, type ReportTargetType } from '@/lib/api'
import { messageErreur } from '@/lib/message-erreur'

/**
 * Les six motifs du serveur (EF-04-05), dans l'ordre où on les lit — pas dans celui du code.
 *
 * L'ordre d'affichage descend du plus grave au plus anodin, comme la file de modération les trie.
 * « Autre » ferme la liste : il est le seul qui n'apprend rien à lui seul, d'où l'aide qui invite
 * à écrire.
 */
const MOTIFS: Array<{ cle: ReportReasonCode; label: string; aide: string }> = [
  { cle: 'HARASSMENT', label: 'Harcèlement', aide: 'Messages répétés, intimidation, menaces' },
  { cle: 'INAPPROPRIATE_BEHAVIOR', label: 'Comportement inapproprié', aide: 'Propos déplacés, agressivité, contenu choquant' },
  { cle: 'SUSPECTED_FAKE_PROFILE', label: 'Profil suspect', aide: 'Identité douteuse, usurpation possible' },
  { cle: 'MISLEADING_INFORMATION', label: 'Information trompeuse', aide: 'Affirmations fausses ou dangereuses' },
  { cle: 'SPAM', label: 'Spam ou publicité', aide: 'Sollicitation commerciale, contenu répétitif' },
  { cle: 'OTHER', label: 'Autre', aide: 'Précisez ci-dessous — sans texte, ce motif n’aide personne' },
]

/** Le serveur plafonne le texte libre à 1000 caractères ; l'écran le dit avant d'être refusé. */
const TEXTE_MAX = 1000

export function DialogueSignalement({
  ouvert,
  surFermer,
  cible,
  cibleId,
  quoi,
}: {
  ouvert: boolean
  surFermer: () => void
  cible: ReportTargetType
  cibleId: string
  /** Ce qu'on signale, en toutes lettres — « ce message », « ce patient ». */
  quoi: string
}) {
  const [motif, setMotif] = useState<ReportReasonCode | null>(null)
  const [texte, setTexte] = useState('')
  const [envoye, setEnvoye] = useState(false)

  const envoyer = useMutation({
    mutationFn: () =>
      api.createReport({
        targetType: cible,
        targetId: cibleId,
        reasonCode: motif!,
        ...(texte.trim() ? { reasonText: texte.trim() } : {}),
      }),
    onSuccess: () => setEnvoye(true),
  })

  /** Fermer remet tout à zéro : rouvrir ne doit pas ressusciter un brouillon abandonné. */
  const fermer = () => {
    surFermer()
    setMotif(null)
    setTexte('')
    setEnvoye(false)
    envoyer.reset()
  }

  return (
    <Dialog open={ouvert} onOpenChange={(o) => (o ? undefined : fermer())}>
      <DialogContent className="max-w-[min(30rem,calc(100vw-2rem))]">
        {envoye ? (
          <>
            <DialogHeader>
              <DialogTitle>Signalement transmis</DialogTitle>
              <DialogDescription>
                L’équipe de modération l’examinera. Vous recevrez sa réponse dans vos notifications.
              </DialogDescription>
            </DialogHeader>
            <Avis ton="succes">
              Votre identité n’est pas communiquée à la personne signalée, ni affichée à l’équipe.
            </Avis>
            <DialogFooter>
              <Button type="button" onClick={fermer}>
                Fermer
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Signaler {quoi}</DialogTitle>
              <DialogDescription>
                Choisissez le motif qui décrit le mieux la situation. Il décide de l’ordre dans lequel
                l’équipe traitera votre signalement.
              </DialogDescription>
            </DialogHeader>

            {/*
              La garantie AVANT le formulaire, et non après : c'est elle qui décide si on ose
              remplir. Un médecin qui reverra ce patient la semaine prochaine a besoin de la lire
              d'abord.
            */}
            <p className="flex items-start gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-[12px] leading-[1.5] text-muted-foreground">
              <ShieldCheck size={13} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>
                <strong className="font-semibold text-foreground">Votre nom ne sera jamais montré</strong> —
                ni à la personne signalée, ni à l’équipe qui examine.
              </span>
            </p>

            <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
              <legend className="mb-1.5 text-[13px] font-medium text-foreground">Motif</legend>
              {MOTIFS.map((m) => (
                <label
                  key={m.cle}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:bg-secondary has-[:checked]:border-border has-[:checked]:bg-secondary has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/30"
                >
                  <input
                    type="radio"
                    name="motif-signalement"
                    value={m.cle}
                    checked={motif === m.cle}
                    onChange={() => setMotif(m.cle)}
                    className="mt-[3px] size-3.5 shrink-0 accent-[var(--ap-500)] focus-visible:outline-none"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] leading-tight text-foreground">{m.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-tight text-[var(--texte-tertiaire)]">{m.aide}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <div>
              <Label htmlFor="texte-signalement" className="mb-1.5 block text-[13px]">
                Précisions <span className="font-normal text-[var(--texte-tertiaire)]">(facultatif)</span>
              </Label>
              <Textarea
                id="texte-signalement"
                rows={3}
                maxLength={TEXTE_MAX}
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                placeholder="Ce qui s’est passé, en quelques mots."
              />
              <p className="mt-1 text-[11px] text-[var(--texte-tertiaire)]">
                {texte.length}/{TEXTE_MAX} · n’écrivez aucune information médicale ici.
              </p>
            </div>

            {envoyer.isError ? <Avis ton="erreur">{messageErreur(envoyer.error)}</Avis> : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={fermer}>
                Annuler
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={motif === null || envoyer.isPending}
                onClick={() => envoyer.mutate()}
              >
                <Flag size={15} strokeWidth={1.8} aria-hidden="true" />
                {envoyer.isPending ? 'Envoi…' : 'Envoyer le signalement'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
