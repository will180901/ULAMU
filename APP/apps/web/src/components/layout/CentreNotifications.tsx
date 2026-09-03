/**
 * Le centre de notifications — cloche de la barre du haut. Chantier 37, 03/09/2026.
 *
 * ── Ce qui manquait, et ce que ça coûtait ─────────────────────────────────────────────────────
 *
 * Le serveur envoie **49 modèles** de notifications. Le web n'en affichait **aucune**. Il branchait
 * les *préférences* — un soignant pouvait choisir les notifications qu'il reçoit, et n'en voyait
 * jamais une seule. Le patient, lui, les lit sur mobile depuis le début.
 *
 * Quelques-unes de celles qui se perdaient, pour un médecin :
 *   • « Nouvelle demande de consultation » — un patient attend, avec un délai qui court ;
 *   • « Délai de compte-rendu dépassé » — **les gains de la séance sont gelés** (D-008) ;
 *   • « Nouveau contrat d'adhésion » — tant qu'il n'est pas signé, il n'exerce plus.
 *
 * Ce n'était pas un oubli : le chantier 1 l'avait écarté en écrivant « M14 est une fonctionnalité à
 * part entière, pas un morceau de coquille ». C'était juste. Elle est construite maintenant.
 *
 * ── Les choix qui se discutent, et pourquoi ils sont tranchés ainsi ───────────────────────────
 *
 * **Ouvrir le tiroir ne marque RIEN comme lu.** C'est l'usage le plus répandu, et c'est le pire :
 * il efface le seul repère de l'utilisateur dès qu'il jette un œil. Ici, une notification devient
 * lue quand on la LIT — c'est-à-dire quand on clique dessus — ou quand on demande explicitement
 * « tout marquer comme lu ».
 *
 * **La liste n'est chargée qu'à l'ouverture** (`enabled: ouvert`). Le badge, lui, se rafraîchit
 * seul toutes les minutes. C'est la seule des deux lectures qui doit rester fraîche : afficher un
 * historique de vingt lignes en boucle pour un compteur serait payer cher un chiffre.
 *
 * **Une notification mène à son écran** quand il en existe un dans le web — voir
 * `lib/destination-notification.ts`. Une notification qui prévient sans emmener oblige à refaire le
 * chemin de tête ; c'est justement le geste qu'on promettait d'éviter en prévenant.
 *
 * ── Ce que cet écran ne fait PAS, volontairement ──────────────────────────────────────────────
 *
 * Pas de son, pas de vignette système, pas de temps réel : le serveur n'a aucun canal poussé vers
 * le web (le push existe, mais pour le mobile). Promettre l'instantané avec un sondage d'une minute
 * serait un mensonge de plus dans une application qui a passé trois chantiers à en retirer.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, CheckCheck, Settings2, Trash2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avis } from '@/components/ulamu/parts'
import { SqueletteLignes } from '@/components/ulamu/Squelette'
import { api, type NotificationRecue } from '@/lib/api'
import { accord } from '@/lib/accord'
import { dateComplete, depuis } from '@/lib/temps'
import { destinationNotification } from '@/lib/destination-notification'
import { useCapabilities } from '@/hooks/useCapabilities'
import { cn } from '@/lib/utils'
import { messageErreur } from '@/lib/message-erreur'

/**
 * L'étiquette lue à voix haute pour une ligne.
 *
 * Écrite à part parce que la version naïve — `${titre}. ${corps}` — produisait « vous sollicite.. »,
 * le corps portant déjà son point. Une synthèse vocale marque ce double point par une pause qui
 * n'existe nulle part à l'écrit. Chaque morceau est donc débarrassé de sa ponctuation finale avant
 * d'être recousu.
 */
function etiquetteLigne(n: NotificationRecue, cliquable: boolean): string {
  return (
    [n.readAt ? null : 'Non lue', n.title, n.body, cliquable ? 'Ouvrir' : null]
      .filter((p): p is string => p !== null)
      .map((p) => p.replace(/[.\s]+$/, ''))
      .join('. ') + '.'
  )
}

/** Le badge ne compte pas au-delà : « 99+ » se lit, « 1 247 » ne tient pas et n'apprend rien. */
const PLAFOND_BADGE = 99

/** Une page de vingt lignes : de quoi couvrir un retour de week-end sans faire défiler à l'infini. */
const PAR_PAGE = 20

/**
 * Le rythme du badge. Une minute est un compromis assumé : assez court pour qu'un médecin voie
 * arriver une demande sans recharger, assez long pour ne pas réveiller l'API gratuite de Render à
 * chaque respiration. Le rafraîchissement au retour sur l'onglet fait le reste du travail.
 */
const RYTHME_BADGE_MS = 60_000

