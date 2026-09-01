/**
 * Les squelettes de chargement d'ULAMU.
 *
 * ── Pourquoi un squelette plutôt qu'un rond qui tourne ────────────────────────────────────────
 *
 * Un rond qui tourne dit **qu'on attend**. Un squelette dit **ce qui arrive** : trois lignes de
 * tableau, quatre tuiles, un fil de discussion. La différence n'est pas décorative — elle change ce
 * que l'utilisateur peut faire pendant l'attente. Devant une forme reconnaissable, on prépare son
 * geste ; devant un rond, on ne peut rien anticiper.
 *
 * Elle change aussi ce qui se passe à l'arrivée des données : un squelette de la bonne taille
 * **réserve la place**, donc rien ne saute quand le contenu se pose. Un rond de 16 px remplacé par
 * un tableau de 400 px déplace tout ce qui est en dessous, souvent sous le doigt de quelqu'un qui
 * était en train de viser un bouton.
 *
 * Le projet l'avait déjà tranché : `globals.css` porte `.ul-shimmer` depuis la reconstruction, avec
 * la mention « CG-08 §06 impose de reproduire fidèlement la structure du contenu final ».
 * ⚠️ Le texte de cette règle n'est PAS dans le dépôt — le README de la charte ne liste que les
 * intitulés de sections. On s'appuie donc sur la décision déjà prise dans le code, pas sur une
 * source qu'on pourrait relire. Deux écrans l'appliquaient (A4, B2), vingt-deux ne l'appliquaient
 * pas. Ce fichier est là pour que ce ne soit plus une affaire de discipline individuelle.
 *
 * ── Ce qui NE reçoit pas de squelette ─────────────────────────────────────────────────────────
 *
 * Un bouton qui travaille. « Envoi… », « Enregistrement… » : là, on attend une ACTION qu'on vient
 * de déclencher, pas des données qui vont remplir un espace. Il n'y a aucune forme à annoncer, et le
 * bouton ne doit pas changer de taille. Le rond qui tourne y reste, et c'est le bon choix.
 *
 * ── L'accessibilité, qui est la vraie difficulté ──────────────────────────────────────────────
 *
 * Un squelette est **muet**. Remplacer « Lecture des habilitations… » par des rectangles gris
 * retirerait l'information à qui ne les voit pas — un recul, pas un progrès.
 *
 * Chaque squelette est donc enveloppé dans une zone qui garde la phrase, en `sr-only`, et porte
 * `role="status"` avec `aria-busy`. Un lecteur d'écran entend exactement ce qu'il entendait avant ;
 * l'œil, lui, gagne la forme. Les rectangles eux-mêmes sont `aria-hidden` : ils n'ont rien à dire.
 *
 * L'ondulation s'arrête d'elle-même sous `prefers-reduced-motion` — c'est déjà dans `.ul-shimmer`.
 */
import { cn } from '@/lib/utils'

