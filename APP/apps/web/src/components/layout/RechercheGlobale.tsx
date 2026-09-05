/**
 * Recherche globale — chantier 46, 05/09/2026.
 *
 * ── Ce qui manquait ─────────────────────────────────────────────────────────────────────────────
 *
 * Le plan l'avait volontairement écartée du chantier A1 : *« chercher dans des dossiers qui
 * n'existent pas encore n'a pas de sens »*. Les dossiers existent maintenant, et l'application a
 * seize écrans : atteindre « Paramètres métier » depuis une consultation demande de replier le fil,
 * d'ouvrir le tiroir, de dérouler un groupe.
 *
 * ── Ce que cette palette cherche VRAIMENT, et ce qu'elle ne cherche pas ─────────────────────────
 *
 * Deux sources, et rien d'autre, parce qu'il n'existe rien d'autre à chercher côté serveur :
 *
 * 1. **Les écrans**, lus de `useNavigation()` — donc déjà filtrés par les capacités de la session.
 * 2. **Les comptes**, par `GET /v1/admin/accounts?query=` (M16). C'est la SEULE route de l'API qui
 *    cherche du texte dans des données, et elle est réservée à certains sous-rôles.
 *
 * ⚠️ **Il n'y a aucune recherche de consultations, de pièces justificatives ni du journal d'audit.**
 * Aucune route ne les cherche par texte : le journal se filtre par action et par acteur exacts, les
 * pièces se listent par dossier, les consultations par participant. Prétendre le contraire dans une
 * palette ferait chercher longtemps ce qui n'y sera jamais — la palette le dit donc en toutes
 * lettres, en bas.
 *
 * ── Deux règles du projet appliquées ici ───────────────────────────────────────────────────────
 *
 * • **Les capacités ne sont pas recopiées.** Le droit de chercher des comptes se lit sur l'entrée
 *   `admin-comptes` de `NAV_GROUPS`, qui porte déjà exactement ce que le serveur accepte
 *   (`@AdminOnly(ADMIN_VERIFICATION, ADMIN_MAP)`, SUPER_ADMIN passant partout). Une liste écrite ici
 *   à la main dériverait le jour où la matrice change — la faute du chantier 37, corrigée alors.
 * • **Une lecture qui échoue n'est ni un zéro ni un « non ».** Une recherche de comptes en échec ne
 *   dit jamais « aucun résultat » : elle dit qu'elle n'a pas pu chercher.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, UserCog } from 'lucide-react'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Spinner } from '@/components/ui/spinner'
import { NAV_GROUPS } from '@/config/navigation.config'
import { useCapabilities } from '@/hooks/useCapabilities'
import { useNavigation } from '@/hooks/useNavigation'
import { api } from '@/lib/api'

/**
 * Le serveur refuse une recherche vide, et une seule lettre ramènerait cinquante comptes sans
 * rapport. Deux caractères est le premier seuil où le terme veut dire quelque chose.
 */
const MIN_CARACTERES = 2

/** Le temps qu'on laisse à la frappe avant d'interroger le serveur. */
const ATTENTE_FRAPPE_MS = 250

/** `searchAccounts` renvoie au plus 50 lignes (`take: 50`) — au-delà, le silence tromperait. */
const PLAFOND_COMPTES = 50

