/**
 * B3 — Mes paramètres. D'après `docs/maquettes/B3 - Mes parametres.dc.html`.
 *
 * Quatre sections derrière un rail de sous-navigation : Préférences, Sécurité du compte, Sessions &
 * appareils, Langue & mentions légales. Le rail devient une barre horizontale défilante sous 1024 px,
 * comme la maquette.
 *
 * La section est portée par la QUERY de l'URL (`?section=securite`) et non par un état local : un
 * lien vers un réglage précis doit pouvoir être partagé, et le retour arrière du navigateur doit
 * ramener où l'on était. Un `useState` aurait perdu les deux.
 *
 * Cet écran est le seul du lot dont la moitié des blocs n'existaient pas côté serveur le 23/08/2026.
 * Chaque section porte en tête le détail de ce qui a été ajouté et de ce qui reste absent.
 */
import { KeyRound, MonitorSmartphone, Scale, Settings2, SlidersHorizontal } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { SectionLegal } from '../sections/SectionLegal'
import { SectionPreferences } from '../sections/SectionPreferences'
import { SectionSecurite } from '../sections/SectionSecurite'
import { SectionSessions } from '../sections/SectionSessions'
import { useSessionStore } from '@/state/session.store'
import type { MeResponse } from '@/lib/api'

const SECTIONS = [
  { cle: 'preferences', label: 'Préférences', aide: 'Thème, page d’accueil, notifications', icone: SlidersHorizontal },
  { cle: 'securite', label: 'Sécurité du compte', aide: 'Adresse, mot de passe, 2FA, photo', icone: KeyRound },
  { cle: 'sessions', label: 'Sessions & appareils', aide: 'Postes connectés, clôture', icone: MonitorSmartphone },
  { cle: 'legal', label: 'Langue & mentions légales', aide: 'CGU, confidentialité, version', icone: Scale },
] as const

type CleSection = (typeof SECTIONS)[number]['cle']

export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const me = useSessionStore((s) => s.me)
  const setMe = useSessionStore((s) => s.setMe)

  const demandee = params.get('section')
  const active: CleSection = SECTIONS.some((s) => s.cle === demandee) ? (demandee as CleSection) : 'preferences'

  // `replace` : naviguer entre les sections ne doit pas empiler quinze entrées dans l'historique, sans
  // quoi le bouton « retour » du navigateur ne ramènerait jamais à l'écran précédent.
  const aller = (cle: CleSection) => setParams({ section: cle }, { replace: true })

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col">
      <div className="mb-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <Settings2 size={18} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">
            Mes paramètres
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">
            Réglages personnels de votre compte · les informations professionnelles se modifient depuis Ma vitrine
          </p>
        </span>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        {/* Rail : colonne à gauche sur grand écran, barre défilante en dessous de 1024 px. */}
        <nav
          aria-label="Sections des paramètres"
          className="-mx-1 flex shrink-0 gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:w-60 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {SECTIONS.map((s) => {
            const actif = s.cle === active
            const Icone = s.icone
            return (
              <button
                key={s.cle}
                type="button"
                aria-current={actif ? 'page' : undefined}
                onClick={() => aller(s.cle)}
                className={
                  'flex shrink-0 items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors ' +
                  'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 lg:w-full lg:shrink ' +
                  (actif
                    ? 'border-[var(--ap-200)] bg-[var(--ap-50)] text-[var(--ap-700)]'
                    : 'border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground')
                }
              >
                <Icone size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
                <span className="min-w-0">
                  <span className="block whitespace-nowrap text-[13px] font-medium lg:whitespace-normal">{s.label}</span>
                  <span className="mt-0.5 hidden text-[11px] leading-[1.4] text-[var(--texte-tertiaire)] lg:block">
                    {s.aide}
                  </span>
                </span>
              </button>
            )
          })}
        </nav>

        <div className="min-w-0 flex-1">
          {active === 'preferences' ? <SectionPreferences /> : null}
          {active === 'securite' && me ? <SectionSecurite me={me} rafraichir={(m: MeResponse) => setMe(m)} /> : null}
          {active === 'sessions' ? <SectionSessions /> : null}
          {active === 'legal' ? <SectionLegal /> : null}
        </div>
      </div>
    </div>
  )
}