export function CentreNotifications() {
  const [ouvert, setOuvert] = useState(false)
  const navigate = useNavigate()
  const capacites = useCapabilities()
  const qc = useQueryClient()

  const badge = useQuery({
    queryKey: ['notifications', 'non-lues'],
    queryFn: () => api.notificationsUnreadCount(),
    refetchInterval: RYTHME_BADGE_MS,
    refetchOnWindowFocus: true,
  })

  const liste = useInfiniteQuery({
    queryKey: ['notifications', 'liste'],
    queryFn: ({ pageParam }) =>
      api.notifications({ limit: PAR_PAGE, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: '',
    getNextPageParam: (derniere) => derniere.nextCursor ?? undefined,
    // Rien n'est chargé tant que le tiroir n'est pas ouvert : c'est le badge qui vit en continu.
    enabled: ouvert,
  })

  /** Les deux lectures bougent ensemble : marquer lu change la liste ET le compteur. */
  const rafraichir = () => {
    void qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const marquerLue = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: rafraichir,
  })
  const toutMarquer = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: rafraichir,
  })
  const supprimer = useMutation({
    mutationFn: (id: string) => api.deleteNotification(id),
    onSuccess: rafraichir,
  })

  const items: NotificationRecue[] = liste.data?.pages.flatMap((p) => p.items) ?? []

  /*
    ⚠️ `undefined` veut dire « on ne sait pas » — et ce n'est ni zéro, ni « aucune ».

    La première version écrivait `?? 0`. Vu en ligne, le défaut sautait aux yeux : quand la lecture
    du compteur échoue (API endormie sur l'offre gratuite de Render, réseau coupé), la cloche
    annonçait « aucune non lue » — un mensonge, et exactement celui que le principe du projet
    interdit : **une lecture qui échoue n'est ni un zéro ni un « non »**.

    Trois états, donc, et non deux : on sait qu'il y en a N · on sait qu'il n'y en a aucune · on ne
    sait pas.
  */
  const nonLues = badge.data?.unread
  const compteurIndisponible = badge.isError

  /**
   * Y a-t-il quelque chose à marquer ?
   *
   * On regarde le compteur ET la liste : si le compteur a échoué mais que la liste montre des
   * non-lues, le bouton doit rester offert. L'inverse est vrai aussi, la liste n'étant chargée
   * qu'à l'ouverture.
   */
  const auMoinsUneNonLue = (nonLues ?? 0) > 0 || items.some((n) => n.readAt === null)

  /** Le lien n'existe que si l'écran existe ET que ce compte a le droit de l'ouvrir. */
  const menePart = (n: NotificationRecue) => {
    const d = destinationNotification(n.template)
    return d !== null && capacites.hasAny(...d.capabilities) ? d.href : null
  }

  /**
   * Un clic sur une notification : elle devient lue, et emmène là où elle porte.
   *
   * Le marquage part AVANT la navigation : si la page suivante démonte ce composant, la requête est
   * déjà en vol.
   */
  const ouvrir = (n: NotificationRecue) => {
    if (!n.readAt) marquerLue.mutate(n.id)
    const href = menePart(n)
    if (href) {
      setOuvert(false)
      navigate(href)
    }
  }

  return (
    <Popover open={ouvert} onOpenChange={setOuvert}>
      <PopoverTrigger
        aria-label={
          compteurIndisponible
            ? 'Notifications — le nombre de non-lues n’a pas pu être lu'
            : nonLues === undefined
              ? 'Notifications'
              : nonLues > 0
                ? `Notifications : ${nonLues} non ${accord(nonLues, 'lue')}`
                : 'Notifications : aucune non lue'
        }
        className="relative flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none data-[state=open]:bg-secondary data-[state=open]:text-foreground"
      >
        <Bell size={18} strokeWidth={1.5} aria-hidden="true" />
        {/* La pastille est décorative : le nombre est déjà dans l'intitulé du bouton, lu par les
            lecteurs d'écran. L'annoncer deux fois le ferait entendre deux fois. */}
        {compteurIndisponible ? (
          /* Compteur illisible : une pastille GRISE et VIDE. Elle ne dit pas « zéro » — elle dit
             qu'il y a quelque chose à savoir et qu'on ne le sait pas. L'intitulé du bouton
             l'explique en toutes lettres. */
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 size-[7px] rounded-full bg-[var(--texte-tertiaire)]"
          />
        ) : nonLues !== undefined && nonLues > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[var(--erreur-accent)] px-1 font-mono text-[9px] leading-none font-semibold text-white"
          >
            {nonLues > PLAFOND_BADGE ? `${PLAFOND_BADGE}+` : nonLues}
          </span>
        ) : null}
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={6} className="w-[min(24rem,calc(100vw-2rem))] gap-0 p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <h2 className="text-[13px] font-semibold text-foreground">Notifications</h2>
          {auMoinsUneNonLue ? (
            <button
              type="button"
              onClick={() => toutMarquer.mutate()}
              disabled={toutMarquer.isPending}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-50"
            >
              <CheckCheck size={12} strokeWidth={1.5} aria-hidden="true" />
              Tout marquer comme lu
            </button>
          ) : null}
        </div>

        <div className="max-h-[min(30rem,60vh)] overflow-y-auto">
          {liste.isPending ? (
            <div className="px-3 py-3">
              <SqueletteLignes nombre={4} libelle="Chargement de vos notifications" />
            </div>
          ) : liste.isError ? (
            <div className="p-3">
              <Avis ton="erreur">{messageErreur(liste.error)}</Avis>
            </div>
          ) : items.length === 0 ? (
            /* Un vide EXPLIQUÉ. « Aucune notification » seul laisse croire à une panne ; la seconde
               phrase dit ce que l'écran fera quand il aura quelque chose à dire. */
            <div className="px-4 py-8 text-center">
              <Bell
                size={20}
                strokeWidth={1.5}
                aria-hidden="true"
                className="mx-auto mb-2 text-[var(--texte-tertiaire)]"
              />
              <p className="text-[13px] text-foreground">Aucune notification</p>
              <p className="mt-1 text-[11px] leading-snug text-[var(--texte-tertiaire)]">
                Les demandes de consultation, les comptes-rendus attendus et les mouvements de vos gains
                apparaîtront ici.
              </p>
            </div>
          ) : (
            <ul>
              {items.map((n) => (
                <LigneNotification
                  key={n.id}
                  notification={n}
                  cliquable={menePart(n) !== null}
                  surOuvrir={() => ouvrir(n)}
                  surSupprimer={() => supprimer.mutate(n.id)}
                  suppressionEnCours={supprimer.isPending && supprimer.variables === n.id}
                />
              ))}
            </ul>
          )}

          {liste.hasNextPage ? (
            <button
              type="button"
              onClick={() => void liste.fetchNextPage()}
              disabled={liste.isFetchingNextPage}
              className="w-full border-t border-border px-3 py-2.5 text-[12px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-50"
            >
              {liste.isFetchingNextPage ? 'Chargement…' : 'Afficher les plus anciennes'}
            </button>
          ) : null}
        </div>

        {/* Le lien vers les préférences : l'écran qui existait AVANT les notifications elles-mêmes.
            C'est là qu'on coupe une catégorie — sauf les alertes vitales (RM-14-02). */}
        <div className="border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={() => {
              setOuvert(false)
              navigate('/parametres')
            }}
            className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            <Settings2 size={12} strokeWidth={1.5} aria-hidden="true" />
            Choisir les notifications que je reçois
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Une ligne.
 *
 * ⚠️ Le bouton « supprimer » est un `<button>` À CÔTÉ, jamais DEDANS : un bouton dans un bouton est
 * invalide en HTML, et les lecteurs d'écran n'en annoncent qu'un des deux. La ligne entière n'est
 * donc pas un bouton — c'est son contenu qui l'est.
 */
