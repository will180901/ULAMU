/**
 * La règle d'un fichier téléversé — chantier 130, 15/09/2026.
 *
 * ⚠️ Ce fichier est VENDORÉ. La source est `packages/shared/src/fichier.ts` ; les copies sont
 * `apps/web/src/lib/fichier.ts` et `apps/mobile/src/lib/fichier.ts`. Toute correction se fait dans
 * la SOURCE, puis se recopie — jamais l'inverse.
 *
 * ── Pourquoi elle existe ──────────────────────────────────────────────────────────────────────
 *
 * ⚠️ **Il y avait TROIS plafonds pour une seule règle.** Mesuré le 15/09 :
 *
 *   • l'écran « Ma vérification » refusait au-delà de **5 Mo** ;
 *   • le contrat d'envoi acceptait **11 000 000 caractères** de base64, soit ~8 Mo de fichier ;
 *   • `StorageService` plafonnait à **8 Mo**.
 *
 * Un diplôme scanné de 6 Mo était donc refusé par l'écran alors que le serveur l'aurait pris. Et le
 * message disait « 5 Mo maximum » : le déposant réduisait son fichier pour rien.
 *
 * > **Trois chiffres pour une même règle finissent par faire trois règles.**
 *
 * ── Pourquoi elle vit ICI, et pas seulement au serveur ────────────────────────────────────────
 *
 * Le serveur décide et décidera toujours — `StorageService` est le point de passage unique, et il
 * refuse. Mais un refus qui arrive APRÈS l'envoi se paie en minutes sur une connexion congolaise :
 * téléverser 8 Mo pour lire « trop lourd » à l'arrivée, c'est le temps perdu deux fois. *Une règle
 * connue des deux côtés se respecte avant de coûter.*
 *
 * ⚠️ C'est donc un MIROIR du serveur, comme `numero.ts` l'est de `m01.policies` : si le plafond
 * change là-bas, ces trois copies doivent suivre. Le test `apps/api/src/common/storage.service.spec`
 * garde l'accord entre le serveur et cette valeur.
 */

/**
 * Le plafond, en octets — **8 Mo**, la valeur du serveur.
 *
 * ⚠️ Ce n'est pas « 5 Mo arrondi » : c'est exactement `StorageService.maxBytes`. Annoncer moins que
 * ce que le serveur accepte fait refuser des fichiers valides ; annoncer plus les fait refuser
 * après l'envoi. *Un plafond annoncé qui n'est pas le plafond appliqué est un mensonge dans les
 * deux sens.*
 */
export const TAILLE_MAX_OCTETS = 8 * 1024 * 1024

/**
 * Les types acceptés pour une PIÈCE (justificatif, document) — PDF et images.
 *
 * ⚠️ Volontairement plus étroit que ce que le stockage accepte : celui-ci connaît aussi l'audio et
 * la vidéo, qui n'ont rien à faire dans un dossier de vérification. *Une liste blanche qui autorise
 * plus que le besoin finit par servir à autre chose.*
 */
export const MIMES_PIECE = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const

/** « 8 Mo », « 512 Ko » — pour l'annoncer avant d'envoyer, dans la langue de l'écran. */
export function formatTaille(octets: number): string {
  if (octets >= 1024 * 1024) {
    const mo = octets / (1024 * 1024)
    return `${Number.isInteger(mo) ? mo : mo.toFixed(1)} Mo`
  }
  return `${Math.round(octets / 1024)} Ko`
}

/**
 * Ce fichier peut-il partir ? `null` si oui, sinon la raison, déjà écrite pour l'utilisateur.
 *
 * ⚠️ L'ordre compte : on vérifie la TAILLE d'abord. Un fichier de 40 Mo au mauvais format doit
 * s'entendre dire qu'il est trop lourd — c'est ce qu'il faut corriger en premier, et c'est ce qui
 * coûterait le plus cher à envoyer pour l'apprendre.
 */
export function refusFichier(
  fichier: { size: number; type: string },
  mimesAcceptes: readonly string[] = MIMES_PIECE,
): string | null {
  if (fichier.size > TAILLE_MAX_OCTETS) {
    return `Fichier trop lourd : ${formatTaille(TAILLE_MAX_OCTETS)} maximum.`
  }
  if (fichier.size === 0) {
    return 'Fichier vide.'
  }
  /*
    Le type déclaré par le système peut être vide (certains navigateurs Android sur un fichier sans
    extension connue). On ne refuse PAS dans ce cas : le serveur tranchera, et refuser ici
    empêcherait un dépôt légitime pour une raison que personne ne peut corriger. *Mieux vaut un
    refus tardif qu'un refus impossible à comprendre.*
  */
  if (fichier.type !== '' && !mimesAcceptes.includes(fichier.type.toLowerCase())) {
    return 'Format accepté : PDF, JPEG, PNG ou WebP.'
  }
  return null
}
