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
import { KeyRound, LifeBuoy, MonitorSmartphone, Scale, Settings2, SlidersHorizontal } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { SectionLegal } from '../sections/SectionLegal'
import { SectionPreferences } from '../sections/SectionPreferences'
import { SectionSecurite } from '../sections/SectionSecurite'
import { SectionAide } from '../sections/SectionAide'
import { SectionSessions } from '../sections/SectionSessions'
import { Segments } from '@/components/ulamu/parts'
import { useEtroit } from '@/hooks/use-mobile'
import { useSessionStore } from '@/state/session.store'
import type { MeResponse } from '@/lib/api'

const SECTIONS = [
  /*
    `court` sert à la forme en segments, sous 1024 px. Les libellés complets y demandent 659 px pour
    365 disponibles à 375 px — mesuré le 01/09/2026. Ils restent entiers dans le rail vertical, où
    la place ne manque pas, et où l'aide s'affiche en plus.
  */
  { cle: 'preferences', label: 'Préférences', court: 'Réglages', aide: 'Thème, page d’accueil, notifications', icone: SlidersHorizontal },
  { cle: 'securite', label: 'Sécurité du compte', court: 'Sécurité', aide: 'Adresse, mot de passe, 2FA, photo', icone: KeyRound },
  { cle: 'sessions', label: 'Sessions & appareils', court: 'Appareils', aide: 'Postes connectés, clôture', icone: MonitorSmartphone },
  { cle: 'legal', label: 'Langue & mentions légales', court: 'Légal', aide: 'CGU, confidentialité, version', icone: Scale },
  /*
    Ajouté le 01/09/2026 (dette 8quater). Il remplace `support@ulamu.cg`, une adresse dont le
    domaine n'appartient pas au projet et que personne ne relevait. Les mentions légales et C1
    pointent ici : une seule page porte la demande ET la réponse.
  */
  { cle: 'aide', label: 'Aide', court: 'Aide', aide: 'Écrire à l’administration, lire sa réponse', icone: LifeBuoy },
] as const

type CleSection = (typeof SECTIONS)[number]['cle']

export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const me = useSessionStore((s) => s.me)
  const setMe = useSessionStore((s) => s.setMe)

  // 1024 px : la même largeur qu'ailleurs dans l'application (tableaux en cartes, chantier 21).
  const etroit = useEtroit(1024)

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
        {/*
          Deux formes pour une seule navigation, et le seuil est 1024 px.

          • **Au-dessus** : le rail vertical, une colonne à gauche. Chaque section y montre son
            libellé complet ET son aide — la place ne manque pas, autant s'en servir.
          • **En dessous** : le même choix en `Segments`, la forme retenue par le porteur pour tous
            les onglets de l'application (01/09/2026). Libellés courts : les complets demandent
            659 px pour 365 disponibles à 375 px.

          Ce fut d'abord une barre défilante horizontalement — trois onglets sur cinq hors écran,
          sans le moindre indice qu'il fallait balayer (corrigé au chantier 21). Un onglet qu'on ne
          voit pas n'existe pas.
        */}
        {etroit ? (
          <div className="shrink-0">
            <Segments
              label="Sections des paramètres"
              valeur={active}
              onChange={(c) => aller(c as CleSection)}
              options={SECTIONS.map((s) => ({ cle: s.cle, label: s.court }))}
            />
          </div>
        ) : (
        <nav
          aria-label="Sections des paramètres"
          className="flex shrink-0 flex-wrap gap-1.5 lg:w-60 lg:flex-col lg:flex-nowrap"
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
        )}

        <div className="min-w-0 flex-1">
          {active === 'preferences' ? <SectionPreferences /> : null}
          {active === 'securite' && me ? <SectionSecurite me={me} rafraichir={(m: MeResponse) => setMe(m)} /> : null}
          {active === 'sessions' ? <SectionSessions /> : null}
          {active === 'legal' ? <SectionLegal /> : null}
          {active === 'aide' ? <SectionAide /> : null}
        </div>
      </div>
    </div>
  )
}
