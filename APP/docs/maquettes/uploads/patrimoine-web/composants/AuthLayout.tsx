/**
 * Coquille des pages d'authentification — une carte centrée : carrousel à gauche (repris à
 * l'identique de l'app mobile, mêmes images et mêmes trajectoires), formulaire à droite.
 *
 * Ajout : la colonne d'illustration **disparaît sous 860px**. Elle était jusqu'ici figée à 42 % de
 * la largeur quelle que soit la fenêtre, ce qui écrasait le formulaire — or l'inscription
 * professionnelle compte cinq étapes, et un pharmacien qui s'inscrit depuis une tablette n'a que
 * faire d'une illustration s'il ne peut plus lire ses champs.
 */
import type { ReactNode } from 'react'
import { AuthCarousel } from '@/components/layout/AuthCarousel'
import { Logo } from '@/components/ulamu/Logo'

export function AuthLayout({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  return (
    <div className="ul-auth saris-grain-strong">
      <div className="ul-auth__card">
        {/* Décoratif : le carrousel ne porte aucune information indispensable, il ne doit donc pas
            encombrer la lecture d'un lecteur d'écran avant d'arriver au formulaire. */}
        <div className="ul-auth__aside" aria-hidden="true">
          <AuthCarousel />
        </div>

        <div className="ul-auth__panel">
          <Logo size={34} />
          <p className="ul-auth__sub">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
