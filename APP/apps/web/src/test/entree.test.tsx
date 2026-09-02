/**
 * Les écrans d'entrée — connexion, inscription, mot de passe oublié, activation 2FA (01/09/2026).
 *
 * ── Ce qui manquait ───────────────────────────────────────────────────────────────────────────
 *
 * Aucun des quatre n'avait de titre ni de repère de page : ni `h1`, ni `main`. Un lecteur d'écran
 * liste les titres pour se déplacer dans une page et annonce le repère principal à l'arrivée ; sur
 * `/login` il n'annonçait donc rien — sur la toute première page de l'application, celle qu'un
 * utilisateur atteint avant toutes les autres.
 *
 * Constaté pendant la relecture visuelle du chantier 18, en interrogeant `document` : les quatre
 * écrans rendaient zéro titre et zéro repère.
 *
 * ── Pourquoi un titre INVISIBLE ───────────────────────────────────────────────────────────────
 *
 * La maquette ne montre que le logo, et la règle du projet est que la maquette décide de la forme.
 * Ce qui manquait n'était pas visible : c'était structurel. Le titre est donc posé en `sr-only` —
 * rien ne change à l'écran, tout change pour qui n'y voit pas.
 */
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { AuthLayout } from '@/components/layout/AuthLayout'

describe('Écrans d’entrée — la structure de la page', () => {
  it('la coquille d’entrée porte un repère principal', () => {
    render(<AuthLayout titre="Connexion à ULAMU">formulaire</AuthLayout>)

    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('elle porte un titre de niveau 1, accessible mais invisible', () => {
    render(<AuthLayout titre="Connexion à ULAMU">formulaire</AuthLayout>)

    const titre = screen.getByRole('heading', { level: 1, name: 'Connexion à ULAMU' })
    // `sr-only` et non `hidden` : un titre réellement masqué ne serait pas non plus annoncé.
    expect(titre.className).toContain('sr-only')
  })

  it('le formulaire vit DANS le repère principal, pas à côté', () => {
    render(<AuthLayout titre="Connexion à ULAMU">formulaire</AuthLayout>)

    expect(screen.getByRole('main')).toHaveTextContent('formulaire')
  })

  it('le carrousel reste décoratif : il ne s’annonce pas avant le formulaire', () => {
    const { container } = render(<AuthLayout titre="Connexion à ULAMU">formulaire</AuthLayout>)

    // Il ne porte aucune information indispensable ; l'annoncer ferait traverser une illustration
    // à qui vient se connecter.
    expect(container.querySelector('.ul-auth__aside')?.getAttribute('aria-hidden')).toBe('true')
  })

  /*
    Le test précédent prouve que la coquille SAIT porter un titre. Celui-ci prouve que les écrans le
    lui DONNENT : `titre` est obligatoire côté types, mais TypeScript ne tourne pas à l'exécution, et
    un écran ajouté plus tard sans titre passerait la revue sans bruit. On lit donc la source, comme
    `charte.test.tsx` lit la feuille de style.
  */
  it('les quatre écrans d’entrée donnent tous un titre', () => {
    const dossier = resolve(__dirname, '../modules/auth/pages')

    for (const fichier of ['LoginPage.tsx', 'RegisterPage.tsx', 'ForgotPasswordPage.tsx']) {
      const source = readFileSync(resolve(dossier, fichier), 'utf8')
      const usages = source.match(/<AuthLayout[^>]*/g) ?? []

      expect(usages.length, `${fichier} n'utilise pas AuthLayout`).toBeGreaterThan(0)
      for (const usage of usages) {
        expect(usage, `${fichier} : un <AuthLayout> sans titre`).toContain('titre=')
      }
    }

    // L'activation 2FA n'utilise pas `AuthLayout` — sa carte est plus étroite. Elle porte donc son
    // repère et son titre en propre, et c'est précisément pour cela qu'elle avait été oubliée.
    const totp = readFileSync(resolve(dossier, 'TotpSetupPage.tsx'), 'utf8')
    expect(totp).toContain('<main')
    expect(totp).toMatch(/<h1 className="sr-only">/)
  })

  /*
    ── La page se déclarait en anglais (chantier 24, 02/09/2026) ────────────────────────────────

    `index.html` portait `<html lang="en">` — la valeur que Vite écrit par défaut, jamais relue.
    Vérifié sur le site EN LIGNE avant correction : `document.documentElement.lang` valait bien
    `en`.

    Ce n'est pas une étiquette décorative. C'est elle qui choisit la voix d'un lecteur d'écran :
    du français lu par une synthèse anglaise ne s'entend pas comme du français mal prononcé, il
    s'entend comme rien du tout. Et l'application est en français SEUL — le chantier 10 a retiré
    le sélecteur de langue en écrivant pourquoi (aucune chaîne n'est externalisée). L'attribut
    mentait donc sur le seul fait qu'il avait à dire.

    Même famille que les quatre écrans sans titre ci-dessus : invisible à l'œil, décisif à
    l'oreille, et introuvable par un test de rendu — jsdom monte des composants, il ne charge
    jamais `index.html`. D'où la lecture du fichier.
  */
  it('la page se déclare en français, comme la seule langue qu’elle sert', () => {
    const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8')

    expect(html).toMatch(/<html\s[^>]*lang="fr"/)
    expect(html).not.toContain('lang="en"')
  })
})
