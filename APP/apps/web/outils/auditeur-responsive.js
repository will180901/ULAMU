/**
 * Auditeur responsive v2 — il ne cherche plus les DÉFAUTS, il juge l'ADAPTATION.
 *
 * L'auditeur du chantier 18 ignorait ce qui vit dans un conteneur à défilement horizontal : un
 * tableau de huit colonnes n'y « débordait » donc pas. C'est précisément ce qu'on veut voir ici.
 */
window.__ALLER__ = async (chemin) => {
  history.pushState({}, '', chemin)
  dispatchEvent(new PopStateEvent('popstate'))
  await new Promise((r) => setTimeout(r, 1100))
  return location.pathname
}

const bref = (e) => {
  const t = e.tagName.toLowerCase()
  const txt = (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
  return t + (txt ? ' « ' + txt + ' »' : '')
}

window.__RESP__ = () => {
  const L = innerWidth
  const principal = document.querySelector('main') || document.body

  // 1. Les conteneurs qui défilent LATÉRALEMENT, et de combien.
  const defilants = [...principal.querySelectorAll('*')]
    .filter((e) => {
      const s = getComputedStyle(e)
      return (s.overflowX === 'auto' || s.overflowX === 'scroll') && e.scrollWidth > e.clientWidth + 4
    })
    .map((e) => ({
      quoi: bref(e),
      visible: e.clientWidth,
      reel: e.scrollWidth,
      deborde: e.scrollWidth - e.clientWidth,
      table: !!e.querySelector('table'),
      colonnes: e.querySelector('table thead tr') ? e.querySelector('table thead tr').children.length : 0,
    }))

  // 2. Les tableaux, adaptés ou non.
  const tableaux = [...principal.querySelectorAll('table')].map((t) => ({
    colonnes: t.querySelector('thead tr') ? t.querySelector('thead tr').children.length : 0,
    lignes: t.querySelectorAll('tbody tr').length,
    largeur: Math.round(t.getBoundingClientRect().width),
    tientDansLEcran: t.getBoundingClientRect().width <= L,
  }))

  // 3. Les mises en page restées CÔTE À CÔTE alors qu'on est sur un téléphone.
  const cotesACote = [...principal.querySelectorAll('*')]
    .filter((e) => {
      const s = getComputedStyle(e)
      if (s.display !== 'flex' || s.flexDirection !== 'row' || s.flexWrap === 'wrap') return false
      const enfants = [...e.children].filter((c) => c.getBoundingClientRect().width > 0)
      if (enfants.length < 2) return false
      // Deux enfants qui prennent chacun plus de 25 % : c'est une vraie colonne, pas une icône.
      const gros = enfants.filter((c) => c.getBoundingClientRect().width > L * 0.25)
      return gros.length >= 2
    })
    .map((e) => ({
      quoi: bref(e),
      largeurs: [...e.children].map((c) => Math.round(c.getBoundingClientRect().width)).filter((w) => w > 0),
    }))

  // 4. Les grilles restées à plusieurs colonnes.
  const grilles = [...principal.querySelectorAll('*')]
    .filter((e) => {
      const s = getComputedStyle(e)
      return s.display === 'grid' && (s.gridTemplateColumns.match(/px/g) || []).length >= 2
    })
    .map((e) => ({ quoi: bref(e), colonnes: getComputedStyle(e).gridTemplateColumns }))

  return {
    ou: location.pathname + location.search,
    largeur: L,
    defilants,
    tableaux,
    cotesACote: cotesACote.slice(0, 5),
    grilles: grilles.slice(0, 5),
  }
}
'auditeur responsive en place'
