/* ─────────────────────────────────────────────
   ULAMU — Catalogue d'icônes (CG-10)
   Style Lucide · viewBox 16×16 · stroke currentColor · linecap/linejoin round.
   Markup intérieur uniquement (sans la balise <svg>). Repris fidèlement
   de la charte graphique Ulamu. Jamais d'emoji ni de caractère ASCII.
───────────────────────────────────────────── */

export const ICONS = {
  // ── Navigation ──
  home: '<path d="M1 6.5L8 1l7 5.5V15H1V6.5z"/><rect x="5.5" y="9" width="5" height="6" rx=".5" fill="currentColor" stroke="none" opacity=".4"/>',
  dashboard: '<rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
  sidebar: '<rect x="1" y="1" width="14" height="14" rx="2"/><path d="M6 1v14"/>',
  menu: '<path d="M2 4h12M2 8h12M2 12h12"/>',
  'chevron-right': '<path d="M6 4l4 4-4 4"/>',
  'chevron-left': '<path d="M10 4l-4 4 4 4"/>',
  'chevron-down': '<path d="M4 6l4 4 4-4"/>',
  'chevron-up': '<path d="M4 10l4-4 4 4"/>',
  'arrow-left': '<path d="M10 4L6 8l4 4M6 8h8"/>',
  'arrow-right': '<path d="M6 4l4 4-4 4M10 8H2"/>',
  'external-link': '<path d="M9 2h5v5M14 2L8 8M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3"/>',
  search: '<circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5l3 3"/>',
  settings: '<circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/>',
  'log-out': '<path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M11 11l3-3-3-3M14 8H6"/>',
  'more-vertical': '<circle cx="8" cy="3.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="8" cy="12.5" r="1.2" fill="currentColor" stroke="none"/>',
  'more-horizontal': '<circle cx="3.5" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="12.5" cy="8" r="1.2" fill="currentColor" stroke="none"/>',

  // ── Actions ──
  plus: '<path d="M8 2v12M2 8h12" stroke-width="2"/>',
  minus: '<path d="M2 8h12" stroke-width="2"/>',
  edit: '<path d="M11 2l3 3-9 9H2v-3L11 2z"/>',
  trash: '<path d="M3 4h10M6 2h4M5 4l1 9h4l1-9"/>',
  copy: '<rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2"/>',
  download: '<path d="M8 2v8M5 7l3 3 3-3M2 13h12"/>',
  upload: '<path d="M8 10V2M5 5l3-3 3 3M2 13h12"/>',
  share: '<circle cx="12.5" cy="3.5" r="1.5"/><circle cx="12.5" cy="12.5" r="1.5"/><circle cx="3.5" cy="8" r="1.5"/><path d="M5 8h5M5.2 6.6l5.3-2.6M5.2 9.4l5.3 2.6"/>',
  filter: '<path d="M1 4h14M4 8h8M7 12h2"/>',
  sort: '<path d="M2 4h12M4 8h8M6 12h4"/>',
  refresh: '<path d="M2 8a6 6 0 1 0 1.5-3.9"/><path d="M2 3v4h4"/>',
  x: '<path d="M3 3l10 10M13 3L3 13"/>',
  check: '<path d="M2 9l4 4 8-8" stroke-width="2"/>',
  send: '<path d="M14 2L7 9M14 2l-4.5 12-2.5-5-5-2.5L14 2z"/>',
  play: '<path d="M5.5 3.2l7.2 4.8-7.2 4.8V3.2z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="4" y="3" width="3" height="10" rx="1" fill="currentColor" stroke="none"/><rect x="9" y="3" width="3" height="10" rx="1" fill="currentColor" stroke="none"/>',
  reply: '<path d="M6 10L2 6l4-4"/><path d="M2 6h8a4 4 0 0 1 4 4v3"/>',
  'check-check': '<path d="M1.5 8.5l3 3 5.5-5.5"/><path d="M7.5 11l1 1L15 5.5"/>',
  mic: '<rect x="6" y="1.5" width="4" height="8" rx="2"/><path d="M3.5 7a4.5 4.5 0 0 0 9 0M8 11.5V14M6 14h4"/>',
  paperclip: '<path d="M13 6.5l-6 6a3 3 0 0 1-4.2-4.2l6-6a2 2 0 0 1 2.9 2.9l-6 6a1 1 0 0 1-1.4-1.4L9.5 5"/>',
  image: '<rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><circle cx="5.5" cy="6" r="1.2"/><path d="M2 11l3.5-3 3 2.5L11 7l3 3"/>',
  eye: '<path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/>',
  'eye-off': '<path d="M6.2 6.2A2 2 0 0 0 8 10a2 2 0 0 0 1.8-1.1M3.5 3.8C2 4.9 1 8 1 8s2.5 5 7 5a7.5 7.5 0 0 0 3-.6M6.5 3.2A7.6 7.6 0 0 1 8 3c4.5 0 7 5 7 5a13 13 0 0 1-1.8 2.4M1 1l14 14"/>',
  star: '<path d="M8 1.5l1.9 4 4.3.5-3.2 2.9.9 4.2L8 11l-3.8 2.1.9-4.2L2 6l4.3-.5L8 1.5z"/>',
  plus_circle: '<circle cx="8" cy="8" r="7"/><path d="M8 5v6M5 8h6"/>',

  // ── États & feedback ──
  'check-circle': '<circle cx="8" cy="8" r="7"/><path d="M5 8.5l2 2 4-4"/>',
  'alert-triangle': '<path d="M8 1L1 14h14L8 1z"/><path d="M8 6v3M8 11v.5"/>',
  'alert-circle': '<circle cx="8" cy="8" r="7"/><path d="M8 5v3.5M8 11v.5"/>',
  info: '<circle cx="8" cy="8" r="7"/><path d="M8 7v4.5M8 5v.5"/>',
  clock: '<circle cx="8" cy="8" r="7"/><path d="M8 5v3l2 2"/>',
  bell: '<path d="M8 2a5 5 0 0 0-5 5v2l-1 2h12l-1-2V7a5 5 0 0 0-5-5zM6.5 13.5a1.5 1.5 0 0 0 3 0"/>',
  'wifi-off': '<path d="M2 2l12 12"/><path d="M9.9 3.5a8 8 0 0 1 3.5 2.1"/><path d="M2.6 5.6A8 8 0 0 1 7 3.6"/><path d="M5 8.5a4 4 0 0 1 4.9-.5"/><circle cx="8" cy="13" r="1" fill="currentColor" stroke="none"/>',
  wifi: '<path d="M1.5 5.5a10 10 0 0 1 13 0M4 8.2a6 6 0 0 1 8 0M6.3 10.8a2.5 2.5 0 0 1 3.4 0"/><circle cx="8" cy="13" r="1" fill="currentColor" stroke="none"/>',
  lock: '<rect x="3" y="7" width="10" height="8" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/><circle cx="8" cy="11.5" r="1" fill="currentColor" stroke="none"/>',

  // ── Médical (domaine Ulamu) ──
  stethoscope: '<path d="M4 3a2 2 0 0 0-2 2v1a5 5 0 0 0 10 0V5a2 2 0 0 0-2-2H4z"/><path d="M12 6v3a4 4 0 0 0 4 4"/><circle cx="14" cy="13" r="1.5"/>',
  patient: '<circle cx="8" cy="5" r="3.5"/><path d="M2 14a6 6 0 0 1 12 0"/>',
  user: '<circle cx="8" cy="5" r="3"/><path d="M2.5 14a5.5 5.5 0 0 1 11 0"/>',
  users: '<circle cx="6" cy="5.5" r="2.6"/><path d="M1.5 14a4.5 4.5 0 0 1 9 0"/><path d="M11 3.2a2.6 2.6 0 0 1 0 5M12 14a4.5 4.5 0 0 0-2.2-3.9"/>',
  'file-medical': '<path d="M9 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5L9 1z"/><path d="M9 1v4h4"/><path d="M6 9h4M8 7v4"/>',
  ordonnance: '<rect x="2" y="1" width="12" height="14" rx="1.5"/><path d="M5 5h6M5 8h6M5 11h3"/><path d="M12 10l-1.5 2h2.5L11.5 14"/>',
  'rendez-vous': '<rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 3V1M11 3V1M2 7h12"/><rect x="5" y="9" width="2" height="2" rx=".5" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 3V1M11 3V1M2 7h12"/>',
  'heart-pulse': '<path d="M2 7.5C2 5 4 3 6.5 3S10 4.5 11 6c1-1.5 2.5-3 4.5-3a.5.5 0 0 1 0 1"/><path d="M1 9h2l1.5-2.5L6 11l2-4 1.5 2.5H14"/>',
  pill: '<path d="M4.5 11.5L11.5 4.5"/><rect x="2.5" y="5.5" width="5" height="9" rx="2.5" transform="rotate(-45 2.5 5.5)"/>',
  activity: '<path d="M2 8h2l2-5 3 10 2-5h3"/>',
  hospital: '<rect x="2" y="3" width="12" height="12" rx="1"/><path d="M8 7v4M6 9h4"/><path d="M5 3V2M11 3V2"/>',
  syringe: '<path d="M11 2l3 3-1 1-3-3 1-1zM9.5 4.5l2 2-5 5-1 1H3v-2.5l1-1 5-5z"/><path d="M7 7l2 2"/><path d="M2 14l1.5-1.5"/>',
  consultation: '<rect x="3" y="3" width="10" height="12" rx="1.5"/><path d="M6 3V2h4v1M6 7h4M6 10h4M6 13h2"/>',
  'shield-check': '<path d="M8 1l5.5 2v5C13.5 12 11 14.5 8 15c-3-.5-5.5-3-5.5-7V3L8 1z"/><path d="M5.5 8l2 2 3-3"/>',

  // ── Communication & données ──
  message: '<path d="M2 3h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5l-3 2V4a1 1 0 0 1 1-1z"/>',
  mail: '<rect x="1" y="4" width="14" height="10" rx="1.5"/><path d="M1 4l7 5.5L15 4"/>',
  phone: '<path d="M3 2h3l1.5 3.5-2 1.5a8 8 0 0 0 3.5 3.5l1.5-2L14 10v3a1 1 0 0 1-1 1A11 11 0 0 1 2 3a1 1 0 0 1 1-1z"/>',
  video: '<rect x="1" y="4" width="10" height="9" rx="1.5"/><path d="M11 7.5l4-2v6l-4-2v-2z"/>',
  'bar-chart': '<path d="M2 14h12M5 14V9M8 14V5M11 14V7"/>',
  'trending-up': '<path d="M2 11l4-4 3 3 5-6"/><path d="M10 4h4v4"/>',
  database: '<ellipse cx="8" cy="4" rx="6" ry="2"/><path d="M2 4v4c0 1.1 2.7 2 6 2s6-.9 6-2V4"/><path d="M2 8v4c0 1.1 2.7 2 6 2s6-.9 6-2V8"/>',
  'map-pin': '<path d="M8 1.5a5 5 0 0 0-5 5c0 3.5 5 8.5 5 8.5s5-5 5-8.5a5 5 0 0 0-5-5z"/><circle cx="8" cy="6.5" r="1.5"/>',
  'credit-card': '<rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 6.5h14M4 10h3"/>',
  'qr-code': '<rect x="1.5" y="1.5" width="5" height="5" rx="1"/><rect x="9.5" y="1.5" width="5" height="5" rx="1"/><rect x="1.5" y="9.5" width="5" height="5" rx="1"/><path d="M9.5 9.5h2v2M14.5 9.5v5M11.5 13.5h3" stroke-width="1.4"/>',

  // ── Thème ──
  sun: '<circle cx="8" cy="8" r="3.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/>',
  moon: '<path d="M13.5 10A5.5 5.5 0 0 1 6 2.5a.5.5 0 0 0-.6-.6A6.5 6.5 0 1 0 14.1 10.6a.5.5 0 0 0-.6-.6z"/>',
};

/** Liste triée des noms d'icônes disponibles. */
export const ICON_NAMES = Object.keys(ICONS).sort();
