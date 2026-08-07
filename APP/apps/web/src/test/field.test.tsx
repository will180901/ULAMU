/**
 * Champ de formulaire — les deux interdictions absolues de CG-05 §07 que la version précédente
 * enfreignait : « message d'erreur avec icône + texte, jamais couleur seule » et « placeholder
 * comme substitut de label ».
 *
 * Un test plutôt qu'une relecture : ces deux règles se perdent au premier copier-coller pressé, et
 * elles ne se voient pas à l'œil sur un écran bien calibré — précisément le cas de la personne qui
 * développe, jamais celui du pharmacien en plein soleil.
 */
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Field } from '@/components/ulamu/Field'

describe('champ de formulaire', () => {
  it('lie le libellé au champ — le placeholder ne fait jamais office de libellé', () => {
    render(<Field label="Nom d’utilisateur" name="username" placeholder="dr_kouma" />)
    // Trouvable PAR SON LIBELLÉ : c'est la preuve que `htmlFor`/`id` sont bien reliés.
    expect(screen.getByLabelText(/nom d’utilisateur/i)).toBeInTheDocument()
  })

  it('accompagne l’erreur d’une icône, jamais de la seule couleur', () => {
    const { container } = render(<Field label="Email" name="email" error="Format invalide." />)
    const msg = screen.getByRole('alert')
    expect(msg).toHaveTextContent('Format invalide.')
    // L'icône est un SVG décoratif à côté du texte — sa présence est la garantie que l'information
    // ne repose pas uniquement sur la teinte.
    expect(msg.querySelector('svg')).not.toBeNull()
    expect(container.querySelector('.ul-field--error')).not.toBeNull()
  })

  it('annonce l’erreur aux lecteurs d’écran et marque le champ invalide', () => {
    render(<Field label="Email" name="email" error="Format invalide." />)
    const input = screen.getByLabelText(/email/i)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    // Sans `aria-describedby`, le champ est annoncé puis le silence : l'erreur reste invisible pour
    // qui ne voit pas l'écran.
    expect(input.getAttribute('aria-describedby')).toBeTruthy()
    expect(document.getElementById(input.getAttribute('aria-describedby')!)).toHaveTextContent('Format invalide.')
  })

  it('accompagne aussi le succès d’une icône', () => {
    render(<Field label="Identifiant" name="u" success="Disponible" />)
    const msg = screen.getByText('Disponible').closest('.ul-field__msg')!
    expect(msg.querySelector('svg')).not.toBeNull()
  })

  it('donne la priorité à l’erreur sur l’aide — jamais les deux à la fois', () => {
    render(<Field label="Email" name="email" hint="Votre adresse professionnelle" error="Format invalide." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Format invalide.')
    expect(screen.queryByText('Votre adresse professionnelle')).not.toBeInTheDocument()
  })
})
