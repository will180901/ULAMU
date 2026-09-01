
window.__ALLER__ = async (chemin) => {
  history.pushState({}, '', chemin)
  dispatchEvent(new PopStateEvent('popstate'))
  await new Promise(r => setTimeout(r, 900))
  return location.pathname
}

const bref = (e) => {
  const t = e.tagName.toLowerCase()
  const c = (e.className && typeof e.className === 'string') ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : ''
  const txt = (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 45)
  return t + c + (txt ? ' « ' + txt + ' »' : '')
}

window.__AUDIT__ = () => {
  const L = innerWidth, H = innerHeight
  const tous = [...document.body.querySelectorAll('*')].filter((e) => {
    const s = getComputedStyle(e)
    return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05
  })

  // 1. Débordement horizontal de la page entière.
  const debordePage = document.documentElement.scrollWidth - L

  // 2. Ce qui dépasse le bord droit, en ignorant ce qui vit dans un conteneur à défilement voulu.
  const dansDefilement = (e) => {
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX
      if (o === 'auto' || o === 'scroll') return true
    }
    return false
  }
  const depasse = tous
    .filter((e) => {
      const r = e.getBoundingClientRect()
      return r.width > 0 && r.right > L + 1 && !dansDefilement(e)
    })
    .map((e) => ({ el: bref(e), droite: Math.round(e.getBoundingClientRect().right) }))

  // 3. Texte rogné : la boîte coupe son propre contenu, sans ellipse assumée.
  const rogne = tous
    .filter((e) => {
      if (e.children.length) return false
      const s = getComputedStyle(e)
      if (s.textOverflow === 'ellipsis') return false
      if (s.overflowX === 'auto' || s.overflowX === 'scroll') return false
      // `sr-only` est un rognage VOULU : 1 px, hors écran, pour les lecteurs d'écran.
      if (e.classList.contains('sr-only') || e.closest('.sr-only')) return false
      return e.scrollWidth > e.clientWidth + 1 && (e.textContent || '').trim().length > 0
    })
    .map((e) => ({ el: bref(e), visible: e.clientWidth, reel: e.scrollWidth }))

  // 4. Recouvrement : le contenu principal passe-t-il sous la barre latérale ?
  const flanc = document.querySelector('[data-slot="sidebar-container"], aside, nav[aria-label]')
  const principal = document.querySelector('main')
  let recouvre = null
  if (flanc && principal) {
    const a = flanc.getBoundingClientRect(), b = principal.getBoundingClientRect()
    const chevauche = Math.min(a.right, b.right) - Math.max(a.left, b.left)
    if (chevauche > 2 && a.width > 0 && b.width > 0) {
      recouvre = { flanc: [Math.round(a.left), Math.round(a.right)], principal: [Math.round(b.left), Math.round(b.right)], chevauchement: Math.round(chevauche) }
    }
  }

  // 5. Texte invisible : couleur identique au fond effectif.
  const fondEffectif = (e) => {
    for (let p = e; p; p = p.parentElement) {
      const bg = getComputedStyle(p).backgroundColor
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg
    }
    return getComputedStyle(document.body).backgroundColor
  }
  const invisible = tous
    .filter((e) => !e.children.length && (e.textContent || '').trim().length > 0)
    .filter((e) => getComputedStyle(e).color === fondEffectif(e))
    .map(bref)

  // 6. Sous 11 px, on ne lit plus sur un téléphone.
  const minuscule = [...new Set(tous
    .filter((e) => !e.children.length && (e.textContent || '').trim().length > 2)
    .filter((e) => parseFloat(getComputedStyle(e).fontSize) < 11)
    .map((e) => bref(e) + ' [' + getComputedStyle(e).fontSize + ']'))]

  // 7. Cibles tactiles trop petites (< 32 px de haut) — seulement en dessous de 768 px.
  const cibles = L < 768 ? tous
    .filter((e) => ['button', 'a'].includes(e.tagName.toLowerCase()) || e.getAttribute('role') === 'button')
    .filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.height < 32 })
    .map((e) => bref(e) + ' [' + Math.round(e.getBoundingClientRect().height) + 'px]') : []

  return {
    ou: location.pathname,
    taille: L + '×' + H,
    theme: document.documentElement.classList.contains('dark') ? 'sombre' : 'clair',
    titre: (document.querySelector('h1, h2') || {}).textContent?.trim().slice(0, 60) ?? null,
    debordePage: debordePage > 1 ? debordePage : 0,
    depasse: depasse.slice(0, 6),
    rogne: rogne.slice(0, 6),
    recouvre,
    invisible: invisible.slice(0, 6),
    minuscule: minuscule.slice(0, 6),
    cibles: cibles.slice(0, 6),
  }
}
'auditeur en place'
