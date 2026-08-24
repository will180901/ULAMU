/**
 * B1 « Coquille applicative » — barre latérale, en-tête, navigation par rôle.
 *
 * Deux défauts sont déjà passés par ici, et aucun n'aurait survécu à ce fichier.
 *
 * ── Défaut n°1 : le `className` transformé en texte (20/08/2026) ────────────────────────────────
 *
 * `NavLink` accepte `className={({ isActive }) => …}`. Au repos, chaque lien est enveloppé dans un
 * `<TooltipTrigger asChild>`, et le `Slot` de Radix FUSIONNE les `className` en les concaténant.
 * Recevant une fonction, il la transformait en chaîne : l'attribut `class` contenait le CODE SOURCE
 * de la fonction. Le navigateur le découpait en mots et appliquait au hasard les classes valides des
 * deux branches — `w-10` passait, `"mx-[14px]` échouait à cause du guillemet collé. Les boutons se
 * retrouvaient collés au bord gauche au lieu d'être centrés.
 *
 * Rien ne plantait. Aucune erreur nulle part. C'est exactement le genre de faute qu'un test attrape
 * et qu'une relecture manque.
 *
 * ── Défaut n°2 : l'anneau de focus absent ───────────────────────────────────────────────────────
 *
 * CG-05 §01 le veut « jamais supprimé ». Il manquait sur les liens de navigation : au clavier, on
 * traversait toute la barre sans savoir où l'on était.
 *
 * ── Et ce que la coquille ne doit jamais faire ──────────────────────────────────────────────────
 *
 * Montrer à un rôle une entrée qui ne le concerne pas. La navigation est filtrée par capacité, et
 * un soignant ne doit pas apercevoir « Signalements » — même désactivé, même grisé.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { useSessionStore } from '@/state/session.store'
import type { MeResponse } from '@/lib/api'

const BASE: MeResponse = {
  accountId: 'x1',
  accountType: 'PROFESSIONAL',
  username: 'dr.nouveau',
  phone: '+242069000110',
  firstName: 'Ange',
  lastName: 'Makaya',
  district: 'Bacongo',
  category: 'GENERAL_PRACTITIONER',
  specialty: 'Médecin généraliste',
  biography: null,
  adminRole: null,
  totpEnabled: true,
  totpEnabledAt: null,
  email: 'dr.nouveau@exemple.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 10,
  backupCodesTotal: 10,
  backupCodesGeneratedAt: null,
}

function monter(chemin: string, moi: Partial<MeResponse> = {}, largeur = 1280) {
  // `useIsMobile` lit `window.innerWidth` au montage : c'est le seul levier pour choisir le format.
  window.innerWidth = largeur
  useSessionStore.setState({ token: 'jeton', me: { ...BASE, ...moi }, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[chemin]}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="*" element={<p>contenu de l’écran</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

/** Les liens de la barre latérale — ceux dont le `class` a été corrompu par `Slot`. */
const liensNav = () => [...document.querySelectorAll('aside nav a')]

/**
 * Les destinations offertes par la barre.
 *
 * On interroge les LIENS et non les libellés : au repos la barre est étroite et n'affiche que les
 * icônes, les intitulés vivant dans les infobulles. Chercher un texte visible ne dirait donc rien
 * de ce qui est réellement accessible — et c'est bien l'accès qu'on veut vérifier.
 */
const destinations = () => liensNav().map((a) => a.getAttribute('href'))

beforeEach(() => {
  window.innerWidth = 1280
})

describe('B1 — la navigation filtrée par rôle', () => {
  it('un soignant voit son espace, et RIEN de l’administration', () => {
    monter('/dashboard')

    expect(destinations()).toEqual(
      expect.arrayContaining(['/dashboard', '/verification', '/vitrine', '/demandes', '/consultations', '/gains', '/parametres']),
    )
    // Une entrée qu'on ne doit pas voir ne doit pas être là DU TOUT : ni grisée, ni désactivée.
    // Une entrée grisée dit à qui la voit qu'elle existe, et c'est déjà une information de trop.
    expect(destinations().filter((h) => h?.startsWith('/admin/'))).toEqual([])
    expect(destinations()).not.toContain('/stock')
    expect(destinations()).not.toContain('/delivrance')
  })

  it('un super-administrateur voit l’administration, et pas le poste de travail d’un soignant', () => {
    monter('/dashboard', { accountType: 'ADMIN', adminRole: 'SUPER_ADMIN' })

    expect(destinations()).toEqual(
      expect.arrayContaining([
        '/admin/verification',
        '/admin/finance',
        '/admin/signalements',
        '/admin/pilotage',
        '/admin/administrateurs',
        '/admin/parametres',
      ]),
    )
    for (const interdit of ['/vitrine', '/demandes', '/gains', '/stock']) {
      expect(destinations()).not.toContain(interdit)
    }
  })

  it('un administrateur FINANCE ne voit que ce que son sous-rôle autorise', () => {
    monter('/dashboard', { accountType: 'ADMIN', adminRole: 'ADMIN_FINANCE' })

    expect(destinations()).toContain('/admin/finance')
    // Les entrées réservées au SUPER_ADMIN restent invisibles : le sous-rôle n'est pas décoratif.
    for (const interdit of ['/admin/signalements', '/admin/administrateurs', '/admin/parametres', '/admin/verification']) {
      expect(destinations()).not.toContain(interdit)
    }
  })
})

