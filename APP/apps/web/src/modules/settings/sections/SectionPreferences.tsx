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

/** Intitulés des cinq catégories de M14. `critical` figure mais ne se coupe pas (RM-14-02). */
const CATEGORIES: Array<{ cle: NotificationCategory; label: string; aide: string }> = [
  { cle: 'care', label: 'Consultations', aide: 'Demandes reçues, séances qui démarrent, comptes-rendus attendus' },
  { cle: 'money', label: 'Paiements et gains', aide: 'Encaissements, retraits, remboursements' },
  /*
    02/09/2026 (chantier 29) — la catégorie « Rappels » est retirée, pour DEUX raisons dont une
    seule vient de nous.

    La nôtre : son intitulé annonçait « réservations qui expirent ». Les réservations sont sorties
    du produit avec la chaîne du médicament (D-052) — la phrase était fausse depuis ce jour-là.

    L'autre, trouvée en la vérifiant : **aucun modèle de notification n'a jamais porté cette
    catégorie.** Compté dans `m14.templates.ts` — care 19, system 12, critical 10, money 7,
    reminder ZÉRO. L'interrupteur ne coupait donc rien, et ne l'a jamais fait.

    C'est exactement la règle du chantier 10, qui avait fait retirer le sélecteur de langue :
    **un interrupteur qui ne change rien est pire qu'un interrupteur absent, parce qu'on lui fait
    confiance.** Ici on lui confiait le silence de rappels qui n'existent pas.

    ⚠️ `reminder` reste dans `NOTIFICATION_CATEGORIES` côté serveur : le jour où un rappel sera
    écrit, la ligne revient ici. Ce n'est pas le contrat qu'on retire, c'est la promesse.
  */
  { cle: 'system', label: 'Service', aide: 'Maintenances, changements de conditions' },
  { cle: 'critical', label: 'Alertes vitales', aide: 'Toujours actives — elles ne peuvent pas être coupées' },
]

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
          <SqueletteReglages nombre={5} libelle="Lecture de vos préférences…" />
        ) : prefs.isError ? (
          <Avis ton="erreur">
            Vos préférences de notification n'ont pas pu être lues. Rien n'a été modifié — réessayez dans un moment.
          </Avis>
        ) : (
          CATEGORIES.map((c) => {
            const ligne = prefs.data.preferences.find((p) => p.category === c.cle)
            return (
              <Reglage key={c.cle} titre={c.label} aide={c.aide}>
                <Switch
                  checked={ligne?.enabled ?? true}
                  disabled={!ligne?.adjustable || bascule.isPending}
                  aria-label={c.label}
                  onCheckedChange={(enabled) => bascule.mutate({ category: c.cle, enabled })}
                />
              </Reglage>
            )
          })
        )}
        {bascule.isError ? <Avis ton="erreur">Le changement n'a pas été enregistré. L'interrupteur est revenu à son état réel.</Avis> : null}
      </Carte>
    </div>
  )
}
