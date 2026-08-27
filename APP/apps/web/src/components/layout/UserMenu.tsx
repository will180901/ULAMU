/**
 * Bouton utilisateur et son menu, au pied de la barre latérale — d'après la maquette B1.
 *
 * Le menu porte les trois entrées demandées : **Mes paramètres**, **bascule de thème**, et
 * **Se déconnecter** — cette dernière isolée par un séparateur et en rouge, parce qu'elle est la
 * seule action irréversible du lot (CG-06 §07).
 *
 * `DropdownMenu` de shadcn plutôt qu'un panneau maison : il apporte le piégeage du focus, la
 * fermeture à l'échappement et au clic extérieur, et la navigation aux flèches. Les réécrire aurait
 * été du travail refait, moins bien.
 */
import { useNavigate } from 'react-router-dom'
import { ChevronsUpDown, LogOut, Moon, Settings, Sun } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSessionStore } from '@/state/session.store'
import { useThemeStore, resolveTheme } from '@/state/theme.store'
import { ESPACE_PAR_ROLE } from '@/config/navigation.config'

/** Deux lettres au plus : « Ange Makaya » → AM, « pharma.demo » → PH. */
function initiales(prenom?: string | null, nom?: string | null, pseudo?: string | null): string {
  const p = prenom?.trim()
  const n = nom?.trim()
  if (p || n) return ((p?.[0] ?? '') + (n?.[0] ?? '')).toUpperCase() || '·'
  // Repli sur le nom d'utilisateur : une structure n'a pas toujours d'état civil renseigné, et
  // afficher « ? » à quelqu'un de bien inscrit est un aveu de bogue, pas une information.
  const u = pseudo?.trim().replace(/[^a-zA-Z0-9]/g, '')
  return u ? u.slice(0, 2).toUpperCase() : '·'
}

const LIBELLE_THEME = { light: 'Clair', dark: 'Sombre', system: 'Système' } as const

/**
 * La ligne sous le nom, dans l'entête du menu.
 *
 * ⚠️ **La maquette y écrit « Clinique de Bacongo · Brazzaville ».** Aucune clinique n'existe :
 * `FacilityType` ne connaît que `PHARMACY` et `LABORATORY`, et un médecin n'est rattachable à rien
 * (alignement, famille 3, groupe A). On garde le RÔLE de la ligne — dire qui l'on est et où — avec
 * les deux seuls champs qui existent vraiment sur la fiche : `specialty` et `district`.
 *
 * EF-05-01 ne connaît d'ailleurs QUE l'arrondissement : ni adresse, ni cabinet, ni horaires.
 *
 * Repli sur `@nom-utilisateur` quand ni l'un ni l'autre n'est renseigné — un profil neuf, ou un
 * compte qui n'est pas un professionnel.
 */
function sousTitre(me: { accountType: string; specialty: string | null; district: string | null; username: string | null } | null): string {
  if (!me) return ''
  if (me.accountType === 'PROFESSIONAL') {
    const parts = [me.specialty, me.district].filter((v): v is string => Boolean(v && v.trim()))
    if (parts.length > 0) return parts.join(' · ')
  }
  return me.username ? `@${me.username}` : ''
}

export function UserMenu({ ouverte }: { ouverte: boolean }) {
  const navigate = useNavigate()
  const me = useSessionStore((s) => s.me)
  const logout = useSessionStore((s) => s.logout)
  const choix = useThemeStore((s) => s.choice)
  const basculer = useThemeStore((s) => s.toggle)

  const nom = [me?.firstName, me?.lastName].filter(Boolean).join(' ') || me?.username || '—'
  const espace = (me && ESPACE_PAR_ROLE[me.accountType]) ?? ''
  const sombreActif = resolveTheme(choix) === 'dark'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu utilisateur"
        className={
          'flex w-full items-center gap-2 rounded-md transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none ' +
          (ouverte ? 'justify-start p-2' : 'justify-center py-1.5')
        }
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-[var(--ap-50)] font-[family-name:var(--font-display)] text-[11px] font-bold text-[var(--ap-600)]">
          {initiales(me?.firstName, me?.lastName, me?.username)}
        </span>
        {ouverte ? (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-foreground">
                {nom}
              </span>
              <span className="mt-px block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-semibold text-[var(--ap-600)]">
                {espace}
              </span>
            </span>
            <ChevronsUpDown size={13} strokeWidth={1.5} className="shrink-0 text-[var(--texte-tertiaire)]" aria-hidden="true" />
          </>
        ) : null}
      </DropdownMenuTrigger>

      {/* Ancré en haut : le déclencheur est au pied de l'écran, un menu qui descendrait sortirait
          de la fenêtre. */}
      <DropdownMenuContent side="top" align="start" sideOffset={6} className="w-60 p-0">
        <div className="border-b border-border bg-secondary px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-[var(--ap-50)] font-[family-name:var(--font-display)] text-[13px] font-bold text-[var(--ap-600)]">
              {initiales(me?.firstName, me?.lastName, me?.username)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-foreground">{nom}</span>
              <span className="mt-px block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[var(--texte-tertiaire)]">
                {sousTitre(me)}
              </span>
            </span>
          </div>
        </div>

        <div className="p-1">
          <DropdownMenuItem onSelect={() => navigate('/parametres')}>
            <Settings size={13} strokeWidth={1.5} aria-hidden="true" />
            Mes paramètres
          </DropdownMenuItem>

          {/* `onSelect` empêché : basculer le thème ne doit pas refermer le menu, on veut pouvoir
              comparer les deux rendus d'un coup d'œil. */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              basculer()
            }}
          >
            {sombreActif ? <Sun size={13} strokeWidth={1.5} aria-hidden="true" /> : <Moon size={13} strokeWidth={1.5} aria-hidden="true" />}
            <span className="flex-1 text-left">Thème</span>
            <span className="font-mono text-[10px] text-[var(--texte-tertiaire)]">{LIBELLE_THEME[choix]}</span>
          </DropdownMenuItem>

          {/* Séparateur avant l'action irréversible, et elle vient en dernier (CG-06 §07). */}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => logout()}>
            <LogOut size={13} strokeWidth={1.5} aria-hidden="true" />
            Se déconnecter
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
