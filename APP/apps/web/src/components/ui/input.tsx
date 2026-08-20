import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        /* Accordé sur les maquettes (docs/maquettes/, constante CHAMP_BASE) plutôt que laissé aux
           défauts de shadcn, qui donnaient un champ de 32px au rayon 8px.
             hauteur 36px · rayon 6px · retrait 12px · texte 14px · fond = surface (pas transparent)
           Le halo de focus est à 12 % et non 50 % : c'est la valeur des maquettes pour un CHAMP.
           Les boutons, eux, gardent les 30 % de CG-05 §01 — un champ actif se signale, un bouton
           au clavier doit se voir. */
        "h-9 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/12 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