function LigneNotification({
  notification: n,
  cliquable,
  surOuvrir,
  surSupprimer,
  suppressionEnCours,
}: {
  notification: NotificationRecue
  cliquable: boolean
  surOuvrir: () => void
  surSupprimer: () => void
  suppressionEnCours: boolean
}) {
  const lue = n.readAt !== null

  return (
    <li className="group relative flex items-start gap-2 border-b border-border/60 px-3 py-2.5 last:border-b-0 hover:bg-secondary/50">
      {/* La pastille du non-lu. Jamais la couleur SEULE (CG-11) : le titre passe aussi en gras, et
          l'intitulé du bouton dit « non lue » en toutes lettres. */}
      <span
        aria-hidden="true"
        className={cn(
          'mt-[6px] size-[6px] shrink-0 rounded-full',
          lue ? 'bg-transparent' : 'bg-[var(--erreur-accent)]',
        )}
      />

      <button
        type="button"
        onClick={surOuvrir}
        aria-label={etiquetteLigne(n, cliquable)}
        className={cn(
          'min-w-0 flex-1 text-left focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none',
          cliquable ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        <span aria-hidden="true" className="block">
          <span
            className={cn(
              'block text-[12.5px] leading-snug',
              lue ? 'text-muted-foreground' : 'font-semibold text-foreground',
            )}
          >
            {n.title}
          </span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-[var(--texte-tertiaire)]">{n.body}</span>
          <span
            className="mt-1 block font-mono text-[10px] text-[var(--texte-tertiaire)]"
            title={dateComplete(n.createdAt)}
          >
            {depuis(n.createdAt)}
          </span>
        </span>
      </button>

      <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        {/* « Marquer comme lu » sans ouvrir : pour la notification qu'on a comprise au titre. */}
        {lue ? null : (
          <button
            type="button"
            onClick={surOuvrir}
            aria-label={`Marquer « ${n.title} » comme lue`}
            className="flex size-6 items-center justify-center rounded text-[var(--texte-tertiaire)] transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            <Check size={12} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={surSupprimer}
          disabled={suppressionEnCours}
          aria-label={`Supprimer « ${n.title} »`}
          className="flex size-6 items-center justify-center rounded text-[var(--texte-tertiaire)] transition-colors hover:bg-secondary hover:text-[var(--erreur-texte)] focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-40"
        >
          <Trash2 size={12} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </span>
    </li>
  )
}
