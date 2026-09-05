/**
 * Le panneau d'aide des raccourcis — chantier 47, 05/09/2026.
 *
 * ── Pourquoi il est la moitié la plus importante du chantier ──────────────────────────────────
 *
 * Ctrl+K existe depuis le chantier 46 et **personne ne peut le deviner**. Un raccourci sans endroit
 * où le lire n'est pas une fonctionnalité : c'est un secret partagé entre le code et celui qui l'a
 * écrit.
 *
 * Ce panneau lit `RACCOURCIS` — la seule liste — et n'en recopie aucune ligne. Il montre aussi ceux
 * qui sont implémentés ailleurs (le composeur de consultation), parce qu'un utilisateur cherche
 * « les raccourcis », pas « les raccourcis déclenchés par tel module ».
 *
 * Les lignes sont filtrées par capacité : un administrateur n'a pas de consultation, et lui montrer
 * « Entrée envoie le message » serait lui promettre un écran qu'il n'a pas.
 */
import { Keyboard } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RACCOURCIS } from '@/config/raccourcis.config'
import { useCapabilities } from '@/hooks/useCapabilities'

export function AideRaccourcis({ ouvert, surChangement }: { ouvert: boolean; surChangement: (v: boolean) => void }) {
  const { hasAny } = useCapabilities()

  const visibles = RACCOURCIS.filter((r) => !r.capabilities || r.capabilities.length === 0 || hasAny(...r.capabilities))

  // Regroupés par portée, dans l'ordre d'apparition : « Partout » vient donc en premier, ce qui est
  // aussi l'ordre d'utilité — on cherche d'abord ce qui marche sur l'écran où l'on est.
  const portees = [...new Set(visibles.map((r) => r.portee))]

  return (
    <Dialog open={ouvert} onOpenChange={surChangement}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard size={17} strokeWidth={1.5} aria-hidden="true" />
            Raccourcis clavier
          </DialogTitle>
          <DialogDescription>
            Appuyez sur <Touche>?</Touche> à tout moment pour revoir cette liste.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {portees.map((portee) => (
            <section key={portee}>
              <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">
                {portee}
              </h3>
              <dl className="m-0 flex flex-col gap-1.5">
                {visibles
                  .filter((r) => r.portee === portee)
                  .map((r) => (
                    <div key={r.cle} className="flex items-baseline justify-between gap-4">
                      <dt className="min-w-0 text-[13px] leading-[1.5] text-foreground">{r.libelle}</dt>
                      <dd className="m-0 flex shrink-0 items-center gap-1.5">
                        {r.touches.map((t, i) => (
                          <span key={t} className="flex items-center gap-1.5">
                            {i > 0 ? (
                              <span className="text-[11px] text-[var(--texte-tertiaire)]">ou</span>
                            ) : null}
                            <Touche>{t}</Touche>
                          </span>
                        ))}
                      </dd>
                    </div>
                  ))}
              </dl>
            </section>
          ))}
        </div>

        {/*
          Dire que la souris suffit n'est pas une politesse : un panneau de raccourcis peut donner
          l'impression qu'il FAUT les connaître pour se servir de l'application.
        */}
        <p className="m-0 border-t border-border pt-3 text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
          Tout se fait aussi à la souris. Ces raccourcis ne font que raccourcir.
        </p>
      </DialogContent>
    </Dialog>
  )
}

/** Une touche, dessinée comme une touche — la forme porte le sens autant que le mot. */
function Touche({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[11px] leading-none text-foreground">
      {children}
    </kbd>
  )
}
