/**
 * Le rappel de double authentification sur les écrans d'administration — chantier 24, 02/09/2026.
 *
 * ── Le problème qu'il règle ───────────────────────────────────────────────────────────────────
 *
 * Depuis le 01/09, RM-01-06 est rétablie sur l'API en ligne : un compte d'administration dont le
 * TOTP n'est pas activé reçoit **403 sur toutes les routes admin**. Les sept écrans affichent donc
 * leur message de panne — « Les administrateurs n'ont pas pu être lus », « La file n'a pas pu être
 * lue » — et proposent « Réessayer ».
 *
 * Rien de tout cela n'est faux, et rien de tout cela n'aide : la lecture a bien échoué, mais elle
 * échouera identiquement au dixième essai. L'écran décrit un symptôme et propose un geste sans
 * effet, tandis que la sortie — `/configuration-totp` — n'est nommée nulle part.
 *
 * ── Pourquoi un bandeau, et pas seulement un meilleur message d'erreur ────────────────────────
 *
 * Parce que la condition est connue AVANT le premier appel. Il n'y a pas à attendre un 403 pour
 * savoir qu'il va tomber : `me.totpEnabled` le dit déjà. Un message d'erreur arriverait après la
 * panne ; le bandeau arrive avant, ce qui est la règle que le chantier 4 a tirée de l'avertissement
 * de remboursement — **un avertissement au passé ne sert à rien**.
 *
 * (Les branches d'erreur des sept écrans sont traitées à part, dans le même chantier : le bandeau
 * explique, mais tant qu'un bouton « Réessayer » subsiste il continue d'inviter à un geste vain.)
 *
 * ── Ce que le bandeau se garde de promettre ───────────────────────────────────────────────────
 *
 * Il énonce une condition NÉCESSAIRE — « sans elle, l'administration refuse toute lecture » — et
 * jamais une condition suffisante. La garde du serveur vérifie deux choses avant le TOTP : que le
 * compte porte bien un sous-rôle d'administration (« Aucun sous-rôle admin attribué »). Un compte
 * sans sous-rôle resterait donc bloqué après avoir activé son TOTP, et une phrase du genre
 * « activez-la et tout se rouvre » lui mentirait.
 *
 * C'est la leçon du chantier 15, retournée : une protection annoncée qui n'existe pas est pire
 * qu'une protection absente — et une réparation annoncée qui ne répare pas l'est tout autant.
 *
 * ── Pourquoi `alerte` et non `erreur` ─────────────────────────────────────────────────────────
 *
 * `parts.tsx` pose la distinction : `erreur` dit qu'une action a ÉCHOUÉ, `alerte` qu'une action
 * MANQUE. Activer sa 2FA n'a pas échoué — elle n'a pas été faite. La teinte rouge ferait chercher
 * une panne là où il y a une étape.
 */
import { Link, useLocation } from 'react-router-dom'
import { Avis } from '@/components/ulamu/parts'
import { Button } from '@/components/ui/button'
import { useTotpAdminManquant } from '@/hooks/useTotpAdminManquant'

export function RappelTotpAdmin() {
  const manquant = useTotpAdminManquant()
  const { pathname } = useLocation()

  /*
    Uniquement sur les écrans d'administration. Le même compte peut ouvrir « Mes paramètres » ou le
    tableau de bord sans rien subir : y afficher le bandeau serait un rappel là où il n'y a aucune
    panne à expliquer — et un avertissement qu'on voit partout finit par ne plus se voir nulle part.
  */
  if (!pathname.startsWith('/admin/') || !manquant) return null

  return (
    <div className="mb-4">
      <Avis ton="alerte">
        Votre double authentification n'est pas activée. Sans elle, l'administration refuse toute
        lecture (RM-01-06) : les écrans de cette section resteront vides, et réessayer n'y changera
        rien.{' '}
        <Link
          to="/configuration-totp"
          className="font-medium underline underline-offset-2 hover:no-underline"
        >
          Activer ma double authentification
        </Link>
      </Avis>
    </div>
  )
}

/**
 * Ce qu'on propose au bas d'un écran d'administration qui n'a rien pu lire.
 *
 * Les cinq grandes cartes d'échec — E1, E3, E4, E5, E6 — offraient toutes « Réessayer ». Le geste
 * est le bon quand la lecture a buté sur un réseau ; il est vide quand elle a buté sur RM-01-06,
 * puisque le dixième essai sera refusé comme le premier.
 *
 * C'est la même faute que « Bannir » en E7, relevée au chantier 12 : **un bouton qui nomme autre
 * chose que ce qu'il fait**. Ici il ne nomme même pas une autre action, il en nomme une qui n'a
 * aucun effet — et il occupe la place de celle qui en aurait un.
 *
 * Le titre et le sous-titre de chaque carte ne bougent pas : ils restent vrais (« Rien n'a été
 * modifié », « Aucune décision n'est perdue »), et ils ont été écrits écran par écran.
 */
export function ActionApresEchec({ surReessayer }: { surReessayer: () => void }) {
  const manquant = useTotpAdminManquant()

  if (manquant) {
    return (
      <Button asChild>
        <Link to="/configuration-totp">Activer ma double authentification</Link>
      </Button>
    )
  }
  return (
    <Button type="button" onClick={surReessayer}>
      Réessayer
    </Button>
  )
}
