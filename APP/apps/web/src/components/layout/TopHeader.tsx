/**
 * Barre du haut — CG-06 §02.
 *
 * Deux interdictions explicites de la charte (§07) sont ici non négociables : la topbar est
 * **sticky** et porte le **grain**. Sans l'un ou l'autre, elle n'est plus la topbar d'Ulamu.
 *
 * Écart assumé par rapport au schéma de CG-06 : la charte y place aussi le logo à gauche et un avatar
 * à droite. Dans notre disposition, la barre latérale est en pleine hauteur et porte DÉJÀ le logo et
 * le bloc utilisateur — les redoubler donnerait deux entrées vers le même compte à 40px d'écart, ce
 * qu'aucune charte ne demande vraiment. La gauche sert donc au bouton de menu mobile et au titre de
 * page, la droite aux notifications et aux réglages.
 */
import { Bell, Lock, Menu as MenuIcon, Search, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUiStore } from '@/state/ui.store'

export function TopHeader({ title, unreadCount = 0, onOpenSearch }: { title: string; unreadCount?: number; onOpenSearch: () => void }) {
  const navigate = useNavigate()
  const setMobileOpen = useUiStore((s) => s.setMobileOpen)
  const mobileOpen = useUiStore((s) => s.mobileOpen)

  return (
    <header className="ul-topbar saris-grain-fine">
      {/* Visible uniquement là où la barre latérale se cache — le point de bascule vit dans le CSS,
          une seule fois, jamais recopié ici. */}
      <button
        type="button"
        className="ul-icon-btn ul-only-mobile saris-focus-ring"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Ouvrir le menu"
        aria-expanded={mobileOpen}
      >
        <MenuIcon size={18} />
      </button>

      <h1 className="t-display-sm" style={{ margin: 0, color: 'var(--texte-primaire)', whiteSpace: 'nowrap' }}>
        {title}
      </h1>

      {/* Recherche — CG-06 §02 : max 280px, fond discret, bordure subtile, raccourci affiché. */}
      <button type="button" className="ul-topbar__search saris-focus-ring" onClick={onOpenSearch} style={{ marginLeft: 'auto' }}>
        <Search size={15} aria-hidden="true" />
        <span className="ul-topbar__search-text">Rechercher…</span>
        <kbd className="ul-kbd">Ctrl K</kbd>
      </button>

      {/* Signal de confiance propre à un produit de santé — repris du fil de discussion mobile. */}
      <span
        className="t-caption"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--texte-tertiaire)', whiteSpace: 'nowrap' }}
        title="Les échanges et les données médicales sont chiffrés"
      >
        <Lock size={11} aria-hidden="true" /> chiffré
      </span>

      <button
        type="button"
        className="ul-icon-btn saris-focus-ring"
        onClick={() => navigate('/notifications')}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} non lues` : 'Notifications'}
      >
        <Bell size={17} />
        {/* Pastille rouge si non lus — CG-06 §02. Purement décorative : le compte exact est dans
            l'étiquette accessible du bouton, pas dans un point de 7px. */}
        {unreadCount > 0 ? <span className="ul-icon-btn__dot" aria-hidden="true" /> : null}
      </button>

      <button type="button" className="ul-icon-btn saris-focus-ring" onClick={() => navigate('/parametres')} aria-label="Réglages">
        <Settings size={17} />
      </button>
    </header>
  )
}