/** Un rectangle gris qui ondule. La brique de tout le reste. */
export function Bloc({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden="true" style={style} className={cn('ul-shimmer rounded-md', className)} />
}

/**
 * L'enveloppe de toute attente : elle porte la phrase pour qui n'y voit pas, et la forme pour les
 * autres.
 *
 * @param libelle ce qu'on annonçait au rond qui tourne — « Lecture des habilitations… ». Il n'est
 *   pas supprimé, il devient invisible.
 */
export function ZoneEnAttente({
  libelle,
  className,
  children,
}: {
  libelle: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={cn('flex flex-col gap-2', className)}>
      <span className="sr-only">{libelle}</span>
      {children}
    </div>
  )
}

/**
 * Des lignes de tableau. `colonnes` sert à donner à chaque ligne la bonne allure — un tableau à
 * sept colonnes ne ressemble pas à un tableau à quatre.
 *
 * Sous 1024 px les tableaux d'ULAMU deviennent des cartes (chantier 21) : le squelette suit, sans
 * quoi il annoncerait une forme que le contenu ne prendra pas.
 */
export function SqueletteTableau({
  colonnes,
  lignes = 4,
  libelle,
}: {
  colonnes: number
  lignes?: number
  libelle: string
}) {
  return (
    <ZoneEnAttente libelle={libelle} className="gap-2">
      {/* En cartes : un bloc par ligne, de la hauteur d'une carte. */}
      <div className="flex flex-col gap-2 lg:hidden">
        {Array.from({ length: lignes }, (_, i) => (
          <Bloc key={i} className="h-[104px] rounded-[8px]" />
        ))}
      </div>

      {/* En tableau : une bande d'en-tête, puis des rangées de cellules. */}
      <div className="hidden flex-col gap-1.5 lg:flex">
        <Bloc className="h-8 rounded-[6px]" />
        {Array.from({ length: lignes }, (_, i) => (
          <div key={i} className="flex gap-2">
            {Array.from({ length: colonnes }, (_, c) => (
              <Bloc
                key={c}
                className={cn(
                  'h-9 rounded-[6px]',
                  // La première colonne est plus large — c'est presque toujours le nom ou la date.
                  c === 0 ? 'flex-[2]' : 'flex-1',
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </ZoneEnAttente>
  )
}

/** Des cartes empilées — une file de demandes, de signalements, de mouvements. */
export function SqueletteCartes({
  nombre = 3,
  hauteur = 88,
  libelle,
}: {
  nombre?: number
  hauteur?: number
  libelle: string
}) {
  return (
    <ZoneEnAttente libelle={libelle}>
      {Array.from({ length: nombre }, (_, i) => (
        <Bloc key={i} className="rounded-[10px]" style={{ height: hauteur }} />
      ))}
    </ZoneEnAttente>
  )
}

/** Des tuiles d'indicateurs, côte à côte — le tableau de bord, le pilotage. */
export function SqueletteTuiles({ nombre = 4, libelle }: { nombre?: number; libelle: string }) {
  return (
    <ZoneEnAttente libelle={libelle}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: nombre }, (_, i) => (
          <Bloc key={i} className="h-[104px] rounded-[10px]" />
        ))}
      </div>
    </ZoneEnAttente>
  )
}

/**
 * Des lignes de texte — un paragraphe, un historique, une liste courte.
 * La dernière est plus courte : c'est ce que fait un vrai paragraphe, et ça se reconnaît.
 */
export function SqueletteLignes({
  nombre = 3,
  libelle,
  className,
}: {
  nombre?: number
  libelle: string
  className?: string
}) {
  return (
    <ZoneEnAttente libelle={libelle} className={cn('gap-1.5', className)}>
      {Array.from({ length: nombre }, (_, i) => (
        <Bloc key={i} className={cn('h-[13px] rounded', i === nombre - 1 ? 'w-[55%]' : 'w-full')} />
      ))}
    </ZoneEnAttente>
  )
}

/**
 * Un fil de discussion — bulles alternées, largeurs inégales.
 *
 * Des bulles toutes de la même taille du même côté ne ressembleraient à aucune conversation ; on
 * n'y reconnaîtrait pas ce qui arrive.
 */
export function SqueletteFil({ nombre = 4, libelle }: { nombre?: number; libelle: string }) {
  const largeurs = ['78%', '62%', '85%', '55%', '70%', '48%']
  return (
    <ZoneEnAttente libelle={libelle} className="gap-3">
      {Array.from({ length: nombre }, (_, i) => (
        <div key={i} className={cn('flex', i % 2 === 1 ? 'justify-end' : 'justify-start')}>
          <Bloc className="h-[52px] rounded-[12px]" style={{ width: largeurs[i % largeurs.length] }} />
        </div>
      ))}
    </ZoneEnAttente>
  )
}

/** Des réglages : un intitulé à gauche, un interrupteur à droite. */
export function SqueletteReglages({ nombre = 4, libelle }: { nombre?: number; libelle: string }) {
  return (
    <ZoneEnAttente libelle={libelle} className="gap-3">
      {Array.from({ length: nombre }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Bloc className="h-[13px] w-[45%] rounded" />
            <Bloc className="h-[11px] w-[72%] rounded" />
          </div>
          <Bloc className="h-[22px] w-[40px] shrink-0 rounded-full" />
        </div>
      ))}
    </ZoneEnAttente>
  )
}
