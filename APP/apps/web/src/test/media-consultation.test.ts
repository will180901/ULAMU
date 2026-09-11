/**
 * Les règles des médias d'une consultation — chantier 75, 11/09/2026.
 *
 * ── Pourquoi ces règles ont besoin d'un test à part ───────────────────────────────────────────
 *
 * Elles sont le **miroir de contraintes serveur** que le serveur ne sert dans aucune route : la
 * liste des formats acceptés, et la limite de 8 Mo du stockage. Un miroir qui dérive ne casse rien
 * à la compilation — il produit un refus à l'arrivée, après que le fichier a traversé le réseau.
 *
 * C'est exactement le défaut que ce chantier corrige : on ne découvre plus la limite par l'échec.
 * Ces tests figent donc les chiffres, pour que les modifier devienne une DÉCISION.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatDuree,
  formatOctets,
  LIMITE_OCTETS,
  MIMES_AUDIO,
  MIMES_IMAGE,
  mimeVocal,
  PHOTOS_MAX,
  refusDEnvoi,
  VOCAL_MAX_S,
} from '@/modules/consultation/media'

/** Un faux fichier : seuls le type et la taille comptent pour ces règles. */
function fichier(type: string, octets: number): File {
  const f = new File(['x'], 'test', { type })
  Object.defineProperty(f, 'size', { value: octets })
  return f
}

describe('Les chiffres qui viennent du serveur', () => {
  /*
    ⚠️ 8 Mo, et pas 80. Le DTO serveur accepte 112 millions de caractères de base64 (~84 Mo) et son
    commentaire annonce « ≈ 80 Mo, cohérent avec StorageService » — alors que `StorageService`
    refuse au-delà de 8 Mo. Le commentaire est faux d'un facteur dix, et c'est le CHIFFRE RÉEL qui
    est repris ici. Si ce test tombe un jour, c'est que quelqu'un a aligné l'écran sur le
    commentaire plutôt que sur le code.
  */
  it('la limite est celle du STOCKAGE (8 Mo), pas celle du DTO', () => {
    expect(LIMITE_OCTETS).toBe(8 * 1024 * 1024)
  })

  /*
    La liste vient de `UploadSessionMediaDto`. Elle ne contient AUCUN format de document : c'est ce
    qui rend le type de message `DOCUMENT` inutilisable aujourd'hui (dette du plan C5).
  */
  it('les formats acceptés sont ceux du serveur, et rien de plus', () => {
    expect([...MIMES_IMAGE]).toEqual(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
    expect([...MIMES_AUDIO]).toEqual(['audio/mp4', 'audio/m4a', 'audio/aac', 'audio/mpeg', 'audio/ogg', 'audio/wav'])
    expect([...MIMES_IMAGE, ...MIMES_AUDIO]).not.toContain('application/pdf')
  })

  it('dix photos par bulle — le plafond de `fileKeys`', () => {
    expect(PHOTOS_MAX).toBe(10)
  })
})

describe('Ce qui empêche un fichier de partir', () => {
  it('laisse passer une image acceptée et assez légère', () => {
    expect(refusDEnvoi(fichier('image/jpeg', 2 * 1024 * 1024))).toBeNull()
  })

  /*
    ⚠️ Le refus DIT le poids et la limite. « Fichier trop volumineux » n'apprend rien ;
    « 12,0 Mo — maximum 8,0 Mo » dit quoi faire. C'est tout l'objet de ce chantier.
  */
  it('un fichier trop lourd est refusé AVEC son poids et la limite', () => {
    const message = refusDEnvoi(fichier('image/jpeg', 12 * 1024 * 1024))

    expect(message).toContain('12,0 Mo')
    expect(message).toContain('8,0 Mo')
  })

  it('un format que le serveur refuserait est refusé ICI, pas après le réseau', () => {
    expect(refusDEnvoi(fichier('application/pdf', 1000))).toMatch(/Format non accepté/)
    // `audio/webm` est ce que produisent les navigateurs Chromium — et le serveur n'en veut pas.
    expect(refusDEnvoi(fichier('audio/webm', 1000))).toMatch(/Format non accepté/)
  })

  it('une note vocale au bon format passe', () => {
    expect(refusDEnvoi(fichier('audio/mp4', 500_000))).toBeNull()
    expect(refusDEnvoi(fichier('audio/ogg', 500_000))).toBeNull()
  })
})

describe('Le format d’enregistrement du micro', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /*
    ⚠️ LE piège de ce chantier, vérifié sur un vrai navigateur le 11/09.

    `MediaRecorder` produit du `audio/webm` sur Chromium — et le serveur ULAMU ne l'accepte pas.
    Relevé à l'exécution : le navigateur sait faire `audio/mp4`, `audio/webm` ; il ne sait PAS faire
    `audio/ogg` ni `audio/wav`. L'intersection avec la liste serveur tient en un seul format.

    Ce test interdit à quiconque de « simplifier » en prenant le premier format supporté.
  */
  it('ne choisit JAMAIS un format que le serveur refuse', () => {
    vi.stubGlobal('MediaRecorder', {
      isTypeSupported: (m: string) => m.startsWith('audio/webm') || m === 'audio/mp4',
    })

    const choix = mimeVocal()
    expect(choix).not.toBeNull()
    expect(choix!.envoi).toBe('audio/mp4')
    expect([...MIMES_AUDIO]).toContain(choix!.envoi)
  })

  it('sur un navigateur qui ne fait que de l’ogg, il prend l’ogg', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: (m: string) => m.startsWith('audio/ogg') })

    expect(mimeVocal()?.envoi).toBe('audio/ogg')
  })

  /*
    ⚠️ `null` et non un format par défaut. Enregistrer dans un format que le serveur refusera, c'est
    faire parler quelqu'un deux minutes pour rien. L'écran DOIT alors désactiver le micro en disant
    pourquoi — c'est ce que `BoutonMicro` fait.
  */
  it('quand aucun format commun n’existe, il rend null plutôt qu’un format qui échouera', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: () => false })
    expect(mimeVocal()).toBeNull()

    vi.stubGlobal('MediaRecorder', undefined)
    expect(mimeVocal()).toBeNull()
  })
})

describe('Dire un poids et une durée comme on les lit', () => {
  it('les tailles', () => {
    expect(formatOctets(800)).toBe('800 o')
    expect(formatOctets(320 * 1024)).toBe('320 Ko')
    expect(formatOctets(2.4 * 1024 * 1024)).toBe('2,4 Mo')
  })

  it('les durées, en minutes et secondes', () => {
    expect(formatDuree(7)).toBe('0:07')
    expect(formatDuree(67)).toBe('1:07')
    expect(formatDuree(VOCAL_MAX_S)).toBe('2:00')
  })

  /*
    Deux minutes : assez pour un complément de consultation, et assez peu pour tenir largement sous
    les 8 Mo du stockage. Un plafond plus haut ferait découvrir la limite de TAILLE au moment de
    l'envoi — c'est-à-dire au pire moment, après avoir parlé.
  */
  it('le plafond d’une note vocale est de deux minutes', () => {
    expect(VOCAL_MAX_S).toBe(120)
  })
})
