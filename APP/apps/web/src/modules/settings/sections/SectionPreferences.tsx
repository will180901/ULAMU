/**
 * B3 · Préférences — affichage d'un côté, notifications de l'autre.
 *
 * ⚠️ **Écart assumé à la maquette.** Elle réunit tout sous « Ces réglages suivent votre compte, quel
 * que soit le poste utilisé », avec un bouton « Enregistrer ». C'est faux pour la moitié d'entre eux :
 * le thème, la page d'accueil et les sons n'ont aucune table côté serveur et vivent dans le
 * navigateur. Sur un poste d'officine partagé, promettre le contraire trompe l'utilisateur.
 *
 * Les deux familles sont donc séparées et chacune dit où elle vit. Il n'y a plus de bouton
 * « Enregistrer » : tout s'applique immédiatement — pour l'affichage parce que l'aperçu EST le
 * résultat, pour les notifications parce qu'un seul appel suffit par bascule.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Monitor } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Avis, Carte, Reglage, Segments } from '@/components/ulamu/parts'
import { Liste } from '@/components/ulamu/Liste'
import { api, type NotificationCategory } from '@/lib/api'
import { useThemeStore, type ThemeChoice } from '@/state/theme.store'
import { usePreferencesStore, type Densite } from '@/state/preferences.store'
import { NAV_GROUPS } from '@/config/navigation.config'
import { useCapabilities } from '@/hooks/useCapabilities'
import { SqueletteReglages } from '@/components/ulamu/Squelette'

/*
  ── Les intitulés ne sont plus écrits ici (dette n°18, 03/09/2026) ────────────────────────────

  Cet écran portait sa propre liste des cinq catégories, avec leurs intitulés et leurs phrases
  d'aide. Le mobile portait la sienne. **Les deux avaient déjà divergé** : « Consultations » ici,
  « Consultations & soins » là-bas ; « Service » ici, « Système & compte » là-bas. Deux
  utilisateurs de la même plateforme ne lisaient pas le même nom pour le même réglage.

  C'est aussi ce qui a fait qu'une phrase fausse — « réservations qui expirent » — a demandé DEUX
  chantiers pour disparaître : le 29 pour cet écran, le 30 pour le mobile.

  **Le serveur sert désormais `label` et `help`**, à côté du catalogue de modèles qui les décrit
  (`m14.templates.ts`). Cet écran n'a plus qu'à les afficher.

  ── Et la catégorie « Rappels » disparaît toute seule ─────────────────────────────────────────

  Le chantier 29 l'avait retirée d'ici à la main, pour une raison vérifiée : **aucun modèle de
  notification ne porte cette catégorie**, son interrupteur ne coupait donc rien. Le mobile, lui,
  l'affichait encore.

  Le serveur ne sert plus que les catégories qui portent réellement un modèle — comptées dans le
  catalogue, jamais écrites à la main. La suppression manuelle d'ici n'a plus lieu d'être, et **le
  jour où un premier rappel sera écrit, la ligne reviendra d'elle-même dans les deux applications**
  sans que personne ait à y penser.
*/

export function SectionPreferences() {
  const theme = useThemeStore((s) => s.choice)
  const setTheme = useThemeStore((s) => s.setTheme)
  const pageAccueil = usePreferencesStore((s) => s.pageAccueil)
  const setPageAccueil = usePreferencesStore((s) => s.setPageAccueil)
  const sons = usePreferencesStore((s) => s.sons)
  const setSons = usePreferencesStore((s) => s.setSons)
  const densite = usePreferencesStore((s) => s.densite)
  const setDensite = usePreferencesStore((s) => s.setDensite)
  const capacites = useCapabilities()
  const qc = useQueryClient()

  // Seules les pages réellement accessibles à ce rôle sont proposées : offrir « Mes gains » à une
  // officine renverrait l'utilisateur sur une redirection à chaque connexion.
  const pages = NAV_GROUPS.flatMap((g) => g.items).filter((i) => capacites.hasAny(...i.capabilities))

  const prefs = useQuery({ queryKey: ['notification-preferences'], queryFn: () => api.notificationPreferences() })
  const bascule = useMutation({
    mutationFn: (v: { category: NotificationCategory; enabled: boolean }) => api.setNotificationPreference(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-preferences'] }),
  })

  return (
    <div className="flex flex-col gap-4">
      <Carte icone={Monitor} titre="Affichage" sousTitre="Ces réglages restent sur cet appareil — un poste partagé garde donc les siens">
        <Reglage titre="Thème" aide="« Automatique » suit le réglage de votre système">
          <Segments
            label="Thème de l'interface"
            valeur={theme}
            onChange={(v) => setTheme(v as ThemeChoice)}
            options={[
              { cle: 'light' as ThemeChoice, label: 'Clair' },
              { cle: 'dark' as ThemeChoice, label: 'Sombre' },
              { cle: 'system' as ThemeChoice, label: 'Automatique' },
            ]}
          />
        </Reglage>

        <Reglage titre="Page d'accueil" aide="« Automatique » ouvre sur le poste de travail de votre fonction">
          <Liste
            label="Page d'accueil après connexion"
            className="w-56"
            valeur={pageAccueil}
            onChange={setPageAccueil}
            options={[
              { cle: 'auto', label: 'Automatique' },
              ...pages.map((p) => ({ cle: p.href, label: p.label })),
            ]}
          />
        </Reglage>

        {/*
          La densité, ajoutée le 01/09. Elle n'a été ajoutée qu'à une condition : qu'elle fasse
          réellement quelque chose. « Compact » resserre les lignes des tableaux et des listes —
          exactement ce que la maquette promet, et rien de plus. Un interrupteur qui ne changerait
          rien serait pire qu'un interrupteur absent : c'est la raison pour laquelle le sélecteur de
          langue, lui, a été retiré.
        */}
        <Reglage titre="Densité" aide="« Compact » rapproche les lignes des tableaux et des listes">
          <Segments
            label="Densité d'affichage"
            valeur={densite}
            onChange={setDensite}
            options={[
              { cle: 'confort' as Densite, label: 'Confort' },
              { cle: 'compact' as Densite, label: 'Compact' },
            ]}
          />
        </Reglage>

        <Reglage titre="Sons de l'interface" aide="Signal discret à l'arrivée d'une demande">
          <Switch checked={sons} onCheckedChange={setSons} aria-label="Sons de l'interface" />
        </Reglage>
      </Carte>

      <Carte icone={Bell} titre="Notifications" sousTitre="Celles-ci suivent votre compte, sur tous vos appareils">
        {prefs.isPending ? (
          <SqueletteReglages nombre={4} libelle="Lecture de vos préférences…" />
        ) : prefs.isError ? (
          <Avis ton="erreur">
            Vos préférences de notification n'ont pas pu être lues. Rien n'a été modifié — réessayez dans un moment.
          </Avis>
        ) : (
          prefs.data.preferences.map((c) => (
            <Reglage key={c.category} titre={c.label} aide={c.help}>
              <Switch
                checked={c.enabled}
                disabled={!c.adjustable || bascule.isPending}
                aria-label={c.label}
                onCheckedChange={(enabled) => bascule.mutate({ category: c.category, enabled })}
              />
            </Reglage>
          ))
        )}
        {bascule.isError ? <Avis ton="erreur">Le changement n'a pas été enregistré. L'interrupteur est revenu à son état réel.</Avis> : null}
      </Carte>
    </div>
  )
}