/** « Ngouabi » doit se trouver en tapant « ngouabi », et « Vérification » en tapant « verification ». */
function sansAccent(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Les capacités qui ouvrent la recherche de comptes, LUES de la navigation.
 *
 * L'entrée `admin-comptes` porte déjà la liste que le serveur accepte, et elle porte le commentaire
 * qui l'explique. La relire ici garantit qu'un changement de matrice ne laisse pas deux vérités.
 */
const CAPACITES_COMPTES =
  NAV_GROUPS.flatMap((g) => g.items).find((i) => i.key === 'admin-comptes')?.capabilities ?? []

export function RechercheGlobale() {
  const [ouvert, setOuvert] = useState(false)
  const [terme, setTerme] = useState('')
  const [termeRetarde, setTermeRetarde] = useState('')
  const naviguer = useNavigate()
  const groupes = useNavigation()
  const { hasAny } = useCapabilities()

  const peutChercherComptes = hasAny(...CAPACITES_COMPTES)

  // Ctrl+K / ⌘K — le raccourci vient EN PLUS du bouton, jamais à sa place : une fonction qui
  // n'existe qu'au clavier n'existe pas pour qui ne la connaît pas.
  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setOuvert((v) => !v)
      }
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [])

  // On n'interroge pas le serveur à chaque frappe : « Ngou » enverrait quatre requêtes, dont trois
  // dont personne ne lira jamais la réponse — et chacune est un accès à des données de comptes.
  useEffect(() => {
    const t = setTimeout(() => setTermeRetarde(terme), ATTENTE_FRAPPE_MS)
    return () => clearTimeout(t)
  }, [terme])

  const recherche = terme.trim()
  const rechercheRetardee = termeRetarde.trim()

  const comptes = useQuery({
    queryKey: ['recherche-globale-comptes', rechercheRetardee],
    queryFn: () => api.searchAccounts(rechercheRetardee),
    enabled: ouvert && peutChercherComptes && rechercheRetardee.length >= MIN_CARACTERES,
    retry: false,
  })

  const ecrans = useMemo(() => {
    const tous = groupes.flatMap((g) => g.items)
    if (recherche.length === 0) return tous
    const q = sansAccent(recherche)
    return tous.filter((i) => sansAccent(i.label).includes(q))
  }, [groupes, recherche])

  function aller(href: string) {
    setOuvert(false)
    setTerme('')
    setTermeRetarde('')
    naviguer(href)
  }

  const resultatsComptes = comptes.data ?? []
  const chercheComptes = peutChercherComptes && rechercheRetardee.length >= MIN_CARACTERES

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label="Rechercher"
        aria-keyshortcuts="Control+K"
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
      >
        <Search size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>

      <CommandDialog
        open={ouvert}
        onOpenChange={setOuvert}
        title="Recherche"
        description="Cherchez un écran, ou un compte si votre rôle le permet."
      >
        {/*
          `shouldFilter={false}` : cmdk filtrerait aussi les comptes, qui viennent DÉJÀ filtrés par
          le serveur — il en cacherait sur une différence d'accent ou de casse que le serveur, lui,
          a acceptée. Le filtrage des écrans est fait plus haut, sans accents.
        */}
        <Command shouldFilter={false}>
          <CommandInput
            value={terme}
            onValueChange={setTerme}
            placeholder={peutChercherComptes ? 'Un écran, un nom, un téléphone…' : 'Un écran…'}
          />
          <CommandList>
            {ecrans.length > 0 ? (
              <CommandGroup heading="Aller à">
                {ecrans.map((i) => {
                  const Icone = i.icon
                  return (
                    <CommandItem key={i.key} value={i.key} onSelect={() => aller(i.href)}>
                      <Icone size={15} strokeWidth={1.5} aria-hidden="true" />
                      <span>{i.label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ) : null}

            {chercheComptes ? (
              <CommandGroup heading="Comptes">
                {comptes.isPending ? (
                  <div className="flex items-center gap-2 px-2 py-3 text-[12px] text-[var(--texte-tertiaire)]">
                    <Spinner className="size-3.5" /> Recherche des comptes…
                  </div>
                ) : comptes.isError ? (
                  /*
                    « Aucun compte » et « je n'ai pas pu chercher » ne se disent pas pareil : le
                    premier est une réponse, le second un échec. Les confondre ferait conclure à un
                    administrateur qu'une personne n'existe pas.
                  */
                  <div role="alert" className="px-2 py-3 text-[12px] leading-[1.5] text-[var(--erreur-texte)]">
                    La recherche de comptes n'a pas abouti. Ce n'est pas une réponse : réessayez.
                  </div>
                ) : resultatsComptes.length === 0 ? (
                  <div className="px-2 py-3 text-[12px] text-[var(--texte-tertiaire)]">
                    Aucun compte ne porte ce nom ni ce numéro.
                  </div>
                ) : (
                  <>
                    {resultatsComptes.map((c) => (
                      <CommandItem
                        key={c.accountId}
                        value={c.accountId}
                        onSelect={() => aller(`/admin/comptes?q=${encodeURIComponent(rechercheRetardee)}`)}
                      >
                        <UserCog size={15} strokeWidth={1.5} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{c.displayName}</span>
                        <span className="shrink-0 text-[11px] text-[var(--texte-tertiaire)]">{c.phone}</span>
                      </CommandItem>
                    ))}
                    {resultatsComptes.length >= PLAFOND_COMPTES ? (
                      /* Le serveur s'arrête à 50. Ne pas le dire ferait croire la liste complète. */
                      <div className="px-2 py-2 text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                        Les {PLAFOND_COMPTES} premiers comptes seulement — précisez votre recherche.
                      </div>
                    ) : null}
                  </>
                )}
              </CommandGroup>
            ) : null}

            {ecrans.length === 0 && !chercheComptes ? (
              <CommandEmpty>Aucun écran ne porte ce nom.</CommandEmpty>
            ) : null}
          </CommandList>

          {/*
            Dire ce qu'on ne cherche PAS évite de chercher longtemps ce qui n'y sera jamais. Aucune
            route de l'API ne cherche du texte dans les consultations, les pièces ou le journal.
          */}
          <p className="border-t border-border px-3 py-2 text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
            {peutChercherComptes ? 'Écrans et comptes.' : 'Écrans seulement.'} Les consultations, les
            pièces et le journal ne se cherchent pas ici.
          </p>
        </Command>
      </CommandDialog>
    </>
  )
}
