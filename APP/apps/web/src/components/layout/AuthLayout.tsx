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

/**
 * `subtitle` est FACULTATIF depuis le 20/08/2026, et c'est un écart assumé avec les maquettes.
 *
 * Le sous-titre coûte 70 px (40 px de texte sur deux lignes, plus 6 et 24 px de marges). Les
 * maquettes le posent sur chaque écran, ce qui va de soi quand chacun tient sur une page. Une fois
 * l'inscription découpée en six étapes, la même phrase — « Créez votre compte ULAMU… » — se répète
 * six fois, et elle n'apprend plus rien à quelqu'un déjà engagé dans le parcours : l'indicateur
 * d'étapes le renseigne mieux.
 *
 * Ces 70 px décident du confort réel : la carte est plafonnée à 90 vh, soit 558 px sur une fenêtre
 * de 620 px. Sans eux, les étapes chargées débordaient dès qu'un message d'erreur s'affichait.
 *
 * Le texte reste donc affiché là où il oriente — la PREMIÈRE étape — et s'efface ensuite.
 */
export function AuthLayout({
  titre,
  subtitle,
  children,
}: {
  /**
   * Nom de l'écran, posé en `h1` **invisible**.
   *
   * Les trois pages d'entrée n'avaient aucun titre ni aucun repère de page : ni `h1`, ni `main`.
   * Un lecteur d'écran liste les titres pour se déplacer et annonce le repère principal à
   * l'arrivée ; sur `/login`, il n'annonçait donc rien — la toute première page de l'application.
   * Constaté le 01/09/2026 pendant la relecture visuelle.
   *
   * Le titre est masqué et non affiché : la maquette ne montre que le logo, et rien de ce qui se
   * voit ne doit changer. Ce qui manquait n'était pas visible, c'était structurel.
   */
  titre: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="ul-auth saris-grain-strong">
      <div className="ul-auth__card">
        {/* Décoratif : le carrousel ne porte aucune information indispensable, il ne doit donc pas
            encombrer la lecture d'un lecteur d'écran avant d'arriver au formulaire. */}
        <div className="ul-auth__aside" aria-hidden="true">
          <AuthCarousel />
        </div>

        <main className="ul-auth__panel">
          <h1 className="sr-only">{titre}</h1>
          <Logo size={34} />
          {subtitle ? <p className="ul-auth__sub">{subtitle}</p> : <div className="h-6" />}
          {children}
        </main>
      </div>
    </div>
  )
}
