/**
 * La carte telle qu'un patient la voit dans l'annuaire.
 *
 * Ce composant est le pivot de C2. Il sert deux fois, avec exactement le même rendu :
 *
 *   • pour les CONFRÈRES, alimenté par `GET /v1/directory` — la vraie réponse du serveur ;
 *   • pour LE MÉDECIN LUI-MÊME, alimenté par ce qu'il est en train de taper.
 *
 * C'est ce qui rend la comparaison honnête. Si sa fiche était dessinée par un autre composant, elle
 * finirait par diverger — plus soignée, mieux espacée — et l'écran mentirait doucement sur sa place
 * réelle dans la liste.
 *
 * Ce qu'un patient regarde vraiment, dans l'ordre : est-il vérifié, est-il joignable MAINTENANT,
 * combien ça coûte, et est-ce qu'il répond vite. La hiérarchie visuelle suit cet ordre-là, pas
 * l'ordre du formulaire d'édition.
 */
import { BadgeCheck, Clock, Star } from 'lucide-react'
import type { DirectoryItem } from '@/lib/api'

const xaf = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

/** « 3 min » plutôt que « 180 s » : personne ne compte en secondes au-delà d'une minute. */
function delai(secondes: number | null): string | null {
  if (secondes === null) return null
  if (secondes < 90) return `${secondes} s`
  const min = Math.round(secondes / 60)
  return min < 60 ? `${min} min` : `${Math.round(min / 60)} h`
}

function initiales(nom: string): string {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? '')
    .join('')
}

export function CarteAnnuaire({
  item,
  avatarUrl,
  moi = false,
}: {
  item: DirectoryItem
  avatarUrl?: string | null
  /** Met la carte du médecin en évidence dans la liste — sans changer sa structure. */
  moi?: boolean
}) {
  const reactivite = delai(item.reactivity.avgConfirmDelayS)

  return (
    <article
      aria-label={moi ? `Votre fiche : ${item.displayName}` : item.displayName}
      className={
        'relative flex gap-3 rounded-[10px] border bg-card p-3 transition-shadow ' +
        (moi
          ? 'border-[var(--ap-400)] shadow-[0_0_0_3px_rgba(var(--ap-400-rgb),.12)]'
          : 'border-border')
      }
    >
      {moi ? (
        <span className="absolute -top-2 left-3 rounded-full bg-[var(--ap-400)] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-white">
          Vous
        </span>
      ) : null}

      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-[var(--ap-50)] font-[family-name:var(--font-display)] text-sm font-bold text-[var(--ap-600)]">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          <span aria-hidden="true">{initiales(item.displayName)}</span>
        )}
        {/*
          La pastille de présence est posée SUR l'avatar, pas dans une colonne à part : c'est la
          convention que tout le monde connaît, et elle survit à la réduction de la carte sur mobile.
        */}
        {item.availableNow ? (
          <span
            aria-hidden="true"
            className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-card bg-[var(--succes-accent)]"
          />
        ) : null}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="font-[family-name:var(--font-display)] text-[14px] font-bold leading-[1.25] tracking-[-0.012em] text-foreground">
            {item.displayName}
          </span>
          {item.badgeVerified ? (
            <BadgeCheck size={14} strokeWidth={2} aria-label="Vérifié par ULAMU" className="shrink-0 text-[var(--ap-500)]" />
          ) : null}
        </span>

        <span className="text-[12px] leading-[1.4] text-[var(--texte-secondaire)]">
          {[item.specialty, item.district].filter(Boolean).join(' · ') || 'Spécialité à renseigner'}
        </span>

        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--texte-tertiaire)]">
          {item.rating.avg !== null ? (
            <span className="flex items-center gap-1">
              <Star size={11} strokeWidth={2} aria-hidden="true" className="text-[var(--as-500)]" />
              <span className="font-semibold text-foreground">{item.rating.avg.toFixed(1)}</span>
              <span>({item.rating.count})</span>
            </span>
          ) : (
            <span>Pas encore noté</span>
          )}
          {reactivite ? (
            <span className="flex items-center gap-1">
              <Clock size={11} strokeWidth={2} aria-hidden="true" />
              répond en {reactivite}
            </span>
          ) : null}
          <span className={item.availableNow ? 'font-semibold text-[var(--succes-texte)]' : undefined}>
            {item.availableNow ? 'Disponible' : item.presence === 'DO_NOT_DISTURB' ? 'Ne pas déranger' : 'Hors ligne'}
          </span>
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end justify-between">
        {item.cheapestOffer ? (
          <span className="text-right">
            <span className="block font-[family-name:var(--font-display)] text-[15px] font-bold leading-none text-foreground">
              {xaf(item.cheapestOffer.priceXaf)}
            </span>
            <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--texte-tertiaire)]">
              XAF · {item.cheapestOffer.durationMin} min
            </span>
          </span>
        ) : (
          <span className="text-right text-[11px] text-[var(--alerte-texte)]">Aucun tarif</span>
        )}
        {/*
          Bouton inerte : c'est un APERÇU. Le rendre cliquable inviterait le médecin à se demander
          des consultations à lui-même, et il n'a rien à faire ici.
        */}
        <span
          aria-hidden="true"
          className="mt-2 rounded-md bg-[var(--ap-400)] px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-90"
        >
          Demander
        </span>
      </span>
    </article>
  )
}
