/**
 * Carrousel des écrans d'authentification — REPRISE À L'IDENTIQUE de l'app mobile
 * (apps/mobile/src/components/AuthCarouselDrawer.tsx) : mesh gradient animé + voile verre dépoli
 * + grain, par-dessus lequel défilent 5 illustrations avec leur texte.
 *
 * Les visuels sont les MÊMES fichiers PNG que le mobile (copiés dans assets/auth), et les trajectoires
 * des formes sont les mêmes courbes (cf. @keyframes ulamu-mesh-drift-* dans globals.css) : les deux
 * plateformes bougent donc réellement pareil, au lieu de deux effets "qui se ressemblent".
 *
 * Pourquoi des images et non des dégradés CSS : le dégradé radial de chaque forme est déjà cuit dans
 * le PNG, ce qui garantit la même palette exacte (l'accent du projet et ses nuances) des deux côtés,
 * et laisse au navigateur une simple texture à composer.
 */
import { useEffect, useState } from 'react'
import blob0 from '@/assets/auth/mesh-blob-0.png'
import blob1 from '@/assets/auth/mesh-blob-1.png'
import blob2 from '@/assets/auth/mesh-blob-2.png'
import blob3 from '@/assets/auth/mesh-blob-3.png'
import blob4 from '@/assets/auth/mesh-blob-4.png'
import blob5 from '@/assets/auth/mesh-blob-5.png'
import frostGrain from '@/assets/auth/frost-grain.png'
import slideDoctor from '@/assets/auth/slide-online-doctor.png'
import slidePrescription from '@/assets/auth/slide-prescription.png'
import slideMedicine from '@/assets/auth/slide-medicine.png'
import slidePharmacist from '@/assets/auth/slide-pharmacist.png'
import slideInsurance from '@/assets/auth/slide-insurance.png'

/** Teinte la plus sombre du mesh (accent900) — le fond sous les formes. */
const MESH_BASE = '#091849'

type MeshBlob = { size: number; top: string; left: string; image: string; anim: string; duration: string; delay: string }

/** Mêmes positions, tailles, durées et décalages que MESH_BLOBS côté mobile. */
const MESH_BLOBS: MeshBlob[] = [
  { size: 460, top: '-16%', left: '-22%', image: blob0, anim: 'ulamu-mesh-drift-1', duration: '15s', delay: '0s' },
  { size: 420, top: '52%', left: '50%', image: blob1, anim: 'ulamu-mesh-drift-2', duration: '17s', delay: '-0.4s' },
  { size: 400, top: '66%', left: '-18%', image: blob2, anim: 'ulamu-mesh-drift-3', duration: '13s', delay: '-0.8s' },
  { size: 380, top: '2%', left: '44%', image: blob3, anim: 'ulamu-mesh-drift-2', duration: '16s', delay: '-1.2s' },
  { size: 360, top: '28%', left: '4%', image: blob4, anim: 'ulamu-mesh-drift-1', duration: '14s', delay: '-1.6s' },
  { size: 340, top: '-10%', left: '16%', image: blob5, anim: 'ulamu-mesh-drift-3', duration: '18s', delay: '-2s' },
]

/** Mêmes diapositives et mêmes textes que le mobile — le parcours patient ULAMU. */
const SLIDES = [
  { image: slideDoctor, text: 'Trouvez un soignant vérifié' },
  { image: slidePrescription, text: 'Recevez votre ordonnance signée' },
  { image: slideMedicine, text: 'Réservez vos médicaments tout près' },
  { image: slidePharmacist, text: 'Retirez-les en pharmacie en toute confiance' },
  { image: slideInsurance, text: 'Payez en toute transparence' },
]

// Séquence identique au mobile : l'image apparaît en fondu, PUIS le texte entier (jamais lettre par
// lettre — choix explicite), le tout tient un temps, puis s'efface avant la diapositive suivante.
const IMAGE_FADE_MS = 700
const TEXT_START_DELAY_MS = 400
const TEXT_FADE_MS = 600
const HOLD_MS = 3000
const FADE_OUT_MS = 500

export function AuthCarousel() {
  const [index, setIndex] = useState(0)
  const [textShown, setTextShown] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)

  useEffect(() => {
    setFadingOut(false)
    setTextShown(false)
    const toText = setTimeout(() => setTextShown(true), TEXT_START_DELAY_MS)
    const toFade = setTimeout(() => setFadingOut(true), TEXT_START_DELAY_MS + TEXT_FADE_MS + HOLD_MS)
    const toNext = setTimeout(
      () => setIndex((v) => (v + 1) % SLIDES.length),
      TEXT_START_DELAY_MS + TEXT_FADE_MS + HOLD_MS + FADE_OUT_MS,
    )
    return () => {
      clearTimeout(toText)
      clearTimeout(toFade)
      clearTimeout(toNext)
    }
  }, [index])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: MESH_BASE }}>
      {MESH_BLOBS.map((b, i) => (
        <img
          key={i}
          src={b.image}
          alt=""
          aria-hidden
          className="ulamu-mesh-blob"
          style={{
            position: 'absolute',
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            animation: `${b.anim} ${b.duration} linear ${b.delay} infinite`,
            willChange: 'transform',
          }}
        />
      ))}

      {/* Voile verre dépoli + grain, en une seule texture pré-composée (comme sur mobile). */}
      <img
        src={frostGrain}
        alt=""
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Contenu : illustration, texte, points. Toutes les illustrations restent montées (seule
          l'opacité change) — les remonter à chaque tour provoquait des à-coups sur mobile. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--espace-6)',
          gap: 'var(--espace-4)',
        }}
      >
        <div style={{ position: 'relative', width: '100%', flex: '1 1 auto', minHeight: 0 }}>
          {SLIDES.map((s, k) => (
            <img
              key={k}
              src={s.image}
              alt=""
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: k === index && !fadingOut ? 1 : 0,
                transition: `opacity ${k === index && fadingOut ? FADE_OUT_MS : IMAGE_FADE_MS}ms ease-in-out`,
              }}
            />
          ))}
        </div>

        <p
          aria-live="polite"
          style={{
            margin: 0,
            minHeight: '2.6em',
            textAlign: 'center',
            color: '#fff',
            fontSize: 'var(--font-size-body)',
            fontWeight: 700,
            lineHeight: 1.3,
            opacity: textShown && !fadingOut ? 1 : 0,
            transition: `opacity ${fadingOut ? FADE_OUT_MS : TEXT_FADE_MS}ms ease-in-out`,
          }}
        >
          {SLIDES[index].text}
        </p>

        <div style={{ display: 'flex', gap: 6 }} aria-hidden>
          {SLIDES.map((_, k) => (
            <span
              key={k}
              style={{
                width: k === index ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: k === index ? '#fff' : 'rgba(255,255,255,0.35)',
                transition: 'width 300ms ease, background 300ms ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
