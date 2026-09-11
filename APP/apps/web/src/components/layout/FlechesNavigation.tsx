/**
 * Les flèches « Précédent / Suivant », et le traqueur qui les alimente — chantier 94, 11/09/2026.
 *
 * Demande du porteur : *« ajoute un moyen de retourner en arrière, en avant, comme avec le projet
 * CMS »*. Le motif y est éprouvé (`BreadcrumbBar` + `navStack.store`) ; on le reprend.
 *
 * ── Deux choses, volontairement dans le même fichier ──────────────────────────────────────────
 *
 * Le traqueur et les flèches sont les deux moitiés d'un même mécanisme : l'un remplit la pile,
 * l'autre la lit. Les séparer obligerait à lire deux fichiers pour comprendre l'un ou l'autre, et
 * rien ne les rend utiles séparément.
 */
import { useEffect } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { peutAvancer, peutReculer, usePileNavigation } from '@/state/usePileNavigation'

/**
 * Enregistre chaque changement d'écran dans la pile.
 *
 * `useNavigationType` dit COMMENT on est arrivé : `PUSH` (un lien, un clic), `REPLACE` (une
 * redirection) ou `POP` (un retour — le bouton du navigateur, ou nos flèches). Les trois ne
 * signifient pas la même chose pour la pile, et les confondre ferait des flèches qui avancent
 * quand on recule.
 *
 * Monté une seule fois dans la coquille, il ne rend rien.
 */
export function TraqueurNavigation() {
  const { pathname, search } = useLocation()
  const type = useNavigationType()
  const empiler = usePileNavigation((e) => e.empiler)
  const remplacer = usePileNavigation((e) => e.remplacer)
  const glisser = usePileNavigation((e) => e.glisser)

  useEffect(() => {
    /*
      La recherche fait partie du chemin : `/consultations?page=3` et `/consultations` sont deux
      endroits distincts pour l'utilisateur, et revenir de l'un à l'autre est une navigation réelle.
    */
    const chemin = pathname + search
    if (type === 'POP') glisser(chemin)
    else if (type === 'REPLACE') remplacer(chemin)
    else empiler(chemin)
  }, [pathname, search, type, empiler, remplacer, glisser])

  return null
}

function Fleche({
  libelle,
  desactive,
  onClick,
  children,
}: {
  libelle: string
  desactive: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={libelle}
      title={libelle}
      disabled={desactive}
      onClick={onClick}
      className={
        'flex size-7 items-center justify-center rounded-lg transition-colors ' +
        'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 ' +
        (desactive
          ? 'cursor-default text-[var(--texte-tertiaire)] opacity-40'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground')
      }
    >
      {children}
    </button>
  )
}

export function FlechesNavigation() {
  const navigate = useNavigate()
  const enArriere = usePileNavigation(peutReculer)
  const enAvant = usePileNavigation(peutAvancer)

  /*
    ⚠️ Les deux flèches restent MONTÉES même inactives, en gris.

    Les faire disparaître ferait bouger le fil d'Ariane à chaque page, et on cliquerait à côté. Et
    une flèche grise dit quelque chose de vrai : *il n'y a rien derrière*. *Une commande qui
    apparaît et disparaît se cherche ; une commande éteinte s'attend.*
  */
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Fleche libelle="Page précédente" desactive={!enArriere} onClick={() => navigate(-1)}>
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
      </Fleche>
      <Fleche libelle="Page suivante" desactive={!enAvant} onClick={() => navigate(1)}>
        <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
      </Fleche>
    </div>
  )
}