describe('B1 — le défaut du `className` transformé en texte', () => {
  it('aucun attribut `class` ne contient du code source', () => {
    monter('/dashboard')
    const liens = liensNav()
    expect(liens.length).toBeGreaterThan(0)

    for (const a of liens) {
      const classe = a.getAttribute('class') ?? ''
      // Les trois traces qu'une fonction stringifiée laisserait dans l'attribut.
      expect(classe).not.toContain('=>')
      expect(classe).not.toContain('function')
      expect(classe).not.toContain('isActive')
      // Et le guillemet collé qui faisait échouer `"mx-[14px]` : aucune classe ne peut en porter.
      expect(classe).not.toContain('"')
    }
  })

  it('au repos, les liens portent bien les classes de la barre étroite', () => {
    monter('/dashboard')
    // La barre n'est pas survolée : chaque lien est centré dans les 68 px, marges comprises.
    // C'est précisément ce qui tombait quand `Slot` mangeait la fonction.
    for (const a of liensNav()) {
      const classe = a.getAttribute('class') ?? ''
      expect(classe).toContain('mx-[14px]')
      expect(classe).toContain('justify-center')
      expect(classe).not.toContain('justify-start')
    }
  })
})

describe('B1 — l’anneau de focus (CG-05 §01)', () => {
  it('chaque lien de navigation le porte — « jamais supprimé »', () => {
    monter('/dashboard')
    for (const a of liensNav()) {
      const classe = a.getAttribute('class') ?? ''
      expect(classe).toContain('focus-visible:ring-3')
      expect(classe).toContain('focus-visible:ring-ring/30')
    }
  })
})

describe('B1 — la page courante', () => {
  it('est marquée `aria-current`, et elle seule', () => {
    monter('/verification')
    const courants = liensNav().filter((a) => a.getAttribute('aria-current') === 'page')
    expect(courants).toHaveLength(1)
    expect(courants[0]?.getAttribute('href')).toBe('/verification')
  })

  it('un sous-chemin garde son parent actif', () => {
    monter('/verification/piece/42')
    const courants = liensNav().filter((a) => a.getAttribute('aria-current') === 'page')
    expect(courants[0]?.getAttribute('href')).toBe('/verification')
  })

  it('le chemin le plus long gagne — `/admin/verification` n’est pas `/verification`', () => {
    monter('/admin/verification', { accountType: 'ADMIN', adminRole: 'SUPER_ADMIN' })
    // Le titre vient du chemin le plus long correspondant. Sans ce tri, le fil d'Ariane aurait
    // affiché « Ma vérification » à un administrateur en train de traiter la file.
    const ariane = screen.getByRole('navigation', { name: "Fil d'Ariane" })
    expect(within(ariane).getByText('File de vérification')).toBeInTheDocument()
    expect(within(ariane).queryByText('Ma vérification')).not.toBeInTheDocument()
  })
})

describe('B1 — le format mobile', () => {
  it('le tiroir fermé est `inert` : ses liens ne sont pas tabulables', () => {
    monter('/dashboard', {}, 375)
    const enveloppe = document.querySelector('aside')?.parentElement
    // Sans `inert`, le focus disparaîtrait de l'écran pendant neuf tabulations, sans que rien ne
    // l'explique : les liens sont hors champ mais restent dans l'ordre de tabulation.
    expect(enveloppe?.hasAttribute('inert')).toBe(true)
  })

  it('sur grand écran, la barre n’est jamais inerte', () => {
    monter('/dashboard', {}, 1280)
    const enveloppe = document.querySelector('aside')?.parentElement
    expect(enveloppe?.hasAttribute('inert')).toBe(false)
  })

  it('le contenu occupe toute la largeur sur mobile, et laisse le rail sur grand écran', () => {
    const { unmount } = monter('/dashboard', {}, 1280)
    // La barre RECOUVRE au survol au lieu de pousser : la place réservée vaut toujours le rail,
    // sinon chaque passage de souris ferait sauter la colonne qu'on est en train de lire.
    expect((document.querySelector('main') as HTMLElement).style.left).toBe('var(--sidebar-rail)')
    unmount()

    monter('/dashboard', {}, 375)
    expect((document.querySelector('main') as HTMLElement).style.left).toBe('0px')
  })
})
