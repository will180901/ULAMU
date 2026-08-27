/**
 * Pastille de présence — barre du haut, d'après la maquette B1.
 *
 * ── Le manque que cet écran comble ────────────────────────────────────────────────────────────
 *
 * La maquette n'a **aucune** présence : à sa place, elle affichait « Clinique de Bacongo » et
 * « 6 rendez-vous », deux notions qui n'existent nulle part (alignement, famille 3, groupe A).
 * Ce qu'on retire libère exactement la place de ce qui manquait.
 *
 * ── Les trois états, et ce qu'ils veulent dire pour un patient ────────────────────────────────
 *
 * • **En ligne** — joignable maintenant. Le bouton « initier » du patient est actif.
 * • **Ne pas déranger** — choix explicite. Le battement de cœur continue (l'activité est réelle)
 *   mais la présence ne se réveille pas : le patient voit un médecin indisponible (EF-05-05).
 * • **Absent** — plus aucun battement depuis PM-26. Le serveur le pose tout seul ; le médecin
 *   peut aussi le choisir.
 *
 * `availableForInitiation` est calculé PAR LE SERVEUR à l'instant de la réponse : un « en ligne »
 * rassis vaut absent (RM-05-04). On affiche donc ce que le serveur dit, jamais ce qu'on croit.
 *
 * ── Le plafond, à côté ────────────────────────────────────────────────────────────────────────
 *
 * « N consultation(s) sur M » — M vient du serveur (PM-27), jamais du code. **Affichage seul,
 * aucune action** : le plafond ne se règle que dans E3. Sans ce texte, un médecin au plafond croit
 * à une panne quand les demandes cessent d'arriver.
 */
import { Check, ChevronDown, MinusCircle, Moon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { PresenceState } from '@/lib/api'
import { usePresence } from '@/hooks/usePresence'
import { useSessionsEnCours } from '@/hooks/useSessionsEnCours'

const ETATS: Array<{ code: PresenceState; libelle: string; aide: string }> = [
  { code: 'ONLINE', libelle: 'En ligne', aide: 'Les patients peuvent vous solliciter' },
  { code: 'DO_NOT_DISTURB', libelle: 'Ne pas déranger', aide: 'Vous restez connecté, sans être sollicité' },
  { code: 'OFFLINE', libelle: 'Absent', aide: 'Vous n’apparaissez plus comme joignable' },
]

/** Le mot affiché suit le serveur : ONLINE + battement rassis = « Absent », pas « En ligne ». */
function motAffiche(state: PresenceState, joignable: boolean): string {
  if (state === 'DO_NOT_DISTURB') return 'Ne pas déranger'
  if (state === 'ONLINE') return joignable ? 'En ligne' : 'Absent'
  return 'Absent'
}

function couleurPastille(state: PresenceState, joignable: boolean, auPlafond: boolean): string {
  if (auPlafond) return 'var(--ton-ambre-icone)'
  if (state === 'DO_NOT_DISTURB') return 'var(--ton-ambre-icone)'
  if (state === 'ONLINE' && joignable) return 'var(--succes-accent)'
  return 'var(--texte-tertiaire)'
}

export function IndicateurPresence() {
  const { presence, chargement, erreur, changerEtat } = usePresence()
  const { enCours } = useSessionsEnCours()

  // Tant qu'on ne sait pas, on n'affiche RIEN plutôt qu'un état inventé : une pastille verte
  // fausse ferait croire à un médecin qu'il est joignable alors qu'il ne l'est pas.
  if (chargement && !presence) return null

  if (!presence || erreur) {
    return (
      <span
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-[var(--texte-tertiaire)]"
        title={erreur ?? 'Présence indisponible'}
      >
        <span aria-hidden="true" className="size-[7px] rounded-full bg-[var(--texte-tertiaire)]" />
        Présence indisponible
      </span>
    )
  }

  const plafond = presence.maxConcurrentSessions
  const auPlafond = enCours !== null && plafond > 0 && enCours >= plafond
  const joignable = presence.availableForInitiation
  const mot = auPlafond ? 'Occupé' : motAffiche(presence.state, joignable)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Ma présence : ${mot}. Changer d’état`}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
      >
        <span
          aria-hidden="true"
          className="size-[7px] shrink-0 rounded-full"
          style={{ background: couleurPastille(presence.state, joignable, auPlafond) }}
        />
        <span className="whitespace-nowrap">{mot}</span>
        {/* Le compte n'apparaît que si on le connaît : « 0 sur 3 » au chargement serait un mensonge
            fugace, et le plafond ne vaut que 0 quand le serveur n'a rien pu dire. */}
        {enCours !== null && plafond > 0 ? (
          <span className="whitespace-nowrap font-mono text-[10px] text-[var(--texte-tertiaire)]">
            {enCours} / {plafond}
          </span>
        ) : null}
        <ChevronDown size={12} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-[var(--texte-tertiaire)]" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={6} className="w-72 p-1">
        <DropdownMenuLabel className="text-[11px] font-semibold text-[var(--texte-tertiaire)]">
          Ma disponibilité
        </DropdownMenuLabel>

        {ETATS.map((e) => (
          <DropdownMenuItem key={e.code} onSelect={() => void changerEtat(e.code)} className="items-start gap-2">
            <span className="mt-[3px] flex size-3.5 shrink-0 items-center justify-center">
              {presence.state === e.code ? <Check size={13} strokeWidth={2} aria-hidden="true" /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] leading-tight text-foreground">{e.libelle}</span>
              <span className="mt-0.5 block text-[11px] leading-tight text-[var(--texte-tertiaire)]">{e.aide}</span>
            </span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* Le plafond est expliqué, jamais réglable ici : PM-27 appartient au super-administrateur
            (E3). Un réglage côté médecin laisserait croire qu'il peut s'en affranchir. */}
        <div className="flex items-start gap-2 px-2 py-2 text-[11px] leading-snug text-[var(--texte-tertiaire)]">
          {auPlafond ? (
            <MinusCircle size={13} strokeWidth={1.5} aria-hidden="true" className="mt-px shrink-0 text-[var(--ton-ambre-icone)]" />
          ) : (
            <Moon size={13} strokeWidth={1.5} aria-hidden="true" className="mt-px shrink-0" />
          )}
          <span>
            {enCours === null || plafond === 0 ? (
              'Le nombre de consultations simultanées est plafonné par la plateforme.'
            ) : auPlafond ? (
              <>
                Vous menez <strong className="font-semibold text-foreground">{enCours}</strong> consultations, soit le
                maximum. Aucune nouvelle demande ne vous parviendra tant qu’une ne sera pas terminée.
              </>
            ) : (
              <>
                Vous pouvez mener <strong className="font-semibold text-foreground">{plafond}</strong> consultations à la
                fois. Au-delà, les patients vous verront occupé.
              </>
            )}
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
