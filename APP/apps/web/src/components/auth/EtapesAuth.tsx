/**
 * Indicateur d'étapes des écrans d'authentification — pastilles numérotées, barres de liaison,
 * libellés. Repris de `docs/maquettes/A2 - Inscription.dc.html` et partagé avec A3.
 *
 * **Cliquable en arrière seulement.** Revenir corriger une faute de frappe doit être immédiat ;
 * sauter en avant ferait soumettre des champs jamais remplis. Les pastilles à venir sont réellement
 * `disabled`, pas seulement grisées — un lecteur d'écran doit l'entendre aussi.
 *
 * Les libellés sont VOLONTAIREMENT courts (un mot). Chaque libellé occupe une colonne de largeur
 * égale : à cinq ou six étapes dans un panneau de 435 px, « Profil professionnel » s'enroulerait sur
 * deux lignes et déformerait la rangée. La maquette fait le même choix dans son propre sélecteur
 * compact, où elle ne garde que le premier mot.
 */
export interface EtapeAuth<T extends string> {
  cle: T
  libelle: string
}

export function EtapesAuth<T extends string>({
  etapes,
  courant,
  aller,
}: {
  etapes: ReadonlyArray<EtapeAuth<T>>
  courant: number
  aller: (cle: T) => void
}) {
  const courante = etapes[courant]

  return (
    <div className="mb-4">
      {/*
        Le résumé, repris de `components/ulamu/Stepper.tsx` avant sa suppression (01/09/2026).

        Chaque pastille s'annonçait déjà — « Étape 2 — Identité » — mais **jamais « sur 5 »** : un
        lecteur d'écran entendait des étapes sans savoir combien il en restait. Sur une inscription
        professionnelle qui en compte cinq, c'est la différence entre avancer et avancer à l'aveugle.
        `Stepper` portait cette phrase et ne servait nulle part ; elle vit maintenant là où elle est
        lue.
      */}
      <p className="sr-only" role="status">
        Étape {courant + 1} sur {etapes.length}
        {courante ? ` : ${courante.libelle}` : ''}
      </p>

      <div className="flex items-center">
        {etapes.map((e, k) => {
          const atteinte = k <= courant
          return (
            <div key={e.cle} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => atteinte && aller(e.cle)}
                disabled={!atteinte}
                aria-current={k === courant ? 'step' : undefined}
                aria-label={`Étape ${k + 1} sur ${etapes.length} — ${e.libelle}`}
                className={
                  'flex size-[26px] shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ' +
                  (atteinte
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'cursor-default border-[var(--bordure-normale)] bg-secondary text-[var(--texte-tertiaire)]')
                }
              >
                {k + 1}
              </button>
              {/* La dernière barre reste transparente : elle ne relie rien, mais occupe la place pour
                  que toutes les pastilles gardent le même écartement. */}
              <span
                aria-hidden="true"
                className={
                  'mx-1 h-0.5 flex-1 rounded-sm transition-colors ' +
                  (k === etapes.length - 1 ? 'bg-transparent' : k < courant ? 'bg-primary' : 'bg-[var(--bordure-normale)]')
                }
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex">
        {etapes.map((e, k) => (
          <span
            key={e.cle}
            className={
              'flex-1 text-center text-[11px] leading-[1.45] ' +
              (k <= courant ? 'text-foreground' : 'text-[var(--texte-tertiaire)] ') +
              (k === courant ? ' font-bold' : ' font-medium')
            }
          >
            {e.libelle}
          </span>
        ))}
      </div>
    </div>
  )
}
