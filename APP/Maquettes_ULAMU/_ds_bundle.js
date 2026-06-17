/* @ds-bundle: {"format":3,"namespace":"ULAMUDesignSystem_d14300","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"ICONS","sourcePath":"components/core/icons.js"},{"name":"ICON_NAMES","sourcePath":"components/core/icons.js"},{"name":"SessionTimer","sourcePath":"components/domain/SessionTimer.jsx"},{"name":"VerifiedBadge","sourcePath":"components/domain/VerifiedBadge.jsx"},{"name":"Banner","sourcePath":"components/feedback/Banner.jsx"},{"name":"Modal","sourcePath":"components/feedback/Modal.jsx"},{"name":"Skeleton","sourcePath":"components/feedback/Skeleton.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"FormField","sourcePath":"components/forms/FormField.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"NavItem","sourcePath":"components/navigation/NavItem.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"f2e2aa41a45b","components/core/Badge.jsx":"4a6f9afe41c0","components/core/Button.jsx":"52956b5ed698","components/core/Card.jsx":"1559d854fd1f","components/core/Icon.jsx":"5f769f51f4f4","components/core/IconButton.jsx":"6457e1160e4c","components/core/Tag.jsx":"2a0d032be451","components/core/icons.js":"8d0ef2516eac","components/domain/SessionTimer.jsx":"71623b8af4dc","components/domain/VerifiedBadge.jsx":"789d3350da06","components/feedback/Banner.jsx":"f2bbe3d5735a","components/feedback/Modal.jsx":"49c49dc071e4","components/feedback/Skeleton.jsx":"99a5a378c7b2","components/feedback/Toast.jsx":"b33274a4f897","components/feedback/Tooltip.jsx":"703c27940c0f","components/forms/Checkbox.jsx":"890651092800","components/forms/FormField.jsx":"05e4ea5dd5ba","components/forms/Input.jsx":"5a88c0782c83","components/forms/Radio.jsx":"e4a5d08f7ee4","components/forms/Select.jsx":"e5e954260f93","components/forms/Switch.jsx":"f4f8c05fa88f","components/forms/Textarea.jsx":"aea8fa64e1e1","components/navigation/NavItem.jsx":"3f351a8c562d","components/navigation/Tabs.jsx":"7b681f2a0082","ui_kits/auth/auth.jsx":"47c1a661417a","ui_kits/auth/auth2.jsx":"77bd973de07a","ui_kits/auth/image-slot.js":"9309434cb09c","ui_kits/auth_mobile/authm.jsx":"115965e5ea09","ui_kits/auth_mobile/image-slot.js":"9309434cb09c","ui_kits/backoffice/admin.jsx":"30b3da99cb79","ui_kits/backoffice/admin2.jsx":"777713e90353","ui_kits/patient_mobile/android-frame.jsx":"70c8c3059eeb","ui_kits/patient_mobile/chat.jsx":"b998f32ea295","ui_kits/patient_mobile/flow.jsx":"c48049907c12","ui_kits/patient_mobile/onboarding.jsx":"6b56538b6352","ui_kits/patient_mobile/screens.jsx":"61be47d8b2a1","ui_kits/patient_mobile/screens2.jsx":"27b9a1479c9b","ui_kits/patient_mobile/session.jsx":"ef0b0ff9dd2b","ui_kits/patient_mobile/tabs.jsx":"cfca4bc1749a","ui_kits/professionnel_desktop/chat-pro.jsx":"2062f60e8b82","ui_kits/professionnel_desktop/cockpit.jsx":"84d4abacfe27","ui_kits/professionnel_desktop/desktop.jsx":"9607d381edb8","ui_kits/professionnel_desktop/pages.jsx":"0e2ff03d6a3a","ui_kits/structure_labo/labo.jsx":"51cda1eeee44","ui_kits/structure_labo/labo2.jsx":"8b7b4d59e743","ui_kits/structure_pharmacie/pharmacie.jsx":"8dbb07bb8e3c","ui_kits/structure_pharmacie/pharmacie2.jsx":"b3e50a2c7b22"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.ULAMUDesignSystem_d14300 = window.ULAMUDesignSystem_d14300 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64
};
const FONT = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 22
};
function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
}

/** Avatar — initiales ou image. Point de présence optionnel. */
function Avatar({
  name = '',
  src,
  size = 'md',
  status,
  style = {},
  ...rest
}) {
  const box = SIZES[size] || SIZES.md;
  const statusColor = status === 'online' ? 'var(--success-dot)' : status === 'busy' ? 'var(--error-dot)' : status === 'away' ? 'var(--warning-dot)' : null;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: 'relative',
      display: 'inline-flex',
      flexShrink: 0,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: box,
      height: box,
      borderRadius: '50%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: FONT[size] || 14,
      color: '#fff',
      background: 'var(--accent-500)',
      overflow: 'hidden',
      border: '2px solid var(--bg-base)',
      boxShadow: 'var(--shadow-sm)'
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials(name)), statusColor && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: Math.max(8, box * 0.26),
      height: Math.max(8, box * 0.26),
      borderRadius: '50%',
      background: statusColor,
      border: '2px solid var(--bg-base)'
    }
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — surface élevée Ulamu. Bord subtil, rayon lg, ombre sm,
 * grain optionnel, lift au survol si interactive.
 */
function Card({
  padding = 'var(--sp-5)',
  interactive = false,
  grain = false,
  elevation = 'sm',
  children,
  style = {},
  onClick,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const shadow = hover && interactive ? 'var(--shadow-md)' : `var(--shadow-${elevation})`;
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => interactive && setHover(true),
    onMouseLeave: () => interactive && setHover(false),
    style: {
      position: 'relative',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding,
      boxShadow: shadow,
      transform: hover && interactive ? 'translateY(-2px)' : 'translateY(0)',
      transition: 'transform var(--dur-base) linear, box-shadow var(--dur-base) linear',
      cursor: interactive ? 'pointer' : 'default',
      ...style
    }
  }, rest), grain && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'calc(var(--grain-opacity) * 0.6)',
      borderRadius: 'inherit'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/icons.js
try { (() => {
/* ─────────────────────────────────────────────
   ULAMU — Catalogue d'icônes (CG-10)
   Style Lucide · viewBox 16×16 · stroke currentColor · linecap/linejoin round.
   Markup intérieur uniquement (sans la balise <svg>). Repris fidèlement
   de la charte graphique Ulamu. Jamais d'emoji ni de caractère ASCII.
───────────────────────────────────────────── */

const ICONS = {
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
  moon: '<path d="M13.5 10A5.5 5.5 0 0 1 6 2.5a.5.5 0 0 0-.6-.6A6.5 6.5 0 1 0 14.1 10.6a.5.5 0 0 0-.6-.6z"/>'
};

/** Liste triée des noms d'icônes disponibles. */
const ICON_NAMES = Object.keys(ICONS).sort();
Object.assign(__ds_scope, { ICONS, ICON_NAMES });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/icons.js", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Icon — icône SVG du système Ulamu (style Lucide, viewBox 16×16).
 * `stroke: currentColor` : la couleur hérite du parent. Jamais d'emoji/ASCII.
 */
function Icon({
  name,
  size = 16,
  strokeWidth = 1.5,
  color,
  className = '',
  style = {},
  title,
  ...rest
}) {
  const inner = __ds_scope.ICONS[name];
  if (!inner) {
    if (typeof console !== 'undefined') console.warn(`[ulamu] icône inconnue : "${name}"`);
    return null;
  }
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: color || 'currentColor',
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className,
    style: {
      flexShrink: 0,
      display: 'block',
      ...style
    },
    "aria-hidden": title ? undefined : true,
    role: title ? 'img' : undefined,
    "aria-label": title,
    dangerouslySetInnerHTML: {
      __html: (title ? `<title>${title}</title>` : '') + inner
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  neutral: {
    bg: 'var(--bg-muted)',
    fg: 'var(--text-secondary)',
    bd: 'var(--border-default)',
    dot: 'var(--text-tertiary)'
  },
  accent: {
    bg: 'rgba(39,86,166,0.12)',
    fg: 'var(--text-accent)',
    bd: 'rgba(39,86,166,0.28)',
    dot: 'var(--accent-500)'
  },
  success: {
    bg: 'var(--success-bg)',
    fg: 'var(--success-text)',
    bd: 'var(--success-border)',
    dot: 'var(--success-dot)'
  },
  warning: {
    bg: 'var(--warning-bg)',
    fg: 'var(--warning-text)',
    bd: 'var(--warning-border)',
    dot: 'var(--warning-dot)'
  },
  error: {
    bg: 'var(--error-bg)',
    fg: 'var(--error-text)',
    bd: 'var(--error-border)',
    dot: 'var(--error-dot)'
  },
  info: {
    bg: 'var(--info-bg)',
    fg: 'var(--info-text)',
    bd: 'var(--info-border)',
    dot: 'var(--info-dot)'
  }
};

/** Badge — étiquette de statut. Point sémantique ou icône optionnels. */
function Badge({
  tone = 'neutral',
  dot = false,
  icon,
  children,
  size = 'md',
  style = {},
  ...rest
}) {
  const t = TONES[tone] || TONES.neutral;
  const small = size === 'sm';
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: small ? 4 : 5,
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      fontSize: small ? 11 : 12,
      lineHeight: 1.4,
      padding: small ? '2px 7px' : '3px 9px',
      borderRadius: 'var(--radius-sm)',
      background: t.bg,
      color: t.fg,
      border: `1px solid ${t.bd}`,
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: t.dot,
      flexShrink: 0
    }
  }), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: small ? 11 : 12
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    padding: '7px 14px',
    fontSize: 13,
    radius: 'var(--radius-md)',
    icon: 14,
    gap: 6
  },
  md: {
    padding: '9px 18px',
    fontSize: 14,
    radius: 'var(--radius-md)',
    icon: 16,
    gap: 8
  },
  lg: {
    padding: '12px 24px',
    fontSize: 15,
    radius: 'var(--radius-md)',
    icon: 16,
    gap: 8
  }
};
function variantStyle(variant, hover) {
  switch (variant) {
    case 'secondary':
      return {
        background: hover ? 'var(--bg-subtle)' : 'var(--bg-muted)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-default)'
      };
    case 'ghost':
      return {
        background: hover ? 'var(--bg-subtle)' : 'transparent',
        color: hover ? 'var(--text-primary)' : 'var(--text-secondary)',
        border: '1px solid var(--border-subtle)'
      };
    case 'danger':
      return {
        background: hover ? '#A83535' : '#C44040',
        color: '#fff',
        border: '1px solid transparent'
      };
    case 'primary':
    default:
      return {
        background: hover ? 'var(--accent-600)' : 'var(--accent-500)',
        color: '#fff',
        border: '1px solid transparent'
      };
  }
}

/**
 * Button — bouton Ulamu. 4 variantes, 3 tailles, grain sérigraphié,
 * micro-feedback au press (scale 0.97 / 80ms).
 */
function Button({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth = false,
  disabled = false,
  loading = false,
  children,
  style = {},
  onClick,
  type = 'button',
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const sz = SIZES[size] || SIZES.md;
  const vs = variantStyle(variant, hover && !disabled);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled || loading,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    style: {
      position: 'relative',
      overflow: 'hidden',
      display: fullWidth ? 'flex' : 'inline-flex',
      width: fullWidth ? '100%' : undefined,
      alignItems: 'center',
      justifyContent: 'center',
      gap: sz.gap,
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      fontSize: sz.fontSize,
      lineHeight: 1.2,
      padding: sz.padding,
      borderRadius: sz.radius,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transform: active && !disabled ? 'scale(0.97)' : 'scale(1)',
      transition: 'background var(--dur-base) linear, color var(--dur-base) linear, transform 80ms linear, box-shadow var(--dur-base) linear',
      whiteSpace: 'nowrap',
      ...vs,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'var(--grain-btn)',
      borderRadius: 'inherit'
    }
  }), loading ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Spinner, {
    size: sz.icon
  })) : iconLeft && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconLeft,
    size: sz.icon
  })), children != null && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative'
    }
  }, children), !loading && iconRight && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: sz.icon
  })));
}
function Spinner({
  size = 16
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      display: 'inline-block',
      borderRadius: '50%',
      border: '2px solid currentColor',
      borderTopColor: 'transparent',
      animation: 'ulamu-spin 0.7s linear infinite'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes ulamu-spin{to{transform:rotate(360deg)}}'));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    box: 28,
    icon: 14
  },
  md: {
    box: 32,
    icon: 16
  },
  lg: {
    box: 36,
    icon: 18
  }
};
function variantStyle(variant, hover) {
  switch (variant) {
    case 'primary':
      return {
        background: hover ? 'var(--accent-600)' : 'var(--accent-500)',
        color: '#fff',
        border: '1px solid transparent',
        grain: true
      };
    case 'solid':
      return {
        background: hover ? 'var(--bg-subtle)' : 'var(--bg-muted)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-default)'
      };
    case 'ghost':
    default:
      return {
        background: hover ? 'var(--bg-subtle)' : 'transparent',
        color: hover ? 'var(--text-primary)' : 'var(--text-secondary)',
        border: '1px solid transparent'
      };
  }
}

/** IconButton — bouton carré contenant une seule icône Ulamu. */
function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  label,
  style = {},
  onClick,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const sz = SIZES[size] || SIZES.md;
  const vs = variantStyle(variant, hover && !disabled);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    style: {
      position: 'relative',
      overflow: 'hidden',
      width: sz.box,
      height: sz.box,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-md)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transform: active && !disabled ? 'scale(0.94)' : 'scale(1)',
      transition: 'background var(--dur-base) linear, color var(--dur-base) linear, transform 80ms linear',
      ...vs,
      ...style
    }
  }, rest), vs.grain && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'var(--grain-btn)',
      borderRadius: 'inherit'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: sz.icon
  })));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Tag — étiquette de filtre/sélection, optionnellement supprimable. */
function Tag({
  icon,
  onRemove,
  children,
  style = {},
  ...rest
}) {
  const [hov, setHov] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      fontWeight: 500,
      padding: onRemove ? '3px 6px 3px 10px' : '3px 10px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-default)',
      background: 'var(--bg-muted)',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 12
  }), children, onRemove && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onRemove,
    "aria-label": "Retirer",
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => setHov(false),
    style: {
      width: 14,
      height: 14,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      background: hov ? 'var(--error-bg)' : 'var(--bg-elevated)',
      color: hov ? 'var(--error-dot)' : 'var(--text-tertiary)',
      transition: 'background var(--dur-fast) linear, color var(--dur-fast) linear'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 9,
    strokeWidth: 2
  })));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/domain/SessionTimer.jsx
try { (() => {
function fmt(total) {
  const s = Math.max(0, Math.floor(total));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/**
 * SessionTimer — décompteur de session chronométrée (D-006), toujours visible.
 * Signature Ulamu : la consultation par messagerie est minutée. Devient warning
 * sous le seuil, propose une prolongation gratuite.
 */
function SessionTimer({
  seconds,
  warnBelow = 60,
  onExtend,
  label = 'Session',
  style = {}
}) {
  const warn = seconds <= warnBelow;
  const tone = warn ? {
    bg: 'var(--warning-bg)',
    fg: 'var(--warning-text)',
    bd: 'var(--warning-border)',
    dot: 'var(--warning-dot)'
  } : {
    bg: 'rgba(39,86,166,0.12)',
    fg: 'var(--text-accent)',
    bd: 'rgba(39,86,166,0.28)',
    dot: 'var(--accent-500)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      background: tone.bg,
      border: `1px solid ${tone.bd}`,
      borderRadius: 'var(--radius-full)',
      padding: '5px 6px 5px 12px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: tone.dot,
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "clock",
    size: 15
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      lineHeight: 1.05
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: tone.fg,
      opacity: 0.75
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 15,
      fontWeight: 600,
      color: tone.fg,
      fontVariantNumeric: 'tabular-nums'
    }
  }, fmt(seconds))), onExtend && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onExtend,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      cursor: 'pointer',
      background: 'var(--bg-elevated)',
      border: `1px solid ${tone.bd}`,
      borderRadius: 'var(--radius-full)',
      padding: '4px 9px',
      fontFamily: 'var(--font-body)',
      fontSize: 11,
      fontWeight: 600,
      color: tone.fg
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "plus",
    size: 11,
    strokeWidth: 2
  }), "5 min"));
}
Object.assign(__ds_scope, { SessionTimer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/SessionTimer.jsx", error: String((e && e.message) || e) }); }

// components/domain/VerifiedBadge.jsx
try { (() => {
const SIZES = {
  sm: {
    box: 14,
    icon: 9,
    font: 11
  },
  md: {
    box: 18,
    icon: 12,
    font: 12
  }
};

/**
 * VerifiedBadge — badge « vérifié » des professionnels (M03). Actif de confiance :
 * il protège la réputation des soignants contre les usurpateurs.
 */
function VerifiedBadge({
  size = 'md',
  label,
  style = {}
}) {
  const sz = SIZES[size] || SIZES.md;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: sz.box,
      height: sz.box,
      borderRadius: '50%',
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--accent-500)',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: sz.icon,
    strokeWidth: 2.4
  })), label != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: sz.font,
      fontWeight: 600,
      color: 'var(--text-accent)'
    }
  }, label));
}
Object.assign(__ds_scope, { VerifiedBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/VerifiedBadge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Banner.jsx
try { (() => {
const TONES = {
  info: {
    bg: 'var(--info-bg)',
    text: 'var(--info-text)',
    border: 'var(--info-border)',
    icon: 'info',
    dot: 'var(--info-dot)'
  },
  success: {
    bg: 'var(--success-bg)',
    text: 'var(--success-text)',
    border: 'var(--success-border)',
    icon: 'check-circle',
    dot: 'var(--success-dot)'
  },
  warning: {
    bg: 'var(--warning-bg)',
    text: 'var(--warning-text)',
    border: 'var(--warning-border)',
    icon: 'alert-triangle',
    dot: 'var(--warning-dot)'
  },
  error: {
    bg: 'var(--error-bg)',
    text: 'var(--error-text)',
    border: 'var(--error-border)',
    icon: 'alert-circle',
    dot: 'var(--error-dot)'
  }
};

/** Banner — message contextuel en bloc (info, succès, alerte, erreur). */
function Banner({
  tone = 'info',
  title,
  children,
  onClose,
  action,
  style = {}
}) {
  const t = TONES[tone] || TONES.info;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      background: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: 'var(--radius-md)',
      padding: '14px 16px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: t.dot,
      display: 'inline-flex',
      marginTop: 1,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t.icon,
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 600,
      color: t.text,
      marginBottom: children ? 3 : 0
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      color: t.text,
      lineHeight: 1.55,
      opacity: 0.92
    }
  }, children), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, action)), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    "aria-label": "Fermer",
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: t.text,
      opacity: 0.7,
      display: 'inline-flex',
      padding: 2,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 14
  })));
}
Object.assign(__ds_scope, { Banner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Banner.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Modal.jsx
try { (() => {
/** Modal — boîte de dialogue centrée (scale-in spring + overlay). */
function Modal({
  open = true,
  title,
  children,
  footer,
  onClose,
  width = 460,
  style = {}
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(2px)',
      WebkitBackdropFilter: 'blur(2px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--sp-6)',
      animation: 'ulamu-overlay var(--dur-moderate) ease-out'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes ulamu-overlay{from{opacity:0}to{opacity:1}}@keyframes ulamu-modal{from{transform:scale(0.91);opacity:0}to{transform:scale(1);opacity:1}}'), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    role: "dialog",
    "aria-modal": "true",
    style: {
      width: '100%',
      maxWidth: width,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-xl)',
      animation: 'ulamu-modal var(--dur-moderate) var(--ease-spring)',
      overflow: 'hidden',
      ...style
    }
  }, (title || onClose) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: 'var(--sp-5) var(--sp-5) var(--sp-4)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: '-0.2px',
      color: 'var(--text-primary)'
    }
  }, title), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    "aria-label": "Fermer",
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--text-tertiary)',
      display: 'inline-flex',
      padding: 4,
      borderRadius: 'var(--radius-sm)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 var(--sp-5)',
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: 'var(--text-secondary)',
      lineHeight: 1.6
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 8,
      padding: 'var(--sp-5)',
      marginTop: 'var(--sp-2)'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Modal.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Skeleton.jsx
try { (() => {
/** Skeleton — bloc de chargement (shimmer continu). */
function Skeleton({
  width = '100%',
  height = 12,
  radius = 'var(--radius-sm)',
  circle = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      width: circle ? height : width,
      height,
      borderRadius: circle ? '50%' : radius,
      background: 'linear-gradient(90deg, var(--bg-muted) 25%, var(--bg-subtle) 37%, var(--bg-muted) 63%)',
      backgroundSize: '400% 100%',
      animation: 'ulamu-shimmer 1400ms ease-in-out infinite',
      ...style
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes ulamu-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}'));
}
Object.assign(__ds_scope, { Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const TONES = {
  neutral: {
    dot: 'var(--text-tertiary)',
    icon: null
  },
  info: {
    dot: 'var(--info-dot)',
    icon: 'info'
  },
  success: {
    dot: 'var(--success-dot)',
    icon: 'check-circle'
  },
  warning: {
    dot: 'var(--warning-dot)',
    icon: 'alert-triangle'
  },
  error: {
    dot: 'var(--error-dot)',
    icon: 'alert-circle'
  }
};

/**
 * Toast — notification éphémère glass (entrée spring depuis le haut).
 * Composant de présentation : gérez l'affichage/masquage côté appelant.
 */
function Toast({
  tone = 'neutral',
  icon,
  children,
  onClose,
  style = {}
}) {
  const t = TONES[tone] || TONES.neutral;
  const ic = icon || t.icon;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      padding: '9px 14px',
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-primary)',
      animation: 'ulamu-toast-in var(--dur-moderate) var(--ease-spring)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes ulamu-toast-in{from{transform:translateY(-44px);opacity:0}to{transform:translateY(0);opacity:1}}'), ic && /*#__PURE__*/React.createElement("span", {
    style: {
      color: t.dot,
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: ic,
    size: 16
  })), /*#__PURE__*/React.createElement("span", null, children), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    "aria-label": "Fermer",
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--text-tertiary)',
      display: 'inline-flex',
      padding: 2,
      marginLeft: 4
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 13
  })));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
/** Tooltip — infobulle au survol. Enveloppe un élément déclencheur. */
function Tooltip({
  content,
  placement = 'top',
  children,
  style = {}
}) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top: {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: 8
    },
    bottom: {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: 8
    },
    left: {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginRight: 8
    },
    right: {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: 8
    }
  }[placement];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      ...style
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocus: () => setShow(true),
    onBlur: () => setShow(false)
  }, children, show && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: 'absolute',
      zIndex: 300,
      ...pos,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      padding: '6px 10px',
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      color: 'var(--text-secondary)',
      boxShadow: 'var(--shadow-md)',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      animation: 'ulamu-fade var(--dur-fast) ease-out'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes ulamu-fade{from{opacity:0}to{opacity:1}}'), content));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Checkbox — case à cocher Ulamu (check spring). */
function Checkbox({
  checked = false,
  indeterminate = false,
  disabled = false,
  label,
  onChange,
  id,
  style = {},
  ...rest
}) {
  const on = checked || indeterminate;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      userSelect: 'none',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: id,
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: 4,
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `1.5px solid ${on ? 'var(--accent-500)' : 'var(--border-strong)'}`,
      background: on ? 'var(--accent-500)' : 'var(--bg-base)',
      transition: 'background var(--dur-base) linear, border-color var(--dur-base) linear'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      color: '#fff',
      transform: on ? 'scale(1)' : 'scale(0)',
      opacity: on ? 1 : 0,
      transition: 'transform var(--dur-base) var(--ease-spring), opacity var(--dur-base) var(--ease-spring)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: indeterminate ? 'minus' : 'check',
    size: 12,
    strokeWidth: 2.4
  }))), label != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/FormField.jsx
try { (() => {
/** FormField — label + champ + indice/erreur. Enveloppe n'importe quel contrôle. */
function FormField({
  label,
  hint,
  error,
  required = false,
  htmlFor,
  children,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      width: '100%',
      ...style
    }
  }, label != null && /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-primary)'
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--error-dot)',
      marginLeft: 3
    }
  }, "*")), children, error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      color: 'var(--error-text)'
    }
  }, error) : hint != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, hint));
}
Object.assign(__ds_scope, { FormField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FormField.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Input — champ texte Ulamu (hauteur 36, focus ring accent). */
function Input({
  leftIcon,
  rightIcon,
  invalid = false,
  disabled = false,
  style = {},
  wrapperStyle = {},
  onFocus,
  onBlur,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const border = invalid ? 'var(--error-dot)' : focus ? 'var(--accent-500)' : 'var(--border-default)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      ...wrapperStyle
    }
  }, leftIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 12,
      display: 'inline-flex',
      color: 'var(--text-tertiary)',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: leftIcon,
    size: 16
  })), /*#__PURE__*/React.createElement("input", _extends({
    disabled: disabled,
    onFocus: e => {
      setFocus(true);
      onFocus && onFocus(e);
    },
    onBlur: e => {
      setFocus(false);
      onBlur && onBlur(e);
    },
    style: {
      height: 36,
      width: '100%',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${border}`,
      background: disabled ? 'var(--bg-subtle)' : 'var(--bg-base)',
      padding: `0 ${rightIcon ? 36 : 12}px 0 ${leftIcon ? 34 : 12}px`,
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: 'var(--text-primary)',
      outline: 'none',
      boxShadow: focus ? `0 0 0 3px ${invalid ? 'rgba(196,64,64,0.18)' : 'rgba(39,86,166,0.18)'}` : 'none',
      opacity: disabled ? 0.6 : 1,
      cursor: disabled ? 'not-allowed' : 'text',
      transition: 'border-color var(--dur-base) linear, box-shadow var(--dur-base) linear',
      ...style
    }
  }, rest)), rightIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 12,
      display: 'inline-flex',
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: rightIcon,
    size: 16
  })));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Radio — bouton radio Ulamu. */
function Radio({
  checked = false,
  disabled = false,
  label,
  name,
  value,
  onChange,
  id,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      userSelect: 'none',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: id,
    type: "radio",
    name: name,
    value: value,
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: '50%',
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `1.5px solid ${checked ? 'var(--accent-500)' : 'var(--border-strong)'}`,
      background: 'var(--bg-base)',
      transition: 'border-color var(--dur-base) linear'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'var(--accent-500)',
      transform: checked ? 'scale(1)' : 'scale(0)',
      transition: 'transform var(--dur-base) var(--ease-spring)'
    }
  })), label != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, label));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CHEVRON = "data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%2371717A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

/** Select — liste déroulante native stylée Ulamu. */
function Select({
  invalid = false,
  disabled = false,
  children,
  style = {},
  onFocus,
  onBlur,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const border = invalid ? 'var(--error-dot)' : focus ? 'var(--accent-500)' : 'var(--border-default)';
  return /*#__PURE__*/React.createElement("select", _extends({
    disabled: disabled,
    onFocus: e => {
      setFocus(true);
      onFocus && onFocus(e);
    },
    onBlur: e => {
      setFocus(false);
      onBlur && onBlur(e);
    },
    style: {
      height: 36,
      width: '100%',
      appearance: 'none',
      WebkitAppearance: 'none',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${border}`,
      background: `${disabled ? 'var(--bg-subtle)' : 'var(--bg-base)'} url("${CHEVRON}") no-repeat right 10px center`,
      backgroundSize: 16,
      padding: '0 32px 0 12px',
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: 'var(--text-primary)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      outline: 'none',
      boxShadow: focus ? '0 0 0 3px rgba(39,86,166,0.18)' : 'none',
      opacity: disabled ? 0.6 : 1,
      transition: 'border-color var(--dur-base) linear, box-shadow var(--dur-base) linear',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Switch — interrupteur Ulamu (thumb spring). */
function Switch({
  checked = false,
  disabled = false,
  label,
  onChange,
  id,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      userSelect: 'none',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: id,
    type: "checkbox",
    role: "switch",
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 22,
      borderRadius: 11,
      position: 'relative',
      flexShrink: 0,
      background: checked ? 'var(--accent-500)' : 'var(--bg-muted)',
      border: `1px solid ${checked ? 'var(--accent-500)' : 'var(--border-default)'}`,
      transition: 'background var(--dur-base) linear, border-color var(--dur-base) linear'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: '#fff',
      position: 'absolute',
      top: 2,
      left: checked ? 20 : 2,
      boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
      transition: 'left var(--dur-base) var(--ease-spring)'
    }
  })), label != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Textarea — zone de texte multi-lignes Ulamu. */
function Textarea({
  invalid = false,
  disabled = false,
  rows = 4,
  style = {},
  onFocus,
  onBlur,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const border = invalid ? 'var(--error-dot)' : focus ? 'var(--accent-500)' : 'var(--border-default)';
  return /*#__PURE__*/React.createElement("textarea", _extends({
    rows: rows,
    disabled: disabled,
    onFocus: e => {
      setFocus(true);
      onFocus && onFocus(e);
    },
    onBlur: e => {
      setFocus(false);
      onBlur && onBlur(e);
    },
    style: {
      width: '100%',
      minHeight: 80,
      resize: 'vertical',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${border}`,
      background: disabled ? 'var(--bg-subtle)' : 'var(--bg-base)',
      padding: '10px 12px',
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: 'var(--text-primary)',
      lineHeight: 1.55,
      outline: 'none',
      boxShadow: focus ? `0 0 0 3px ${invalid ? 'rgba(196,64,64,0.18)' : 'rgba(39,86,166,0.18)'}` : 'none',
      opacity: disabled ? 0.6 : 1,
      transition: 'border-color var(--dur-base) linear, box-shadow var(--dur-base) linear',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** NavItem — entrée de navigation latérale Ulamu (icône + label + pastille). */
function NavItem({
  icon,
  label,
  active = false,
  badge,
  collapsed = false,
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const bg = active ? 'rgba(39,86,166,0.14)' : hover ? 'var(--bg-subtle)' : 'transparent';
  const color = active ? 'var(--text-accent)' : hover ? 'var(--text-primary)' : 'var(--text-tertiary)';
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: onClick,
    title: collapsed ? label : undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      height: 36,
      width: '100%',
      border: 'none',
      cursor: 'pointer',
      padding: collapsed ? 0 : '0 12px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      borderRadius: 'var(--radius-md)',
      background: bg,
      color,
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 500,
      textAlign: 'left',
      transition: 'background var(--dur-fast) linear, color var(--dur-fast) linear',
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16,
    strokeWidth: active ? 1.6 : 1.5
  })), !collapsed && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, label), !collapsed && badge != null && /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 18,
      height: 18,
      padding: '0 5px',
      borderRadius: 9,
      background: active ? 'var(--accent-500)' : 'var(--bg-muted)',
      color: active ? '#fff' : 'var(--text-secondary)',
      border: active ? 'none' : '1px solid var(--border-default)',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, badge));
}
Object.assign(__ds_scope, { NavItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavItem.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/** Tabs — onglets soulignés. items: [{id,label,icon?,badge?}]. */
function Tabs({
  items = [],
  value,
  onChange,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: 'flex',
      gap: 4,
      borderBottom: '1px solid var(--border-subtle)',
      ...style
    }
  }, items.map(it => {
    const active = it.id === value;
    return /*#__PURE__*/React.createElement(Tab, {
      key: it.id,
      item: it,
      active: active,
      onChange: onChange
    });
  }));
}
function Tab({
  item,
  active,
  onChange
}) {
  const [hover, setHover] = React.useState(false);
  const color = active ? 'var(--text-accent)' : hover ? 'var(--text-primary)' : 'var(--text-tertiary)';
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "tab",
    "aria-selected": active,
    onClick: () => onChange && onChange(item.id),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '0 4px 10px',
      marginBottom: -1,
      color,
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      fontWeight: 500,
      borderBottom: `2px solid ${active ? 'var(--accent-500)' : 'transparent'}`,
      transition: 'color var(--dur-fast) linear, border-color var(--dur-fast) linear'
    }
  }, item.icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: item.icon,
    size: 15
  }), item.label, item.badge != null && /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 17,
      height: 17,
      padding: '0 5px',
      borderRadius: 9,
      background: 'var(--bg-muted)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border-default)',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, item.badge));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/auth/auth.jsx
try { (() => {
/* ULAMU — Authentification (M01). Expérience unifiée role-aware :
   panneau de marque immersif + sélection d'espace + formulaires adaptatifs.
   Sans mot de passe en priorité (téléphone/OTP), 2FA pour l'équipe ULAMU. */
const UA = window.ULAMUDesignSystem_d14300;
const {
  Button: AB,
  IconButton: AIB,
  Badge: ABD,
  Avatar: AAV,
  Input: AIN,
  Card: AC,
  Icon: AIcn,
  Banner: ABN,
  Switch: ASW,
  VerifiedBadge: AVB
} = UA;

/* Logo ulamu (goutte + base) */
function AuthLogo({
  size = 30,
  light
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: 'var(--radius-md)',
      background: light ? 'rgba(255,255,255,0.16)' : 'var(--accent-500)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      border: light ? '1px solid rgba(255,255,255,0.22)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: light ? 0.18 : 'var(--grain-btn)'
    }
  }), /*#__PURE__*/React.createElement("svg", {
    width: size * 0.56,
    height: size * 0.56,
    viewBox: "0 0 16 16",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 2C5.8 2 4 3.8 4 6c0 1.4.7 2.6 1.8 3.3L5 12h6l-.8-2.7C11.3 8.6 12 7.4 12 6c0-2.2-1.8-4-4-4z",
    fill: "#fff",
    fillOpacity: ".94"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5.5",
    y: "12.5",
    width: "5",
    height: "1.5",
    rx: ".75",
    fill: "#fff",
    fillOpacity: ".74"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: size * 0.62,
      letterSpacing: '-0.5px',
      color: light ? '#fff' : 'var(--text-primary)'
    }
  }, "ulamu"));
}

/* ── Panneau de marque (gauche) — cobalt immersif, photo illustrative + preuves rotatives ── */
const IMG_HERO_D = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=1100&q=80&auto=format&fit=crop';
const PROOFS = [{
  icon: 'shield-check',
  big: 'Payez après la poignée de main',
  small: 'Aucun débit sans accord mutuel.'
}, {
  icon: 'file-medical',
  big: 'Votre dossier de santé, à vie',
  small: 'Consultations, ordonnances et résultats, à vous pour toujours.'
}, {
  icon: 'stethoscope',
  big: 'Des soignants vérifiés un à un',
  small: 'Diplômes contrôlés avant le badge bleu.'
}];
function BrandPanel() {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setI(v => (v + 1) % PROOFS.length), 4200);
    return () => clearInterval(t);
  }, []);
  const p = PROOFS[i];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 496,
      flexShrink: 0,
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--accent-600)',
      display: 'flex',
      flexDirection: 'column',
      padding: '34px 40px 32px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 0.12,
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -160,
      right: -120,
      width: 420,
      height: 420,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(255,255,255,0.16), transparent 68%)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: -200,
      left: -140,
      width: 460,
      height: 460,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(0,0,0,0.22), transparent 66%)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(AuthLogo, {
    size: 30,
    light: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      marginTop: 26,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 212,
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.22)',
      boxShadow: '0 12px 32px rgba(0,0,0,0.32)'
    }
  }, /*#__PURE__*/React.createElement("image-slot", {
    id: "ulamu-auth-hero",
    shape: "rect",
    src: IMG_HERO_D,
    placeholder: "D\xE9posez une photo",
    style: {
      display: 'block',
      width: '100%',
      height: '100%'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(to top, rgba(15,40,90,0.55), transparent 52%)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 12,
      left: 12,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 11px 6px 7px',
      borderRadius: 'var(--radius-full)',
      background: 'rgba(17,17,19,0.46)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.18)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'var(--success-dot)',
      boxShadow: '0 0 8px var(--success-dot)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      fontWeight: 600,
      color: '#fff'
    }
  }, "Consultation en cours")), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      padding: '6px 11px',
      borderRadius: 'var(--radius-full)',
      background: 'rgba(255,255,255,0.94)',
      boxShadow: 'var(--shadow-md)'
    }
  }, /*#__PURE__*/React.createElement(AVB, {
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      fontWeight: 700,
      color: 'var(--accent-600)'
    }
  }, "Dr A. Konat\xE9")))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      animation: 'ulamu-fade-up var(--dur-slow) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 29,
      lineHeight: 1.12,
      letterSpacing: '-0.9px',
      color: '#fff',
      margin: 0,
      maxWidth: 360
    }
  }, p.big), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      lineHeight: 1.55,
      color: 'rgba(255,255,255,0.82)',
      marginTop: 12,
      maxWidth: 340
    }
  }, p.small)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 7,
      marginTop: 18
    }
  }, PROOFS.map((_, k) => /*#__PURE__*/React.createElement("span", {
    key: k,
    style: {
      width: k === i ? 24 : 7,
      height: 7,
      borderRadius: 4,
      background: k === i ? '#fff' : 'rgba(255,255,255,0.32)',
      transition: 'width var(--dur-base) ease-out'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      paddingTop: 20,
      borderTop: '1px solid rgba(255,255,255,0.16)'
    }
  }, [['153', 'soignants vérifiés'], ['12 480', 'dossiers ouverts'], ['4,9★', 'satisfaction']].map(([v, l], k) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: l
  }, k > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 30,
      background: 'rgba(255,255,255,0.16)'
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 19,
      color: '#fff',
      letterSpacing: '-0.4px'
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.66)',
      marginTop: 1
    }
  }, l))))));
}

/* ── Fil d'étapes (style app pro) ── */
const STEPS = ['Rôle', 'Identité', 'Vérification', 'Accès'];
function AuthStepper({
  step
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      width: '100%'
    }
  }, STEPS.map((label, i) => {
    const n = i + 1;
    const done = n < step,
      current = n === step;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: label
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 26,
        height: 26,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: done || current ? 'var(--accent-500)' : 'var(--bg-muted)',
        border: current ? '3px solid rgba(39,86,166,0.22)' : done ? 'none' : '1px solid var(--border-default)',
        color: done || current ? '#fff' : 'var(--text-tertiary)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11.5,
        fontWeight: 600,
        transition: 'background var(--dur-base) linear'
      }
    }, done ? /*#__PURE__*/React.createElement(AIcn, {
      name: "check",
      size: 13
    }) : n), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10.5,
        fontWeight: current ? 600 : 500,
        color: current ? 'var(--text-primary)' : 'var(--text-tertiary)',
        whiteSpace: 'nowrap'
      }
    }, label)), i < STEPS.length - 1 && /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        height: 2,
        margin: '0 6px',
        marginBottom: 18,
        borderRadius: 1,
        background: n < step ? 'var(--accent-500)' : 'var(--border-default)',
        transition: 'background var(--dur-base) linear'
      }
    }));
  }));
}

/* ── Coquille de droite : en-tête (retour + thème) + fil d'étapes + contenu centré ── */
function FormShell({
  onBack,
  children,
  footnote,
  step
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-base)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '20px 28px',
      height: 64
    }
  }, onBack ? /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    className: "uha",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      padding: '7px 12px 7px 9px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-default)',
      background: 'var(--bg-subtle)',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(AIcn, {
    name: "arrow-left",
    size: 15
  }), "Retour") : /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-tertiary)'
    }
  }, "Plateforme de soin ULAMU"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  })), step != null && /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      padding: '4px 56px 8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 392,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(AuthStepper, {
    step: step
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '8px 56px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: 392,
      margin: '0 auto'
    }
  }, children)), /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      padding: '0 56px 22px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11.5,
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement(AIcn, {
    name: "lock",
    size: 12
  }), footnote || 'Connexion chiffrée de bout en bout')));
}

/* ── Sélection de rôle ── */
const ROLES = [{
  id: 'patient',
  icon: 'user',
  label: 'Je suis patient',
  sub: 'Me soigner, suivre mon dossier médical',
  dest: 'App patient'
}, {
  id: 'soignant',
  icon: 'stethoscope',
  label: 'Je suis soignant',
  sub: 'Médecin, infirmier — mon cockpit de soin',
  dest: 'Cockpit professionnel'
}, {
  id: 'structure',
  icon: 'hospital',
  label: 'Une structure',
  sub: 'Pharmacie, laboratoire, clinique',
  dest: 'Espace structure'
}, {
  id: 'ulamu',
  icon: 'shield-check',
  label: 'Équipe ULAMU',
  sub: 'Supervision, vérification, litiges',
  dest: 'Back-office'
}];
function RoleCard({
  r,
  onPick
}) {
  const [hov, setHov] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onPick(r.id),
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => setHov(false),
    className: "uha",
    style: {
      all: 'unset',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 16px',
      borderRadius: 'var(--radius-lg)',
      border: `1px solid ${hov ? 'var(--accent-400)' : 'var(--border-default)'}`,
      background: hov ? 'var(--bg-subtle)' : 'var(--bg-base)',
      transform: hov ? 'translateY(-1px)' : 'none',
      boxShadow: hov ? 'var(--shadow-md)' : 'none',
      boxSizing: 'border-box',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 'var(--radius-md)',
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: hov ? 'var(--accent-500)' : 'rgba(39,86,166,0.14)',
      color: hov ? '#fff' : 'var(--accent-300)',
      transition: 'background var(--dur-fast) linear, color var(--dur-fast) linear',
      position: 'relative',
      overflow: 'hidden'
    }
  }, hov && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'var(--grain-btn)'
    }
  }), /*#__PURE__*/React.createElement(AIcn, {
    name: r.icon,
    size: 21
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 15.5,
      letterSpacing: '-0.2px',
      color: 'var(--text-primary)'
    }
  }, r.label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 12.5,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, r.sub)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: hov ? 'var(--accent-400)' : 'var(--text-disabled)',
      display: 'inline-flex',
      flexShrink: 0,
      transform: hov ? 'translateX(2px)' : 'none',
      transition: 'transform var(--dur-fast) ease-out'
    }
  }, /*#__PURE__*/React.createElement(AIcn, {
    name: "chevron-right",
    size: 18
  })));
}
function RoleSelect({
  onPick
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--accent-300)',
      marginBottom: 10
    }
  }, "Bienvenue"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 27,
      letterSpacing: '-0.7px',
      color: 'var(--text-primary)',
      margin: 0
    }
  }, "Acc\xE9dez \xE0 votre espace"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-tertiary)',
      marginTop: 6
    }
  }, "Choisissez qui vous \xEAtes \u2014 nous adaptons la suite.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, ROLES.map(r => /*#__PURE__*/React.createElement(RoleCard, {
    key: r.id,
    r: r,
    onPick: onPick
  }))));
}

/* ── Panneau illustration (droite) — carousel d'étapes du cœur métier ULAMU ── */
const D_JOURNEY = [{
  slug: 'communication',
  t: 'Trouvez un soignant vérifié',
  s: 'Diplômes contrôlés un à un avant le badge bleu.'
}, {
  slug: 'video-call',
  t: 'Consultez à distance',
  s: 'Au tarif annoncé, après la poignée de main.'
}, {
  slug: 'taking-notes',
  t: 'Recevez votre ordonnance',
  s: 'Signée, avec un QR de délivrance sécurisé.'
}, {
  slug: 'customer-support',
  t: 'Réservez vos médicaments',
  s: 'Trouvés et gardés dans une pharmacie proche.'
}, {
  slug: 'success',
  t: 'Votre dossier de santé, à vie',
  s: 'Gratuit et chiffré — rien que pour vous.'
}];
function IllustrationPanel() {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setI(v => (v + 1) % D_JOURNEY.length), 5000);
    return () => clearInterval(t);
  }, []);
  const s = D_JOURNEY[i];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 540,
      flexShrink: 0,
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--bg-subtle)',
      borderLeft: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: '34px 44px 38px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -140,
      right: -120,
      width: 380,
      height: 380,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(39,86,166,0.12), transparent 68%)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: -160,
      left: -120,
      width: 360,
      height: 360,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(39,86,166,0.08), transparent 66%)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(AuthLogo, {
    size: 24
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-accent)'
    }
  }, /*#__PURE__*/React.createElement(AIcn, {
    name: "shield-check",
    size: 13
  }), "Le soin, simplement")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 0,
      padding: '14px 0'
    }
  }, /*#__PURE__*/React.createElement("img", {
    key: s.slug,
    src: `https://illustrations.popsy.co/blue/${s.slug}.svg`,
    alt: "",
    style: {
      width: '84%',
      maxHeight: '100%',
      objectFit: 'contain',
      animation: 'ulamu-fade var(--dur-slow) ease-out'
    }
  })), /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: 'relative',
      minHeight: 86,
      animation: 'ulamu-fade-up var(--dur-moderate) ease-out'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 23,
      letterSpacing: '-0.5px',
      color: 'var(--text-primary)',
      margin: 0
    }
  }, s.t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      color: 'var(--text-tertiary)',
      marginTop: 7,
      lineHeight: 1.55,
      maxWidth: 360
    }
  }, s.s)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
      gap: 7,
      marginTop: 20
    }
  }, D_JOURNEY.map((_, k) => /*#__PURE__*/React.createElement("span", {
    key: k,
    style: {
      width: k === i ? 8 : 6,
      height: k === i ? 8 : 6,
      borderRadius: '50%',
      background: k === i ? 'var(--accent-500)' : 'var(--border-default)',
      transition: 'width var(--dur-base) ease-out, height var(--dur-base) ease-out, background var(--dur-base) linear'
    }
  }))));
}
window.AuthLogo = AuthLogo;
window.AuthIllustrationPanel = IllustrationPanel;
window.AuthFormShell = FormShell;
window.AuthRoleSelect = RoleSelect;
window.AUTH_ROLES = ROLES;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/auth/auth.jsx", error: String((e && e.message) || e) }); }

// ui_kits/auth/auth2.jsx
try { (() => {
/* ULAMU — Authentification (suite) : OTP, identifiants adaptatifs,
   mot de passe oublié, demande d'accès structure, succès + contrôleur racine. */
const UA2 = window.ULAMUDesignSystem_d14300;
const {
  Button: A2B,
  IconButton: A2IB,
  Badge: A2BD,
  Input: A2IN,
  Card: A2C,
  Icon: A2I,
  Banner: A2BN,
  Switch: A2SW,
  VerifiedBadge: A2VB
} = UA2;
const A2_ROLES = window.AUTH_ROLES;

/* Titre de section réutilisable */
function Lead({
  kicker,
  title,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 22
    }
  }, kicker && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--accent-300)',
      marginBottom: 10
    }
  }, kicker), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 25,
      letterSpacing: '-0.6px',
      color: 'var(--text-primary)',
      margin: 0
    }
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-tertiary)',
      marginTop: 6,
      lineHeight: 1.5
    }
  }, sub));
}

/* Étiquette de champ */
function FieldLabel({
  children,
  hint,
  onHint
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      fontWeight: 600,
      color: 'var(--text-secondary)'
    }
  }, children), hint && /*#__PURE__*/React.createElement("button", {
    onClick: onHint,
    style: {
      all: 'unset',
      marginLeft: 'auto',
      cursor: 'pointer',
      fontSize: 12,
      color: 'var(--text-accent)',
      fontWeight: 500
    }
  }, hint));
}

/* ── OTP : 6 cases, collage, auto-avance, auto-réception démo ── */
function OtpInput({
  value,
  onChange,
  autofill
}) {
  const refs = React.useRef([]);
  React.useEffect(() => {
    if (!autofill) return;
    onChange('');
    const code = '481902'.split('');
    const ids = code.map((d, i) => setTimeout(() => onChange(v => (v + d).slice(0, 6)), 900 + i * 320));
    return () => ids.forEach(clearTimeout);
  }, [autofill]);
  const setAt = (i, d) => {
    const arr = value.split('');
    arr[i] = d;
    onChange(arr.join('').slice(0, 6));
  };
  const onKey = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[i]) setAt(i, '');else if (i > 0) {
        setAt(i - 1, '');
        refs.current[i - 1]?.focus();
      }
    } else if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      setAt(i, e.key);
      if (i < 5) refs.current[i + 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();else if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };
  const onPaste = e => {
    e.preventDefault();
    const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (digits) {
      onChange(digits);
      refs.current[Math.min(digits.length, 5)]?.focus();
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 9,
      justifyContent: 'space-between'
    },
    onPaste: onPaste
  }, [0, 1, 2, 3, 4, 5].map(i => {
    const filled = !!value[i];
    return /*#__PURE__*/React.createElement("input", {
      key: i,
      ref: el => refs.current[i] = el,
      inputMode: "numeric",
      maxLength: 1,
      value: value[i] || '',
      onChange: () => {},
      onKeyDown: e => onKey(i, e),
      onFocus: e => e.target.select(),
      style: {
        width: 50,
        height: 60,
        textAlign: 'center',
        borderRadius: 'var(--radius-lg)',
        border: `1.5px solid ${filled ? 'var(--accent-500)' : 'var(--border-default)'}`,
        background: 'var(--bg-base)',
        fontFamily: 'var(--font-mono)',
        fontSize: 24,
        fontWeight: 600,
        color: 'var(--text-primary)',
        outline: 'none',
        boxShadow: filled ? '0 0 0 3px rgba(39,86,166,0.14)' : 'none',
        transition: 'border-color var(--dur-base) linear, box-shadow var(--dur-base) linear'
      }
    });
  }));
}

/* ── Champ mot de passe avec affichage + alerte Maj ── */
function PasswordField({
  value,
  onChange,
  onEnter
}) {
  const [show, setShow] = React.useState(false);
  const [focus, setFocus] = React.useState(false);
  const [caps, setCaps] = React.useState(false);
  const border = focus ? 'var(--accent-500)' : 'var(--border-default)';
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 12,
      display: 'inline-flex',
      color: 'var(--text-tertiary)',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(A2I, {
    name: "lock",
    size: 16
  })), /*#__PURE__*/React.createElement("input", {
    type: show ? 'text' : 'password',
    value: value,
    placeholder: "Votre mot de passe",
    onChange: e => onChange(e.target.value),
    onFocus: () => setFocus(true),
    onBlur: () => {
      setFocus(false);
      setCaps(false);
    },
    onKeyUp: e => setCaps(e.getModifierState && e.getModifierState('CapsLock')),
    onKeyDown: e => {
      if (e.key === 'Enter' && onEnter) onEnter();
    },
    style: {
      width: '100%',
      height: 44,
      boxSizing: 'border-box',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${border}`,
      background: 'var(--bg-base)',
      padding: '0 42px 0 34px',
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: 'var(--text-primary)',
      outline: 'none',
      boxShadow: focus ? '0 0 0 3px rgba(39,86,166,0.18)' : 'none',
      transition: 'border-color var(--dur-base) linear, box-shadow var(--dur-base) linear'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShow(s => !s),
    "aria-label": show ? 'Masquer' : 'Afficher',
    style: {
      all: 'unset',
      position: 'absolute',
      right: 12,
      cursor: 'pointer',
      color: 'var(--text-tertiary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(A2I, {
    name: show ? 'eye-off' : 'eye',
    size: 16
  }))), caps && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      marginTop: 7,
      fontSize: 11.5,
      color: 'var(--warning-text)'
    }
  }, /*#__PURE__*/React.createElement(A2I, {
    name: "alert-triangle",
    size: 12
  }), "Verrouillage majuscules activ\xE9"));
}

/* Bouton pleine largeur 44px (cohérent avec les champs) */
function BigBtn({
  children,
  onClick,
  disabled,
  variant = 'primary',
  iconLeft,
  iconRight
}) {
  return /*#__PURE__*/React.createElement(A2B, {
    variant: variant,
    fullWidth: true,
    size: "lg",
    disabled: disabled,
    onClick: onClick,
    iconLeft: iconLeft,
    iconRight: iconRight
  }, children);
}

/* ── Identifiants adaptatifs ── */
function Credentials({
  role,
  onSubmit,
  onForgot,
  onRequest,
  onPasswordless
}) {
  const cfg = A2_ROLES.find(r => r.id === role);
  const isPhone = role === 'patient';
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const [remember, setRemember] = React.useState(true);
  if (isPhone) {
    const ready = phone.replace(/\D/g, '').length >= 9;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)'
      }
    }, /*#__PURE__*/React.createElement(Lead, {
      kicker: "Espace patient",
      title: "Votre num\xE9ro de t\xE9l\xE9phone",
      sub: "Un code par SMS, pas de mot de passe."
    }), /*#__PURE__*/React.createElement(FieldLabel, null, "Num\xE9ro de t\xE9l\xE9phone"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 13px',
        height: 44,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-default)',
        background: 'var(--bg-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 14,
        color: 'var(--text-secondary)',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(A2I, {
      name: "phone",
      size: 14
    }), "+242"), /*#__PURE__*/React.createElement(A2IN, {
      placeholder: "06 612 45 90",
      value: phone,
      type: "tel",
      onChange: e => setPhone(e.target.value),
      style: {
        height: 44,
        fontSize: 14
      },
      onKeyDown: e => {
        if (e.key === 'Enter' && ready) onSubmit({
          method: 'sms',
          dest: cfg.dest
        });
      }
    })), /*#__PURE__*/React.createElement(BigBtn, {
      iconLeft: "send",
      disabled: !ready,
      onClick: () => onSubmit({
        method: 'sms',
        dest: cfg.dest
      })
    }, "Recevoir mon code"), /*#__PURE__*/React.createElement(A2BN, {
      tone: "info",
      style: {
        marginTop: 16
      }
    }, "Nouveau sur ULAMU ? Votre dossier m\xE9dical gratuit s'ouvre d\xE8s la premi\xE8re connexion."));
  }

  /* Soignant / structure / ULAMU : email + mot de passe (+ 2FA pour ULAMU) */
  const ready = email.includes('@') && pwd.length >= 4;
  const is2fa = role === 'ulamu';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement(Lead, {
    kicker: cfg.dest,
    title: "Connexion \xE0 votre compte",
    sub: is2fa ? 'Accès supervisé · double authentification.' : 'Accédez à votre espace professionnel.'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FieldLabel, null, "Adresse e-mail professionnelle"), /*#__PURE__*/React.createElement(A2IN, {
    leftIcon: "mail",
    placeholder: "nom@structure.cg",
    value: email,
    type: "email",
    onChange: e => setEmail(e.target.value),
    style: {
      height: 44,
      fontSize: 14
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FieldLabel, {
    hint: "Mot de passe oubli\xE9 ?",
    onHint: onForgot
  }, "Mot de passe"), /*#__PURE__*/React.createElement(PasswordField, {
    value: pwd,
    onChange: setPwd,
    onEnter: () => ready && onSubmit({
      method: is2fa ? '2fa' : 'pwd',
      dest: cfg.dest
    })
  })), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 9,
      cursor: 'pointer',
      userSelect: 'none'
    }
  }, /*#__PURE__*/React.createElement(A2SW, {
    checked: remember,
    onChange: () => setRemember(r => !r)
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-secondary)'
    }
  }, "Se souvenir de cet appareil 30 jours")), /*#__PURE__*/React.createElement(BigBtn, {
    iconLeft: is2fa ? 'shield-check' : 'arrow-right',
    disabled: !ready,
    onClick: () => onSubmit({
      method: is2fa ? '2fa' : 'pwd',
      dest: cfg.dest
    })
  }, is2fa ? 'Continuer vers la double authentification' : 'Se connecter')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      margin: '18px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--border-subtle)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-disabled)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em'
    }
  }, "ou"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--border-subtle)'
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => onPasswordless(cfg.dest),
    className: "uha",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%',
      height: 44,
      boxSizing: 'border-box',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-default)',
      background: 'var(--bg-subtle)',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement(A2I, {
    name: "send",
    size: 15
  }), "Recevoir un code \xE0 usage unique"), role === 'structure' && /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: 'center',
      fontSize: 12.5,
      color: 'var(--text-tertiary)',
      marginTop: 18
    }
  }, "Votre structure n'est pas encore r\xE9f\xE9renc\xE9e ?", ' ', /*#__PURE__*/React.createElement("button", {
    onClick: onRequest,
    style: {
      all: 'unset',
      cursor: 'pointer',
      color: 'var(--text-accent)',
      fontWeight: 600
    }
  }, "Demander un acc\xE8s")));
}

/* ── Vérification OTP ── */
function OtpVerify({
  flow,
  onVerify,
  onBack
}) {
  const [otp, setOtp] = React.useState('');
  const [secs, setSecs] = React.useState(45);
  React.useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);
  const is2fa = flow.method === '2fa';
  const ready = otp.length === 6;
  React.useEffect(() => {
    if (ready) {
      const t = setTimeout(() => onVerify(flow), 420);
      return () => clearTimeout(t);
    }
  }, [ready]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 48,
      height: 48,
      borderRadius: 'var(--radius-lg)',
      background: 'rgba(39,86,166,0.14)',
      color: 'var(--accent-300)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement(A2I, {
    name: is2fa ? 'shield-check' : 'message',
    size: 22
  })), /*#__PURE__*/React.createElement(Lead, {
    title: is2fa ? 'Double authentification' : 'Entrez le code reçu',
    sub: is2fa ? 'Saisissez le code à 6 chiffres de votre application d\'authentification.' : 'Code à 6 chiffres envoyé par SMS au +242 06 612 45 90.'
  }), /*#__PURE__*/React.createElement(OtpInput, {
    value: otp,
    onChange: setOtp,
    autofill: !is2fa
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      margin: '18px 0 4px'
    }
  }, !ready ? is2fa ? /*#__PURE__*/React.createElement(A2BD, {
    tone: "neutral",
    size: "sm",
    icon: "lock"
  }, "En attente de votre saisie") : /*#__PURE__*/React.createElement(A2BD, {
    tone: "neutral",
    dot: true,
    size: "sm"
  }, "R\xE9ception du code en cours\u2026") : /*#__PURE__*/React.createElement(A2BD, {
    tone: "success",
    size: "sm",
    icon: "check-circle"
  }, "Code complet \u2014 v\xE9rification\u2026")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, secs > 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-tertiary)'
    }
  }, "Renvoyer le code dans ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      color: 'var(--text-secondary)'
    }
  }, secs, "s")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setSecs(45),
    style: {
      all: 'unset',
      cursor: 'pointer',
      fontSize: 12.5,
      color: 'var(--text-accent)',
      fontWeight: 600
    }
  }, "Renvoyer le code")));
}

/* ── Mot de passe oublié ── */
function Forgot({
  onBack
}) {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  if (sent) return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 56,
      height: 56,
      borderRadius: '50%',
      background: 'var(--success-bg)',
      border: '1px solid var(--success-border)',
      color: 'var(--success-dot)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(A2I, {
    name: "mail",
    size: 26
  })), /*#__PURE__*/React.createElement(Lead, {
    title: "Lien envoy\xE9",
    sub: `Si un compte existe pour ${email}, un lien de réinitialisation vient d'y être envoyé.`
  }), /*#__PURE__*/React.createElement(BigBtn, {
    iconLeft: "arrow-left",
    variant: "secondary",
    onClick: onBack
  }, "Revenir \xE0 la connexion"));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement(Lead, {
    kicker: "R\xE9cup\xE9ration",
    title: "Mot de passe oubli\xE9",
    sub: "Indiquez votre e-mail : nous vous envoyons un lien s\xE9curis\xE9 pour en choisir un nouveau."
  }), /*#__PURE__*/React.createElement(FieldLabel, null, "Adresse e-mail"), /*#__PURE__*/React.createElement(A2IN, {
    leftIcon: "mail",
    placeholder: "nom@structure.cg",
    value: email,
    type: "email",
    onChange: e => setEmail(e.target.value),
    style: {
      height: 44,
      fontSize: 14
    },
    wrapperStyle: {
      marginBottom: 14
    }
  }), /*#__PURE__*/React.createElement(BigBtn, {
    iconLeft: "send",
    disabled: !email.includes('@'),
    onClick: () => setSent(true)
  }, "Envoyer le lien"));
}

/* ── Demande d'accès structure ── */
function RequestAccess({
  onBack
}) {
  const [f, setF] = React.useState({
    struct: '',
    name: '',
    email: ''
  });
  const [doc, setDoc] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const ready = f.struct && f.name && f.email.includes('@') && doc;
  if (sent) return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 56,
      height: 56,
      borderRadius: '50%',
      background: 'rgba(39,86,166,0.14)',
      color: 'var(--accent-300)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(A2I, {
    name: "shield-check",
    size: 26
  })), /*#__PURE__*/React.createElement(Lead, {
    title: "Demande envoy\xE9e",
    sub: "L'\xE9quipe ULAMU v\xE9rifie vos documents sous 48 h. Vous recevrez vos acc\xE8s par e-mail une fois la structure valid\xE9e."
  }), /*#__PURE__*/React.createElement(A2BD, {
    tone: "warning",
    icon: "lock",
    style: {
      marginBottom: 18
    }
  }, "En cours de v\xE9rification"), /*#__PURE__*/React.createElement(BigBtn, {
    iconLeft: "arrow-left",
    variant: "secondary",
    onClick: onBack
  }, "Revenir \xE0 la connexion"));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)'
    }
  }, /*#__PURE__*/React.createElement(Lead, {
    kicker: "Nouvelle structure",
    title: "Demander un acc\xE8s",
    sub: "Pharmacie, laboratoire ou clinique \u2014 chaque structure est v\xE9rifi\xE9e avant activation."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FieldLabel, null, "Nom de la structure"), /*#__PURE__*/React.createElement(A2IN, {
    leftIcon: "hospital",
    placeholder: "Pharmacie du March\xE9",
    value: f.struct,
    onChange: e => setF({
      ...f,
      struct: e.target.value
    }),
    style: {
      height: 44,
      fontSize: 14
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FieldLabel, null, "Responsable (titulaire)"), /*#__PURE__*/React.createElement(A2IN, {
    leftIcon: "user",
    placeholder: "Pr\xE9nom et nom",
    value: f.name,
    onChange: e => setF({
      ...f,
      name: e.target.value
    }),
    style: {
      height: 44,
      fontSize: 14
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FieldLabel, null, "E-mail professionnel"), /*#__PURE__*/React.createElement(A2IN, {
    leftIcon: "mail",
    placeholder: "nom@structure.cg",
    value: f.email,
    type: "email",
    onChange: e => setF({
      ...f,
      email: e.target.value
    }),
    style: {
      height: 44,
      fontSize: 14
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDoc(true),
    className: "uha",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      width: '100%',
      boxSizing: 'border-box',
      padding: '12px 14px',
      borderRadius: 'var(--radius-md)',
      border: `1px dashed ${doc ? 'var(--success-border)' : 'var(--border-default)'}`,
      background: doc ? 'var(--success-bg)' : 'var(--bg-subtle)',
      cursor: 'pointer',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-md)',
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: doc ? 'var(--success-dot)' : 'var(--bg-muted)',
      color: doc ? '#fff' : 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement(A2I, {
    name: doc ? 'check' : 'upload',
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, doc ? 'agrement_pharmacie.pdf' : 'Joindre l\'agrément / licence'), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 11.5,
      color: 'var(--text-tertiary)',
      marginTop: 1
    }
  }, doc ? 'Document ajouté · 1,2 Mo' : 'PDF ou photo — vérifié par ULAMU'))), /*#__PURE__*/React.createElement(BigBtn, {
    iconLeft: "send",
    disabled: !ready,
    onClick: () => setSent(true)
  }, "Envoyer ma demande")));
}

/* ── Succès ── */
const DEST_ICON = {
  'App patient': 'user',
  'Cockpit professionnel': 'stethoscope',
  'Espace structure': 'hospital',
  'Back-office': 'shield-check'
};
function Success({
  flow,
  onReplay
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes ulamu-pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}'), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 68,
      height: 68,
      borderRadius: '50%',
      background: 'var(--success-bg)',
      border: '1px solid var(--success-border)',
      color: 'var(--success-dot)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
      animation: 'ulamu-pop var(--dur-slow) var(--ease-spring)'
    }
  }, /*#__PURE__*/React.createElement(A2I, {
    name: "check-circle",
    size: 34
  })), /*#__PURE__*/React.createElement(Lead, {
    title: "Connexion r\xE9ussie",
    sub: "Vous \xEAtes authentifi\xE9. Bienvenue sur ULAMU."
  }), /*#__PURE__*/React.createElement(A2C, {
    padding: "14px 16px",
    style: {
      textAlign: 'left',
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 'var(--radius-md)',
      flexShrink: 0,
      background: 'rgba(39,86,166,0.14)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(A2I, {
    name: DEST_ICON[flow.dest] || 'arrow-right',
    size: 19
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, "Vous acc\xE9dez \xE0"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 15,
      color: 'var(--text-primary)'
    }
  }, flow.dest), /*#__PURE__*/React.createElement(A2VB, {
    size: "sm"
  }))), /*#__PURE__*/React.createElement(A2BD, {
    tone: "success",
    dot: true,
    size: "sm"
  }, "S\xE9curis\xE9"))), /*#__PURE__*/React.createElement(BigBtn, {
    iconRight: "arrow-right",
    onClick: onReplay
  }, "Acc\xE9der \xE0 mon espace"), /*#__PURE__*/React.createElement("button", {
    onClick: onReplay,
    style: {
      all: 'unset',
      display: 'block',
      margin: '14px auto 0',
      cursor: 'pointer',
      fontSize: 12.5,
      color: 'var(--text-tertiary)'
    }
  }, "Rejouer la d\xE9mo de connexion"));
}

/* ── Contrôleur racine ── */
function AuthApp() {
  const [screen, setScreen] = React.useState('role'); // role | creds | otp | success | forgot | request
  const [role, setRole] = React.useState(null);
  const [flow, setFlow] = React.useState({
    method: 'pwd',
    dest: ''
  });
  const reset = () => {
    setScreen('role');
    setRole(null);
  };
  const STEP = {
    role: 1,
    creds: 2,
    otp: 3,
    success: 4
  };
  let body,
    onBack = null,
    footnote,
    step = STEP[screen] != null ? STEP[screen] : null;
  if (screen === 'role') {
    body = /*#__PURE__*/React.createElement(window.AuthRoleSelect, {
      onPick: id => {
        setRole(id);
        setScreen('creds');
      }
    });
    footnote = 'Connexion chiffrée de bout en bout';
  } else if (screen === 'creds') {
    onBack = reset;
    body = /*#__PURE__*/React.createElement(Credentials, {
      role: role,
      onSubmit: f => {
        setFlow(f);
        setScreen(f.method === 'pwd' ? 'success' : 'otp');
      },
      onPasswordless: dest => {
        setFlow({
          method: 'sms',
          dest
        });
        setScreen('otp');
      },
      onForgot: () => setScreen('forgot'),
      onRequest: () => setScreen('request')
    });
    footnote = role === 'patient' ? 'Votre téléphone est votre seul identifiant' : 'Connexion chiffrée de bout en bout';
  } else if (screen === 'otp') {
    onBack = () => setScreen('creds');
    body = /*#__PURE__*/React.createElement(OtpVerify, {
      flow: flow,
      onVerify: f => {
        setFlow(f);
        setScreen('success');
      },
      onBack: () => setScreen('creds')
    });
    footnote = 'Code à usage unique — valable 10 minutes';
  } else if (screen === 'forgot') {
    onBack = () => setScreen('creds');
    body = /*#__PURE__*/React.createElement(Forgot, {
      onBack: () => setScreen('creds')
    });
    footnote = 'Lien de réinitialisation sécurisé';
  } else if (screen === 'request') {
    onBack = () => setScreen('creds');
    body = /*#__PURE__*/React.createElement(RequestAccess, {
      onBack: () => setScreen('creds')
    });
    footnote = 'Chaque structure est vérifiée avant activation';
  } else {
    body = /*#__PURE__*/React.createElement(Success, {
      flow: flow,
      onReplay: reset
    });
    footnote = 'Session sécurisée';
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement(window.AuthFormShell, {
    onBack: onBack,
    footnote: footnote,
    step: step
  }, body), /*#__PURE__*/React.createElement(window.AuthIllustrationPanel, null));
}
window.AuthApp = AuthApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/auth/auth2.jsx", error: String((e && e.message) || e) }); }

// ui_kits/auth/image-slot.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
/* BEGIN USAGE */
/**
 * <image-slot> — user-fillable image placeholder.
 *
 * Drop this into a deck, mockup, or page wherever you want the user to
 * supply an image. You control the slot's shape and size; the user fills it
 * by dragging an image file onto it (or clicking to browse). The dropped
 * image persists across reloads via a .image-slots.state.json sidecar —
 * same read-via-fetch / write-via-window.omelette pattern as
 * design_canvas.jsx, so the filled slot shows on share links, downloaded
 * zips, and PPTX export. Outside the omelette runtime the slot is read-only.
 *
 * The host bridge only allows sidecar writes at the project root, so the
 * HTML that uses this component is assumed to live at the project root too
 * (same constraint as design_canvas.jsx).
 *
 * Attributes:
 *   id           Persistence key. REQUIRED for the drop to survive reload —
 *                every slot on the page needs a distinct id.
 *   shape        'rect' | 'rounded' | 'circle' | 'pill'   (default 'rounded')
 *                'circle' applies 50% border-radius; on a non-square slot
 *                that's an ellipse — set equal width and height for a true
 *                circle.
 *   radius       Corner radius in px for 'rounded'.       (default 12)
 *   mask         Any CSS clip-path value. Overrides `shape` — use this for
 *                hexagons, blobs, arbitrary polygons.
 *   fit          object-fit: cover | contain | fill.       (default 'cover')
 *                With cover (the default) double-clicking the filled slot
 *                enters a reframe mode: the whole image spills past the mask
 *                (translucent outside, opaque inside), drag to reposition,
 *                corner-drag to scale. The crop persists alongside the image
 *                in the sidecar. contain/fill stay static.
 *   position     object-position for fit=contain|fill.     (default '50% 50%')
 *   placeholder  Empty-state caption.                      (default 'Drop an image')
 *   src          Optional initial/fallback image URL. A user drop overrides
 *                it; clearing the drop reveals src again.
 *
 * Size and layout come from ordinary CSS on the element — width/height
 * inline or from a parent grid — so it composes with any layout.
 *
 * Usage:
 *   <image-slot id="hero"   style="width:800px;height:450px" shape="rounded" radius="20"
 *               placeholder="Drop a hero image"></image-slot>
 *   <image-slot id="avatar" style="width:120px;height:120px" shape="circle"></image-slot>
 *   <image-slot id="kite"   style="width:300px;height:300px"
 *               mask="polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"></image-slot>
 */
/* END USAGE */

(() => {
  const STATE_FILE = '.image-slots.state.json';
  // 2× a ~600px slot in a 1920-wide deck — retina-sharp without making the
  // sidecar enormous. A 1200px WebP at q=0.85 is ~150-300KB.
  const MAX_DIM = 1200;
  // Raster formats only. SVG is excluded (can carry script; createImageBitmap
  // on SVG blobs is inconsistent). GIF is excluded because the canvas
  // re-encode keeps only the first frame, so an animated GIF would silently
  // go still — better to reject than surprise.
  const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

  // ── Shared sidecar store ────────────────────────────────────────────────
  // One fetch + immediate write-on-change for every <image-slot> on the
  // page. Reads via fetch() so viewing works anywhere the HTML and sidecar
  // are served together; writes go through window.omelette.writeFile, which
  // the host allowlists to *.state.json basenames only.
  const subs = new Set();
  let slots = {};
  // ids explicitly cleared before the sidecar fetch resolved — otherwise
  // the merge below can't tell "never set" from "just deleted" and would
  // resurrect the sidecar's stale value.
  const tombstones = new Set();
  let loaded = false;
  let loadP = null;
  function load() {
    if (loadP) return loadP;
    loadP = fetch(STATE_FILE).then(r => r.ok ? r.json() : null).then(j => {
      // Merge: sidecar loses to any in-memory change that raced ahead of
      // the fetch (drop or clear) so neither is clobbered by hydration.
      if (j && typeof j === 'object') {
        const merged = Object.assign({}, j, slots);
        // A framing-only write that raced ahead of hydration must not
        // drop a user image that's only on disk — inherit u from the
        // sidecar for any in-memory entry that lacks one.
        for (const k in slots) {
          if (merged[k] && !merged[k].u && j[k]) {
            merged[k].u = typeof j[k] === 'string' ? j[k] : j[k].u;
          }
        }
        for (const id of tombstones) delete merged[id];
        slots = merged;
      }
      tombstones.clear();
    }).catch(() => {}).then(() => {
      loaded = true;
      subs.forEach(fn => fn());
    });
    return loadP;
  }

  // Serialize writes so two near-simultaneous drops on different slots
  // can't reorder at the backend and leave the sidecar with only the
  // first. A save requested mid-flight just marks dirty and re-fires on
  // completion with the then-current slots.
  let saving = false;
  let saveDirty = false;
  function save() {
    if (saving) {
      saveDirty = true;
      return;
    }
    const w = window.omelette && window.omelette.writeFile;
    if (!w) return;
    saving = true;
    Promise.resolve(w(STATE_FILE, JSON.stringify(slots))).catch(() => {}).then(() => {
      saving = false;
      if (saveDirty) {
        saveDirty = false;
        save();
      }
    });
  }
  const S_MAX = 5;
  const clampS = s => Math.max(1, Math.min(S_MAX, s));

  // Normalize a stored slot value. Pre-reframe sidecars stored a bare
  // data-URL string; newer ones store {u, s, x, y}. Either shape is valid.
  function getSlot(id) {
    const v = slots[id];
    if (!v) return null;
    return typeof v === 'string' ? {
      u: v,
      s: 1,
      x: 0,
      y: 0
    } : v;
  }
  function setSlot(id, val) {
    if (!id) return;
    if (val) {
      slots[id] = val;
      tombstones.delete(id);
    } else {
      delete slots[id];
      if (!loaded) tombstones.add(id);
    }
    subs.forEach(fn => fn());
    // A drop is rare + high-value — write immediately so nav-away can't lose
    // it. Gate on the initial read so we don't overwrite a sidecar we haven't
    // merged yet; the merge in load() keeps this change once the read lands.
    if (loaded) save();else load().then(save);
  }

  // ── Image downscale ─────────────────────────────────────────────────────
  // Encode through a canvas so the sidecar carries resized bytes, not the
  // raw upload. Longest side is capped at 2× the slot's rendered width
  // (retina) and at MAX_DIM. WebP keeps alpha and is ~10× smaller than PNG
  // for photos, so there's no need for per-image format picking.
  async function toDataUrl(file, targetW) {
    const bitmap = await createImageBitmap(file);
    try {
      const cap = Math.min(MAX_DIM, Math.max(1, Math.round(targetW * 2)) || MAX_DIM);
      const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      return canvas.toDataURL('image/webp', 0.85);
    } finally {
      bitmap.close && bitmap.close();
    }
  }

  // ── Custom element ──────────────────────────────────────────────────────
  const stylesheet = ':host{display:inline-block;position:relative;vertical-align:top;' + '  font:13px/1.3 system-ui,-apple-system,sans-serif;color:rgba(0,0,0,.55);width:240px;height:160px}' + '.frame{position:absolute;inset:0;overflow:hidden;background:rgba(0,0,0,.04)}' +
  // .frame img (clipped) and .spill (unclipped ghost + handles) share the
  // same left/top/width/height in frame-%, computed by _applyView(), so the
  // inside-mask crop and the outside-mask spill stay pixel-aligned.
  '.frame img{position:absolute;max-width:none;transform:translate(-50%,-50%);' + '  -webkit-user-drag:none;user-select:none;touch-action:none}' +
  // Reframe mode (double-click): the full image spills past the mask. The
  // spill layer is sized to the IMAGE bounds so its corners are where the
  // resize handles belong. The ghost <img> inside is translucent; the real
  // clipped <img> underneath shows the opaque in-mask crop.
  '.spill{position:absolute;transform:translate(-50%,-50%);display:none;z-index:1;' + '  cursor:grab;touch-action:none}' + ':host([data-panning]) .spill{cursor:grabbing}' + '.spill .ghost{position:absolute;inset:0;width:100%;height:100%;opacity:.35;' + '  pointer-events:none;-webkit-user-drag:none;user-select:none;' + '  box-shadow:0 0 0 1px rgba(0,0,0,.2),0 12px 32px rgba(0,0,0,.2)}' + '.spill .handle{position:absolute;width:12px;height:12px;border-radius:50%;' + '  background:#fff;box-shadow:0 0 0 1.5px #c96442,0 1px 3px rgba(0,0,0,.3);' + '  transform:translate(-50%,-50%)}' + '.spill .handle[data-c=nw]{left:0;top:0;cursor:nwse-resize}' + '.spill .handle[data-c=ne]{left:100%;top:0;cursor:nesw-resize}' + '.spill .handle[data-c=sw]{left:0;top:100%;cursor:nesw-resize}' + '.spill .handle[data-c=se]{left:100%;top:100%;cursor:nwse-resize}' + ':host([data-reframe]){z-index:10}' + ':host([data-reframe]) .spill{display:block}' + ':host([data-reframe]) .frame{box-shadow:0 0 0 2px #c96442}' + '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' + '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' + '  cursor:pointer;user-select:none}' + '.empty svg{opacity:.45}' + '.empty .cap{max-width:90%;font-weight:500;letter-spacing:.01em}' + '.empty .sub{font-size:11px}' + '.empty .sub u{text-underline-offset:2px;text-decoration-color:rgba(0,0,0,.25)}' + '.empty:hover .sub u{color:rgba(0,0,0,.75);text-decoration-color:currentColor}' + ':host([data-over]) .frame{outline:2px solid #c96442;outline-offset:-2px;' + '  background:rgba(201,100,66,.10)}' + '.ring{position:absolute;inset:0;pointer-events:none;border:1.5px dashed rgba(0,0,0,.25);' + '  transition:border-color .12s}' + ':host([data-over]) .ring{border-color:#c96442}' + ':host([data-filled]) .ring{display:none}' +
  // Controls sit BELOW the mask (top:100%), absolutely positioned so the
  // author-declared slot height is unaffected. The gap is padding, not a
  // top offset, so the hover target stays contiguous with the frame.
  '.ctl{position:absolute;top:100%;left:50%;transform:translateX(-50%);padding-top:8px;' + '  display:flex;gap:6px;opacity:0;pointer-events:none;transition:opacity .12s;z-index:2;' + '  white-space:nowrap}' + ':host([data-filled][data-editable]:hover) .ctl,:host([data-reframe]) .ctl' + '  {opacity:1;pointer-events:auto}' + '.ctl button{appearance:none;border:0;border-radius:6px;padding:5px 10px;cursor:pointer;' + '  background:rgba(0,0,0,.65);color:#fff;font:11px/1 system-ui,-apple-system,sans-serif;' + '  backdrop-filter:blur(6px)}' + '.ctl button:hover{background:rgba(0,0,0,.8)}' + '.err{position:absolute;left:8px;bottom:8px;right:8px;color:#b3261e;font-size:11px;' + '  background:rgba(255,255,255,.85);padding:4px 6px;border-radius:5px;pointer-events:none}';
  const icon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' + '<path d="m21 15-5-5L5 21"/></svg>';
  class ImageSlot extends HTMLElement {
    static get observedAttributes() {
      return ['shape', 'radius', 'mask', 'fit', 'position', 'placeholder', 'src', 'id'];
    }
    constructor() {
      super();
      const root = this.attachShadow({
        mode: 'open'
      });
      // .spill and .ctl sit OUTSIDE .frame so overflow:hidden + border-radius
      // on the frame (circle, pill, rounded) can't clip them.
      root.innerHTML = '<style>' + stylesheet + '</style>' + '<div class="frame" part="frame">' + '  <img part="image" alt="" draggable="false" style="display:none">' + '  <div class="empty" part="empty">' + icon + '    <div class="cap"></div>' + '    <div class="sub">or <u>browse files</u></div></div>' + '  <div class="ring" part="ring"></div>' + '</div>' + '<div class="spill">' + '  <img class="ghost" alt="" draggable="false">' + '  <div class="handle" data-c="nw"></div><div class="handle" data-c="ne"></div>' + '  <div class="handle" data-c="sw"></div><div class="handle" data-c="se"></div>' + '</div>' + '<div class="ctl"><button data-act="replace" title="Replace image">Replace</button>' + '  <button data-act="clear" title="Remove image">Remove</button></div>' + '<input type="file" accept="' + ACCEPT.join(',') + '" hidden>';
      this._frame = root.querySelector('.frame');
      this._ring = root.querySelector('.ring');
      this._img = root.querySelector('.frame img');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._sub = root.querySelector('.sub');
      this._spill = root.querySelector('.spill');
      this._ghost = root.querySelector('.ghost');
      this._err = null;
      this._input = root.querySelector('input');
      this._depth = 0;
      this._gen = 0;
      this._view = {
        s: 1,
        x: 0,
        y: 0
      };
      this._subFn = () => this._render();
      // Shadow-DOM listeners live with the shadow DOM — bound once here so
      // disconnect/reconnect (e.g. React remount) doesn't stack handlers.
      this._empty.addEventListener('click', () => this._input.click());
      root.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (act === 'replace') {
          this._exitReframe(true);
          this._input.click();
        }
        if (act === 'clear') {
          this._exitReframe(false);
          this._gen++;
          this._local = null;
          if (this.id) setSlot(this.id, null);else this._render();
        }
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._ingest(f);
        this._input.value = '';
      });
      // naturalWidth/Height aren't known until load — re-apply so the cover
      // baseline is computed from real dimensions, not the 100%×100% fallback.
      this._img.addEventListener('load', () => this._applyView());
      // Gated on editable + fit=cover so share links and contain/fill slots
      // stay static.
      this.addEventListener('dblclick', e => {
        if (!this.hasAttribute('data-editable') || !this._reframes()) return;
        e.preventDefault();
        if (this.hasAttribute('data-reframe')) this._exitReframe(true);else this._enterReframe();
      });
      // Pan + resize both originate on the spill layer. A handle pointerdown
      // drives an aspect-locked resize anchored at the opposite corner; any
      // other pointerdown on the spill pans. Offsets are frame-% so a
      // reframed slot survives responsive resize / PPTX export.
      this._spill.addEventListener('pointerdown', e => {
        if (e.button !== 0 || !this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        e.stopPropagation();
        this._spill.setPointerCapture(e.pointerId);
        const rect = this.getBoundingClientRect();
        const fw = rect.width || 1,
          fh = rect.height || 1;
        const corner = e.target.getAttribute && e.target.getAttribute('data-c');
        let move;
        if (corner) {
          // Resize about the OPPOSITE corner. Viewport-px throughout (rect
          // fw/fh, not clientWidth) so the math survives a transform:scale()
          // ancestor — deck_stage renders slides scaled-to-fit.
          const iw = this._img.naturalWidth || 1,
            ih = this._img.naturalHeight || 1;
          const base = Math.max(fw / iw, fh / ih);
          const sx = corner.includes('e') ? 1 : -1;
          const sy = corner.includes('s') ? 1 : -1;
          const s0 = this._view.s;
          const w0 = iw * base * s0,
            h0 = ih * base * s0;
          const cx0 = (50 + this._view.x) / 100 * fw;
          const cy0 = (50 + this._view.y) / 100 * fh;
          const ox = cx0 - sx * w0 / 2,
            oy = cy0 - sy * h0 / 2;
          const diag0 = Math.hypot(w0, h0);
          const ux = sx * w0 / diag0,
            uy = sy * h0 / diag0;
          move = ev => {
            const proj = (ev.clientX - rect.left - ox) * ux + (ev.clientY - rect.top - oy) * uy;
            const s = clampS(s0 * proj / diag0);
            const d = diag0 * s / s0;
            this._view.s = s;
            this._view.x = (ox + ux * d / 2) / fw * 100 - 50;
            this._view.y = (oy + uy * d / 2) / fh * 100 - 50;
            this._clampView();
            this._applyView();
          };
        } else {
          this.setAttribute('data-panning', '');
          const start = {
            px: e.clientX,
            py: e.clientY,
            x: this._view.x,
            y: this._view.y
          };
          move = ev => {
            this._view.x = start.x + (ev.clientX - start.px) / fw * 100;
            this._view.y = start.y + (ev.clientY - start.py) / fh * 100;
            this._clampView();
            this._applyView();
          };
        }
        const up = () => {
          try {
            this._spill.releasePointerCapture(e.pointerId);
          } catch {}
          this._spill.removeEventListener('pointermove', move);
          this._spill.removeEventListener('pointerup', up);
          this._spill.removeEventListener('pointercancel', up);
          this.removeAttribute('data-panning');
          this._dragUp = null;
        };
        // Stashed so _exitReframe (Escape / outside-click mid-drag) can
        // tear the capture + listeners down synchronously.
        this._dragUp = up;
        this._spill.addEventListener('pointermove', move);
        this._spill.addEventListener('pointerup', up);
        this._spill.addEventListener('pointercancel', up);
      });
      // Wheel zoom stays available inside reframe mode as a trackpad nicety —
      // zooms toward the cursor (offset' = cursor·(1-k) + offset·k).
      this.addEventListener('wheel', e => {
        if (!this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        const r = this.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width * 100 - 50;
        const cy = (e.clientY - r.top) / r.height * 100 - 50;
        const prev = this._view.s;
        const next = clampS(prev * Math.pow(1.0015, -e.deltaY));
        if (next === prev) return;
        const k = next / prev;
        this._view.s = next;
        this._view.x = cx * (1 - k) + this._view.x * k;
        this._view.y = cy * (1 - k) + this._view.y * k;
        this._clampView();
        this._applyView();
      }, {
        passive: false
      });
    }
    connectedCallback() {
      // Warn once per page — an id-less slot works for the session but
      // cannot persist, and two id-less slots would share nothing.
      if (!this.id && !ImageSlot._warned) {
        ImageSlot._warned = true;
        console.warn('<image-slot> without an id will not persist its dropped image.');
      }
      this.addEventListener('dragenter', this);
      this.addEventListener('dragover', this);
      this.addEventListener('dragleave', this);
      this.addEventListener('drop', this);
      subs.add(this._subFn);
      // width%/height% in _applyView encode the frame aspect at call time —
      // a host resize (responsive grid, pane divider) would stretch the
      // image until the next _render. Re-render on size change: _render()
      // re-seeds _view from stored before clamp/apply, so a shrink→grow
      // cycle round-trips instead of ratcheting x/y toward the narrower
      // frame's clamp range.
      this._ro = new ResizeObserver(() => this._render());
      this._ro.observe(this);
      load();
      this._render();
    }
    disconnectedCallback() {
      subs.delete(this._subFn);
      this.removeEventListener('dragenter', this);
      this.removeEventListener('dragover', this);
      this.removeEventListener('dragleave', this);
      this.removeEventListener('drop', this);
      if (this._ro) {
        this._ro.disconnect();
        this._ro = null;
      }
      this._exitReframe(false);
    }
    _enterReframe() {
      if (this.hasAttribute('data-reframe')) return;
      this.setAttribute('data-reframe', '');
      this._applyView();
      // Close on click outside (the spill handler stopPropagation()s so
      // in-image drags don't reach this) and on Escape. Listeners are held
      // on the instance so _exitReframe / disconnectedCallback can detach
      // exactly what was attached.
      this._outside = e => {
        if (e.composedPath && e.composedPath().includes(this)) return;
        this._exitReframe(true);
      };
      this._esc = e => {
        if (e.key === 'Escape') this._exitReframe(true);
      };
      document.addEventListener('pointerdown', this._outside, true);
      document.addEventListener('keydown', this._esc, true);
    }
    _exitReframe(commit) {
      if (!this.hasAttribute('data-reframe')) return;
      if (this._dragUp) this._dragUp();
      this.removeAttribute('data-reframe');
      this.removeAttribute('data-panning');
      if (this._outside) document.removeEventListener('pointerdown', this._outside, true);
      if (this._esc) document.removeEventListener('keydown', this._esc, true);
      this._outside = this._esc = null;
      if (commit) this._commitView();
    }
    attributeChangedCallback() {
      if (this.shadowRoot) this._render();
    }

    // handleEvent — one listener object for all four drag events keeps the
    // add/remove symmetric and the depth counter correct.
    handleEvent(e) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        // Without preventDefault the browser never fires 'drop'.
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.setAttribute('data-over', '');
      } else if (e.type === 'dragleave') {
        // dragenter/leave fire for every descendant crossing — count depth
        // so hovering the icon inside the empty state doesn't flicker.
        if (--this._depth <= 0) {
          this._depth = 0;
          this.removeAttribute('data-over');
        }
      } else if (e.type === 'drop') {
        e.preventDefault();
        e.stopPropagation();
        this._depth = 0;
        this.removeAttribute('data-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }
    async _ingest(file) {
      this._setError(null);
      if (!file || ACCEPT.indexOf(file.type) < 0) {
        this._setError('Drop a PNG, JPEG, WebP, or AVIF image.');
        return;
      }
      // toDataUrl can take hundreds of ms on a large photo. A Clear or a
      // newer drop during that window would be clobbered when this await
      // resumes — bump + capture a generation so stale encodes bail.
      const gen = ++this._gen;
      try {
        const w = this.clientWidth || this.offsetWidth || MAX_DIM;
        const url = await toDataUrl(file, w);
        if (gen !== this._gen) return;
        // Only exit reframe once the new image is in hand — a rejected type
        // or decode failure leaves the in-progress crop untouched.
        this._exitReframe(false);
        const val = {
          u: url,
          s: 1,
          x: 0,
          y: 0
        };
        setSlot(this.id || '', val);
        // Keep a session-local copy for id-less slots so the drop still
        // shows, even though it cannot persist.
        if (!this.id) {
          this._local = val;
          this._render();
        }
      } catch (err) {
        if (gen !== this._gen) return;
        this._setError('Could not read that image.');
        console.warn('<image-slot> ingest failed:', err);
      }
    }
    _setError(msg) {
      if (this._err) {
        this._err.remove();
        this._err = null;
      }
      if (!msg) return;
      const d = document.createElement('div');
      d.className = 'err';
      d.textContent = msg;
      this.shadowRoot.appendChild(d);
      this._err = d;
      setTimeout(() => {
        if (this._err === d) {
          d.remove();
          this._err = null;
        }
      }, 3000);
    }

    // Reframing (pan/resize) is only meaningful for fit=cover — contain/fill
    // keep the old object-fit path and double-click is a no-op.
    _reframes() {
      return this.hasAttribute('data-filled') && (this.getAttribute('fit') || 'cover') === 'cover';
    }

    // Cover-baseline geometry, shared by clamp/apply/resize. Null until the
    // img has loaded (naturalWidth is 0 before that) or when the slot has no
    // layout box — ResizeObserver fires with a 0×0 rect under display:none,
    // and clamping against a degenerate 1×1 frame would silently pull the
    // stored pan toward zero.
    _geom() {
      const iw = this._img.naturalWidth,
        ih = this._img.naturalHeight;
      const fw = this.clientWidth,
        fh = this.clientHeight;
      if (!iw || !ih || !fw || !fh) return null;
      return {
        iw,
        ih,
        fw,
        fh,
        base: Math.max(fw / iw, fh / ih)
      };
    }
    _clampView() {
      // Pan range on each axis is half the overflow past the frame edge.
      const g = this._geom();
      if (!g) return;
      const mx = Math.max(0, (g.iw * g.base * this._view.s / g.fw - 1) * 50);
      const my = Math.max(0, (g.ih * g.base * this._view.s / g.fh - 1) * 50);
      this._view.x = Math.max(-mx, Math.min(mx, this._view.x));
      this._view.y = Math.max(-my, Math.min(my, this._view.y));
    }
    _applyView() {
      const g = this._geom();
      const fit = this.getAttribute('fit') || 'cover';
      if (fit !== 'cover' || !g) {
        // Non-cover, or dimensions not known yet (before img load).
        this._img.style.width = '100%';
        this._img.style.height = '100%';
        this._img.style.left = '50%';
        this._img.style.top = '50%';
        this._img.style.objectFit = fit;
        this._img.style.objectPosition = this.getAttribute('position') || '50% 50%';
        return;
      }
      // Cover baseline: img fills the frame on its tighter axis at s=1, so
      // pan works immediately on the overflowing axis without zooming first.
      // Width/height and left/top are all frame-% — depends only on the
      // frame aspect ratio, so a responsive resize keeps the same crop. The
      // spill layer mirrors the same box so its corners = image corners.
      const k = g.base * this._view.s;
      const w = g.iw * k / g.fw * 100 + '%';
      const h = g.ih * k / g.fh * 100 + '%';
      const l = 50 + this._view.x + '%';
      const t = 50 + this._view.y + '%';
      this._img.style.width = w;
      this._img.style.height = h;
      this._img.style.left = l;
      this._img.style.top = t;
      this._img.style.objectFit = '';
      this._spill.style.width = w;
      this._spill.style.height = h;
      this._spill.style.left = l;
      this._spill.style.top = t;
    }
    _commitView() {
      const v = {
        s: this._view.s,
        x: this._view.x,
        y: this._view.y
      };
      if (this._userUrl) v.u = this._userUrl;
      // Framing-only (no u) persists too so an author-src slot remembers its
      // crop; clearing the sidecar still falls through to src=.
      if (this.id) setSlot(this.id, v);else {
        this._local = v;
      }
    }
    _render() {
      // Shape / mask. Presets use border-radius so the dashed ring can
      // follow the rounded outline; clip-path is only applied for an
      // explicit `mask` (the ring is hidden there since a rectangle
      // dashed border chopped by an arbitrary polygon looks broken).
      const mask = this.getAttribute('mask');
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '';
      if (shape === 'circle') radius = '50%';else if (shape === 'pill') radius = '9999px';else if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 12) + 'px';
      }
      this._frame.style.borderRadius = mask ? '' : radius;
      this._frame.style.clipPath = mask || '';
      this._ring.style.borderRadius = mask ? '' : radius;
      this._ring.style.display = mask ? 'none' : '';

      // Controls and reframe entry gate on this so share links stay read-only.
      const editable = !!(window.omelette && window.omelette.writeFile);
      this.toggleAttribute('data-editable', editable);
      this._sub.style.display = editable ? '' : 'none';

      // Content. The sidecar is also writable by the agent's write_file
      // tool, so its value isn't guaranteed canvas-originated — only accept
      // data:image/ URLs from it. The `src` attribute is author-controlled
      // (Claude wrote it into the HTML) so it passes through unchanged.
      let stored = this.id ? getSlot(this.id) : this._local;
      if (stored && stored.u && !/^data:image\//i.test(stored.u)) stored = null;
      const srcAttr = this.getAttribute('src') || '';
      this._userUrl = stored && stored.u || null;
      const url = this._userUrl || srcAttr;
      // Don't clobber an in-flight reframe with a store-triggered re-render.
      if (!this.hasAttribute('data-reframe')) {
        this._view = {
          s: stored && Number.isFinite(stored.s) ? clampS(stored.s) : 1,
          x: stored && Number.isFinite(stored.x) ? stored.x : 0,
          y: stored && Number.isFinite(stored.y) ? stored.y : 0
        };
      }
      this._cap.textContent = this.getAttribute('placeholder') || 'Drop an image';
      // Toggle via style.display — the [hidden] attribute alone loses to
      // the display:flex / display:block rules in the stylesheet above.
      if (url) {
        if (this._img.getAttribute('src') !== url) {
          this._img.src = url;
          this._ghost.src = url;
        }
        this._img.style.display = 'block';
        this._empty.style.display = 'none';
        this.setAttribute('data-filled', '');
        this._clampView();
        this._applyView();
      } else {
        this._img.style.display = 'none';
        this._img.removeAttribute('src');
        this._ghost.removeAttribute('src');
        this._empty.style.display = 'flex';
        this.removeAttribute('data-filled');
      }
    }
  }
  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/auth/image-slot.js", error: String((e && e.message) || e) }); }

// ui_kits/auth_mobile/authm.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* ULAMU — Authentification mobile (M01). En-tête cobalt illustré + carte
   flottante. Role-aware léger (Patient sans mot de passe / Professionnel),
   OTP, inscription patient, mot de passe oublié, succès. Thème clair/sombre. */
const AM = window.ULAMUDesignSystem_d14300;
const {
  Button: MB,
  Input: MIN,
  Badge: MBD,
  Icon: MI,
  Banner: MBN,
  Switch: MSW,
  VerifiedBadge: MVB,
  Card: MC
} = AM;

/* ── Cadre téléphone ── */
function StatusBar({
  dark
}) {
  const c = dark ? '#fff' : 'var(--text-primary)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 30,
      zIndex: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12.5,
      fontWeight: 600,
      color: c
    }
  }, "09:41"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      color: c
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "11",
    viewBox: "0 0 16 11",
    fill: "none"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "6",
    width: "3",
    height: "5",
    rx: "1",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.5",
    y: "3.5",
    width: "3",
    height: "7.5",
    rx: "1",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "1.5",
    width: "3",
    height: "9.5",
    rx: "1",
    fill: "currentColor",
    fillOpacity: ".5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "13.5",
    y: "0",
    width: "3",
    height: "11",
    rx: "1",
    fill: "currentColor",
    fillOpacity: ".5"
  })), /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "11",
    viewBox: "0 0 15 11",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7.5 2.5c2 0 3.8.8 5.1 2.1l1-1.1A9 9 0 0 0 1.4 3.5l1 1.1A7 7 0 0 1 7.5 2.5z",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7.5 6c1 0 2 .4 2.7 1.1l1-1.1a5.5 5.5 0 0 0-7.4 0l1 1.1A3.8 3.8 0 0 1 7.5 6z",
    fill: "currentColor"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7.5",
    cy: "9.3",
    r: "1.4",
    fill: "currentColor"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 11,
      borderRadius: 3,
      border: `1px solid ${dark ? 'rgba(255,255,255,0.5)' : 'var(--text-tertiary)'}`,
      padding: 1.5,
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      background: c,
      borderRadius: 1
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1.5,
      height: 4,
      background: c,
      borderRadius: 1,
      opacity: 0.6
    }
  }))));
}
function MobileFrame({
  statusDark,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 412,
      height: 892,
      borderRadius: 44,
      overflow: 'hidden',
      background: '#000',
      border: '11px solid #0a0a0c',
      boxShadow: '0 40px 90px rgba(0,0,0,0.4)',
      boxSizing: 'border-box',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-base)'
    }
  }, /*#__PURE__*/React.createElement(StatusBar, {
    dark: statusDark
  }), /*#__PURE__*/React.createElement("div", {
    className: "noscroll",
    style: {
      flex: 1,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }
  }, children), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 7,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 132,
      height: 5,
      borderRadius: 3,
      background: 'var(--text-primary)',
      opacity: 0.32,
      zIndex: 6
    }
  })));
}

/* Logo */
function MLogo({
  light
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: 8,
      background: light ? 'rgba(255,255,255,0.18)' : 'var(--accent-500)',
      border: light ? '1px solid rgba(255,255,255,0.24)' : 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 0.16
    }
  }), /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 16 16",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 2C5.8 2 4 3.8 4 6c0 1.4.7 2.6 1.8 3.3L5 12h6l-.8-2.7C11.3 8.6 12 7.4 12 6c0-2.2-1.8-4-4-4z",
    fill: "#fff",
    fillOpacity: ".94"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5.5",
    y: "12.5",
    width: "5",
    height: "1.5",
    rx: ".75",
    fill: "#fff",
    fillOpacity: ".74"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 18,
      letterSpacing: '-0.4px',
      color: light ? '#fff' : 'var(--text-primary)'
    }
  }, "ulamu"));
}

/* En-tête cobalt (bleed haut, coins bas arrondis) */
function CobaltHeader({
  onBack,
  children,
  pb = 30
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--accent-600)',
      borderRadius: '0 0 30px 30px',
      padding: `38px 22px ${pb}px`,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 0.12,
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -120,
      right: -90,
      width: 300,
      height: 300,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(255,255,255,0.16), transparent 68%)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14
    }
  }, onBack ? /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    className: "uha",
    style: {
      all: 'unset',
      cursor: 'pointer',
      width: 34,
      height: 34,
      borderRadius: 10,
      background: 'rgba(255,255,255,0.14)',
      border: '1px solid rgba(255,255,255,0.2)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement(MI, {
    name: "arrow-left",
    size: 17
  })) : /*#__PURE__*/React.createElement(MLogo, {
    light: true
  })), children));
}

/* Carte flottante (chevauche l'en-tête) */
function FloatCard({
  children,
  mt = -22
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      position: 'relative',
      zIndex: 2,
      marginTop: mt,
      background: 'var(--bg-base)',
      borderRadius: '26px 26px 0 0',
      boxShadow: '0 -8px 28px rgba(0,0,0,0.12)',
      padding: '24px 22px 30px',
      display: 'flex',
      flexDirection: 'column'
    }
  }, children);
}

/* Étiquette de champ */
function FLabel({
  children,
  hint,
  onHint
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      fontWeight: 600,
      color: 'var(--text-secondary)'
    }
  }, children), hint && /*#__PURE__*/React.createElement("button", {
    onClick: onHint,
    style: {
      all: 'unset',
      marginLeft: 'auto',
      cursor: 'pointer',
      fontSize: 12,
      color: 'var(--text-accent)',
      fontWeight: 500
    }
  }, hint));
}

/* Champ mot de passe (œil) */
function PwdField({
  value,
  onChange,
  onEnter
}) {
  const [show, setShow] = React.useState(false);
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 13,
      color: 'var(--text-tertiary)',
      display: 'inline-flex',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(MI, {
    name: "lock",
    size: 16
  })), /*#__PURE__*/React.createElement("input", {
    type: show ? 'text' : 'password',
    value: value,
    placeholder: "Votre mot de passe",
    onChange: e => onChange(e.target.value),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    onKeyDown: e => {
      if (e.key === 'Enter' && onEnter) onEnter();
    },
    style: {
      width: '100%',
      height: 48,
      boxSizing: 'border-box',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${focus ? 'var(--accent-500)' : 'var(--border-default)'}`,
      background: 'var(--bg-base)',
      padding: '0 44px 0 36px',
      fontFamily: 'var(--font-body)',
      fontSize: 14.5,
      color: 'var(--text-primary)',
      outline: 'none',
      boxShadow: focus ? '0 0 0 3px rgba(39,86,166,0.18)' : 'none',
      transition: 'border-color var(--dur-base) linear, box-shadow var(--dur-base) linear'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShow(s => !s),
    "aria-label": show ? 'Masquer' : 'Afficher',
    style: {
      all: 'unset',
      position: 'absolute',
      right: 13,
      cursor: 'pointer',
      color: 'var(--text-tertiary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(MI, {
    name: show ? 'eye-off' : 'eye',
    size: 16
  })));
}

/* Champ générique 48px */
function Field({
  icon,
  ...rest
}) {
  return /*#__PURE__*/React.createElement(MIN, _extends({
    leftIcon: icon,
    style: {
      height: 48,
      fontSize: 14.5
    }
  }, rest));
}

/* OTP 6 cases */
function OtpInput({
  value,
  onChange,
  autofill
}) {
  const refs = React.useRef([]);
  React.useEffect(() => {
    if (!autofill) return;
    onChange('');
    const code = '481902'.split('');
    const ids = code.map((d, i) => setTimeout(() => onChange(v => (v + d).slice(0, 6)), 850 + i * 300));
    return () => ids.forEach(clearTimeout);
  }, [autofill]);
  const setAt = (i, d) => {
    const a = value.split('');
    a[i] = d;
    onChange(a.join('').slice(0, 6));
  };
  const onKey = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[i]) setAt(i, '');else if (i > 0) {
        setAt(i - 1, '');
        refs.current[i - 1]?.focus();
      }
    } else if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      setAt(i, e.key);
      if (i < 5) refs.current[i + 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();else if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };
  const onPaste = e => {
    e.preventDefault();
    const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (d) {
      onChange(d);
      refs.current[Math.min(d.length, 5)]?.focus();
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      justifyContent: 'space-between'
    },
    onPaste: onPaste
  }, [0, 1, 2, 3, 4, 5].map(i => {
    const filled = !!value[i];
    return /*#__PURE__*/React.createElement("input", {
      key: i,
      ref: el => refs.current[i] = el,
      inputMode: "numeric",
      maxLength: 1,
      value: value[i] || '',
      onChange: () => {},
      onKeyDown: e => onKey(i, e),
      onFocus: e => e.target.select(),
      style: {
        width: 48,
        height: 58,
        textAlign: 'center',
        borderRadius: 'var(--radius-lg)',
        border: `1.5px solid ${filled ? 'var(--accent-500)' : 'var(--border-default)'}`,
        background: 'var(--bg-base)',
        fontFamily: 'var(--font-mono)',
        fontSize: 23,
        fontWeight: 600,
        color: 'var(--text-primary)',
        outline: 'none',
        boxShadow: filled ? '0 0 0 3px rgba(39,86,166,0.14)' : 'none',
        transition: 'border-color var(--dur-base) linear, box-shadow var(--dur-base) linear'
      }
    });
  }));
}

/* Segmenté Patient / Professionnel */
function RoleToggle({
  role,
  onChange
}) {
  const opts = [['patient', 'Patient', 'user'], ['pro', 'Professionnel', 'stethoscope']];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      padding: 4,
      background: 'var(--bg-muted)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 18
    }
  }, opts.map(([id, label, ic]) => {
    const on = role === id;
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      onClick: () => onChange(id),
      className: "uha",
      style: {
        all: 'unset',
        cursor: 'pointer',
        flex: 1,
        height: 38,
        borderRadius: 'var(--radius-sm)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        fontSize: 13,
        background: on ? 'var(--bg-base)' : 'transparent',
        color: on ? 'var(--accent-600)' : 'var(--text-tertiary)',
        boxShadow: on ? 'var(--shadow-sm)' : 'none',
        transition: 'background var(--dur-fast) linear, color var(--dur-fast) linear'
      }
    }, /*#__PURE__*/React.createElement(MI, {
      name: ic,
      size: 15
    }), label);
  }));
}

/* Illustrations plates — Popsy (libres, attribution popsy.co ; l'utilisateur peut déposer la sienne) */
const IMG_HERO = 'https://illustrations.popsy.co/white/video-call.svg';
const IMG_REG = 'https://illustrations.popsy.co/white/communication.svg';

/* Illustration en-tête. bare = sans cadre, plein-largeur, fondu bas vers le cobalt */
function HeaderArt({
  id,
  h = 150,
  placeholder,
  chip,
  src,
  bare,
  fit = 'cover'
}) {
  if (bare) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        height: h,
        margin: '2px -22px 0'
      }
    }, /*#__PURE__*/React.createElement("image-slot", {
      id: id,
      shape: "rect",
      src: src,
      fit: fit,
      placeholder: placeholder,
      style: {
        display: 'block',
        width: '100%',
        height: '100%',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 58%, transparent 100%)',
        maskImage: 'linear-gradient(to bottom, #000 58%, transparent 100%)'
      }
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: h,
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.22)',
      boxShadow: '0 10px 26px rgba(0,0,0,0.26)'
    }
  }, /*#__PURE__*/React.createElement("image-slot", {
    id: id,
    shape: "rect",
    src: src,
    placeholder: placeholder,
    style: {
      display: 'block',
      width: '100%',
      height: '100%'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(to top, rgba(15,40,90,0.5), transparent 56%)',
      pointerEvents: 'none'
    }
  }), chip && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: 11,
      left: 11,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      padding: '6px 11px',
      borderRadius: 'var(--radius-full)',
      background: 'rgba(255,255,255,0.94)',
      boxShadow: 'var(--shadow-md)'
    }
  }, /*#__PURE__*/React.createElement(MVB, {
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11.5,
      fontWeight: 700,
      color: 'var(--accent-600)'
    }
  }, chip))));
}
const fadeUp = {
  animation: 'ulamu-fade-up var(--dur-moderate) var(--ease-out)'
};

/* ── Carousel d'étapes (mini-vidéo du cœur métier ULAMU) ── */
const JOURNEY = [{
  slug: 'communication',
  t: 'Trouvez un soignant vérifié'
}, {
  slug: 'video-call',
  t: 'Consultez à distance, au tarif annoncé'
}, {
  slug: 'taking-notes',
  t: 'Recevez votre ordonnance signée'
}, {
  slug: 'customer-support',
  t: 'Réservez vos médicaments tout près'
}, {
  slug: 'success',
  t: 'Votre dossier de santé, à vie'
}];
function StepCarousel({
  color = 'white',
  h = 230
}) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setI(v => (v + 1) % JOURNEY.length), 5000);
    return () => clearInterval(t);
  }, []);
  const s = JOURNEY[i];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: h,
      margin: '0 -22px'
    }
  }, /*#__PURE__*/React.createElement("img", {
    key: s.slug,
    src: `https://illustrations.popsy.co/${color}/${s.slug}.svg`,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      WebkitMaskImage: 'linear-gradient(to bottom, #000 56%, transparent 100%)',
      maskImage: 'linear-gradient(to bottom, #000 56%, transparent 100%)',
      animation: 'ulamu-fade var(--dur-slow) ease-out'
    }
  })), /*#__PURE__*/React.createElement("h1", {
    key: i,
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 23,
      lineHeight: 1.2,
      letterSpacing: '-0.6px',
      color: '#fff',
      margin: '2px 0 0',
      minHeight: 56,
      animation: 'ulamu-fade-up var(--dur-moderate) ease-out'
    }
  }, s.t), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 7,
      marginTop: 14
    }
  }, JOURNEY.map((_, k) => /*#__PURE__*/React.createElement("span", {
    key: k,
    style: {
      width: k === i ? 8 : 6,
      height: k === i ? 8 : 6,
      borderRadius: '50%',
      background: k === i ? '#fff' : 'rgba(255,255,255,0.36)',
      transition: 'width var(--dur-base) ease-out, height var(--dur-base) ease-out, background var(--dur-base) linear'
    }
  }))));
}

/* ── Écran : Connexion ── */
function WelcomeScreen({
  theme,
  onTheme,
  onSubmit,
  onForgot,
  onRegister,
  onPasswordless
}) {
  const [role, setRole] = React.useState('patient');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [pwd, setPwd] = React.useState('');
  const isPatient = role === 'patient';
  const ready = isPatient ? phone.replace(/\D/g, '').length >= 9 : email.includes('@') && pwd.length >= 4;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CobaltHeader, {
    pb: 28
  }, /*#__PURE__*/React.createElement(StepCarousel, {
    color: "white",
    h: 236
  })), /*#__PURE__*/React.createElement(FloatCard, null, /*#__PURE__*/React.createElement("div", {
    style: fadeUp
  }, /*#__PURE__*/React.createElement(RoleToggle, {
    role: role,
    onChange: setRole
  }), isPatient ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FLabel, null, "Num\xE9ro de t\xE9l\xE9phone"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '0 13px',
      height: 48,
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-default)',
      background: 'var(--bg-muted)',
      fontFamily: 'var(--font-mono)',
      fontSize: 14.5,
      color: 'var(--text-secondary)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(MI, {
    name: "phone",
    size: 14
  }), "+242"), /*#__PURE__*/React.createElement(Field, {
    placeholder: "06 612 45 90",
    value: phone,
    type: "tel",
    onChange: e => setPhone(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && ready) onSubmit({
        method: 'sms',
        dest: 'App patient'
      });
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(MB, {
    variant: "primary",
    fullWidth: true,
    size: "lg",
    iconLeft: "send",
    disabled: !ready,
    onClick: () => onSubmit({
      method: 'sms',
      dest: 'App patient'
    })
  }, "Recevoir mon code"))) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FLabel, null, "E-mail"), /*#__PURE__*/React.createElement(Field, {
    icon: "mail",
    placeholder: "nom@structure.cg",
    value: email,
    type: "email",
    onChange: e => setEmail(e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FLabel, {
    hint: "Oubli\xE9 ?",
    onHint: onForgot
  }, "Mot de passe"), /*#__PURE__*/React.createElement(PwdField, {
    value: pwd,
    onChange: setPwd,
    onEnter: () => ready && onSubmit({
      method: 'pwd',
      dest: 'Cockpit professionnel'
    })
  })), /*#__PURE__*/React.createElement(MB, {
    variant: "primary",
    fullWidth: true,
    size: "lg",
    iconLeft: "arrow-right",
    disabled: !ready,
    onClick: () => onSubmit({
      method: 'pwd',
      dest: 'Cockpit professionnel'
    })
  }, "Se connecter"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      margin: '2px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--border-subtle)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-disabled)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em'
    }
  }, "ou"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--border-subtle)'
    }
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => onPasswordless('Cockpit professionnel'),
    className: "uha",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%',
      height: 48,
      boxSizing: 'border-box',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-default)',
      background: 'var(--bg-subtle)',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement(MI, {
    name: "send",
    size: 15
  }), "Recevoir un code \xE0 usage unique"))), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: 'center',
      fontSize: 13,
      color: 'var(--text-tertiary)',
      marginTop: 22
    }
  }, isPatient ? 'Nouveau sur ULAMU ? ' : 'Structure non référencée ? ', /*#__PURE__*/React.createElement("button", {
    onClick: onRegister,
    style: {
      all: 'unset',
      cursor: 'pointer',
      color: 'var(--text-accent)',
      fontWeight: 700
    }
  }, isPatient ? 'Créer un compte' : 'Demander un accès'))));
}

/* ── Écran : OTP ── */
function OtpScreen({
  theme,
  onTheme,
  flow,
  onBack,
  onVerify
}) {
  const [otp, setOtp] = React.useState('');
  const [secs, setSecs] = React.useState(45);
  const is2fa = flow.method === '2fa';
  React.useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);
  const ready = otp.length === 6;
  React.useEffect(() => {
    if (ready) {
      const t = setTimeout(() => onVerify(flow), 420);
      return () => clearTimeout(t);
    }
  }, [ready]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CobaltHeader, {
    theme: theme,
    onTheme: onTheme,
    onBack: onBack,
    pb: 32
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 46,
      height: 46,
      borderRadius: 'var(--radius-lg)',
      background: 'rgba(255,255,255,0.16)',
      border: '1px solid rgba(255,255,255,0.22)',
      color: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(MI, {
    name: is2fa ? 'shield-check' : 'message',
    size: 22
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 23,
      letterSpacing: '-0.5px',
      color: '#fff',
      margin: '14px 0 0'
    }
  }, is2fa ? 'Double authentification' : 'Entrez le code reçu'), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.82)',
      marginTop: 5
    }
  }, is2fa ? 'Code de votre application d\'authentification.' : 'Envoyé par SMS au +242 06 612 45 90')), /*#__PURE__*/React.createElement(FloatCard, null, /*#__PURE__*/React.createElement("div", {
    style: fadeUp
  }, /*#__PURE__*/React.createElement(OtpInput, {
    value: otp,
    onChange: setOtp,
    autofill: !is2fa
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      margin: '18px 0 4px'
    }
  }, !ready ? is2fa ? /*#__PURE__*/React.createElement(MBD, {
    tone: "neutral",
    size: "sm",
    icon: "lock"
  }, "En attente de votre saisie") : /*#__PURE__*/React.createElement(MBD, {
    tone: "neutral",
    dot: true,
    size: "sm"
  }, "R\xE9ception du code en cours\u2026") : /*#__PURE__*/React.createElement(MBD, {
    tone: "success",
    size: "sm",
    icon: "check-circle"
  }, "Code complet \u2014 v\xE9rification\u2026")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, secs > 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-tertiary)'
    }
  }, "Renvoyer dans ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      color: 'var(--text-secondary)'
    }
  }, secs, "s")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setSecs(45),
    style: {
      all: 'unset',
      cursor: 'pointer',
      fontSize: 12.5,
      color: 'var(--text-accent)',
      fontWeight: 600
    }
  }, "Renvoyer le code")))));
}

/* ── Écran : Inscription patient ── */
function RegisterScreen({
  theme,
  onTheme,
  onBack,
  onSubmit,
  onLogin
}) {
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [agree, setAgree] = React.useState(true);
  const ready = name.trim() && phone.replace(/\D/g, '').length >= 9 && agree;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CobaltHeader, {
    theme: theme,
    onTheme: onTheme,
    onBack: onBack,
    pb: 32
  }, /*#__PURE__*/React.createElement(HeaderArt, {
    id: "ulamu-authm-reg",
    bare: true,
    fit: "contain",
    h: 170,
    src: IMG_REG,
    placeholder: "D\xE9posez une illustration"
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 24,
      letterSpacing: '-0.6px',
      color: '#fff',
      margin: '4px 0 0'
    }
  }, "Cr\xE9er mon compte")), /*#__PURE__*/React.createElement(FloatCard, null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...fadeUp,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FLabel, null, "Pr\xE9nom et nom"), /*#__PURE__*/React.createElement(Field, {
    icon: "user",
    placeholder: "Mireille Nkounkou",
    value: name,
    onChange: e => setName(e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FLabel, null, "Num\xE9ro de t\xE9l\xE9phone"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '0 13px',
      height: 48,
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-default)',
      background: 'var(--bg-muted)',
      fontFamily: 'var(--font-mono)',
      fontSize: 14.5,
      color: 'var(--text-secondary)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(MI, {
    name: "phone",
    size: 14
  }), "+242"), /*#__PURE__*/React.createElement(Field, {
    placeholder: "06 612 45 90",
    value: phone,
    type: "tel",
    onChange: e => setPhone(e.target.value)
  }))), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      cursor: 'pointer',
      userSelect: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement(MSW, {
    checked: agree,
    onChange: () => setAgree(a => !a)
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)',
      lineHeight: 1.5
    }
  }, "J'accepte que mes donn\xE9es de sant\xE9 soient chiffr\xE9es et accessibles aux seuls soignants que je consulte.")), /*#__PURE__*/React.createElement(MB, {
    variant: "primary",
    fullWidth: true,
    size: "lg",
    iconLeft: "send",
    disabled: !ready,
    onClick: () => onSubmit({
      method: 'sms',
      dest: 'App patient'
    })
  }, "Cr\xE9er mon compte")), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: 'center',
      fontSize: 13,
      color: 'var(--text-tertiary)',
      marginTop: 22
    }
  }, "D\xE9j\xE0 membre ? ", /*#__PURE__*/React.createElement("button", {
    onClick: onLogin,
    style: {
      all: 'unset',
      cursor: 'pointer',
      color: 'var(--text-accent)',
      fontWeight: 700
    }
  }, "Se connecter"))));
}

/* ── Écran : Mot de passe oublié ── */
function ForgotScreen({
  theme,
  onTheme,
  onBack
}) {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CobaltHeader, {
    theme: theme,
    onTheme: onTheme,
    onBack: onBack,
    pb: 32
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 46,
      height: 46,
      borderRadius: 'var(--radius-lg)',
      background: 'rgba(255,255,255,0.16)',
      border: '1px solid rgba(255,255,255,0.22)',
      color: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(MI, {
    name: sent ? 'mail' : 'lock',
    size: 22
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 23,
      letterSpacing: '-0.5px',
      color: '#fff',
      margin: '14px 0 0'
    }
  }, sent ? 'Lien envoyé' : 'Mot de passe oublié'), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.82)',
      marginTop: 5,
      lineHeight: 1.5
    }
  }, sent ? `Si un compte existe, un lien vient d'être envoyé à ${email}.` : 'Recevez un lien sécurisé pour en choisir un nouveau.')), /*#__PURE__*/React.createElement(FloatCard, null, sent ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...fadeUp
    }
  }, /*#__PURE__*/React.createElement(MBN, {
    tone: "success",
    title: "V\xE9rifiez votre bo\xEEte mail"
  }, "Le lien expire dans 30 minutes."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(MB, {
    variant: "secondary",
    fullWidth: true,
    size: "lg",
    iconLeft: "arrow-left",
    onClick: onBack
  }, "Revenir \xE0 la connexion"))) : /*#__PURE__*/React.createElement("div", {
    style: fadeUp
  }, /*#__PURE__*/React.createElement(FLabel, null, "Adresse e-mail"), /*#__PURE__*/React.createElement(Field, {
    icon: "mail",
    placeholder: "nom@structure.cg",
    value: email,
    type: "email",
    onChange: e => setEmail(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(MB, {
    variant: "primary",
    fullWidth: true,
    size: "lg",
    iconLeft: "send",
    disabled: !email.includes('@'),
    onClick: () => setSent(true)
  }, "Envoyer le lien")))));
}

/* ── Écran : Succès ── */
const M_DEST_ICON = {
  'App patient': 'user',
  'Cockpit professionnel': 'stethoscope'
};
function SuccessScreen({
  flow,
  onReplay,
  theme,
  onTheme
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CobaltHeader, {
    theme: theme,
    onTheme: onTheme,
    pb: 40
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      paddingTop: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 66,
      height: 66,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.16)',
      border: '1px solid rgba(255,255,255,0.28)',
      color: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'ulamu-pop var(--dur-slow) var(--ease-spring)'
    }
  }, /*#__PURE__*/React.createElement(MI, {
    name: "check-circle",
    size: 34
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 25,
      letterSpacing: '-0.6px',
      color: '#fff',
      margin: '16px 0 0'
    }
  }, "Connexion r\xE9ussie"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.82)',
      marginTop: 5
    }
  }, "Bienvenue sur ULAMU."))), /*#__PURE__*/React.createElement(FloatCard, null, /*#__PURE__*/React.createElement("div", {
    style: fadeUp
  }, /*#__PURE__*/React.createElement(MC, {
    padding: "14px 16px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 42,
      height: 42,
      borderRadius: 'var(--radius-md)',
      flexShrink: 0,
      background: 'rgba(39,86,166,0.14)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(MI, {
    name: M_DEST_ICON[flow.dest] || 'arrow-right',
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, "Vous acc\xE9dez \xE0"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 15,
      color: 'var(--text-primary)'
    }
  }, flow.dest), /*#__PURE__*/React.createElement(MVB, {
    size: "sm"
  }))), /*#__PURE__*/React.createElement(MBD, {
    tone: "success",
    dot: true,
    size: "sm"
  }, "S\xE9curis\xE9"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(MB, {
    variant: "primary",
    fullWidth: true,
    size: "lg",
    iconRight: "arrow-right",
    onClick: onReplay
  }, "Acc\xE9der \xE0 mon espace")), /*#__PURE__*/React.createElement("button", {
    onClick: onReplay,
    style: {
      all: 'unset',
      display: 'block',
      margin: '14px auto 0',
      cursor: 'pointer',
      fontSize: 12.5,
      color: 'var(--text-tertiary)',
      textAlign: 'center',
      width: '100%'
    }
  }, "Rejouer la d\xE9mo"))));
}

/* ── Contrôleur ── */
function AuthMobileApp() {
  const [theme, setThemeState] = React.useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const [screen, setScreen] = React.useState('welcome');
  const [flow, setFlow] = React.useState({
    method: 'sms',
    dest: 'App patient'
  });
  const toggleTheme = () => setThemeState(t => {
    const n = t === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    try {
      localStorage.setItem('ulamu-theme', n);
    } catch (e) {}
    return n;
  });
  const common = {
    theme,
    onTheme: toggleTheme
  };
  let body;
  if (screen === 'welcome') body = /*#__PURE__*/React.createElement(WelcomeScreen, _extends({}, common, {
    onSubmit: f => {
      setFlow(f);
      setScreen(f.method === 'pwd' ? 'success' : 'otp');
    },
    onPasswordless: dest => {
      setFlow({
        method: 'sms',
        dest
      });
      setScreen('otp');
    },
    onForgot: () => setScreen('forgot'),
    onRegister: () => setScreen('register')
  }));else if (screen === 'otp') body = /*#__PURE__*/React.createElement(OtpScreen, _extends({}, common, {
    flow: flow,
    onBack: () => setScreen('welcome'),
    onVerify: f => {
      setFlow(f);
      setScreen('success');
    }
  }));else if (screen === 'register') body = /*#__PURE__*/React.createElement(RegisterScreen, _extends({}, common, {
    onBack: () => setScreen('welcome'),
    onSubmit: f => {
      setFlow(f);
      setScreen('otp');
    },
    onLogin: () => setScreen('welcome')
  }));else if (screen === 'forgot') body = /*#__PURE__*/React.createElement(ForgotScreen, _extends({}, common, {
    onBack: () => setScreen('welcome')
  }));else body = /*#__PURE__*/React.createElement(SuccessScreen, _extends({}, common, {
    flow: flow,
    onReplay: () => setScreen('welcome')
  }));
  return /*#__PURE__*/React.createElement(MobileFrame, {
    statusDark: true
  }, body);
}
window.AuthMobileApp = AuthMobileApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/auth_mobile/authm.jsx", error: String((e && e.message) || e) }); }

// ui_kits/auth_mobile/image-slot.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
/* BEGIN USAGE */
/**
 * <image-slot> — user-fillable image placeholder.
 *
 * Drop this into a deck, mockup, or page wherever you want the user to
 * supply an image. You control the slot's shape and size; the user fills it
 * by dragging an image file onto it (or clicking to browse). The dropped
 * image persists across reloads via a .image-slots.state.json sidecar —
 * same read-via-fetch / write-via-window.omelette pattern as
 * design_canvas.jsx, so the filled slot shows on share links, downloaded
 * zips, and PPTX export. Outside the omelette runtime the slot is read-only.
 *
 * The host bridge only allows sidecar writes at the project root, so the
 * HTML that uses this component is assumed to live at the project root too
 * (same constraint as design_canvas.jsx).
 *
 * Attributes:
 *   id           Persistence key. REQUIRED for the drop to survive reload —
 *                every slot on the page needs a distinct id.
 *   shape        'rect' | 'rounded' | 'circle' | 'pill'   (default 'rounded')
 *                'circle' applies 50% border-radius; on a non-square slot
 *                that's an ellipse — set equal width and height for a true
 *                circle.
 *   radius       Corner radius in px for 'rounded'.       (default 12)
 *   mask         Any CSS clip-path value. Overrides `shape` — use this for
 *                hexagons, blobs, arbitrary polygons.
 *   fit          object-fit: cover | contain | fill.       (default 'cover')
 *                With cover (the default) double-clicking the filled slot
 *                enters a reframe mode: the whole image spills past the mask
 *                (translucent outside, opaque inside), drag to reposition,
 *                corner-drag to scale. The crop persists alongside the image
 *                in the sidecar. contain/fill stay static.
 *   position     object-position for fit=contain|fill.     (default '50% 50%')
 *   placeholder  Empty-state caption.                      (default 'Drop an image')
 *   src          Optional initial/fallback image URL. A user drop overrides
 *                it; clearing the drop reveals src again.
 *
 * Size and layout come from ordinary CSS on the element — width/height
 * inline or from a parent grid — so it composes with any layout.
 *
 * Usage:
 *   <image-slot id="hero"   style="width:800px;height:450px" shape="rounded" radius="20"
 *               placeholder="Drop a hero image"></image-slot>
 *   <image-slot id="avatar" style="width:120px;height:120px" shape="circle"></image-slot>
 *   <image-slot id="kite"   style="width:300px;height:300px"
 *               mask="polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"></image-slot>
 */
/* END USAGE */

(() => {
  const STATE_FILE = '.image-slots.state.json';
  // 2× a ~600px slot in a 1920-wide deck — retina-sharp without making the
  // sidecar enormous. A 1200px WebP at q=0.85 is ~150-300KB.
  const MAX_DIM = 1200;
  // Raster formats only. SVG is excluded (can carry script; createImageBitmap
  // on SVG blobs is inconsistent). GIF is excluded because the canvas
  // re-encode keeps only the first frame, so an animated GIF would silently
  // go still — better to reject than surprise.
  const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

  // ── Shared sidecar store ────────────────────────────────────────────────
  // One fetch + immediate write-on-change for every <image-slot> on the
  // page. Reads via fetch() so viewing works anywhere the HTML and sidecar
  // are served together; writes go through window.omelette.writeFile, which
  // the host allowlists to *.state.json basenames only.
  const subs = new Set();
  let slots = {};
  // ids explicitly cleared before the sidecar fetch resolved — otherwise
  // the merge below can't tell "never set" from "just deleted" and would
  // resurrect the sidecar's stale value.
  const tombstones = new Set();
  let loaded = false;
  let loadP = null;
  function load() {
    if (loadP) return loadP;
    loadP = fetch(STATE_FILE).then(r => r.ok ? r.json() : null).then(j => {
      // Merge: sidecar loses to any in-memory change that raced ahead of
      // the fetch (drop or clear) so neither is clobbered by hydration.
      if (j && typeof j === 'object') {
        const merged = Object.assign({}, j, slots);
        // A framing-only write that raced ahead of hydration must not
        // drop a user image that's only on disk — inherit u from the
        // sidecar for any in-memory entry that lacks one.
        for (const k in slots) {
          if (merged[k] && !merged[k].u && j[k]) {
            merged[k].u = typeof j[k] === 'string' ? j[k] : j[k].u;
          }
        }
        for (const id of tombstones) delete merged[id];
        slots = merged;
      }
      tombstones.clear();
    }).catch(() => {}).then(() => {
      loaded = true;
      subs.forEach(fn => fn());
    });
    return loadP;
  }

  // Serialize writes so two near-simultaneous drops on different slots
  // can't reorder at the backend and leave the sidecar with only the
  // first. A save requested mid-flight just marks dirty and re-fires on
  // completion with the then-current slots.
  let saving = false;
  let saveDirty = false;
  function save() {
    if (saving) {
      saveDirty = true;
      return;
    }
    const w = window.omelette && window.omelette.writeFile;
    if (!w) return;
    saving = true;
    Promise.resolve(w(STATE_FILE, JSON.stringify(slots))).catch(() => {}).then(() => {
      saving = false;
      if (saveDirty) {
        saveDirty = false;
        save();
      }
    });
  }
  const S_MAX = 5;
  const clampS = s => Math.max(1, Math.min(S_MAX, s));

  // Normalize a stored slot value. Pre-reframe sidecars stored a bare
  // data-URL string; newer ones store {u, s, x, y}. Either shape is valid.
  function getSlot(id) {
    const v = slots[id];
    if (!v) return null;
    return typeof v === 'string' ? {
      u: v,
      s: 1,
      x: 0,
      y: 0
    } : v;
  }
  function setSlot(id, val) {
    if (!id) return;
    if (val) {
      slots[id] = val;
      tombstones.delete(id);
    } else {
      delete slots[id];
      if (!loaded) tombstones.add(id);
    }
    subs.forEach(fn => fn());
    // A drop is rare + high-value — write immediately so nav-away can't lose
    // it. Gate on the initial read so we don't overwrite a sidecar we haven't
    // merged yet; the merge in load() keeps this change once the read lands.
    if (loaded) save();else load().then(save);
  }

  // ── Image downscale ─────────────────────────────────────────────────────
  // Encode through a canvas so the sidecar carries resized bytes, not the
  // raw upload. Longest side is capped at 2× the slot's rendered width
  // (retina) and at MAX_DIM. WebP keeps alpha and is ~10× smaller than PNG
  // for photos, so there's no need for per-image format picking.
  async function toDataUrl(file, targetW) {
    const bitmap = await createImageBitmap(file);
    try {
      const cap = Math.min(MAX_DIM, Math.max(1, Math.round(targetW * 2)) || MAX_DIM);
      const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      return canvas.toDataURL('image/webp', 0.85);
    } finally {
      bitmap.close && bitmap.close();
    }
  }

  // ── Custom element ──────────────────────────────────────────────────────
  const stylesheet = ':host{display:inline-block;position:relative;vertical-align:top;' + '  font:13px/1.3 system-ui,-apple-system,sans-serif;color:rgba(0,0,0,.55);width:240px;height:160px}' + '.frame{position:absolute;inset:0;overflow:hidden;background:rgba(0,0,0,.04)}' +
  // .frame img (clipped) and .spill (unclipped ghost + handles) share the
  // same left/top/width/height in frame-%, computed by _applyView(), so the
  // inside-mask crop and the outside-mask spill stay pixel-aligned.
  '.frame img{position:absolute;max-width:none;transform:translate(-50%,-50%);' + '  -webkit-user-drag:none;user-select:none;touch-action:none}' +
  // Reframe mode (double-click): the full image spills past the mask. The
  // spill layer is sized to the IMAGE bounds so its corners are where the
  // resize handles belong. The ghost <img> inside is translucent; the real
  // clipped <img> underneath shows the opaque in-mask crop.
  '.spill{position:absolute;transform:translate(-50%,-50%);display:none;z-index:1;' + '  cursor:grab;touch-action:none}' + ':host([data-panning]) .spill{cursor:grabbing}' + '.spill .ghost{position:absolute;inset:0;width:100%;height:100%;opacity:.35;' + '  pointer-events:none;-webkit-user-drag:none;user-select:none;' + '  box-shadow:0 0 0 1px rgba(0,0,0,.2),0 12px 32px rgba(0,0,0,.2)}' + '.spill .handle{position:absolute;width:12px;height:12px;border-radius:50%;' + '  background:#fff;box-shadow:0 0 0 1.5px #c96442,0 1px 3px rgba(0,0,0,.3);' + '  transform:translate(-50%,-50%)}' + '.spill .handle[data-c=nw]{left:0;top:0;cursor:nwse-resize}' + '.spill .handle[data-c=ne]{left:100%;top:0;cursor:nesw-resize}' + '.spill .handle[data-c=sw]{left:0;top:100%;cursor:nesw-resize}' + '.spill .handle[data-c=se]{left:100%;top:100%;cursor:nwse-resize}' + ':host([data-reframe]){z-index:10}' + ':host([data-reframe]) .spill{display:block}' + ':host([data-reframe]) .frame{box-shadow:0 0 0 2px #c96442}' + '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' + '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' + '  cursor:pointer;user-select:none}' + '.empty svg{opacity:.45}' + '.empty .cap{max-width:90%;font-weight:500;letter-spacing:.01em}' + '.empty .sub{font-size:11px}' + '.empty .sub u{text-underline-offset:2px;text-decoration-color:rgba(0,0,0,.25)}' + '.empty:hover .sub u{color:rgba(0,0,0,.75);text-decoration-color:currentColor}' + ':host([data-over]) .frame{outline:2px solid #c96442;outline-offset:-2px;' + '  background:rgba(201,100,66,.10)}' + '.ring{position:absolute;inset:0;pointer-events:none;border:1.5px dashed rgba(0,0,0,.25);' + '  transition:border-color .12s}' + ':host([data-over]) .ring{border-color:#c96442}' + ':host([data-filled]) .ring{display:none}' +
  // Controls sit BELOW the mask (top:100%), absolutely positioned so the
  // author-declared slot height is unaffected. The gap is padding, not a
  // top offset, so the hover target stays contiguous with the frame.
  '.ctl{position:absolute;top:100%;left:50%;transform:translateX(-50%);padding-top:8px;' + '  display:flex;gap:6px;opacity:0;pointer-events:none;transition:opacity .12s;z-index:2;' + '  white-space:nowrap}' + ':host([data-filled][data-editable]:hover) .ctl,:host([data-reframe]) .ctl' + '  {opacity:1;pointer-events:auto}' + '.ctl button{appearance:none;border:0;border-radius:6px;padding:5px 10px;cursor:pointer;' + '  background:rgba(0,0,0,.65);color:#fff;font:11px/1 system-ui,-apple-system,sans-serif;' + '  backdrop-filter:blur(6px)}' + '.ctl button:hover{background:rgba(0,0,0,.8)}' + '.err{position:absolute;left:8px;bottom:8px;right:8px;color:#b3261e;font-size:11px;' + '  background:rgba(255,255,255,.85);padding:4px 6px;border-radius:5px;pointer-events:none}';
  const icon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' + '<path d="m21 15-5-5L5 21"/></svg>';
  class ImageSlot extends HTMLElement {
    static get observedAttributes() {
      return ['shape', 'radius', 'mask', 'fit', 'position', 'placeholder', 'src', 'id'];
    }
    constructor() {
      super();
      const root = this.attachShadow({
        mode: 'open'
      });
      // .spill and .ctl sit OUTSIDE .frame so overflow:hidden + border-radius
      // on the frame (circle, pill, rounded) can't clip them.
      root.innerHTML = '<style>' + stylesheet + '</style>' + '<div class="frame" part="frame">' + '  <img part="image" alt="" draggable="false" style="display:none">' + '  <div class="empty" part="empty">' + icon + '    <div class="cap"></div>' + '    <div class="sub">or <u>browse files</u></div></div>' + '  <div class="ring" part="ring"></div>' + '</div>' + '<div class="spill">' + '  <img class="ghost" alt="" draggable="false">' + '  <div class="handle" data-c="nw"></div><div class="handle" data-c="ne"></div>' + '  <div class="handle" data-c="sw"></div><div class="handle" data-c="se"></div>' + '</div>' + '<div class="ctl"><button data-act="replace" title="Replace image">Replace</button>' + '  <button data-act="clear" title="Remove image">Remove</button></div>' + '<input type="file" accept="' + ACCEPT.join(',') + '" hidden>';
      this._frame = root.querySelector('.frame');
      this._ring = root.querySelector('.ring');
      this._img = root.querySelector('.frame img');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._sub = root.querySelector('.sub');
      this._spill = root.querySelector('.spill');
      this._ghost = root.querySelector('.ghost');
      this._err = null;
      this._input = root.querySelector('input');
      this._depth = 0;
      this._gen = 0;
      this._view = {
        s: 1,
        x: 0,
        y: 0
      };
      this._subFn = () => this._render();
      // Shadow-DOM listeners live with the shadow DOM — bound once here so
      // disconnect/reconnect (e.g. React remount) doesn't stack handlers.
      this._empty.addEventListener('click', () => this._input.click());
      root.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (act === 'replace') {
          this._exitReframe(true);
          this._input.click();
        }
        if (act === 'clear') {
          this._exitReframe(false);
          this._gen++;
          this._local = null;
          if (this.id) setSlot(this.id, null);else this._render();
        }
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._ingest(f);
        this._input.value = '';
      });
      // naturalWidth/Height aren't known until load — re-apply so the cover
      // baseline is computed from real dimensions, not the 100%×100% fallback.
      this._img.addEventListener('load', () => this._applyView());
      // Gated on editable + fit=cover so share links and contain/fill slots
      // stay static.
      this.addEventListener('dblclick', e => {
        if (!this.hasAttribute('data-editable') || !this._reframes()) return;
        e.preventDefault();
        if (this.hasAttribute('data-reframe')) this._exitReframe(true);else this._enterReframe();
      });
      // Pan + resize both originate on the spill layer. A handle pointerdown
      // drives an aspect-locked resize anchored at the opposite corner; any
      // other pointerdown on the spill pans. Offsets are frame-% so a
      // reframed slot survives responsive resize / PPTX export.
      this._spill.addEventListener('pointerdown', e => {
        if (e.button !== 0 || !this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        e.stopPropagation();
        this._spill.setPointerCapture(e.pointerId);
        const rect = this.getBoundingClientRect();
        const fw = rect.width || 1,
          fh = rect.height || 1;
        const corner = e.target.getAttribute && e.target.getAttribute('data-c');
        let move;
        if (corner) {
          // Resize about the OPPOSITE corner. Viewport-px throughout (rect
          // fw/fh, not clientWidth) so the math survives a transform:scale()
          // ancestor — deck_stage renders slides scaled-to-fit.
          const iw = this._img.naturalWidth || 1,
            ih = this._img.naturalHeight || 1;
          const base = Math.max(fw / iw, fh / ih);
          const sx = corner.includes('e') ? 1 : -1;
          const sy = corner.includes('s') ? 1 : -1;
          const s0 = this._view.s;
          const w0 = iw * base * s0,
            h0 = ih * base * s0;
          const cx0 = (50 + this._view.x) / 100 * fw;
          const cy0 = (50 + this._view.y) / 100 * fh;
          const ox = cx0 - sx * w0 / 2,
            oy = cy0 - sy * h0 / 2;
          const diag0 = Math.hypot(w0, h0);
          const ux = sx * w0 / diag0,
            uy = sy * h0 / diag0;
          move = ev => {
            const proj = (ev.clientX - rect.left - ox) * ux + (ev.clientY - rect.top - oy) * uy;
            const s = clampS(s0 * proj / diag0);
            const d = diag0 * s / s0;
            this._view.s = s;
            this._view.x = (ox + ux * d / 2) / fw * 100 - 50;
            this._view.y = (oy + uy * d / 2) / fh * 100 - 50;
            this._clampView();
            this._applyView();
          };
        } else {
          this.setAttribute('data-panning', '');
          const start = {
            px: e.clientX,
            py: e.clientY,
            x: this._view.x,
            y: this._view.y
          };
          move = ev => {
            this._view.x = start.x + (ev.clientX - start.px) / fw * 100;
            this._view.y = start.y + (ev.clientY - start.py) / fh * 100;
            this._clampView();
            this._applyView();
          };
        }
        const up = () => {
          try {
            this._spill.releasePointerCapture(e.pointerId);
          } catch {}
          this._spill.removeEventListener('pointermove', move);
          this._spill.removeEventListener('pointerup', up);
          this._spill.removeEventListener('pointercancel', up);
          this.removeAttribute('data-panning');
          this._dragUp = null;
        };
        // Stashed so _exitReframe (Escape / outside-click mid-drag) can
        // tear the capture + listeners down synchronously.
        this._dragUp = up;
        this._spill.addEventListener('pointermove', move);
        this._spill.addEventListener('pointerup', up);
        this._spill.addEventListener('pointercancel', up);
      });
      // Wheel zoom stays available inside reframe mode as a trackpad nicety —
      // zooms toward the cursor (offset' = cursor·(1-k) + offset·k).
      this.addEventListener('wheel', e => {
        if (!this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        const r = this.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width * 100 - 50;
        const cy = (e.clientY - r.top) / r.height * 100 - 50;
        const prev = this._view.s;
        const next = clampS(prev * Math.pow(1.0015, -e.deltaY));
        if (next === prev) return;
        const k = next / prev;
        this._view.s = next;
        this._view.x = cx * (1 - k) + this._view.x * k;
        this._view.y = cy * (1 - k) + this._view.y * k;
        this._clampView();
        this._applyView();
      }, {
        passive: false
      });
    }
    connectedCallback() {
      // Warn once per page — an id-less slot works for the session but
      // cannot persist, and two id-less slots would share nothing.
      if (!this.id && !ImageSlot._warned) {
        ImageSlot._warned = true;
        console.warn('<image-slot> without an id will not persist its dropped image.');
      }
      this.addEventListener('dragenter', this);
      this.addEventListener('dragover', this);
      this.addEventListener('dragleave', this);
      this.addEventListener('drop', this);
      subs.add(this._subFn);
      // width%/height% in _applyView encode the frame aspect at call time —
      // a host resize (responsive grid, pane divider) would stretch the
      // image until the next _render. Re-render on size change: _render()
      // re-seeds _view from stored before clamp/apply, so a shrink→grow
      // cycle round-trips instead of ratcheting x/y toward the narrower
      // frame's clamp range.
      this._ro = new ResizeObserver(() => this._render());
      this._ro.observe(this);
      load();
      this._render();
    }
    disconnectedCallback() {
      subs.delete(this._subFn);
      this.removeEventListener('dragenter', this);
      this.removeEventListener('dragover', this);
      this.removeEventListener('dragleave', this);
      this.removeEventListener('drop', this);
      if (this._ro) {
        this._ro.disconnect();
        this._ro = null;
      }
      this._exitReframe(false);
    }
    _enterReframe() {
      if (this.hasAttribute('data-reframe')) return;
      this.setAttribute('data-reframe', '');
      this._applyView();
      // Close on click outside (the spill handler stopPropagation()s so
      // in-image drags don't reach this) and on Escape. Listeners are held
      // on the instance so _exitReframe / disconnectedCallback can detach
      // exactly what was attached.
      this._outside = e => {
        if (e.composedPath && e.composedPath().includes(this)) return;
        this._exitReframe(true);
      };
      this._esc = e => {
        if (e.key === 'Escape') this._exitReframe(true);
      };
      document.addEventListener('pointerdown', this._outside, true);
      document.addEventListener('keydown', this._esc, true);
    }
    _exitReframe(commit) {
      if (!this.hasAttribute('data-reframe')) return;
      if (this._dragUp) this._dragUp();
      this.removeAttribute('data-reframe');
      this.removeAttribute('data-panning');
      if (this._outside) document.removeEventListener('pointerdown', this._outside, true);
      if (this._esc) document.removeEventListener('keydown', this._esc, true);
      this._outside = this._esc = null;
      if (commit) this._commitView();
    }
    attributeChangedCallback() {
      if (this.shadowRoot) this._render();
    }

    // handleEvent — one listener object for all four drag events keeps the
    // add/remove symmetric and the depth counter correct.
    handleEvent(e) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        // Without preventDefault the browser never fires 'drop'.
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.setAttribute('data-over', '');
      } else if (e.type === 'dragleave') {
        // dragenter/leave fire for every descendant crossing — count depth
        // so hovering the icon inside the empty state doesn't flicker.
        if (--this._depth <= 0) {
          this._depth = 0;
          this.removeAttribute('data-over');
        }
      } else if (e.type === 'drop') {
        e.preventDefault();
        e.stopPropagation();
        this._depth = 0;
        this.removeAttribute('data-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }
    async _ingest(file) {
      this._setError(null);
      if (!file || ACCEPT.indexOf(file.type) < 0) {
        this._setError('Drop a PNG, JPEG, WebP, or AVIF image.');
        return;
      }
      // toDataUrl can take hundreds of ms on a large photo. A Clear or a
      // newer drop during that window would be clobbered when this await
      // resumes — bump + capture a generation so stale encodes bail.
      const gen = ++this._gen;
      try {
        const w = this.clientWidth || this.offsetWidth || MAX_DIM;
        const url = await toDataUrl(file, w);
        if (gen !== this._gen) return;
        // Only exit reframe once the new image is in hand — a rejected type
        // or decode failure leaves the in-progress crop untouched.
        this._exitReframe(false);
        const val = {
          u: url,
          s: 1,
          x: 0,
          y: 0
        };
        setSlot(this.id || '', val);
        // Keep a session-local copy for id-less slots so the drop still
        // shows, even though it cannot persist.
        if (!this.id) {
          this._local = val;
          this._render();
        }
      } catch (err) {
        if (gen !== this._gen) return;
        this._setError('Could not read that image.');
        console.warn('<image-slot> ingest failed:', err);
      }
    }
    _setError(msg) {
      if (this._err) {
        this._err.remove();
        this._err = null;
      }
      if (!msg) return;
      const d = document.createElement('div');
      d.className = 'err';
      d.textContent = msg;
      this.shadowRoot.appendChild(d);
      this._err = d;
      setTimeout(() => {
        if (this._err === d) {
          d.remove();
          this._err = null;
        }
      }, 3000);
    }

    // Reframing (pan/resize) is only meaningful for fit=cover — contain/fill
    // keep the old object-fit path and double-click is a no-op.
    _reframes() {
      return this.hasAttribute('data-filled') && (this.getAttribute('fit') || 'cover') === 'cover';
    }

    // Cover-baseline geometry, shared by clamp/apply/resize. Null until the
    // img has loaded (naturalWidth is 0 before that) or when the slot has no
    // layout box — ResizeObserver fires with a 0×0 rect under display:none,
    // and clamping against a degenerate 1×1 frame would silently pull the
    // stored pan toward zero.
    _geom() {
      const iw = this._img.naturalWidth,
        ih = this._img.naturalHeight;
      const fw = this.clientWidth,
        fh = this.clientHeight;
      if (!iw || !ih || !fw || !fh) return null;
      return {
        iw,
        ih,
        fw,
        fh,
        base: Math.max(fw / iw, fh / ih)
      };
    }
    _clampView() {
      // Pan range on each axis is half the overflow past the frame edge.
      const g = this._geom();
      if (!g) return;
      const mx = Math.max(0, (g.iw * g.base * this._view.s / g.fw - 1) * 50);
      const my = Math.max(0, (g.ih * g.base * this._view.s / g.fh - 1) * 50);
      this._view.x = Math.max(-mx, Math.min(mx, this._view.x));
      this._view.y = Math.max(-my, Math.min(my, this._view.y));
    }
    _applyView() {
      const g = this._geom();
      const fit = this.getAttribute('fit') || 'cover';
      if (fit !== 'cover' || !g) {
        // Non-cover, or dimensions not known yet (before img load).
        this._img.style.width = '100%';
        this._img.style.height = '100%';
        this._img.style.left = '50%';
        this._img.style.top = '50%';
        this._img.style.objectFit = fit;
        this._img.style.objectPosition = this.getAttribute('position') || '50% 50%';
        return;
      }
      // Cover baseline: img fills the frame on its tighter axis at s=1, so
      // pan works immediately on the overflowing axis without zooming first.
      // Width/height and left/top are all frame-% — depends only on the
      // frame aspect ratio, so a responsive resize keeps the same crop. The
      // spill layer mirrors the same box so its corners = image corners.
      const k = g.base * this._view.s;
      const w = g.iw * k / g.fw * 100 + '%';
      const h = g.ih * k / g.fh * 100 + '%';
      const l = 50 + this._view.x + '%';
      const t = 50 + this._view.y + '%';
      this._img.style.width = w;
      this._img.style.height = h;
      this._img.style.left = l;
      this._img.style.top = t;
      this._img.style.objectFit = '';
      this._spill.style.width = w;
      this._spill.style.height = h;
      this._spill.style.left = l;
      this._spill.style.top = t;
    }
    _commitView() {
      const v = {
        s: this._view.s,
        x: this._view.x,
        y: this._view.y
      };
      if (this._userUrl) v.u = this._userUrl;
      // Framing-only (no u) persists too so an author-src slot remembers its
      // crop; clearing the sidecar still falls through to src=.
      if (this.id) setSlot(this.id, v);else {
        this._local = v;
      }
    }
    _render() {
      // Shape / mask. Presets use border-radius so the dashed ring can
      // follow the rounded outline; clip-path is only applied for an
      // explicit `mask` (the ring is hidden there since a rectangle
      // dashed border chopped by an arbitrary polygon looks broken).
      const mask = this.getAttribute('mask');
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '';
      if (shape === 'circle') radius = '50%';else if (shape === 'pill') radius = '9999px';else if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 12) + 'px';
      }
      this._frame.style.borderRadius = mask ? '' : radius;
      this._frame.style.clipPath = mask || '';
      this._ring.style.borderRadius = mask ? '' : radius;
      this._ring.style.display = mask ? 'none' : '';

      // Controls and reframe entry gate on this so share links stay read-only.
      const editable = !!(window.omelette && window.omelette.writeFile);
      this.toggleAttribute('data-editable', editable);
      this._sub.style.display = editable ? '' : 'none';

      // Content. The sidecar is also writable by the agent's write_file
      // tool, so its value isn't guaranteed canvas-originated — only accept
      // data:image/ URLs from it. The `src` attribute is author-controlled
      // (Claude wrote it into the HTML) so it passes through unchanged.
      let stored = this.id ? getSlot(this.id) : this._local;
      if (stored && stored.u && !/^data:image\//i.test(stored.u)) stored = null;
      const srcAttr = this.getAttribute('src') || '';
      this._userUrl = stored && stored.u || null;
      const url = this._userUrl || srcAttr;
      // Don't clobber an in-flight reframe with a store-triggered re-render.
      if (!this.hasAttribute('data-reframe')) {
        this._view = {
          s: stored && Number.isFinite(stored.s) ? clampS(stored.s) : 1,
          x: stored && Number.isFinite(stored.x) ? stored.x : 0,
          y: stored && Number.isFinite(stored.y) ? stored.y : 0
        };
      }
      this._cap.textContent = this.getAttribute('placeholder') || 'Drop an image';
      // Toggle via style.display — the [hidden] attribute alone loses to
      // the display:flex / display:block rules in the stylesheet above.
      if (url) {
        if (this._img.getAttribute('src') !== url) {
          this._img.src = url;
          this._ghost.src = url;
        }
        this._img.style.display = 'block';
        this._empty.style.display = 'none';
        this.setAttribute('data-filled', '');
        this._clampView();
        this._applyView();
      } else {
        this._img.style.display = 'none';
        this._img.removeAttribute('src');
        this._ghost.removeAttribute('src');
        this._empty.style.display = 'flex';
        this.removeAttribute('data-filled');
      }
    }
  }
  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/auth_mobile/image-slot.js", error: String((e && e.message) || e) }); }

// ui_kits/backoffice/admin.jsx
try { (() => {
/* ULAMU — Back-office (M16) : pilotage du réseau, file de vérification
   des soignants (badge vérifié M03), sidebar admin + topbar. */
const AD = window.ULAMUDesignSystem_d14300;
const {
  Button,
  IconButton,
  Badge,
  Avatar,
  Input,
  Card,
  Icon,
  Banner,
  NavItem,
  Modal,
  Switch,
  VerifiedBadge
} = AD;
const VERIFS = [{
  id: 'VER-0241',
  name: 'Dr Olga Ndinga',
  spec: 'Pédiatre · Brazzaville',
  docs: ['Diplôme d\'État', 'Ordre des médecins', 'Pièce d\'identité'],
  since: 'il y a 2 h',
  risk: null
}, {
  id: 'VER-0240',
  name: 'Brice Elenga',
  spec: 'Infirmier · Dolisie',
  docs: ['Diplôme d\'État', 'Pièce d\'identité'],
  since: 'il y a 5 h',
  risk: null
}, {
  id: 'VER-0238',
  name: '« Dr » Sosthène M.',
  spec: 'Généraliste · Brazzaville',
  docs: ['Diplôme illisible', 'Pièce d\'identité'],
  since: 'hier',
  risk: 'Numéro d\'ordre introuvable'
}];
function ASectionLabel({
  children,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      margin: '0 0 12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)'
    }
  }, children), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--border-subtle)'
    }
  }), right);
}

/* ── Sidebar admin (entête / corps / pied menu utilisateur) ── */
function AdminSidebar({
  nav,
  setNav,
  theme,
  onTheme
}) {
  const items = [['dashboard', 'Pilotage', null], ['shield-check', 'Vérifications', '3'], ['alert-triangle', 'Litiges', '2'], ['hospital', 'Structures', null], ['database', 'Journal', null]];
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [hovItem, setHovItem] = React.useState(null);
  const menuRef = React.useRef(null);
  React.useEffect(() => {
    if (!menuOpen) return;
    const close = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);
  const itemStyle = (id, danger) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    height: 34,
    padding: '0 10px',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 'var(--radius-md)',
    textAlign: 'left',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    fontWeight: 500,
    background: hovItem === id ? danger ? 'var(--error-bg)' : 'var(--bg-subtle)' : 'transparent',
    color: danger ? 'var(--error-text)' : 'var(--text-primary)',
    transition: 'background var(--dur-fast) linear'
  });
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 240,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderRight: '1px solid var(--glass-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '14px 16px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 'var(--radius-md)',
      background: 'var(--accent-500)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'var(--grain-btn)'
    }
  }), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 2C5.8 2 4 3.8 4 6c0 1.4.7 2.6 1.8 3.3L5 12h6l-.8-2.7C11.3 8.6 12 7.4 12 6c0-2.2-1.8-4-4-4z",
    fill: "#fff",
    fillOpacity: ".92"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5.5",
    y: "12.5",
    width: "5",
    height: "1.5",
    rx: ".75",
    fill: "#fff",
    fillOpacity: ".72"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)'
    }
  }, "ulamu"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.05em',
      color: 'var(--warning-text)',
      border: '1px solid var(--warning-border)',
      background: 'var(--warning-bg)',
      borderRadius: 4,
      padding: '2px 5px'
    }
  }, "ADMIN")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '12px 12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-disabled)',
      padding: '2px 12px 6px'
    }
  }, "R\xE9seau de soin"), items.map(([ic, l, b]) => /*#__PURE__*/React.createElement(NavItem, {
    key: ic,
    icon: ic,
    label: l,
    badge: b,
    active: nav === ic,
    onClick: () => setNav(ic)
  })), /*#__PURE__*/React.createElement(Banner, {
    tone: "warning",
    title: "Pilote Brazzaville",
    style: {
      marginTop: 14
    }
  }, "Semaine 9 / 24 \u2014 objectif : 500 consultations / semaine.")), /*#__PURE__*/React.createElement("div", {
    ref: menuRef,
    style: {
      flexShrink: 0,
      position: 'relative',
      padding: 12,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, menuOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 'calc(100% + 6px)',
      left: 12,
      right: 12,
      zIndex: 50,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-xl)',
      padding: 6,
      animation: 'ulamu-menu-in3 var(--dur-base) var(--ease-spring)'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes ulamu-menu-in3{from{transform:translateY(6px) scale(.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 10px 10px'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Lydie Bouanga",
    size: "md",
    status: "online"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      color: 'var(--text-primary)'
    }
  }, "Lydie Bouanga"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginTop: 1
    }
  }, "Op\xE9rations \xB7 R\xF4le : superviseure"))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-subtle)',
      margin: '0 4px 6px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      height: 34,
      padding: '0 10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: theme === 'dark' ? 'moon' : 'sun',
    size: 15
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-primary)'
    }
  }, "Th\xE8me sombre"), /*#__PURE__*/React.createElement(Switch, {
    checked: theme === 'dark',
    onChange: onTheme
  })), /*#__PURE__*/React.createElement("button", {
    style: itemStyle('settings'),
    onMouseEnter: () => setHovItem('settings'),
    onMouseLeave: () => setHovItem(null)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 15
  })), "Param\xE8tres"), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-subtle)',
      margin: '6px 4px'
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: itemStyle('logout', true),
    onMouseEnter: () => setHovItem('logout'),
    onMouseLeave: () => setHovItem(null)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "log-out",
    size: 15
  })), "Se d\xE9connecter")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMenuOpen(o => !o),
    "aria-expanded": menuOpen,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      width: '100%',
      padding: '7px 8px',
      border: '1px solid transparent',
      cursor: 'pointer',
      borderRadius: 'var(--radius-md)',
      textAlign: 'left',
      background: menuOpen ? 'var(--bg-subtle)' : 'transparent',
      borderColor: menuOpen ? 'var(--border-default)' : 'transparent',
      transition: 'background var(--dur-fast) linear'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Lydie Bouanga",
    size: "sm",
    status: "online"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 12.5,
      color: 'var(--text-primary)'
    }
  }, "Lydie Bouanga"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 10.5,
      color: 'var(--text-tertiary)'
    }
  }, "Superviseure")), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-tertiary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: menuOpen ? 'chevron-down' : 'chevron-up',
    size: 14
  })))));
}
function AdminTopbar({
  crumb
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 24px',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--glass-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-primary)',
      fontWeight: 500
    }
  }, crumb), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      maxWidth: 340,
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    leftIcon: "search",
    placeholder: "Soignant, structure, litige\u2026",
    style: {
      height: 32,
      fontSize: 13
    }
  })), /*#__PURE__*/React.createElement(Badge, {
    tone: "success",
    dot: true
  }, "R\xE9seau op\xE9rationnel"), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "bell",
    variant: "solid",
    label: "Notifications"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 4,
      right: 5,
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'var(--error-dot)',
      border: '2px solid var(--bg-base)'
    }
  })));
}

/* ── Modale d'examen d'un dossier de vérification ── */
function VerifModal({
  v,
  onClose,
  onDecide
}) {
  const [rejecting, setRejecting] = React.useState(false);
  return /*#__PURE__*/React.createElement(Modal, {
    title: `Dossier ${v.id}`,
    onClose: onClose,
    width: 480,
    footer: rejecting ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setRejecting(false)
    }, "Retour"), /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      iconLeft: "x",
      onClick: () => onDecide(v.id, 'reject')
    }, "Confirmer le rejet")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      iconLeft: "x",
      onClick: () => setRejecting(true)
    }, "Rejeter"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      iconLeft: "shield-check",
      onClick: () => onDecide(v.id, 'approve')
    }, "Accorder le badge v\xE9rifi\xE9"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      paddingBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: v.name.replace(/[«»]/g, ''),
    size: "lg"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 16,
      color: 'var(--text-primary)'
    }
  }, v.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, v.spec, " \xB7 d\xE9pos\xE9 ", v.since))), v.risk && /*#__PURE__*/React.createElement(Banner, {
    tone: "error",
    title: "Signal de risque"
  }, v.risk, " \u2014 v\xE9rifier aupr\xE8s de l'ordre avant toute d\xE9cision."), rejecting ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-primary)',
      marginBottom: 6
    }
  }, "Motif du rejet (transmis au demandeur)"), /*#__PURE__*/React.createElement(Input, {
    placeholder: "Ex. : num\xE9ro d'ordre inv\xE9rifiable\u2026",
    defaultValue: v.risk || ''
  })) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, v.docs.map(d => /*#__PURE__*/React.createElement("div", {
    key: d,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '9px 12px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-subtle)',
      border: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.14)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-medical",
    size: 15
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      fontWeight: 600,
      fontFamily: 'var(--font-body)',
      color: 'var(--text-primary)'
    }
  }, d), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    iconLeft: "eye"
  }, "Examiner"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 12
  }), "D\xE9cision trac\xE9e au journal inalt\xE9rable (M04), avec votre identit\xE9."))));
}
window.AdminSidebar = AdminSidebar;
window.AdminTopbar = AdminTopbar;
window.AdminVerifModal = VerifModal;
window.AdminSectionLabel = ASectionLabel;
window.ADMIN_VERIFS = VERIFS;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/backoffice/admin.jsx", error: String((e && e.message) || e) }); }

// ui_kits/backoffice/admin2.jsx
try { (() => {
/* ULAMU — Back-office : Pilotage (KPIs réseau + courbe), Vérifications,
   Litiges, Structures, Journal inaltérable + racine AdminApp. */
const AD2 = window.ULAMUDesignSystem_d14300;
const {
  Button: AB,
  IconButton: AIB,
  Badge: ABD,
  Avatar: AAV,
  Card: AC,
  Icon: AIC,
  Banner: ABN,
  VerifiedBadge: AVB
} = AD2;
const ASL = window.AdminSectionLabel;
function ARow({
  children,
  last
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 0',
      borderBottom: last ? 'none' : '1px solid var(--border-subtle)'
    }
  }, children);
}
function AShell({
  title,
  sub,
  actions,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '28px 32px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 24,
      letterSpacing: '-0.6px',
      color: 'var(--text-primary)'
    }
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-tertiary)',
      marginTop: 4
    }
  }, sub)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, actions)), children);
}

/* Courbe des consultations (dégradé autorisé : area chart uniquement) */
function NetChart() {
  const W = 560,
    H = 150,
    P = 8,
    max = 80;
  const vals = [22, 34, 31, 46, 52, 64, 71];
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const pts = vals.map((v, i) => [P + i * ((W - 2 * P) / 6), H - P - v / max * (H - 2 * P)]);
  const line = pts.map(p => p.join(',')).join(' ');
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W} ${H}`,
    style: {
      width: '100%',
      height: 'auto',
      display: 'block',
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "gnet",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#2756A6",
    stopOpacity: ".18"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#2756A6",
    stopOpacity: "0"
  }))), [0.25, 0.5, 0.75].map(f => /*#__PURE__*/React.createElement("line", {
    key: f,
    x1: P,
    x2: W - P,
    y1: H - P - f * (H - 2 * P),
    y2: H - P - f * (H - 2 * P),
    stroke: "var(--border-subtle)",
    strokeWidth: "1",
    strokeDasharray: "3 4"
  })), /*#__PURE__*/React.createElement("line", {
    x1: P,
    x2: W - P,
    y1: H - P,
    y2: H - P,
    stroke: "var(--border-default)",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: `${P},${H - P} ${line} ${W - P},${H - P}`,
    fill: "url(#gnet)"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: line,
    fill: "none",
    stroke: "var(--accent-400)",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), pts.map((p, i) => i === 6 ? /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("circle", {
    cx: p[0],
    cy: p[1],
    r: "7",
    fill: "var(--accent-500)",
    opacity: ".22"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: p[0],
    cy: p[1],
    r: "3",
    fill: "var(--accent-400)"
  })) : /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: p[0],
    cy: p[1],
    r: "2.4",
    fill: "var(--accent-400)",
    opacity: ".55"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 2px 0'
    }
  }, days.map(d => /*#__PURE__*/React.createElement("span", {
    key: d,
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--text-disabled)'
    }
  }, d))));
}

/* ── Pilotage ── */
function Pilotage({
  onVerifs
}) {
  const kpis = [['Patients inscrits', '12 480', 'users', '+340 cette semaine', 'success'], ['Consultations / jour', '71', 'consultation', 'record du pilote', 'success'], ['Volume semaine', '2,4 M F', 'trending-up', '+18 % vs S-1', 'success'], ['Taux de litiges', '0,8 %', 'alert-triangle', '2 ouverts', 'warning']];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '28px 32px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--accent-300)',
      marginBottom: 6
    }
  }, "Jeudi 11 juin 2026 \xB7 20:10 \xB7 pilote Brazzaville S9/24"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 26,
      letterSpacing: '-0.7px',
      color: 'var(--text-primary)'
    }
  }, "Pilotage du r\xE9seau"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-tertiary)',
      marginTop: 4
    }
  }, "153 soignants v\xE9rifi\xE9s \xB7 28 pharmacies \xB7 6 laboratoires \xB7 2 arrondissements couverts")), /*#__PURE__*/React.createElement(AB, {
    variant: "primary",
    iconLeft: "shield-check",
    onClick: onVerifs
  }, "File de v\xE9rification \xB7 3")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16,
      marginBottom: 26
    }
  }, kpis.map(([l, v, ic, d, tone]) => /*#__PURE__*/React.createElement(AC, {
    key: l,
    padding: "15px 16px",
    grain: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-tertiary)'
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.14)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(AIC, {
    name: ic,
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 25,
      letterSpacing: '-0.6px',
      color: 'var(--text-primary)',
      lineHeight: 1,
      whiteSpace: 'nowrap'
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(ABD, {
    tone: tone,
    size: "sm",
    dot: true
  }, d))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.55fr 1fr',
      gap: 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(ASL, {
    right: /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text-tertiary)'
      }
    }, "consultations / jour")
  }, "Activit\xE9 de la semaine"), /*#__PURE__*/React.createElement(AC, {
    padding: "18px 18px 12px"
  }, /*#__PURE__*/React.createElement(NetChart, null))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(ASL, null, "Alertes op\xE9rationnelles"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(ABN, {
    tone: "error",
    title: "Litige LIT-0034 \u2014 session non honor\xE9e"
  }, "Remboursement automatique effectu\xE9 \xB7 arbitrage du compte pro en attente."), /*#__PURE__*/React.createElement(ABN, {
    tone: "warning",
    title: "Pharmacie Mavr\xE9 \u2014 stock gel\xE9"
  }, "Aucune mise \xE0 jour depuis 52 h : masqu\xE9e des recherches (r\xE8gle de fra\xEEcheur)."), /*#__PURE__*/React.createElement(ABN, {
    tone: "info",
    title: "Pic d'usage 19h\u201321h"
  }, "82 % des consultations ont lieu le soir \u2014 pr\xE9voir la garde des m\xE9decins.")))));
}

/* ── Vérifications ── */
function VerifsPage({
  decided,
  onOpen
}) {
  const rows = window.ADMIN_VERIFS.filter(v => !decided[v.id]);
  return /*#__PURE__*/React.createElement(AShell, {
    title: "V\xE9rifications",
    sub: "Le badge v\xE9rifi\xE9 est l'actif de confiance du r\xE9seau \u2014 chaque d\xE9cision est trac\xE9e",
    actions: /*#__PURE__*/React.createElement(AB, {
      variant: "ghost",
      iconLeft: "filter"
    }, "Filtrer")
  }, Object.entries(decided).map(([id, d]) => /*#__PURE__*/React.createElement(ABN, {
    key: id,
    tone: d === 'approve' ? 'success' : 'error',
    style: {
      marginBottom: 12
    },
    title: d === 'approve' ? `${id} — badge vérifié accordé` : `${id} — dossier rejeté`
  }, d === 'approve' ? 'Le soignant est désormais visible des patients avec son badge.' : 'Motif transmis au demandeur · signalement conservé.')), /*#__PURE__*/React.createElement(AC, {
    padding: "4px 18px"
  }, rows.map((v, i) => /*#__PURE__*/React.createElement(ARow, {
    key: v.id,
    last: i === rows.length - 1
  }, /*#__PURE__*/React.createElement(AAV, {
    name: v.name.replace(/[«»]/g, ''),
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 90,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-accent)'
    }
  }, v.id)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, v.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, v.spec, " \xB7 ", v.docs.length, " documents \xB7 ", v.since)), v.risk ? /*#__PURE__*/React.createElement(ABD, {
    tone: "error",
    size: "sm",
    dot: true
  }, "Signal de risque") : /*#__PURE__*/React.createElement(ABD, {
    tone: "neutral",
    size: "sm",
    dot: true
  }, "\xC0 examiner"), /*#__PURE__*/React.createElement(AB, {
    variant: "primary",
    size: "sm",
    iconLeft: "eye",
    onClick: () => onOpen(v)
  }, "Examiner"))), rows.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 0',
      textAlign: 'center',
      fontSize: 13,
      color: 'var(--text-tertiary)'
    }
  }, "File vide \u2014 toutes les demandes sont trait\xE9es.")));
}

/* ── Litiges ── */
function LitigesPage() {
  const ROWS = [['LIT-0034', 'Session non honorée', 'Patient remboursé auto · Dr F. Okemba (3ᵉ récidive)', 'Suspendre le compte ?', 'error'], ['LIT-0033', 'Réservation non tenue', 'Pharmacie Mavré · stock annoncé absent · 500 F remboursés', 'Avertissement envoyé', 'warning'], ['LIT-0029', 'Contestation de compte-rendu', 'Résolu en conciliation · clôturé hier', 'Clôturé', 'neutral']];
  return /*#__PURE__*/React.createElement(AShell, {
    title: "Litiges",
    sub: "Le remboursement est automatique \u2014 l'arbitrage humain ne porte que sur les comptes"
  }, /*#__PURE__*/React.createElement(AC, {
    padding: "4px 18px"
  }, ROWS.map(([id, t, s, action, tone], i) => /*#__PURE__*/React.createElement(ARow, {
    key: id,
    last: i === ROWS.length - 1
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-md)',
      background: tone === 'error' ? 'var(--error-bg)' : tone === 'warning' ? 'var(--warning-bg)' : 'var(--bg-muted)',
      border: '1px solid var(--border-subtle)',
      color: tone === 'error' ? 'var(--error-dot)' : tone === 'warning' ? 'var(--warning-dot)' : 'var(--text-tertiary)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(AIC, {
    name: "alert-triangle",
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 86,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-accent)'
    }
  }, id)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, s)), /*#__PURE__*/React.createElement(ABD, {
    tone: tone,
    size: "sm",
    dot: true
  }, action), /*#__PURE__*/React.createElement(AIB, {
    icon: "chevron-right",
    label: "Ouvrir"
  })))));
}

/* ── Structures ── */
function StructuresPage() {
  const ROWS = [['Pharmacie du Marché', 'Poto-Poto · 142 lignes de stock', 'À jour il y a 3 h', 'success'], ['Laboratoire Avenir', 'Moungali · 14 examens au catalogue', 'Résultats sous 6 h', 'success'], ['Pharmacie Mavré', 'Talangaï · 89 lignes de stock', 'Gelée — 52 h sans mise à jour', 'warning'], ['Clinique Espérance', 'Centre-ville · 8 soignants', 'Vérifiée', 'success']];
  return /*#__PURE__*/React.createElement(AShell, {
    title: "Structures",
    sub: "Pharmacies, laboratoires et cliniques du r\xE9seau",
    actions: /*#__PURE__*/React.createElement(AB, {
      variant: "primary",
      iconLeft: "plus"
    }, "Inviter une structure")
  }, /*#__PURE__*/React.createElement(AC, {
    padding: "4px 18px"
  }, ROWS.map(([n, meta, st, tone], i) => /*#__PURE__*/React.createElement(ARow, {
    key: n,
    last: i === ROWS.length - 1
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.14)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(AIC, {
    name: "hospital",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, n), /*#__PURE__*/React.createElement(AVB, {
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, meta)), /*#__PURE__*/React.createElement(ABD, {
    tone: tone,
    size: "sm",
    dot: true
  }, st), /*#__PURE__*/React.createElement(AIB, {
    icon: "chevron-right",
    label: "Ouvrir"
  })))));
}

/* ── Journal inaltérable (M04) ── */
function JournalPage() {
  const ROWS = [['20:08:41', 'verification.decision', 'VER-0239 approuvé · par L. Bouanga', 'a3f9…c21e'], ['20:02:17', 'litige.remboursement', 'LIT-0034 · 5 000 F → PAT-2026-04412 (auto)', '8be0…77d4'], ['19:58:03', 'ordonnance.signature', 'ORD-2026-00412 · Dr A. Konaté', 'f1c2…09ab'], ['19:51:44', 'session.cloture', 'SES-2026-18230 · compte-rendu versé', '57aa…e3f8'], ['19:42:09', 'paiement.capture', '5 000 F · MTN MoMo · poignée de main confirmée', 'c09d…41b2']];
  return /*#__PURE__*/React.createElement(AShell, {
    title: "Journal",
    sub: "Journal inalt\xE9rable (M04) \u2014 chaque \xE9criture est cha\xEEn\xE9e par empreinte, rien ne s'efface"
  }, /*#__PURE__*/React.createElement(AC, {
    padding: "4px 18px"
  }, ROWS.map(([h, type, detail, hash], i) => /*#__PURE__*/React.createElement(ARow, {
    key: i,
    last: i === ROWS.length - 1
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11.5,
      color: 'var(--text-tertiary)',
      width: 58,
      flexShrink: 0
    }
  }, h), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11.5,
      fontWeight: 600,
      color: 'var(--text-accent)',
      width: 180,
      flexShrink: 0
    }
  }, type), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 12.5,
      color: 'var(--text-secondary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, detail), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      color: 'var(--text-disabled)'
    }
  }, /*#__PURE__*/React.createElement(AIC, {
    name: "lock",
    size: 11
  }), hash)))), /*#__PURE__*/React.createElement(ABN, {
    tone: "info",
    style: {
      marginTop: 16
    },
    title: "Lecture seule"
  }, "Le journal se consulte mais ne s'\xE9dite pas \u2014 y compris pour l'\xE9quipe ULAMU."));
}

/* ── Racine ── */
function AdminApp() {
  const [nav, setNav] = React.useState('dashboard');
  const [openVerif, setOpenVerif] = React.useState(null);
  const [decided, setDecided] = React.useState({});
  const [theme, setThemeState] = React.useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const toggleTheme = () => setThemeState(t => {
    const n = t === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    try {
      localStorage.setItem('ulamu-theme', n);
    } catch (e) {}
    return n;
  });
  const NAMES = {
    dashboard: 'Pilotage',
    'shield-check': 'Vérifications',
    'alert-triangle': 'Litiges',
    hospital: 'Structures',
    database: 'Journal'
  };
  let main;
  if (nav === 'shield-check') main = /*#__PURE__*/React.createElement(VerifsPage, {
    decided: decided,
    onOpen: setOpenVerif
  });else if (nav === 'alert-triangle') main = /*#__PURE__*/React.createElement(LitigesPage, null);else if (nav === 'hospital') main = /*#__PURE__*/React.createElement(StructuresPage, null);else if (nav === 'database') main = /*#__PURE__*/React.createElement(JournalPage, null);else main = /*#__PURE__*/React.createElement(Pilotage, {
    onVerifs: () => setNav('shield-check')
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement(window.AdminSidebar, {
    nav: nav,
    setNav: setNav,
    theme: theme,
    onTheme: toggleTheme
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(window.AdminTopbar, {
    crumb: NAMES[nav]
  }), main), openVerif && /*#__PURE__*/React.createElement(window.AdminVerifModal, {
    v: openVerif,
    onClose: () => setOpenVerif(null),
    onDecide: (id, d) => {
      setDecided(s => ({
        ...s,
        [id]: d
      }));
      setOpenVerif(null);
    }
  }));
}
window.AdminApp = AdminApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/backoffice/admin2.jsx", error: String((e && e.message) || e) }); }

// ui_kits/patient_mobile/android-frame.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// Android.jsx — Simplified Android (Material 3) device frame
// Status bar + top app bar + content + gesture nav + keyboard.
// Based on Figma M3 spec. No dependencies, no image assets.
// Exports (to window): AndroidDevice, AndroidStatusBar, AndroidAppBar, AndroidListItem, AndroidNavBar, AndroidKeyboard
//
// Usage — wrap your screen content in <AndroidDevice> to get the bezel, status
// bar and gesture nav (props: title, large, keyboard, dark):
//
//   <AndroidDevice title="Inbox" large>
//     ...your screen content...
//   </AndroidDevice>
//   <AndroidDevice title="Compose" keyboard>…</AndroidDevice>
/* END USAGE */

const MD_C = {
  surface: '#f4fbf8',
  surfaceVariant: '#dae5e1',
  inverseOnSurface: '#ecf2ef',
  secondaryContainer: '#cde8e1',
  primaryFixedDim: '#83d5c6',
  onSurface: '#171d1b',
  onSurfaceVar: '#49454f',
  onPrimaryContainer: '#00201c',
  primary: '#006a60',
  frameBorder: 'rgba(116,119,117,0.5)'
};

// ─────────────────────────────────────────────────────────────
// Status bar (time left, wifi/cell/battery right)
// ─────────────────────────────────────────────────────────────
function AndroidStatusBar({
  dark = false
}) {
  const c = dark ? '#fff' : MD_C.onSurface;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      position: 'relative',
      fontFamily: 'Roboto, system-ui, sans-serif'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 128,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 400,
      letterSpacing: 0.25,
      lineHeight: '20px',
      color: c
    }
  }, "9:30")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: 8,
      transform: 'translateX(-50%)',
      width: 24,
      height: 24,
      borderRadius: 100,
      background: '#2e2e2e'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      paddingRight: 2
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    style: {
      marginRight: -2
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 13.3L.67 5.97a10.37 10.37 0 0114.66 0L8 13.3z",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    style: {
      marginRight: -2
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14.67 14.67V1.33L1.33 14.67h13.34z",
    fill: c
  }))), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3.75",
    y: "2",
    width: "8.5",
    height: "13",
    rx: "1.5",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5.5",
    y: "0.9",
    width: "5",
    height: "2",
    rx: "0.5",
    fill: c
  }))));
}

// ─────────────────────────────────────────────────────────────
// Top app bar (Material 3 small/medium)
// ─────────────────────────────────────────────────────────────
function AndroidAppBar({
  title = 'Title',
  large = false
}) {
  const iconDot = /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: MD_C.onSurfaceVar,
      opacity: 0.3
    }
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: MD_C.surface,
      padding: '4px 4px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, iconDot, !large && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 22,
      fontWeight: 400,
      color: MD_C.onSurface,
      fontFamily: 'Roboto, system-ui, sans-serif'
    }
  }, title), large && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), iconDot), large && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 16px 20px',
      fontSize: 28,
      fontWeight: 400,
      color: MD_C.onSurface,
      fontFamily: 'Roboto, system-ui, sans-serif'
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// List item (Material 3)
// ─────────────────────────────────────────────────────────────
function AndroidListItem({
  headline,
  supporting,
  leading
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '12px 16px',
      minHeight: 56,
      boxSizing: 'border-box',
      fontFamily: 'Roboto, system-ui, sans-serif'
    }
  }, leading && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: '50%',
      background: MD_C.primary,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      fontWeight: 500,
      flexShrink: 0
    }
  }, leading), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: MD_C.onSurface,
      lineHeight: '24px'
    }
  }, headline), supporting && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: MD_C.onSurfaceVar,
      lineHeight: '20px'
    }
  }, supporting)));
}

// ─────────────────────────────────────────────────────────────
// Gesture nav bar (pill)
// ─────────────────────────────────────────────────────────────
function AndroidNavBar({
  dark = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 108,
      height: 4,
      borderRadius: 2,
      background: dark ? '#fff' : MD_C.onSurface,
      opacity: 0.4
    }
  }));
}

// ─────────────────────────────────────────────────────────────
// Device frame — wraps everything
// ─────────────────────────────────────────────────────────────
function AndroidDevice({
  children,
  width = 412,
  height = 892,
  dark = false,
  title,
  large = false,
  keyboard = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 18,
      overflow: 'hidden',
      background: dark ? '#1d1b20' : MD_C.surface,
      border: `8px solid ${MD_C.frameBorder}`,
      boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement(AndroidStatusBar, {
    dark: dark
  }), title !== undefined && /*#__PURE__*/React.createElement(AndroidAppBar, {
    title: title,
    large: large
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(AndroidKeyboard, null), /*#__PURE__*/React.createElement(AndroidNavBar, {
    dark: dark
  }));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — Gboard (Material 3)
// ─────────────────────────────────────────────────────────────
function AndroidKeyboard() {
  let _k = 0;
  const key = (l, {
    flex = 1,
    bg = MD_C.surface,
    r = 6,
    minW,
    fs = 21
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: _k++,
    style: {
      height: 46,
      borderRadius: r,
      flex,
      minWidth: minW,
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Roboto, system-ui',
      fontSize: fs,
      color: MD_C.onPrimaryContainer
    }
  }, l);
  const row = (keys, style = {}) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      justifyContent: 'center',
      ...style
    }
  }, keys.map(l => key(l)));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: MD_C.inverseOnSurface,
      padding: '0 8px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], {
    padding: '0 20px'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, key('', {
    bg: MD_C.surfaceVariant
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flex: 7,
      minWidth: 274
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l))), key('', {
    bg: MD_C.surfaceVariant
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, key('?123', {
    bg: MD_C.secondaryContainer,
    r: 100,
    minW: 58,
    fs: 14
  }), key(',', {
    bg: MD_C.surfaceVariant
  }), key('', {
    flex: 3,
    minW: 154
  }), key('.', {
    bg: MD_C.surfaceVariant
  }), key('', {
    bg: MD_C.primaryFixedDim,
    r: 100,
    minW: 58
  }))));
}
Object.assign(window, {
  AndroidDevice,
  AndroidStatusBar,
  AndroidAppBar,
  AndroidListItem,
  AndroidNavBar,
  AndroidKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/patient_mobile/android-frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/patient_mobile/chat.jsx
try { (() => {
/* ULAMU — Session de consultation (mobile) : messagerie enrichie.
   Inspirée de la spec « messagerie interne » (doc 18) adaptée à ULAMU :
   accusés 3 états, citations, édition/suppression, notes vocales (onde,
   vitesse), albums médias, aperçu avant envoi, séparateur sticky, bouton
   descendre. Pas de groupes, pas de réactions emoji (charte). */
const UC = window.ULAMUDesignSystem_d14300;
const {
  IconButton: CIB,
  Badge: CBD,
  Avatar: CAV,
  Card: CC,
  Icon: CIC,
  SessionTimer: CST,
  Button: CB,
  Banner: CBN
} = UC;

/* Icônes locales (dispo immédiate, dupliquées au catalogue icons.js) */
const CHAT_ICONS = {
  play: '<path d="M5.5 3.2l7.2 4.8-7.2 4.8V3.2z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="4" y="3" width="3" height="10" rx="1" fill="currentColor" stroke="none"/><rect x="9" y="3" width="3" height="10" rx="1" fill="currentColor" stroke="none"/>',
  reply: '<path d="M6 10L2 6l4-4"/><path d="M2 6h8a4 4 0 0 1 4 4v3"/>',
  checkcheck: '<path d="M1.5 8.5l3 3 5.5-5.5"/><path d="M7.5 11l1 1L15 5.5"/>'
};
function LIc({
  name,
  size = 14,
  strokeWidth = 1.5,
  color,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: color || 'currentColor',
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flexShrink: 0,
      display: 'block',
      ...style
    },
    "aria-hidden": "true",
    dangerouslySetInnerHTML: {
      __html: CHAT_ICONS[name]
    }
  });
}
const nowHM = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};
const fmtMS = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const genWave = (n = 36) => Array.from({
  length: n
}, () => 0.18 + 0.82 * Math.pow(Math.random(), 0.55));

/* ── Accusé 3 états ── */
function Receipt({
  status
}) {
  if (!status || status === 'none') return null;
  if (status === 'pending') return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontSize: 9.5,
      color: 'rgba(255,255,255,0.75)'
    }
  }, /*#__PURE__*/React.createElement(CIC, {
    name: "clock",
    size: 10
  }), "envoi\u2026");
  if (status === 'sent') return /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'rgba(255,255,255,0.75)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(CIC, {
    name: "check",
    size: 13
  }));
  return /*#__PURE__*/React.createElement("span", {
    style: {
      color: status === 'lu' ? '#9DE0FF' : 'rgba(255,255,255,0.75)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(LIc, {
    name: "checkcheck",
    size: 13
  }));
}

/* ── Lecteur de note vocale (onde 36 barres, seek, vitesse) ── */
const SPEEDS = [1, 1.5, 2];
function VoicePlayer({
  wave,
  dur,
  mine
}) {
  const [playing, setPlaying] = React.useState(false);
  const [prog, setProg] = React.useState(0);
  const [spd, setSpd] = React.useState(0);
  const waveRef = React.useRef(null);
  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setProg(p => {
        const n = p + 0.1 * SPEEDS[spd] / dur;
        if (n >= 1) {
          setPlaying(false);
          return 0;
        }
        return n;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, spd, dur]);
  const seek = e => {
    const r = waveRef.current.getBoundingClientRect();
    setProg(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  };
  const playedC = mine ? '#FFFFFF' : 'var(--accent-400)';
  const restC = mine ? 'rgba(255,255,255,0.42)' : 'var(--border-strong)';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      width: 218,
      padding: '3px 2px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPlaying(p => !p),
    "aria-label": playing ? 'Pause' : 'Écouter',
    style: {
      width: 34,
      height: 34,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: mine ? 'rgba(255,255,255,0.92)' : 'var(--accent-500)',
      color: mine ? 'var(--accent-600)' : '#fff'
    }
  }, /*#__PURE__*/React.createElement(LIc, {
    name: playing ? 'pause' : 'play',
    size: 15
  })), /*#__PURE__*/React.createElement("span", {
    ref: waveRef,
    onPointerDown: seek,
    style: {
      flex: 1,
      height: 30,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      position: 'relative',
      cursor: 'pointer',
      touchAction: 'none'
    }
  }, wave.map((a, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      maxWidth: 3,
      height: 3 + a * 21,
      borderRadius: 9999,
      background: i / wave.length <= prog ? playedC : restC
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: '50%',
      left: `${prog * 100}%`,
      transform: 'translate(-50%,-50%)',
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: mine ? '#fff' : 'var(--accent-400)',
      boxShadow: '0 0 0 2px rgba(0,0,0,0.10)',
      pointerEvents: 'none'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      fontVariantNumeric: 'tabular-nums',
      color: mine ? 'rgba(255,255,255,0.85)' : 'var(--text-tertiary)',
      minWidth: 28,
      textAlign: 'right'
    }
  }, fmtMS(dur)), playing && /*#__PURE__*/React.createElement("button", {
    onClick: () => setSpd(s => (s + 1) % 3),
    style: {
      height: 21,
      padding: '0 7px',
      borderRadius: 9999,
      border: 'none',
      cursor: 'pointer',
      flexShrink: 0,
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      background: mine ? 'rgba(255,255,255,0.22)' : 'var(--bg-muted)',
      color: mine ? '#fff' : 'var(--text-accent)'
    }
  }, String(SPEEDS[spd]).replace('.', ','), "\xD7"));
}

/* ── Enregistreur (44 barres, chrono, annuler / envoyer) ── */
function Recorder({
  onSend,
  onCancel
}) {
  const [sec, setSec] = React.useState(0);
  const [bars, setBars] = React.useState(Array(44).fill(0.06));
  React.useEffect(() => {
    const a = setInterval(() => setSec(s => s + 1), 1000);
    const b = setInterval(() => setBars(bs => [...bs.slice(1), 0.08 + 0.92 * Math.pow(Math.random(), 0.6)]), 80);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, []);
  React.useEffect(() => {
    if (sec >= 300) onSend(sec);
  }, [sec]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '4px 6px',
      minHeight: 38,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes ulamu-rec{0%,100%{opacity:1}50%{opacity:.25}}'), /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    "aria-label": "Annuler",
    style: {
      width: 34,
      height: 34,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      background: 'transparent',
      color: 'var(--error-dot)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(CIC, {
    name: "trash",
    size: 17
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: '50%',
      background: 'var(--error-dot)',
      animation: 'ulamu-rec 1s infinite',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 30,
      display: 'flex',
      alignItems: 'center',
      gap: 2
    }
  }, bars.map((a, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      maxWidth: 4,
      height: 3 + a * 23,
      borderRadius: 9999,
      background: 'var(--accent-400)',
      transition: 'height 0.08s linear'
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      fontWeight: 600,
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--text-secondary)',
      minWidth: 36,
      textAlign: 'right'
    }
  }, fmtMS(sec)), /*#__PURE__*/React.createElement("button", {
    onClick: () => onSend(sec),
    "aria-label": "Envoyer la note vocale",
    style: {
      width: 38,
      height: 38,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      background: 'var(--accent-500)',
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'var(--grain-btn)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(CIC, {
    name: "send",
    size: 15
  }))));
}

/* ── Album média (placeholder de démo) ── */
function MediaAlbum({
  count,
  onOpen
}) {
  const cols = count === 3 ? 3 : 2;
  const shown = Math.min(count, 4);
  return /*#__PURE__*/React.createElement("span", {
    onClick: onOpen,
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 2,
      width: 216,
      cursor: 'pointer'
    }
  }, Array.from({
    length: shown
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      position: 'relative',
      aspectRatio: '1',
      borderRadius: 10,
      border: '1px solid var(--border-subtle)',
      background: 'var(--bg-muted)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-disabled)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(CIC, {
    name: "image",
    size: 22,
    strokeWidth: 1.3
  }), i === 3 && count > 4 && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,0,0,0.55)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 20
    }
  }, "+", count - 4))));
}

/* ── Lecteur plein-cadre (overlay local au fil) ── */
function MediaViewer({
  onClose
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 60,
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 52,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 12px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(CIB, {
    icon: "arrow-left",
    label: "Fermer",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, "photo-symptome.jpg"), /*#__PURE__*/React.createElement(CIB, {
    icon: "download",
    variant: "solid",
    label: "T\xE9l\xE9charger"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      aspectRatio: '3/4',
      maxHeight: '100%',
      borderRadius: 12,
      background: 'var(--bg-muted)',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      color: 'var(--text-disabled)'
    }
  }, /*#__PURE__*/React.createElement(CIC, {
    name: "image",
    size: 40,
    strokeWidth: 1.2
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, "Aper\xE7u \u2014 d\xE9mo"))));
}

/* ── Aperçu avant envoi ── */
function PreviewOverlay({
  onClose,
  onSend
}) {
  const [caption, setCaption] = React.useState('');
  const [active, setActive] = React.useState(0);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 60,
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 52,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 12px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(CIB, {
    icon: "x",
    label: "Annuler",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, "photo-", active + 1, ".jpg"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 10.5,
      color: 'var(--text-tertiary)'
    }
  }, "1,2 Mo \xB7 ", active + 1, "/3 fichiers")), /*#__PURE__*/React.createElement(CBD, {
    tone: "success",
    size: "sm",
    icon: "check"
  }, "compress\xE9e \xB7 4,1 \u2192 1,2 Mo")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '88%',
      aspectRatio: '3/4',
      maxHeight: '100%',
      borderRadius: 12,
      background: 'var(--bg-muted)',
      border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      color: 'var(--text-disabled)'
    }
  }, /*#__PURE__*/React.createElement(CIC, {
    name: "image",
    size: 40,
    strokeWidth: 1.2
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, "Aper\xE7u \u2014 d\xE9mo"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      padding: '10px 14px 14px',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: caption,
    onChange: e => setCaption(e.target.value),
    onKeyDown: e => e.key === 'Enter' && onSend(caption),
    placeholder: "Ajouter une l\xE9gende\u2026",
    style: {
      height: 40,
      borderRadius: 9999,
      border: '1px solid var(--border-default)',
      background: 'var(--bg-subtle)',
      padding: '0 16px',
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      color: 'var(--text-primary)',
      outline: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => setActive(i),
    style: {
      width: 52,
      height: 52,
      borderRadius: 10,
      cursor: 'pointer',
      border: `2.5px solid ${i === active ? 'var(--accent-400)' : 'var(--border-subtle)'}`,
      background: 'var(--bg-muted)',
      color: 'var(--text-disabled)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: i === active ? 'translateY(-2px)' : 'none',
      boxShadow: i === active ? 'var(--shadow-md)' : 'none',
      transition: 'transform var(--dur-fast) linear'
    }
  }, /*#__PURE__*/React.createElement(CIC, {
    name: "image",
    size: 18,
    strokeWidth: 1.3
  }))), /*#__PURE__*/React.createElement("button", {
    style: {
      width: 52,
      height: 52,
      borderRadius: 10,
      cursor: 'pointer',
      border: '1.5px dashed var(--border-strong)',
      background: 'transparent',
      color: 'var(--text-tertiary)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(CIC, {
    name: "plus",
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => onSend(caption),
    "aria-label": "Envoyer",
    style: {
      width: 50,
      height: 50,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      background: 'var(--accent-500)',
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'var(--grain-btn)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(CIC, {
    name: "send",
    size: 17
  }))))));
}

/* ── Feuille d'actions (appui sur le chevron de bulle) ── */
function ActionSheet({
  msg,
  step,
  onAction,
  onClose
}) {
  const Row = ({
    icon,
    local,
    label,
    danger,
    act
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: () => onAction(act),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      height: 46,
      padding: '0 16px',
      border: 'none',
      cursor: 'pointer',
      background: 'transparent',
      borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      fontWeight: 500,
      textAlign: 'left',
      color: danger ? 'var(--error-text)' : 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      color: danger ? 'var(--error-dot)' : 'var(--text-secondary)'
    }
  }, local ? /*#__PURE__*/React.createElement(LIc, {
    name: icon,
    size: 16
  }) : /*#__PURE__*/React.createElement(CIC, {
    name: icon,
    size: 16
  })), label);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 70,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes ulamu-sheet{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}'), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: 'var(--bg-elevated)',
      borderRadius: '14px 14px 0 0',
      padding: '10px 8px calc(10px + env(safe-area-inset-bottom, 8px))',
      animation: 'ulamu-sheet var(--dur-moderate) var(--ease-spring)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      width: 36,
      height: 4,
      borderRadius: 2,
      background: 'var(--border-strong)',
      margin: '0 auto 10px'
    }
  }), step === 'delete' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 16px 10px',
      fontSize: 12.5,
      color: 'var(--text-tertiary)'
    }
  }, "Supprimer ce message ?"), /*#__PURE__*/React.createElement(Row, {
    icon: "eye-off",
    label: "Supprimer pour moi",
    act: "delete-me"
  }), msg.who === 'me' && /*#__PURE__*/React.createElement(Row, {
    icon: "trash",
    label: "Supprimer pour tout le monde",
    danger: true,
    act: "delete-all"
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "x",
    label: "Annuler",
    act: "close"
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Row, {
    icon: "reply",
    local: true,
    label: "R\xE9pondre",
    act: "reply"
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "copy",
    label: "Copier",
    act: "copy"
  }), msg.who === 'me' && msg.kind !== 'voice' && msg.kind !== 'album' && /*#__PURE__*/React.createElement(Row, {
    icon: "edit",
    label: "Modifier",
    act: "edit"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-subtle)',
      margin: '4px 12px'
    }
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "trash",
    label: "Supprimer",
    danger: true,
    act: "delete"
  }))));
}
window.UChatParts = {
  LIc,
  Receipt,
  VoicePlayer,
  Recorder,
  MediaAlbum,
  MediaViewer,
  PreviewOverlay,
  ActionSheet,
  nowHM,
  fmtMS,
  genWave
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/patient_mobile/chat.jsx", error: String((e && e.message) || e) }); }

// ui_kits/patient_mobile/flow.jsx
try { (() => {
/* ULAMU — App patient : flux consultation (poignée de main → paiement →
   session), onglets Consultations / Mon espace, Urgence. Icônes SVG only. */
const U2 = window.ULAMUDesignSystem_d14300;
const {
  Button: B2,
  IconButton: IB2,
  Badge: BD2,
  Avatar: AV2,
  Input: IN2,
  Card: C2,
  SessionTimer: ST2,
  Icon: IC2,
  Banner: BN2,
  Modal: MD2
} = U2;
const GH = window.PatientGlassHeader;
const SL = window.PatientSectionLabel;
const fmtF2 = window.patientFmtF;

/* Indicateur d'étapes du parcours */
function StepBar({
  step
}) {
  const steps = ['Poignée de main', 'Paiement', 'Session'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '14px 16px 2px'
    }
  }, steps.map((s, i) => {
    const state = i < step ? 'done' : i === step ? 'on' : 'off';
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: s
    }, i > 0 && /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        height: 2,
        borderRadius: 1,
        background: i <= step ? 'var(--accent-500)' : 'var(--border-default)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 20,
        height: 20,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: state === 'off' ? 'var(--bg-muted)' : 'var(--accent-500)',
        border: `1px solid ${state === 'off' ? 'var(--border-default)' : 'var(--accent-500)'}`,
        color: state === 'off' ? 'var(--text-tertiary)' : '#fff'
      }
    }, state === 'done' ? /*#__PURE__*/React.createElement(IC2, {
      name: "check",
      size: 11,
      strokeWidth: 2.4
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 600
      }
    }, i + 1)), state === 'on' && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-body)',
        fontSize: 11.5,
        fontWeight: 600,
        color: 'var(--text-primary)',
        whiteSpace: 'nowrap'
      }
    }, s)));
  }));
}

/* ── ÉTAPE 1 · Poignée de main ── */
function HandshakeView({
  d,
  onBack,
  onConfirmed
}) {
  const [confirmed, setConfirmed] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setConfirmed(true), 2800);
    return () => clearTimeout(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "scr"
  }, /*#__PURE__*/React.createElement(GH, null, /*#__PURE__*/React.createElement(IB2, {
    icon: "arrow-left",
    label: "Retour",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)',
      flex: 1
    }
  }, "Consultation"), /*#__PURE__*/React.createElement(BD2, {
    tone: "neutral",
    size: "sm",
    icon: "lock"
  }, "S\xE9curis\xE9")), /*#__PURE__*/React.createElement(StepBar, {
    step: 0
  }), /*#__PURE__*/React.createElement("style", null, `
        @keyframes upulse { 0% { transform: scale(.9); opacity: .55 } 100% { transform: scale(1.65); opacity: 0 } }
        @keyframes upop { 0% { transform: scale(.6); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
      `), /*#__PURE__*/React.createElement("div", {
    className: "pad",
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 110,
      height: 110,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, !confirmed && [0, 1].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      position: 'absolute',
      inset: 14,
      borderRadius: '50%',
      border: '1.5px solid var(--accent-400)',
      animation: `upulse 1.8s ${i * 0.9}s ease-out infinite`
    }
  })), /*#__PURE__*/React.createElement(AV2, {
    name: d.name,
    size: "xl"
  }), confirmed && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      width: 30,
      height: 30,
      borderRadius: '50%',
      background: 'var(--success-dot)',
      border: '3px solid var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      animation: 'upop var(--dur-moderate) var(--ease-spring)'
    }
  }, /*#__PURE__*/React.createElement(IC2, {
    name: "check",
    size: 14,
    strokeWidth: 2.6
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 19,
      letterSpacing: '-0.4px',
      color: 'var(--text-primary)'
    }
  }, confirmed ? `${d.name} est prêt` : 'Poignée de main en cours…'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-tertiary)',
      marginTop: 5,
      maxWidth: 270,
      lineHeight: 1.55
    }
  }, confirmed ? 'Il a lu votre pré-consultation. Vous pouvez régler en toute confiance.' : 'Le soignant confirme sa disponibilité. Rien ne sera débité sans son accord.')), /*#__PURE__*/React.createElement(C2, {
    padding: "12px 14px",
    style: {
      width: '100%'
    }
  }, [['file-medical', 'Pré-consultation', confirmed ? 'Lue par le soignant' : 'Transmise', confirmed], ['clock', 'Temps de session', `${d.dur} minutes`, true], ['credit-card', 'Montant bloqué', fmtF2(d.price), true]].map(([ic, t, v, ok], i) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '9px 0',
      borderTop: i ? '1px solid var(--border-subtle)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-tertiary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(IC2, {
    name: ic,
    size: 15
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      textAlign: 'left',
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, t), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: ok ? 'var(--text-primary)' : 'var(--text-tertiary)'
    }
  }, v))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      borderTop: '1px solid var(--glass-border)'
    }
  }, /*#__PURE__*/React.createElement(B2, {
    variant: "primary",
    fullWidth: true,
    size: "lg",
    iconLeft: "credit-card",
    disabled: !confirmed,
    onClick: onConfirmed
  }, confirmed ? `Régler ${fmtF2(d.price)}` : 'En attente de confirmation…')));
}

/* ── ÉTAPE 2 · Paiement MoMo ── */
function PayView({
  d,
  onBack,
  onPaid
}) {
  const [op, setOp] = React.useState('mtn');
  return /*#__PURE__*/React.createElement("div", {
    className: "scr"
  }, /*#__PURE__*/React.createElement(GH, null, /*#__PURE__*/React.createElement(IB2, {
    icon: "arrow-left",
    label: "Retour",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)',
      flex: 1
    }
  }, "Paiement"), /*#__PURE__*/React.createElement(BD2, {
    tone: "neutral",
    size: "sm",
    icon: "lock"
  }, "S\xE9curis\xE9")), /*#__PURE__*/React.createElement(StepBar, {
    step: 1
  }), /*#__PURE__*/React.createElement("div", {
    className: "pad",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(C2, {
    padding: "16px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      paddingBottom: 12,
      borderBottom: '1px dashed var(--border-default)'
    }
  }, /*#__PURE__*/React.createElement(AV2, {
    name: d.name,
    size: "sm"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, d.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-tertiary)'
    }
  }, d.spec)), /*#__PURE__*/React.createElement(BD2, {
    tone: "success",
    dot: true,
    size: "sm"
  }, "Pr\xEAt")), [['Consultation · ' + d.dur + ' min', fmtF2(d.price)], ['Commission ULAMU', 'incluse'], ['Frais cachés', 'aucun']].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 0 0',
      fontSize: 12.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-tertiary)'
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      color: v === fmtF2(d.price) ? 'var(--text-primary)' : 'var(--text-tertiary)'
    }
  }, v))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginTop: 12,
      paddingTop: 12,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, "Total \xE0 payer"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 24,
      letterSpacing: '-0.6px',
      color: 'var(--text-primary)'
    }
  }, fmtF2(d.price)))), /*#__PURE__*/React.createElement(SL, null, "Op\xE9rateur Mobile Money"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, [['mtn', 'MTN MoMo', '06 612 45 90'], ['airtel', 'Airtel Money', '05 540 12 33']].map(([id, l, num]) => {
    const on = op === id;
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      className: "uha",
      onClick: () => setOp(id),
      style: {
        all: 'unset',
        cursor: 'pointer',
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(C2, {
      padding: "13px",
      style: {
        borderColor: on ? 'var(--accent-500)' : 'var(--border-subtle)',
        boxShadow: on ? '0 0 0 3px rgba(39,86,166,0.18)' : 'var(--shadow-sm)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: on ? 'var(--accent-300)' : 'var(--text-tertiary)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(IC2, {
      name: "credit-card",
      size: 18
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 16,
        height: 16,
        borderRadius: '50%',
        border: `1.5px solid ${on ? 'var(--accent-500)' : 'var(--border-strong)'}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, on && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: 'var(--accent-500)'
      }
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        fontSize: 13,
        color: 'var(--text-primary)'
      }
    }, l), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text-tertiary)',
        marginTop: 2
      }
    }, num)));
  })), /*#__PURE__*/React.createElement(BN2, {
    tone: "info",
    title: "Confirmez sur votre t\xE9l\xE9phone"
  }, "Une demande ", op === 'mtn' ? 'MTN MoMo' : 'Airtel Money', " s'affichera. Validez avec votre code secret \u2014 jamais dans l'app."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      justifyContent: 'center',
      fontSize: 11.5,
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement(IC2, {
    name: "shield-check",
    size: 13,
    color: "var(--success-dot)"
  }), "Remboursement automatique si le soignant ne r\xE9pond pas")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      borderTop: '1px solid var(--glass-border)'
    }
  }, /*#__PURE__*/React.createElement(B2, {
    variant: "primary",
    fullWidth: true,
    size: "lg",
    iconLeft: "lock",
    onClick: onPaid
  }, "Payer ", fmtF2(d.price))));
}
window.PatientStepBar = StepBar;
window.PatientHandshake = HandshakeView;
window.PatientPay = PayView;
// SessionView vit désormais dans chat.jsx (messagerie enrichie)
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/patient_mobile/flow.jsx", error: String((e && e.message) || e) }); }

// ui_kits/patient_mobile/onboarding.jsx
try { (() => {
/* ULAMU — App patient : onboarding (M01). Bienvenue → téléphone → OTP →
   profil. Icônes + textes courts : pensé pour la faible littératie. */
const U5 = window.ULAMUDesignSystem_d14300;
const {
  Button: B5,
  IconButton: IB5,
  Badge: BD5,
  Input: IN5,
  Card: C5,
  Icon: IC5,
  Banner: BN5
} = U5;
const LM5 = window.PatientLogoMark;
function StepDots({
  step,
  total = 4
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      gap: 6
    }
  }, Array.from({
    length: total
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: i === step ? 18 : 6,
      height: 6,
      borderRadius: 3,
      background: i <= step ? 'var(--accent-500)' : 'var(--bg-muted)',
      border: i > step ? '1px solid var(--border-default)' : 'none',
      transition: 'width var(--dur-base) ease-out'
    }
  })));
}
function OnbShell({
  step,
  onBack,
  children,
  footer
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "scr"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '14px 16px'
    }
  }, onBack ? /*#__PURE__*/React.createElement(IB5, {
    icon: "arrow-left",
    label: "Retour",
    onClick: onBack
  }) : /*#__PURE__*/React.createElement(LM5, null), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(StepDots, {
    step: step
  })), /*#__PURE__*/React.createElement("div", {
    className: "pad",
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, children), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      borderTop: '1px solid var(--glass-border)'
    }
  }, footer));
}
function OtpBoxes({
  value
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      justifyContent: 'center'
    }
  }, [0, 1, 2, 3].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 52,
      height: 60,
      borderRadius: 'var(--radius-lg)',
      border: `1.5px solid ${value[i] ? 'var(--accent-500)' : 'var(--border-default)'}`,
      background: 'var(--bg-elevated)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: 24,
      fontWeight: 600,
      color: 'var(--text-primary)',
      boxShadow: value[i] ? '0 0 0 3px rgba(39,86,166,0.14)' : 'none'
    }
  }, value[i] || '')));
}
function Onboarding({
  onDone
}) {
  const [step, setStep] = React.useState(0);
  const [phone, setPhone] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [name, setName] = React.useState('');

  /* Démo : le code OTP « arrive » tout seul */
  React.useEffect(() => {
    if (step !== 2) return;
    setOtp('');
    const digits = '4 7 1 9'.split(' ');
    const ids = digits.map((d, i) => setTimeout(() => setOtp(v => v + d), 700 + i * 380));
    return () => ids.forEach(clearTimeout);
  }, [step]);
  if (step === 0) return /*#__PURE__*/React.createElement(OnbShell, {
    step: 0,
    footer: /*#__PURE__*/React.createElement(B5, {
      variant: "primary",
      fullWidth: true,
      size: "lg",
      iconRight: "arrow-right",
      onClick: () => setStep(1)
    }, "Commencer")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(LM5, {
    size: 56
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 26,
      letterSpacing: '-0.7px',
      color: 'var(--text-primary)'
    }
  }, "Bienvenue sur ulamu"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-tertiary)',
      marginTop: 6,
      lineHeight: 1.55
    }
  }, "Se soigner, sans file d'attente,", /*#__PURE__*/React.createElement("br", null), "sans carnet perdu, sans mauvaise surprise.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, [['file-medical', 'Dossier médical gratuit, à vie', 'Chaque soin enrichit votre mémoire médicale'], ['shield-check', 'Payez après la poignée de main', 'Jamais un franc sans l\'accord du soignant'], ['pill', 'Médicaments trouvés et réservés', 'Fini la tournée des pharmacies']].map(([ic, t, s]) => /*#__PURE__*/React.createElement(C5, {
    key: t,
    padding: "13px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.16)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(IC5, {
    name: ic,
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-tertiary)',
      marginTop: 1
    }
  }, s))))))));
  if (step === 1) return /*#__PURE__*/React.createElement(OnbShell, {
    step: 1,
    onBack: () => setStep(0),
    footer: /*#__PURE__*/React.createElement(B5, {
      variant: "primary",
      fullWidth: true,
      size: "lg",
      iconLeft: "send",
      disabled: phone.replace(/\D/g, '').length < 9,
      onClick: () => setStep(2)
    }, "Recevoir mon code")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 21,
      letterSpacing: '-0.5px',
      color: 'var(--text-primary)'
    }
  }, "Votre num\xE9ro de t\xE9l\xE9phone"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-tertiary)',
      marginTop: 5,
      lineHeight: 1.5
    }
  }, "C'est votre seul identifiant. Un code \xE0 4 chiffres vous sera envoy\xE9 par SMS.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '0 12px',
      height: 36,
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-default)',
      background: 'var(--bg-muted)',
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--text-secondary)',
      flexShrink: 0
    }
  }, "+242"), /*#__PURE__*/React.createElement(IN5, {
    leftIcon: "phone",
    placeholder: "06 612 45 90",
    value: phone,
    onChange: e => setPhone(e.target.value),
    type: "tel"
  })), /*#__PURE__*/React.createElement(BN5, {
    tone: "info"
  }, "Aucun mot de passe \xE0 retenir \u2014 votre t\xE9l\xE9phone suffit."));
  if (step === 2) return /*#__PURE__*/React.createElement(OnbShell, {
    step: 2,
    onBack: () => setStep(1),
    footer: /*#__PURE__*/React.createElement(B5, {
      variant: "primary",
      fullWidth: true,
      size: "lg",
      iconLeft: "check",
      disabled: otp.length < 4,
      onClick: () => setStep(3)
    }, "V\xE9rifier")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 18,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 21,
      letterSpacing: '-0.5px',
      color: 'var(--text-primary)'
    }
  }, "Entrez le code re\xE7u"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-tertiary)',
      marginTop: 5
    }
  }, "Envoy\xE9 au ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)'
    }
  }, "+242 ", phone || '06 612 45 90'))), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 10
    }
  }, /*#__PURE__*/React.createElement(OtpBoxes, {
    value: otp
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, otp.length < 4 ? /*#__PURE__*/React.createElement(BD5, {
    tone: "neutral",
    dot: true,
    size: "sm"
  }, "Code en cours de r\xE9ception\u2026") : /*#__PURE__*/React.createElement(BD5, {
    tone: "success",
    icon: "check-circle",
    size: "sm"
  }, "Code re\xE7u automatiquement")), /*#__PURE__*/React.createElement("button", {
    className: "uha",
    style: {
      all: 'unset',
      cursor: 'pointer',
      textAlign: 'center',
      fontSize: 12.5,
      color: 'var(--text-accent)',
      fontWeight: 500
    }
  }, "Renvoyer le code (45 s)"));
  return /*#__PURE__*/React.createElement(OnbShell, {
    step: 3,
    onBack: () => setStep(2),
    footer: /*#__PURE__*/React.createElement(B5, {
      variant: "primary",
      fullWidth: true,
      size: "lg",
      iconRight: "arrow-right",
      disabled: !name.trim(),
      onClick: onDone
    }, "C'est parti")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 21,
      letterSpacing: '-0.5px',
      color: 'var(--text-primary)'
    }
  }, "Comment vous appelez-vous ?"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-tertiary)',
      marginTop: 5,
      lineHeight: 1.5
    }
  }, "Votre nom ouvre votre dossier m\xE9dical \u2014 gratuit, \xE0 vie.")), /*#__PURE__*/React.createElement(IN5, {
    leftIcon: "user",
    placeholder: "Pr\xE9nom et nom",
    value: name,
    onChange: e => setName(e.target.value)
  }), /*#__PURE__*/React.createElement(C5, {
    padding: "13px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--success-dot)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(IC5, {
    name: "shield-check",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)',
      lineHeight: 1.5
    }
  }, "Vos donn\xE9es de sant\xE9 sont chiffr\xE9es. Seuls les soignants que ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text-primary)'
    }
  }, "vous"), " consultez y acc\xE8dent."))));
}
window.PatientOnboarding = Onboarding;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/patient_mobile/onboarding.jsx", error: String((e && e.message) || e) }); }

// ui_kits/patient_mobile/screens.jsx
try { (() => {
/* ULAMU — App patient (mobile) · Accueil + Profil médecin.
   Design dense et hiérarchisé : héro rappel grainé, actions rapides,
   chips de filtres, cartes médecin premium. Icônes SVG uniquement. */
const U = window.ULAMUDesignSystem_d14300;
const {
  Button,
  IconButton,
  Badge,
  Avatar,
  Input,
  Card,
  Icon,
  Banner,
  VerifiedBadge
} = U;
const DOCTORS = [{
  id: 'armel',
  name: 'Dr Armel Konaté',
  spec: 'Médecin généraliste',
  cat: 'general',
  price: 5000,
  follow: 2500,
  dur: 30,
  online: true,
  rating: '4,8',
  reviews: 214,
  zone: 'Moungali',
  resp: '~3 min',
  exp: '12 ans',
  patients: 460,
  bio: "Écoute d'abord, prescrit ensuite. Spécialiste du suivi hypertension et diabète."
}, {
  id: 'solange',
  name: 'Dr Solange Mbemba',
  spec: 'Gynécologue',
  cat: 'gyneco',
  price: 12000,
  follow: 6000,
  dur: 30,
  online: true,
  rating: '4,9',
  reviews: 96,
  zone: 'Centre-ville',
  resp: '~10 min',
  premium: true,
  exp: '15 ans',
  patients: 312,
  bio: 'Santé féminine en toute discrétion. Répond aussi aux questions intimes par messagerie.'
}, {
  id: 'firmin',
  name: 'Dr Firmin Okemba',
  spec: 'Dentiste',
  cat: 'dentiste',
  price: 7000,
  follow: 3500,
  dur: 20,
  online: false,
  rating: '4,6',
  reviews: 58,
  zone: 'Pointe-Noire',
  resp: '—',
  exp: '8 ans',
  patients: 190,
  bio: 'Urgences dentaires et conseils de prévention. Cabinet à Pointe-Noire centre.'
}, {
  id: 'nadege',
  name: 'Nadège Loemba',
  spec: 'Infirmière · triage à domicile',
  cat: 'infirmier',
  price: 2000,
  follow: 2000,
  dur: 15,
  online: true,
  rating: '4,7',
  reviews: 120,
  zone: 'Madingou',
  resp: '~5 min',
  exp: '10 ans',
  patients: 540,
  bio: 'Je me déplace chez vous : constantes, pansements, suivi des traitements.'
}];
const fmtF = n => n.toLocaleString('fr-FR') + ' F';

/* Micro-label de section (pattern charte : mono uppercase + filet) */
function SectionLabel({
  children,
  count
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      margin: '4px 0 2px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)'
    }
  }, children), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--border-subtle)'
    }
  }), count != null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--accent-300)'
    }
  }, count));
}
function GlassHeader({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 16px',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--glass-border)'
    }
  }, children);
}
function LogoMark({
  size = 28
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: 'var(--radius-md)',
      background: 'var(--accent-500)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'var(--grain-btn)'
    }
  }), /*#__PURE__*/React.createElement("svg", {
    width: size * 0.58,
    height: size * 0.58,
    viewBox: "0 0 16 16",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 2C5.8 2 4 3.8 4 6c0 1.4.7 2.6 1.8 3.3L5 12h6l-.8-2.7C11.3 8.6 12 7.4 12 6c0-2.2-1.8-4-4-4z",
    fill: "#fff",
    fillOpacity: ".92"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5.5",
    y: "12.5",
    width: "5",
    height: "1.5",
    rx: ".75",
    fill: "#fff",
    fillOpacity: ".72"
  })));
}

/* Pastille de notification sur une icône */
function BellWithDot({
  onClick
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "bell",
    variant: "solid",
    label: "Notifications",
    onClick: onClick
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 5,
      right: 6,
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'var(--error-dot)',
      border: '2px solid var(--bg-base)'
    }
  }));
}

/* Carte médecin — flux social : bannière, grand avatar, bio, stats, CTA */
function DoctorRow({
  d,
  onClick
}) {
  const initials = d.name.replace('Dr ', '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return /*#__PURE__*/React.createElement("button", {
    className: "uha",
    onClick: onClick,
    style: {
      all: 'unset',
      cursor: 'pointer',
      display: 'block',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "0",
    interactive: true,
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 64,
      background: d.online ? 'var(--accent-500)' : 'var(--bg-muted)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 0.12
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: -8,
      top: -14,
      color: d.online ? 'rgba(255,255,255,0.13)' : 'rgba(127,127,127,0.13)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: d.cat === 'gyneco' ? 'heart-pulse' : d.cat === 'dentiste' ? 'hospital' : d.cat === 'infirmier' ? 'activity' : 'stethoscope',
    size: 88,
    strokeWidth: 1
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 10,
      left: 14
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: d.online ? 'success' : 'neutral',
    dot: true,
    size: "sm",
    style: {
      background: 'var(--bg-elevated)'
    }
  }, d.online ? 'Disponible maintenant' : 'Hors ligne')), d.online && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 10,
      right: 12,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 600,
      color: '#fff',
      background: 'rgba(0,0,0,0.25)',
      borderRadius: 'var(--radius-full)',
      padding: '3px 9px'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "send",
    size: 10
  }), "r\xE9pond en ", d.resp)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginTop: -26
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 58,
      height: 58,
      borderRadius: '50%',
      background: 'var(--accent-600)',
      border: '3px solid var(--bg-elevated)',
      boxShadow: 'var(--shadow-md)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 19,
      color: '#fff'
    }
  }, initials), d.online && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 14,
      height: 14,
      borderRadius: '50%',
      background: 'var(--success-dot)',
      border: '2.5px solid var(--bg-elevated)'
    }
  })), d.premium && /*#__PURE__*/React.createElement(Badge, {
    tone: "warning",
    size: "sm",
    icon: "star",
    style: {
      marginBottom: 6
    }
  }, "Tr\xE8s demand\xE9e")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 16.5,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap'
    }
  }, d.name), /*#__PURE__*/React.createElement(VerifiedBadge, {
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-accent)',
      fontWeight: 600,
      marginTop: 2
    }
  }, d.spec, " \xB7 ", d.zone), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-secondary)',
      lineHeight: 1.55,
      marginTop: 7
    }
  }, d.bio), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      margin: '12px 0 0',
      padding: '10px 0',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, [[d.rating, `${d.reviews} avis`, 'star'], [`${d.patients}+`, 'patients', 'users'], [d.exp, 'expertise', 'shield-check']].map(([v, l, ic], i) => /*#__PURE__*/React.createElement("span", {
    key: l,
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 1,
      borderLeft: i ? '1px solid var(--border-subtle)' : 'none',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 12,
    color: ic === 'star' ? 'var(--warning-dot)' : 'var(--accent-300)'
  }), v), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9.5,
      color: 'var(--text-tertiary)'
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      padding: '2px 0 14px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 34,
      borderRadius: 'var(--radius-md)',
      background: d.online ? 'var(--accent-500)' : 'var(--bg-muted)',
      color: d.online ? '#fff' : 'var(--text-tertiary)',
      border: d.online ? 'none' : '1px solid var(--border-default)',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      position: 'relative',
      overflow: 'hidden'
    }
  }, d.online && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'var(--grain-btn)'
    }
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "stethoscope",
    size: 14
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative'
    }
  }, "Voir le profil")), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-muted)',
      border: '1px solid var(--border-default)',
      color: 'var(--text-secondary)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "share",
    size: 14
  }))))));
}

/* ── ACCUEIL ── */
function HomeView({
  onPick,
  onAction,
  theme,
  onTheme
}) {
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState('tous');
  const [taken, setTaken] = React.useState(false);
  const CHIPS = [['tous', 'Tous'], ['general', 'Généraliste'], ['gyneco', 'Gynécologie'], ['dentiste', 'Dentaire'], ['infirmier', 'Triage']];
  const list = DOCTORS.filter(d => (cat === 'tous' || d.cat === cat) && (d.name + d.spec).toLowerCase().includes(q.toLowerCase()));
  const QUICK = [['stethoscope', 'Consulter', 'un médecin', () => {
    const el = document.getElementById('search-medecin');
    if (el) {
      el.focus();
    }
  }], ['pill', 'Médicaments', 'trouver & réserver', () => onAction('meds')], ['activity', 'Triage', 'à domicile', () => onPick(DOCTORS[3])], ['file-medical', 'Mon dossier', 'à vie, gratuit', () => onAction('dossier')]];
  return /*#__PURE__*/React.createElement("div", {
    className: "scr"
  }, /*#__PURE__*/React.createElement(GlassHeader, null, /*#__PURE__*/React.createElement(LogoMark, null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 17,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)',
      flex: 1
    }
  }, "ulamu"), /*#__PURE__*/React.createElement(window.PatientThemeToggle, {
    theme: theme,
    onTheme: onTheme
  }), /*#__PURE__*/React.createElement(BellWithDot, {
    onClick: () => onAction('notif')
  }), /*#__PURE__*/React.createElement(Avatar, {
    name: "Mireille Nkounkou",
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    className: "pad",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-tertiary)'
    }
  }, "Bonsoir,"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 24,
      letterSpacing: '-0.6px',
      color: 'var(--text-primary)',
      lineHeight: 1.15
    }
  }, "Mireille Nkounkou"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      color: 'var(--text-tertiary)',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "map-pin",
    size: 12
  }), "Talanga\xEF, Brazzaville")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 'var(--radius-xl)',
      background: taken ? 'var(--bg-elevated)' : 'var(--accent-500)',
      border: taken ? '1px solid var(--success-border)' : 'none',
      padding: 16,
      boxShadow: 'var(--shadow-md)',
      transition: 'background var(--dur-moderate) linear'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: taken ? 0.04 : 0.1,
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 42,
      height: 42,
      borderRadius: 'var(--radius-lg)',
      background: taken ? 'var(--success-bg)' : 'rgba(255,255,255,0.16)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      color: taken ? 'var(--success-dot)' : '#fff'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: taken ? 'check-circle' : 'pill',
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9.5,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: taken ? 'var(--text-tertiary)' : 'rgba(255,255,255,0.66)'
    }
  }, "Rappel de m\xE9dicament"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 15.5,
      color: taken ? 'var(--text-primary)' : '#fff',
      marginTop: 2
    }
  }, "Amlodipine 5 mg"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      color: taken ? 'var(--success-text)' : 'rgba(255,255,255,0.82)',
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: taken ? 'check' : 'clock',
    size: 12
  }), taken ? 'Pris ce soir — prochain rappel demain 20:00' : 'Ce soir, 20:00')), !taken && /*#__PURE__*/React.createElement("button", {
    className: "uha",
    onClick: () => setTaken(true),
    style: {
      all: 'unset',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: 'rgba(255,255,255,0.14)',
      border: '1px solid rgba(255,255,255,0.28)',
      borderRadius: 'var(--radius-md)',
      padding: '7px 11px',
      color: '#fff',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12,
    strokeWidth: 2.2
  }), "Pris"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr 1fr',
      gap: 8
    }
  }, QUICK.map(([ic, t, s, fn]) => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: "uha",
    onClick: fn,
    style: {
      all: 'unset',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "11px 6px",
    interactive: true,
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      margin: '0 auto 7px',
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.16)',
      color: 'var(--accent-300)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 11.5,
      color: 'var(--text-primary)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9.5,
      color: 'var(--text-tertiary)',
      marginTop: 1
    }
  }, s))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Input, {
    id: "search-medecin",
    leftIcon: "search",
    placeholder: "Sp\xE9cialit\xE9, nom du m\xE9decin\u2026",
    value: q,
    onChange: e => setQ(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      overflowX: 'auto',
      paddingBottom: 2,
      marginRight: -16
    },
    className: "chips"
  }, CHIPS.map(([id, l]) => {
    const on = cat === id;
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      className: "uha",
      onClick: () => setCat(id),
      style: {
        all: 'unset',
        cursor: 'pointer',
        flexShrink: 0,
        padding: '6px 13px',
        borderRadius: 'var(--radius-full)',
        fontFamily: 'var(--font-body)',
        fontSize: 12.5,
        fontWeight: on ? 600 : 500,
        background: on ? 'var(--accent-500)' : 'var(--bg-muted)',
        color: on ? '#fff' : 'var(--text-secondary)',
        border: `1px solid ${on ? 'var(--accent-500)' : 'var(--border-default)'}`,
        transition: 'background var(--dur-fast) linear, color var(--dur-fast) linear'
      }
    }, l);
  }))), /*#__PURE__*/React.createElement(SectionLabel, {
    count: list.length
  }, "Disponibles maintenant"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      paddingTop: 4
    }
  }, list.map(d => /*#__PURE__*/React.createElement(DoctorRow, {
    key: d.id,
    d: d,
    onClick: () => onPick(d)
  })), list.length === 0 && /*#__PURE__*/React.createElement(Card, {
    padding: "26px",
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-tertiary)',
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 24,
    strokeWidth: 1.4
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, "Aucun soignant ne correspond.")))));
}

/* ── PROFIL MÉDECIN ── */
function DoctorView({
  d,
  onBack,
  onInitiate
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "scr"
  }, /*#__PURE__*/React.createElement(GlassHeader, null, /*#__PURE__*/React.createElement(IconButton, {
    icon: "arrow-left",
    label: "Retour",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)',
      flex: 1
    }
  }, "Profil du soignant"), /*#__PURE__*/React.createElement(IconButton, {
    icon: "share",
    label: "Partager"
  })), /*#__PURE__*/React.createElement("div", {
    className: "pad",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      paddingBottom: 90
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: d.name,
    status: d.online ? 'online' : undefined,
    size: "xl"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 18,
      letterSpacing: '-0.4px',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, d.name), /*#__PURE__*/React.createElement(VerifiedBadge, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, d.spec), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: d.online ? 'success' : 'neutral',
    dot: true,
    size: "sm"
  }, d.online ? 'En ligne' : 'Hors ligne'), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral",
    size: "sm",
    icon: "map-pin"
  }, d.zone)))), /*#__PURE__*/React.createElement(Card, {
    padding: "0"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr'
    }
  }, [['star', d.rating, `${d.reviews} avis`], ['clock', `${d.dur} min`, 'par session'], ['send', d.resp, 'réponse']].map(([ic, v, l], i) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      padding: '14px 8px',
      textAlign: 'center',
      borderLeft: i ? '1px solid var(--border-subtle)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent-300)',
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 16,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)'
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, l))))), /*#__PURE__*/React.createElement(SectionLabel, null, "Tarifs"), /*#__PURE__*/React.createElement(Card, {
    padding: "4px 14px"
  }, [['stethoscope', 'Consultation', `${d.dur} min · messagerie`, fmtF(d.price)], ['refresh', 'Session de suivi', 'tarif réduit', fmtF(d.follow)], ['ordonnance', 'Ordonnance signée', 'incluse', 'Gratuit']].map(([ic, t, s, p], i) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      padding: '11px 0',
      borderTop: i ? '1px solid var(--border-subtle)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-tertiary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-tertiary)'
    }
  }, s)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 14,
      color: p === 'Gratuit' ? 'var(--success-text)' : 'var(--text-primary)'
    }
  }, p)))), /*#__PURE__*/React.createElement(SectionLabel, null, "Avant la session"), /*#__PURE__*/React.createElement(Card, {
    padding: "14px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.16)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-medical",
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, "Pr\xE9-consultation gratuite"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-secondary)',
      lineHeight: 1.5,
      marginTop: 3
    }
  }, "D\xE9crivez votre motif en quelques questions. ", d.name.split(' ').slice(0, 2).join(' '), " le lira d\xE8s la poign\xE9e de main.")))), /*#__PURE__*/React.createElement(Banner, {
    tone: "info",
    title: "Poign\xE9e de main avant paiement"
  }, "Aucun franc n'est d\xE9bit\xE9 tant que le soignant n'a pas confirm\xE9 \xEAtre pr\xEAt. Remboursement automatique en cas de d\xE9faillance.")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 14,
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderTop: '1px solid var(--glass-border)',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 19,
      letterSpacing: '-0.4px',
      color: 'var(--text-primary)'
    }
  }, fmtF(d.price)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: 'var(--text-tertiary)'
    }
  }, "d\xE9bit\xE9 apr\xE8s la poign\xE9e de main")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconLeft: "stethoscope",
    disabled: !d.online,
    onClick: onInitiate
  }, d.online ? 'Initier la consultation' : 'Hors ligne')));
}
window.PatientGlassHeader = GlassHeader;
window.PatientSectionLabel = SectionLabel;
window.PatientLogoMark = LogoMark;
window.PatientHome = HomeView;
window.PatientDoctor = DoctorView;
window.PATIENT_DOCTORS = DOCTORS;
window.patientFmtF = fmtF;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/patient_mobile/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/patient_mobile/screens2.jsx
try { (() => {
/* ULAMU — App patient : écrans secondaires. Dévoilement-réservation
   (signature), QR d'ordonnance, dossier médical, notifications, thème. */
const U4 = window.ULAMUDesignSystem_d14300;
const {
  Button: B4,
  IconButton: IB4,
  Badge: BD4,
  Avatar: AV4,
  Input: IN4,
  Card: C4,
  Icon: IC4,
  Banner: BN4
} = U4;
const GH4 = window.PatientGlassHeader;
const SL4 = window.PatientSectionLabel;

/* Bascule de thème — SVG inline (soleil/lune, style charte) */
function ThemeToggle({
  theme,
  onTheme
}) {
  const dark = theme === 'dark';
  return /*#__PURE__*/React.createElement("button", {
    className: "uha",
    onClick: onTheme,
    title: dark ? 'Passer en clair' : 'Passer en sombre',
    "aria-label": "Changer de th\xE8me",
    style: {
      all: 'unset',
      cursor: 'pointer',
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-md)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-muted)',
      border: '1px solid var(--border-default)',
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, dark ? /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "8",
    cy: "8",
    r: "3.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
  })) : /*#__PURE__*/React.createElement("path", {
    d: "M13.5 10A5.5 5.5 0 0 1 6 2.5a.5.5 0 0 0-.6-.6A6.5 6.5 0 1 0 14.1 10.6a.5.5 0 0 0-.6-.6z"
  })));
}

/* ── Dévoilement-réservation (modèle signature D-009) ── */
function MedsScreen({
  onBack,
  onShowQR
}) {
  const [state, setState] = React.useState('anonymous'); // anonymous → revealed
  return /*#__PURE__*/React.createElement("div", {
    className: "scr"
  }, /*#__PURE__*/React.createElement(GH4, null, /*#__PURE__*/React.createElement(IB4, {
    icon: "arrow-left",
    label: "Retour",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)',
      flex: 1
    }
  }, "Trouver un m\xE9dicament")), /*#__PURE__*/React.createElement("div", {
    className: "pad",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "uha",
    onClick: onShowQR,
    style: {
      all: 'unset',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(C4, {
    padding: "13px",
    interactive: true,
    style: {
      borderColor: 'rgba(111,146,218,0.35)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.16)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(IC4, {
    name: "ordonnance",
    size: 19
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, "Rechercher avec mon ordonnance"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, "ORD-2026-00412 \xB7 2 m\xE9dicaments")), /*#__PURE__*/React.createElement(IC4, {
    name: "chevron-right",
    size: 15,
    color: "var(--text-tertiary)"
  })))), /*#__PURE__*/React.createElement(IN4, {
    leftIcon: "search",
    placeholder: "Ou taper un m\xE9dicament\u2026",
    defaultValue: "Amlodipine 5 mg"
  }), /*#__PURE__*/React.createElement(SL4, null, "Disponibilit\xE9 \u2014 Talanga\xEF"), /*#__PURE__*/React.createElement(C4, {
    padding: "15px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 'var(--radius-md)',
      background: 'var(--success-bg)',
      color: 'var(--success-dot)',
      border: '1px solid var(--success-border)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(IC4, {
    name: "pill",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 14.5,
      color: 'var(--text-primary)'
    }
  }, "3 pharmacies ont vos 2 m\xE9dicaments"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, "Information anonyme et gratuite \xB7 arrondissement Talanga\xEF"))), state === 'anonymous' ? /*#__PURE__*/React.createElement(React.Fragment, null, [1, 2, 3].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 0',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-muted)',
      color: 'var(--text-disabled)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(IC4, {
    name: "lock",
    size: 13
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      height: 9,
      width: 110 + i * 14,
      borderRadius: 4,
      background: 'var(--bg-muted)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      height: 7,
      width: 70 + i * 8,
      borderRadius: 4,
      background: 'var(--bg-muted)',
      marginTop: 5,
      opacity: 0.7
    }
  })), /*#__PURE__*/React.createElement(BD4, {
    tone: "neutral",
    size: "sm"
  }, "En stock"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(B4, {
    variant: "primary",
    fullWidth: true,
    iconLeft: "eye",
    onClick: () => setState('revealed')
  }, "D\xE9voiler & r\xE9server \xB7 500 F"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginTop: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(IC4, {
    name: "shield-check",
    size: 12,
    color: "var(--success-dot)"
  }), "Disponibilit\xE9 garantie ou rembours\xE9"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 0',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.16)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(IC4, {
    name: "hospital",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, "Pharmacie du March\xE9"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 11.5,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement(IC4, {
    name: "map-pin",
    size: 11
  }), "Av. de la Paix, Poto-Poto \xB7 \xE0 12 min")), /*#__PURE__*/React.createElement(BD4, {
    tone: "success",
    dot: true
  }, "R\xE9serv\xE9")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 12
    }
  }, [['Amlodipine 5 mg', '2 400 F'], ['Ramipril 10 mg', '3 100 F']].map(([m, p]) => /*#__PURE__*/React.createElement("span", {
    key: m,
    style: {
      flex: 1,
      padding: '8px 10px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-subtle)',
      border: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 11.5,
      fontWeight: 600,
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-body)'
    }
  }, m), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, p))))), /*#__PURE__*/React.createElement(BN4, {
    tone: "info",
    title: "R\xE9servation valable 23 h 54"
  }, "Pr\xE9sentez le QR de votre ordonnance \xE0 la pharmacie. Le stock est bloqu\xE9 pour vous."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(B4, {
    variant: "primary",
    fullWidth: true,
    iconLeft: "qr-code",
    onClick: onShowQR
  }, "Afficher le QR de d\xE9livrance"))))));
}

/* ── QR d'ordonnance — lisible en plein soleil : fond blanc forcé ── */
function QRScreen({
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "scr"
  }, /*#__PURE__*/React.createElement(GH4, null, /*#__PURE__*/React.createElement(IB4, {
    icon: "arrow-left",
    label: "Retour",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)',
      flex: 1
    }
  }, "Ordonnance"), /*#__PURE__*/React.createElement(IB4, {
    icon: "download",
    label: "T\xE9l\xE9charger"
  })), /*#__PURE__*/React.createElement("div", {
    className: "pad",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#FFFFFF',
      borderRadius: 'var(--radius-xl)',
      padding: '26px 20px',
      textAlign: 'center',
      boxShadow: 'var(--shadow-md)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "148",
    height: "148",
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "#111112",
    strokeWidth: "1.1",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      margin: '0 auto',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: "1.5",
    y: "1.5",
    width: "5",
    height: "5",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.5",
    y: "1.5",
    width: "5",
    height: "5",
    rx: "1"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1.5",
    y: "9.5",
    width: "5",
    height: "5",
    rx: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9.5 9.5h2v2M14.5 9.5v5M11.5 13.5h3"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3.2",
    y: "3.2",
    width: "1.6",
    height: "1.6",
    fill: "#111112",
    stroke: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "11.2",
    y: "3.2",
    width: "1.6",
    height: "1.6",
    fill: "#111112",
    stroke: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3.2",
    y: "11.2",
    width: "1.6",
    height: "1.6",
    fill: "#111112",
    stroke: "none"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      fontWeight: 600,
      color: '#111112',
      marginTop: 14,
      letterSpacing: '0.04em'
    }
  }, "ORD-2026-00412"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 11,
      color: '#71717A',
      marginTop: 3
    }
  }, "\xC0 pr\xE9senter en pharmacie \xB7 luminosit\xE9 au maximum")), /*#__PURE__*/React.createElement(C4, {
    padding: "4px 14px"
  }, [['pill', 'Amlodipine 5 mg', '1 cp / jour, le matin · 30 jours'], ['pill', 'Ramipril 10 mg', '1 cp / jour, le soir · 30 jours']].map(([ic, m, p], i) => /*#__PURE__*/React.createElement("div", {
    key: m,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      padding: '11px 0',
      borderTop: i ? '1px solid var(--border-subtle)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent-300)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(IC4, {
    name: ic,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, m), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-tertiary)'
    }
  }, p))))), /*#__PURE__*/React.createElement(C4, {
    padding: "13px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(AV4, {
    name: "Armel Konat\xE9",
    size: "sm"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      fontWeight: 600,
      fontFamily: 'var(--font-body)',
      color: 'var(--text-primary)'
    }
  }, "Sign\xE9e par Dr Armel Konat\xE9"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, "11 juin 2026 \xB7 valable 30 jours")), /*#__PURE__*/React.createElement(BD4, {
    tone: "accent",
    icon: "shield-check"
  }, "Authentique")))));
}

/* ── Dossier médical à vie ── */
function DossierScreen({
  onBack
}) {
  const ENTRIES = [['consultation', 'Consultation — Dr Armel Konaté', 'Douleurs thoraciques · compte-rendu versé', '11 juin 2026'], ['ordonnance', 'Ordonnance ORD-2026-00412', 'Amlodipine · Ramipril', '11 juin 2026'], ['activity', 'Triage — Nadège Loemba', 'Tension 13/8 · pouls 78', '8 mars 2026'], ['pill', 'Délivrance — Pharmacie du Marché', '2 médicaments · scan QR', '14 mars 2026'], ['file-medical', 'Ouverture du dossier', 'Gratuit, à vie', '2 juin 2025']];
  return /*#__PURE__*/React.createElement("div", {
    className: "scr"
  }, /*#__PURE__*/React.createElement(GH4, null, /*#__PURE__*/React.createElement(IB4, {
    icon: "arrow-left",
    label: "Retour",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)',
      flex: 1
    }
  }, "Dossier m\xE9dical"), /*#__PURE__*/React.createElement(BD4, {
    tone: "success",
    icon: "lock",
    size: "sm"
  }, "Chiffr\xE9")), /*#__PURE__*/React.createElement("div", {
    className: "pad",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(BN4, {
    tone: "error",
    title: "Allergie : p\xE9nicilline"
  }, "Visible par tout soignant en session \u2014 garde-fou actif \xE0 la prescription."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8
    }
  }, [['activity', '13/8', 'tension'], ['heart-pulse', '78', 'bpm'], ['users', 'O+', 'groupe']].map(([ic, v, l]) => /*#__PURE__*/React.createElement(C4, {
    key: l,
    padding: "10px 6px",
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent-300)',
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement(IC4, {
    name: ic,
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 600,
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9.5,
      color: 'var(--text-tertiary)'
    }
  }, l)))), /*#__PURE__*/React.createElement(SL4, null, "Historique"), /*#__PURE__*/React.createElement(C4, {
    padding: "4px 14px"
  }, ENTRIES.map(([ic, t, s, dte], i) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: 'flex',
      gap: 11,
      padding: '12px 0',
      borderTop: i ? '1px solid var(--border-subtle)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: 'rgba(39,86,166,0.16)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(IC4, {
    name: ic,
    size: 13
  })), i < ENTRIES.length - 1 && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      flex: 1,
      minHeight: 10,
      background: 'var(--border-subtle)',
      marginTop: 4
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      color: 'var(--text-primary)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-tertiary)',
      marginTop: 1
    }
  }, s), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9.5,
      color: 'var(--text-disabled)',
      marginTop: 3
    }
  }, dte)))))));
}

/* ── Notifications ── */
function NotifScreen({
  onBack
}) {
  const ITEMS = [['stethoscope', 'Dr Armel Konaté a confirmé', 'Votre poignée de main est acceptée — vous pouvez régler.', 'il y a 2 min', true], ['pill', 'Rappel — Amlodipine 5 mg', 'À prendre ce soir à 20:00.', 'il y a 1 h', true], ['clock', 'Réservation bientôt expirée', 'Pharmacie du Marché · plus que 6 h pour retirer.', 'il y a 3 h', false], ['ordonnance', 'Ordonnance disponible', 'ORD-2026-00412 signée et versée au dossier.', 'hier', false]];
  return /*#__PURE__*/React.createElement("div", {
    className: "scr"
  }, /*#__PURE__*/React.createElement(GH4, null, /*#__PURE__*/React.createElement(IB4, {
    icon: "arrow-left",
    label: "Retour",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)',
      flex: 1
    }
  }, "Notifications"), /*#__PURE__*/React.createElement(B4, {
    variant: "ghost",
    size: "sm"
  }, "Tout lire")), /*#__PURE__*/React.createElement("div", {
    className: "pad",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, ITEMS.map(([ic, t, s, when, unread], i) => /*#__PURE__*/React.createElement(C4, {
    key: i,
    padding: "13px",
    interactive: true,
    style: {
      borderColor: unread ? 'rgba(111,146,218,0.3)' : undefined
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.16)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(IC4, {
    name: ic,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      color: 'var(--text-primary)',
      flex: 1
    }
  }, t), unread && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'var(--accent-400)',
      flexShrink: 0
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)',
      lineHeight: 1.45,
      marginTop: 2
    }
  }, s), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9.5,
      color: 'var(--text-disabled)',
      marginTop: 4
    }
  }, when))))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      fontSize: 11,
      color: 'var(--text-tertiary)',
      padding: '6px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(IC4, {
    name: "lock",
    size: 11
  }), "Jamais de contenu m\xE9dical sur l'\xE9cran verrouill\xE9")));
}
window.PatientThemeToggle = ThemeToggle;
window.PatientMeds = MedsScreen;
window.PatientQR = QRScreen;
window.PatientDossier = DossierScreen;
window.PatientNotifs = NotifScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/patient_mobile/screens2.jsx", error: String((e && e.message) || e) }); }

// ui_kits/patient_mobile/session.jsx
try { (() => {
/* ULAMU — SessionView (mobile) : fil de consultation chronométrée.
   Assemble les composants de chat.jsx. Remplace l'ancienne vue de flow.jsx. */
const US = window.ULAMUDesignSystem_d14300;
const {
  IconButton: SIB2,
  Badge: SBD2,
  Avatar: SAV2,
  Card: SC2,
  Icon: SIC2,
  SessionTimer: SST2,
  Button: SB2
} = US;
const {
  LIc: XLIc,
  Receipt: XReceipt,
  VoicePlayer: XVoice,
  Recorder: XRec,
  MediaAlbum: XAlbum,
  MediaViewer: XViewer,
  PreviewOverlay: XPreview,
  ActionSheet: XSheet,
  nowHM: xNow,
  fmtMS: xMS,
  genWave: xWave
} = window.UChatParts;
let _mid = 100;
const SEED_MSGS = d => [{
  id: 1,
  who: 'doc',
  kind: 'text',
  t: 'Bonsoir Mireille, j\'ai lu votre pré-consultation. Depuis quand ressentez-vous ces douleurs ?',
  time: '19:42'
}, {
  id: 2,
  who: 'me',
  kind: 'text',
  t: 'Bonsoir docteur. Depuis trois semaines, surtout le soir après le marché.',
  time: '19:43',
  status: 'lu',
  readAt: '19:44'
}, {
  id: 3,
  who: 'doc',
  kind: 'voice',
  dur: 38,
  wave: xWave(36),
  time: '19:44'
}, {
  id: 4,
  who: 'me',
  kind: 'text',
  t: 'Non, pas de fièvre. Juste une fatigue inhabituelle.',
  time: '19:45',
  status: 'lu',
  readAt: '19:46',
  replyTo: {
    who: 'doc',
    name: d.name.split(' ').slice(0, 2).join(' '),
    text: 'Note vocale · 0:38'
  }
}, {
  id: 5,
  who: 'doc',
  kind: 'ordo',
  time: '19:51'
}];
function SessionView({
  d,
  onBack,
  onEnd,
  onShowQR,
  onReserve
}) {
  const docName = d.name.split(' ').slice(0, 2).join(' ');
  const [sec, setSec] = React.useState(d.dur * 60 - 64);
  const [msgs, setMsgs] = React.useState(() => SEED_MSGS(d));
  const [draft, setDraft] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const [replyTo, setReplyTo] = React.useState(null);
  const [editing, setEditing] = React.useState(null); // {id, text}
  const [sheet, setSheet] = React.useState(null); // {id, step}
  const [recording, setRecording] = React.useState(false);
  const [attachOpen, setAttachOpen] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const [viewer, setViewer] = React.useState(false);
  const [showDown, setShowDown] = React.useState(false);
  const boxRef = React.useRef(null);
  const refsMap = React.useRef({});
  const taRef = React.useRef(null);
  React.useEffect(() => {
    const id = setInterval(() => setSec(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const toBottom = () => {
    const b = boxRef.current;
    if (b) b.scrollTo({
      top: b.scrollHeight
    });
  };
  React.useEffect(() => {
    toBottom();
  }, [msgs.length, typing]);
  const patch = (id, p) => setMsgs(ms => ms.map(m => m.id === id ? {
    ...m,
    ...p
  } : m));

  /* Cycle d'accusés simulé : pending → sent → remis → lu */
  const lifecycle = id => {
    setTimeout(() => patch(id, {
      status: 'sent'
    }), 450);
    setTimeout(() => patch(id, {
      status: 'remis'
    }), 1500);
    setTimeout(() => patch(id, {
      status: 'lu',
      readAt: xNow()
    }), 3200);
  };
  const pushMine = m => {
    const id = ++_mid;
    setMsgs(ms => [...ms, {
      id,
      who: 'me',
      time: xNow(),
      status: 'pending',
      ...m
    }]);
    lifecycle(id);
    return id;
  };
  const docReply = (text, delay = 1900) => {
    setTimeout(() => setTyping(true), delay - 1300);
    setTimeout(() => {
      setTyping(false);
      setMsgs(ms => [...ms, {
        id: ++_mid,
        who: 'doc',
        kind: 'text',
        t: text,
        time: xNow()
      }]);
    }, delay);
  };
  const send = () => {
    const t = draft.trim();
    if (!t) return;
    if (editing) {
      patch(editing.id, {
        t,
        edited: true
      });
      setEditing(null);
      setDraft('');
      return;
    }
    pushMine({
      kind: 'text',
      t,
      replyTo
    });
    setDraft('');
    setReplyTo(null);
    if (taRef.current) taRef.current.style.height = '38px';
    docReply('Très bien, je note. Suivez la posologie et revoyons-nous dans 30 jours en session de suivi.');
  };
  const onSheetAction = act => {
    const m = msgs.find(x => x.id === sheet.id);
    if (act === 'close') return setSheet(null);
    if (act === 'delete') return setSheet({
      ...sheet,
      step: 'delete'
    });
    if (act === 'delete-me') {
      setMsgs(ms => ms.filter(x => x.id !== m.id));
      return setSheet(null);
    }
    if (act === 'delete-all') {
      patch(m.id, {
        deleted: true
      });
      return setSheet(null);
    }
    if (act === 'reply') {
      setReplyTo({
        who: m.who,
        name: m.who === 'me' ? 'Vous' : docName,
        text: m.kind === 'voice' ? `Note vocale · ${xMS(m.dur)}` : m.kind === 'album' ? 'Photos' : (m.t || '').slice(0, 120)
      });
      return setSheet(null);
    }
    if (act === 'copy') {
      try {
        navigator.clipboard && navigator.clipboard.writeText(m.t || '');
      } catch (e) {}
      return setSheet(null);
    }
    if (act === 'edit') {
      setEditing({
        id: m.id
      });
      setDraft(m.t || '');
      setReplyTo(null);
      return setSheet(null);
    }
  };
  const scrollToMsg = mid => {
    const el = refsMap.current[mid];
    const b = boxRef.current;
    if (el && b) b.scrollTo({
      top: Math.max(0, el.offsetTop - 70),
      behavior: 'smooth'
    });
  };
  const onScroll = () => {
    const b = boxRef.current;
    if (!b) return;
    setShowDown(b.scrollHeight - b.scrollTop - b.clientHeight > 220);
  };

  /* ── Rendu d'une bulle ── */
  const renderMsg = (m, i) => {
    const prev = msgs[i - 1];
    const grouped = prev && prev.who === m.who;
    const mine = m.who === 'me';
    const lastMine = mine && !msgs.slice(i + 1).some(x => x.who === 'me');
    if (m.deleted) return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      ref: el => refsMap.current[m.id] = el,
      style: {
        display: 'flex',
        justifyContent: mine ? 'flex-end' : 'flex-start',
        marginTop: grouped ? 2 : 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 12px',
        borderRadius: 12,
        border: '1px dashed var(--border-default)',
        color: 'var(--text-disabled)',
        fontSize: 12,
        fontStyle: 'italic'
      }
    }, /*#__PURE__*/React.createElement(SIC2, {
      name: "eye-off",
      size: 12
    }), "Message supprim\xE9"));
    if (m.kind === 'ordo') return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      ref: el => refsMap.current[m.id] = el,
      style: {
        display: 'flex',
        justifyContent: 'flex-start',
        marginTop: grouped ? 2 : 10
      }
    }, /*#__PURE__*/React.createElement(SC2, {
      padding: "13px",
      style: {
        borderColor: 'rgba(111,146,218,0.35)',
        minWidth: 225,
        maxWidth: '84%'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 11,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 38,
        height: 38,
        borderRadius: 'var(--radius-md)',
        background: 'rgba(39,86,166,0.16)',
        color: 'var(--accent-300)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(SIC2, {
      name: "ordonnance",
      size: 19
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 13,
        color: 'var(--text-primary)'
      }
    }, "Ordonnance sign\xE9e"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 10.5,
        color: 'var(--text-tertiary)',
        marginTop: 1
      }
    }, "ORD-2026-00412 \xB7 2 m\xE9dicaments"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        marginTop: 11
      }
    }, /*#__PURE__*/React.createElement(SB2, {
      variant: "primary",
      size: "sm",
      iconLeft: "qr-code",
      style: {
        flex: 1
      },
      onClick: onShowQR
    }, "Voir le QR"), /*#__PURE__*/React.createElement(SB2, {
      variant: "ghost",
      size: "sm",
      iconLeft: "pill",
      style: {
        flex: 1
      },
      onClick: onReserve
    }, "R\xE9server"))));
    const bubbleBg = mine ? 'var(--accent-500)' : 'var(--bg-elevated)';
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      ref: el => refsMap.current[m.id] = el,
      style: {
        display: 'flex',
        justifyContent: mine ? 'flex-end' : 'flex-start',
        marginTop: grouped ? 2 : 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        maxWidth: '82%',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        opacity: m.status === 'pending' ? 0.75 : 1,
        transition: 'opacity var(--dur-base) linear'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        padding: m.kind === 'album' ? '5px 5px 7px' : '8px 12px',
        borderRadius: 12,
        borderBottomRightRadius: mine ? 3 : 12,
        borderBottomLeftRadius: mine ? 12 : 3,
        background: bubbleBg,
        color: mine ? '#fff' : 'var(--text-primary)',
        border: mine ? 'none' : '1px solid var(--border-subtle)',
        boxShadow: mine ? 'none' : '0 1px 1px rgba(0,0,0,0.04)'
      }
    }, m.replyTo && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const orig = msgs.find(x => (x.t || '').startsWith((m.replyTo.text || '').slice(0, 24)) && x.id !== m.id);
        if (orig) scrollToMsg(orig.id);
      },
      style: {
        display: 'flex',
        alignItems: 'stretch',
        gap: 8,
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        margin: '0 0 6px',
        padding: '5px 8px',
        borderRadius: 6,
        border: 'none',
        background: mine ? 'rgba(255,255,255,0.16)' : 'var(--bg-muted)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 3,
        borderRadius: 2,
        background: mine ? 'rgba(255,255,255,0.6)' : 'var(--accent-400)',
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 10.5,
        fontWeight: 700,
        color: mine ? '#fff' : 'var(--text-accent)'
      }
    }, m.replyTo.name), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 11,
        opacity: 0.85,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 200,
        color: mine ? '#fff' : 'var(--text-secondary)'
      }
    }, m.replyTo.text))), m.kind === 'voice' ? /*#__PURE__*/React.createElement(XVoice, {
      wave: m.wave,
      dur: m.dur,
      mine: mine
    }) : m.kind === 'album' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(XAlbum, {
      count: m.count,
      onOpen: () => setViewer(true)
    }), m.t && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        lineHeight: 1.45,
        padding: '6px 6px 0',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }
    }, m.t)) : /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        lineHeight: 1.45,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }
    }, m.t), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 5,
        height: 14,
        marginTop: 3,
        padding: m.kind === 'album' ? '0 6px' : 0
      }
    }, m.edited && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9.5,
        fontStyle: 'italic',
        color: mine ? 'rgba(255,255,255,0.7)' : 'var(--text-disabled)'
      }
    }, "modifi\xE9 \xB7"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: mine ? 'rgba(255,255,255,0.75)' : 'var(--text-disabled)'
      }
    }, m.time), mine && /*#__PURE__*/React.createElement(XReceipt, {
      status: m.status
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => setSheet({
        id: m.id,
        step: 'main'
      }),
      "aria-label": "Options du message",
      style: {
        position: 'absolute',
        top: 2,
        right: 4,
        width: 22,
        height: 18,
        border: 'none',
        cursor: 'pointer',
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: mine ? 'rgba(255,255,255,0.18)' : 'var(--bg-muted)',
        color: mine ? 'rgba(255,255,255,0.95)' : 'var(--text-secondary)',
        opacity: 0.85
      }
    }, /*#__PURE__*/React.createElement(SIC2, {
      name: "chevron-down",
      size: 12
    }))), lastMine && m.status && m.status !== 'pending' && /*#__PURE__*/React.createElement("span", {
      style: {
        alignSelf: 'flex-end',
        fontSize: 9.5,
        color: m.status === 'lu' ? 'var(--text-accent)' : 'var(--text-tertiary)',
        paddingRight: 2
      }
    }, m.status === 'lu' ? `Lu à ${m.readAt || m.time}` : m.status === 'remis' ? 'Remis' : 'Envoyé')));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "scr",
    style: {
      position: 'relative',
      height: '100%',
      minHeight: 0,
      maxHeight: '100%',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '9px 12px',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--glass-border)'
    }
  }, /*#__PURE__*/React.createElement(SIB2, {
    icon: "arrow-left",
    label: "Retour",
    onClick: onBack
  }), /*#__PURE__*/React.createElement(SAV2, {
    name: d.name,
    size: "sm",
    status: "online"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 13.5,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, d.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 10.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--success-text)',
      fontWeight: 600
    }
  }, "\u25CF en ligne"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-tertiary)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement(SIC2, {
    name: "lock",
    size: 9
  }), "chiffr\xE9"))), /*#__PURE__*/React.createElement(SST2, {
    seconds: sec,
    warnBelow: 120,
    onExtend: () => setSec(s => s + 300)
  })), /*#__PURE__*/React.createElement("div", {
    ref: boxRef,
    onScroll: onScroll,
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '12px 14px 16px',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 4,
      zIndex: 3,
      textAlign: 'center',
      margin: '2px 0 8px',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      fontSize: 10.5,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      background: 'var(--bg-overlay)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      padding: '4px 12px',
      borderRadius: 9999,
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
    }
  }, "Aujourd'hui")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9.5,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--text-disabled)',
      background: 'var(--bg-muted)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 9999,
      padding: '3px 10px'
    }
  }, "Session ouverte \xB7 19:42 \xB7 ", d.dur, " min")), msgs.map(renderMsg), typing && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-start',
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      gap: 4,
      padding: '11px 14px',
      borderRadius: 12,
      borderBottomLeftRadius: 3,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes udot2{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}'), [0, 1, 2].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'var(--text-tertiary)',
      animation: `udot2 1.1s ${i * 0.18}s infinite`
    }
  }))))), showDown && /*#__PURE__*/React.createElement("button", {
    onClick: toBottom,
    "aria-label": "Descendre",
    style: {
      position: 'absolute',
      right: 14,
      bottom: replyTo || editing ? 148 : 112,
      zIndex: 5,
      width: 36,
      height: 36,
      borderRadius: '50%',
      border: '1px solid var(--border-default)',
      cursor: 'pointer',
      background: 'var(--bg-elevated)',
      color: 'var(--text-secondary)',
      boxShadow: 'var(--shadow-lg)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(SIC2, {
    name: "chevron-down",
    size: 16
  })), (replyTo || editing) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '7px 12px',
      borderTop: '1px solid var(--glass-border)',
      background: 'var(--bg-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 3,
      alignSelf: 'stretch',
      borderRadius: 2,
      background: 'var(--accent-400)',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 10.5,
      fontWeight: 700,
      color: 'var(--text-accent)'
    }
  }, editing ? 'Modifier le message' : `Répondre à ${replyTo.name}`), replyTo && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 11,
      color: 'var(--text-tertiary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, replyTo.text)), /*#__PURE__*/React.createElement(SIB2, {
    icon: "x",
    size: "sm",
    label: "Annuler",
    onClick: () => {
      setReplyTo(null);
      setEditing(null);
      setDraft('');
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 6,
      padding: '8px 10px',
      borderTop: replyTo || editing ? 'none' : '1px solid var(--glass-border)',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      position: 'relative'
    }
  }, recording ? /*#__PURE__*/React.createElement(XRec, {
    onCancel: () => setRecording(false),
    onSend: s => {
      setRecording(false);
      pushMine({
        kind: 'voice',
        dur: Math.max(1, s),
        wave: xWave(36)
      });
      docReply('Bien reçu, votre note vocale est claire. Je vous prépare l\'ordonnance.', 2300);
    }
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(SIB2, {
    icon: "paperclip",
    variant: "solid",
    label: "Joindre",
    onClick: () => setAttachOpen(o => !o)
  }), attachOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 'calc(100% + 8px)',
      left: 0,
      zIndex: 50,
      width: 200,
      padding: 4,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 10,
      boxShadow: 'var(--shadow-xl)'
    }
  }, [['image', 'Photos et vidéos', () => {
    setAttachOpen(false);
    setPreview(true);
  }], ['file-medical', 'Document', () => {
    setAttachOpen(false);
    pushMine({
      kind: 'text',
      t: 'analyses-cardio.pdf · 2,1 Mo'
    });
  }]].map(([ic, l, fn]) => /*#__PURE__*/React.createElement("button", {
    key: l,
    onClick: fn,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      padding: '9px 10px',
      border: 'none',
      cursor: 'pointer',
      background: 'transparent',
      borderRadius: 7,
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      color: 'var(--text-primary)',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent-300)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(SIC2, {
    name: ic,
    size: 15
  })), l)))), /*#__PURE__*/React.createElement("textarea", {
    ref: taRef,
    value: draft,
    rows: 1,
    placeholder: "Votre message\u2026",
    onChange: e => {
      setDraft(e.target.value);
      const el = e.target;
      el.style.height = '38px';
      el.style.height = Math.min(100, el.scrollHeight) + 'px';
    },
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    style: {
      flex: 1,
      minHeight: 38,
      height: 38,
      maxHeight: 100,
      resize: 'none',
      borderRadius: 20,
      border: '1px solid var(--border-default)',
      background: 'var(--bg-base)',
      padding: '9px 14px',
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      lineHeight: 1.4,
      color: 'var(--text-primary)',
      outline: 'none'
    }
  }), draft.trim() ? /*#__PURE__*/React.createElement("button", {
    onClick: send,
    "aria-label": "Envoyer",
    style: {
      width: 38,
      height: 38,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      background: 'var(--accent-500)',
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'var(--grain-btn)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(SIC2, {
    name: editing ? 'check' : 'send',
    size: 15
  }))) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setRecording(true),
    "aria-label": "Note vocale",
    style: {
      width: 38,
      height: 38,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      background: 'transparent',
      color: 'var(--text-accent)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(SIC2, {
    name: "mic",
    size: 19
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 12px 10px',
      background: 'transparent'
    }
  }, /*#__PURE__*/React.createElement(SB2, {
    variant: "ghost",
    size: "sm",
    fullWidth: true,
    iconLeft: "check-circle",
    onClick: onEnd
  }, "Terminer la session \xB7 compte-rendu automatique")), preview && /*#__PURE__*/React.createElement(XPreview, {
    onClose: () => setPreview(false),
    onSend: caption => {
      setPreview(false);
      pushMine({
        kind: 'album',
        count: 3,
        t: caption || undefined
      });
    }
  }), viewer && /*#__PURE__*/React.createElement(XViewer, {
    onClose: () => setViewer(false)
  }), sheet && /*#__PURE__*/React.createElement(XSheet, {
    msg: msgs.find(x => x.id === sheet.id) || {},
    step: sheet.step,
    onAction: onSheetAction,
    onClose: () => setSheet(null)
  }));
}
window.PatientSession = SessionView;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/patient_mobile/session.jsx", error: String((e && e.message) || e) }); }

// ui_kits/patient_mobile/tabs.jsx
try { (() => {
/* ULAMU — App patient : onglets Consultations / Mon espace, barre d'onglets,
   bouton Urgence (modale) et contrôleur racine PatientApp. */
const U3 = window.ULAMUDesignSystem_d14300;
const {
  Button: B3,
  IconButton: IB3,
  Badge: BD3,
  Avatar: AV3,
  Card: C3,
  Icon: IC3,
  Modal: MD3,
  Banner: BN3
} = U3;
const GH3 = window.PatientGlassHeader;
const SL3 = window.PatientSectionLabel;

/* ── Consultations : chronologie groupée ── */
function ConsultTab({
  onResume,
  onOpenQR,
  onOpenDossier
}) {
  const groups = [['Aujourd\'hui', [{
    ic: 'message',
    t: 'Dr Armel Konaté',
    s: 'Session en cours · répond en ~3 min',
    b: ['accent', 'En cours'],
    live: true
  }]], ['Mars 2026', [{
    ic: 'ordonnance',
    t: 'Ordonnance ORD-2026-00412',
    s: 'Amlodipine 5 mg · Ramipril 10 mg',
    b: ['success', 'Réservée']
  }, {
    ic: 'consultation',
    t: 'Dr Armel Konaté',
    s: 'Compte-rendu reçu · 12 mars',
    b: ['neutral', 'Terminée']
  }]], ['Février 2026', [{
    ic: 'activity',
    t: 'Triage — Nadège Loemba',
    s: 'Tension 13/8 · versé au dossier',
    b: ['neutral', 'Archivé']
  }, {
    ic: 'pill',
    t: 'Délivrance — Pharmacie du Marché',
    s: '2 médicaments · scan QR',
    b: ['neutral', 'Délivrée']
  }]]];
  return /*#__PURE__*/React.createElement("div", {
    className: "scr"
  }, /*#__PURE__*/React.createElement(GH3, null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 17,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)',
      flex: 1
    }
  }, "Consultations"), /*#__PURE__*/React.createElement(IB3, {
    icon: "filter",
    variant: "solid",
    label: "Filtrer"
  })), /*#__PURE__*/React.createElement("div", {
    className: "pad",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, groups.map(([label, items]) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: label
  }, /*#__PURE__*/React.createElement(SL3, null, label), items.map((it, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: "uha",
    onClick: it.live ? onResume : it.ic === 'ordonnance' ? onOpenQR : onOpenDossier,
    style: {
      all: 'unset',
      cursor: 'pointer',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement(C3, {
    padding: "13px",
    interactive: true,
    style: {
      borderColor: it.live ? 'rgba(111,146,218,0.4)' : undefined
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.16)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(IC3, {
    name: it.ic,
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, it.t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, it.s)), /*#__PURE__*/React.createElement(BD3, {
    tone: it.b[0],
    size: "sm",
    dot: it.live
  }, it.b[1])))))))));
}

/* ── Mon espace ── */
function SpaceTab({
  onAction,
  theme,
  onTheme
}) {
  const TILES = [['file-medical', 'Dossier médical', 'Gratuit, à vie', 'dossier'], ['users', 'Carnet familial', '2 proches', 'dossier'], ['pill', 'Mes rappels', '1 actif', 'notif'], ['credit-card', 'Mes paiements', 'MTN MoMo', 'payments']];
  return /*#__PURE__*/React.createElement("div", {
    className: "scr"
  }, /*#__PURE__*/React.createElement(GH3, null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 17,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)',
      flex: 1
    }
  }, "Mon espace"), /*#__PURE__*/React.createElement(window.PatientThemeToggle, {
    theme: theme,
    onTheme: onTheme
  }), /*#__PURE__*/React.createElement(IB3, {
    icon: "settings",
    variant: "solid",
    label: "R\xE9glages"
  })), /*#__PURE__*/React.createElement("div", {
    className: "pad",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(C3, {
    padding: "16px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 13
    }
  }, /*#__PURE__*/React.createElement(AV3, {
    name: "Mireille Nkounkou",
    size: "lg"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 17,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)'
    }
  }, "Mireille Nkounkou"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, "PAT-2026-08317")), /*#__PURE__*/React.createElement(IC3, {
    name: "chevron-right",
    size: 16,
    color: "var(--text-tertiary)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 13,
      paddingTop: 13,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, [['7', 'consultations'], ['3', 'ordonnances'], ['12', 'mois d\'historique']].map(([v, l], i) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      flex: 1,
      textAlign: 'center',
      borderLeft: i ? '1px solid var(--border-subtle)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 17,
      color: 'var(--text-primary)'
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--text-tertiary)'
    }
  }, l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 10
    }
  }, TILES.map(([ic, t, s, act]) => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: "uha",
    onClick: () => onAction(act),
    style: {
      all: 'unset',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(C3, {
    padding: "14px",
    interactive: true
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.16)',
      color: 'var(--accent-300)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(IC3, {
    name: ic,
    size: 17
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      color: 'var(--text-primary)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, s))))), /*#__PURE__*/React.createElement("button", {
    className: "uha",
    onClick: () => onAction('dossier'),
    style: {
      all: 'unset',
      cursor: 'pointer',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement(C3, {
    padding: "13px",
    interactive: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--success-dot)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(IC3, {
    name: "shield-check",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      color: 'var(--text-primary)'
    }
  }, "Confidentialit\xE9"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-tertiary)',
      marginTop: 1
    }
  }, "Chiffr\xE9 \xB7 jamais de contenu m\xE9dical sur l'\xE9cran verrouill\xE9")), /*#__PURE__*/React.createElement(IC3, {
    name: "chevron-right",
    size: 15,
    color: "var(--text-tertiary)"
  })))), /*#__PURE__*/React.createElement(B3, {
    variant: "ghost",
    fullWidth: true,
    iconLeft: "log-out",
    onClick: () => onAction('logout')
  }, "Se d\xE9connecter")));
}

/* ── Barre d'onglets ── */
function TabBar({
  tab,
  setTab
}) {
  const tabs = [['accueil', 'home', 'Accueil'], ['consult', 'message', 'Consultations'], ['espace', 'user', 'Mon espace']];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderTop: '1px solid var(--glass-border)'
    }
  }, tabs.map(([id, ic, l]) => {
    const on = tab === id;
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      className: "uha",
      onClick: () => setTab(id),
      style: {
        all: 'unset',
        cursor: 'pointer',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '8px 0 10px',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 44,
        height: 26,
        borderRadius: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: on ? 'rgba(39,86,166,0.22)' : 'transparent',
        color: on ? 'var(--accent-300)' : 'var(--text-tertiary)',
        transition: 'background var(--dur-fast) linear, color var(--dur-fast) linear'
      }
    }, /*#__PURE__*/React.createElement(IC3, {
      name: ic,
      size: 18,
      strokeWidth: on ? 1.7 : 1.5
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        fontWeight: on ? 600 : 500,
        fontFamily: 'var(--font-body)',
        color: on ? 'var(--text-primary)' : 'var(--text-tertiary)'
      }
    }, l));
  }));
}

/* ── Historique des paiements ── */
function PaymentsScreen({
  onBack
}) {
  const ROWS = [['stethoscope', 'Consultation — Dr Armel Konaté', '11 juin 2026 · MTN MoMo', '-5 000 F'], ['eye', 'Dévoilement — Pharmacie du Marché', '11 juin 2026 · MTN MoMo', '-500 F'], ['activity', 'Triage à domicile — Nadège L.', '8 mars 2026 · Airtel Money', '-2 000 F'], ['refresh', 'Remboursement automatique', '2 févr. 2026 · session non honorée', '+5 000 F']];
  return /*#__PURE__*/React.createElement("div", {
    className: "scr"
  }, /*#__PURE__*/React.createElement(GH3, null, /*#__PURE__*/React.createElement(IB3, {
    icon: "arrow-left",
    label: "Retour",
    onClick: onBack
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)',
      flex: 1
    }
  }, "Mes paiements"), /*#__PURE__*/React.createElement(BD3, {
    tone: "neutral",
    size: "sm",
    icon: "credit-card"
  }, "MTN MoMo")), /*#__PURE__*/React.createElement("div", {
    className: "pad",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(C3, {
    padding: "4px 14px"
  }, ROWS.map(([ic, t, s, amt], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      padding: '12px 0',
      borderTop: i ? '1px solid var(--border-subtle)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.16)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(IC3, {
    name: ic,
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 12.5,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginTop: 1
    }
  }, s)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12.5,
      fontWeight: 600,
      color: amt.startsWith('+') ? 'var(--success-text)' : 'var(--text-primary)',
      whiteSpace: 'nowrap'
    }
  }, amt)))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      fontSize: 11,
      color: 'var(--text-tertiary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(IC3, {
    name: "shield-check",
    size: 12,
    color: "var(--success-dot)"
  }), "Re\xE7u syst\xE9matique \xB7 jamais un franc de plus que le prix affich\xE9")));
}

/* ── Racine ── */
function PatientApp() {
  const [tab, setTab] = React.useState('accueil');
  const [stack, setStack] = React.useState([]);
  const [urgence, setUrgence] = React.useState(false);
  const [onboarded, setOnboarded] = React.useState(() => {
    try {
      return localStorage.getItem('ulamu-onboarded') === '1';
    } catch (e) {
      return true;
    }
  });
  const [theme, setThemeState] = React.useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const toggleTheme = () => setThemeState(t => {
    const n = t === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    try {
      localStorage.setItem('ulamu-theme', n);
    } catch (e) {}
    return n;
  });
  const top = stack[stack.length - 1];
  const push = v => setStack(s => [...s, v]);
  const pop = () => setStack(s => s.slice(0, -1));
  const reset = () => setStack([]);
  const go = k => {
    if (k === 'logout') {
      try {
        localStorage.setItem('ulamu-onboarded', '0');
      } catch (e) {}
      setStack([]);
      setTab('accueil');
      setOnboarded(false);
      return;
    }
    push({
      k
    });
  };
  const finishOnboarding = () => {
    try {
      localStorage.setItem('ulamu-onboarded', '1');
    } catch (e) {}
    setOnboarded(true);
  };
  const armel = window.PATIENT_DOCTORS[0];
  if (!onboarded) {
    return /*#__PURE__*/React.createElement(window.AndroidDevice, {
      dark: theme === 'dark'
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-base)'
      }
    }, /*#__PURE__*/React.createElement(window.PatientOnboarding, {
      onDone: finishOnboarding
    })));
  }
  let body;
  if (top) {
    if (top.k === 'doctor') body = /*#__PURE__*/React.createElement(window.PatientDoctor, {
      d: top.d,
      onBack: pop,
      onInitiate: () => push({
        k: 'handshake',
        d: top.d
      })
    });else if (top.k === 'handshake') body = /*#__PURE__*/React.createElement(window.PatientHandshake, {
      d: top.d,
      onBack: pop,
      onConfirmed: () => push({
        k: 'pay',
        d: top.d
      })
    });else if (top.k === 'pay') body = /*#__PURE__*/React.createElement(window.PatientPay, {
      d: top.d,
      onBack: pop,
      onPaid: () => push({
        k: 'session',
        d: top.d
      })
    });else if (top.k === 'session') body = /*#__PURE__*/React.createElement(window.PatientSession, {
      d: top.d,
      onBack: pop,
      onEnd: reset,
      onShowQR: () => go('qr'),
      onReserve: () => go('meds')
    });else if (top.k === 'meds') body = /*#__PURE__*/React.createElement(window.PatientMeds, {
      onBack: pop,
      onShowQR: () => go('qr')
    });else if (top.k === 'qr') body = /*#__PURE__*/React.createElement(window.PatientQR, {
      onBack: pop
    });else if (top.k === 'dossier') body = /*#__PURE__*/React.createElement(window.PatientDossier, {
      onBack: pop
    });else if (top.k === 'notif') body = /*#__PURE__*/React.createElement(window.PatientNotifs, {
      onBack: pop
    });else if (top.k === 'payments') body = /*#__PURE__*/React.createElement(PaymentsScreen, {
      onBack: pop
    });
  } else if (tab === 'accueil') body = /*#__PURE__*/React.createElement(window.PatientHome, {
    onPick: d => push({
      k: 'doctor',
      d
    }),
    onAction: go,
    theme: theme,
    onTheme: toggleTheme
  });else if (tab === 'consult') body = /*#__PURE__*/React.createElement(ConsultTab, {
    onResume: () => push({
      k: 'session',
      d: armel
    }),
    onOpenQR: () => go('qr'),
    onOpenDossier: () => go('dossier')
  });else body = /*#__PURE__*/React.createElement(SpaceTab, {
    onAction: go,
    theme: theme,
    onTheme: toggleTheme
  });
  const inFlow = !!top;
  return /*#__PURE__*/React.createElement(window.AndroidDevice, {
    dark: theme === 'dark'
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-base)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }
  }, body), !inFlow && /*#__PURE__*/React.createElement("button", {
    className: "uha",
    title: "Urgence",
    onClick: () => setUrgence(true),
    style: {
      position: 'absolute',
      right: 14,
      bottom: 76,
      height: 46,
      padding: '0 16px 0 13px',
      borderRadius: 23,
      border: 'none',
      cursor: 'pointer',
      background: '#C44040',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      boxShadow: 'var(--shadow-xl)',
      zIndex: 30,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'var(--grain-btn)'
    }
  }), /*#__PURE__*/React.createElement(IC3, {
    name: "phone",
    size: 17,
    strokeWidth: 1.8
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 13
    }
  }, "Urgence")), !inFlow && /*#__PURE__*/React.createElement(TabBar, {
    tab: tab,
    setTab: setTab
  }), urgence && /*#__PURE__*/React.createElement(MD3, {
    title: "Urgence m\xE9dicale",
    onClose: () => setUrgence(false),
    width: 330,
    style: {
      margin: '0 12px'
    },
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(B3, {
      variant: "secondary",
      onClick: () => setUrgence(false)
    }, "Annuler"), /*#__PURE__*/React.createElement(B3, {
      variant: "danger",
      iconLeft: "phone"
    }, "Appeler le service de garde"))
  }, /*#__PURE__*/React.createElement(BN3, {
    tone: "error",
    title: "Si la vie est en danger"
  }, "Appelez imm\xE9diatement \u2014 l'appel est gratuit et prioritaire, m\xEAme sans cr\xE9dit."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '12px 0 6px',
      fontSize: 13
    }
  }, "Votre position approximative (Talanga\xEF) sera partag\xE9e avec le service de garde."))));
}
window.PatientApp = PatientApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/patient_mobile/tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/professionnel_desktop/chat-pro.jsx
try { (() => {
/* ULAMU — Cockpit pro : composants de messagerie enrichie (desktop).
   Variante desktop des composants mobiles : menu contextuel en popover
   au survol, mêmes accusés/voix/médias. Pas de groupes, pas d'emoji. */
const UP = window.ULAMUDesignSystem_d14300;
const {
  IconButton: PIB2,
  Badge: PBD2,
  Icon: PIC2,
  Button: PB2
} = UP;
const PRO_CHAT_ICONS = {
  play: '<path d="M5.5 3.2l7.2 4.8-7.2 4.8V3.2z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="4" y="3" width="3" height="10" rx="1" fill="currentColor" stroke="none"/><rect x="9" y="3" width="3" height="10" rx="1" fill="currentColor" stroke="none"/>',
  reply: '<path d="M6 10L2 6l4-4"/><path d="M2 6h8a4 4 0 0 1 4 4v3"/>',
  checkcheck: '<path d="M1.5 8.5l3 3 5.5-5.5"/><path d="M7.5 11l1 1L15 5.5"/>'
};
function PLIc({
  name,
  size = 14,
  strokeWidth = 1.5,
  color,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: color || 'currentColor',
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flexShrink: 0,
      display: 'block',
      ...style
    },
    "aria-hidden": "true",
    dangerouslySetInnerHTML: {
      __html: PRO_CHAT_ICONS[name]
    }
  });
}
const pNow = () => {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};
const pMS = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const pWave = (n = 36) => Array.from({
  length: n
}, () => 0.18 + 0.82 * Math.pow(Math.random(), 0.55));
function PReceipt({
  status
}) {
  if (!status || status === 'none') return null;
  if (status === 'pending') return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontSize: 9.5,
      color: 'rgba(255,255,255,0.75)'
    }
  }, /*#__PURE__*/React.createElement(PIC2, {
    name: "clock",
    size: 10
  }), "envoi\u2026");
  if (status === 'sent') return /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'rgba(255,255,255,0.75)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(PIC2, {
    name: "check",
    size: 13
  }));
  return /*#__PURE__*/React.createElement("span", {
    style: {
      color: status === 'lu' ? '#9DE0FF' : 'rgba(255,255,255,0.75)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(PLIc, {
    name: "checkcheck",
    size: 13
  }));
}
const PRO_SPEEDS = [1, 1.5, 2];
function PVoicePlayer({
  wave,
  dur,
  mine
}) {
  const [playing, setPlaying] = React.useState(false);
  const [prog, setProg] = React.useState(0);
  const [spd, setSpd] = React.useState(0);
  const waveRef = React.useRef(null);
  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setProg(p => {
      const n = p + 0.1 * PRO_SPEEDS[spd] / dur;
      if (n >= 1) {
        setPlaying(false);
        return 0;
      }
      return n;
    }), 100);
    return () => clearInterval(id);
  }, [playing, spd, dur]);
  const seek = e => {
    const r = waveRef.current.getBoundingClientRect();
    setProg(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
  };
  const playedC = mine ? '#FFFFFF' : 'var(--accent-400)';
  const restC = mine ? 'rgba(255,255,255,0.42)' : 'var(--border-strong)';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      width: 250,
      padding: '3px 2px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPlaying(p => !p),
    "aria-label": playing ? 'Pause' : 'Écouter',
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: mine ? 'rgba(255,255,255,0.92)' : 'var(--accent-500)',
      color: mine ? 'var(--accent-600)' : '#fff'
    }
  }, /*#__PURE__*/React.createElement(PLIc, {
    name: playing ? 'pause' : 'play',
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    ref: waveRef,
    onPointerDown: seek,
    style: {
      flex: 1,
      height: 30,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      position: 'relative',
      cursor: 'pointer',
      touchAction: 'none'
    }
  }, wave.map((a, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      maxWidth: 3,
      height: 3 + a * 21,
      borderRadius: 9999,
      background: i / wave.length <= prog ? playedC : restC
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: '50%',
      left: `${prog * 100}%`,
      transform: 'translate(-50%,-50%)',
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: mine ? '#fff' : 'var(--accent-400)',
      boxShadow: '0 0 0 2px rgba(0,0,0,0.10)',
      pointerEvents: 'none'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontVariantNumeric: 'tabular-nums',
      color: mine ? 'rgba(255,255,255,0.85)' : 'var(--text-tertiary)',
      minWidth: 30,
      textAlign: 'right'
    }
  }, pMS(dur)), playing && /*#__PURE__*/React.createElement("button", {
    onClick: () => setSpd(s => (s + 1) % 3),
    style: {
      height: 22,
      padding: '0 7px',
      borderRadius: 9999,
      border: 'none',
      cursor: 'pointer',
      flexShrink: 0,
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
      background: mine ? 'rgba(255,255,255,0.22)' : 'var(--bg-muted)',
      color: mine ? '#fff' : 'var(--text-accent)'
    }
  }, String(PRO_SPEEDS[spd]).replace('.', ','), "\xD7"));
}
function PRecorder({
  onSend,
  onCancel
}) {
  const [sec, setSec] = React.useState(0);
  const [bars, setBars] = React.useState(Array(44).fill(0.06));
  React.useEffect(() => {
    const a = setInterval(() => setSec(s => s + 1), 1000);
    const b = setInterval(() => setBars(bs => [...bs.slice(1), 0.08 + 0.92 * Math.pow(Math.random(), 0.6)]), 80);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, []);
  React.useEffect(() => {
    if (sec >= 300) onSend(sec);
  }, [sec]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '4px 6px',
      minHeight: 38,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes ulamu-rec2{0%,100%{opacity:1}50%{opacity:.25}}'), /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    "aria-label": "Annuler l'enregistrement",
    style: {
      width: 34,
      height: 34,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      background: 'transparent',
      color: 'var(--error-dot)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(PIC2, {
    name: "trash",
    size: 17
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: '50%',
      background: 'var(--error-dot)',
      animation: 'ulamu-rec2 1s infinite',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 30,
      display: 'flex',
      alignItems: 'center',
      gap: 2
    }
  }, bars.map((a, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      maxWidth: 4,
      height: 3 + a * 23,
      borderRadius: 9999,
      background: 'var(--accent-400)',
      transition: 'height 0.08s linear'
    }
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12.5,
      fontWeight: 600,
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--text-secondary)',
      minWidth: 38,
      textAlign: 'right'
    }
  }, pMS(sec)), /*#__PURE__*/React.createElement("button", {
    onClick: () => onSend(sec),
    "aria-label": "Envoyer la note vocale",
    style: {
      width: 38,
      height: 38,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      background: 'var(--accent-500)',
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'var(--grain-btn)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(PIC2, {
    name: "send",
    size: 15
  }))));
}

/* Menu contextuel desktop : popover ancré au coin de la bulle */
function PBubbleMenu({
  mine,
  canEdit,
  onAction
}) {
  const Row = ({
    icon,
    local,
    label,
    danger,
    act
  }) => {
    const [h, setH] = React.useState(false);
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => onAction(act),
      onMouseEnter: () => setH(true),
      onMouseLeave: () => setH(false),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '7px 10px',
        border: 'none',
        cursor: 'pointer',
        borderRadius: 7,
        textAlign: 'left',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: 500,
        background: h ? danger ? 'var(--error-bg)' : 'var(--bg-subtle)' : 'transparent',
        color: danger ? 'var(--error-text)' : 'var(--text-primary)',
        transition: 'background var(--dur-fast) linear'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: danger ? 'var(--error-dot)' : 'var(--text-secondary)'
      }
    }, local ? /*#__PURE__*/React.createElement(PLIc, {
      name: icon,
      size: 14
    }) : /*#__PURE__*/React.createElement(PIC2, {
      name: icon,
      size: 14
    })), label);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 22,
      [mine ? 'right' : 'left']: 4,
      zIndex: 50,
      width: 188,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 12,
      boxShadow: 'var(--shadow-xl)',
      padding: 4,
      animation: 'ulamu-pop var(--dur-base) var(--ease-spring)'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes ulamu-pop{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}'), /*#__PURE__*/React.createElement(Row, {
    icon: "reply",
    local: true,
    label: "R\xE9pondre",
    act: "reply"
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "copy",
    label: "Copier",
    act: "copy"
  }), canEdit && /*#__PURE__*/React.createElement(Row, {
    icon: "edit",
    label: "Modifier",
    act: "edit"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-subtle)',
      margin: '4px 8px'
    }
  }), mine && /*#__PURE__*/React.createElement(Row, {
    icon: "trash",
    label: "Supprimer pour tous",
    danger: true,
    act: "delete-all"
  }), /*#__PURE__*/React.createElement(Row, {
    icon: "eye-off",
    label: "Supprimer pour moi",
    danger: true,
    act: "delete-me"
  }));
}
function PAlbum({
  count,
  onOpen
}) {
  const cols = count === 3 ? 3 : 2;
  const shown = Math.min(count, 4);
  return /*#__PURE__*/React.createElement("span", {
    onClick: onOpen,
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 2,
      width: 280,
      cursor: 'pointer'
    }
  }, Array.from({
    length: shown
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      position: 'relative',
      aspectRatio: '1',
      borderRadius: 10,
      border: '1px solid var(--border-subtle)',
      background: 'var(--bg-muted)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-disabled)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(PIC2, {
    name: "image",
    size: 24,
    strokeWidth: 1.3
  }), i === 3 && count > 4 && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,0,0,0.55)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 22
    }
  }, "+", count - 4))));
}

/* Overlay local à la zone de droite (la liste/dossier restent visibles) */
function PViewer({
  onClose
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 62,
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 16px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(PIB2, {
    icon: "arrow-left",
    label: "Fermer",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, "photo-symptome.jpg"), /*#__PURE__*/React.createElement(PIB2, {
    icon: "download",
    variant: "solid",
    label: "T\xE9l\xE9charger"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      aspectRatio: '3/4',
      borderRadius: 12,
      background: 'var(--bg-muted)',
      border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      color: 'var(--text-disabled)'
    }
  }, /*#__PURE__*/React.createElement(PIC2, {
    name: "image",
    size: 44,
    strokeWidth: 1.2
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-tertiary)'
    }
  }, "Aper\xE7u \u2014 d\xE9mo"))));
}
function PPreview({
  onClose,
  onSend
}) {
  const [caption, setCaption] = React.useState('');
  const [active, setActive] = React.useState(0);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 60,
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 16px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(PIB2, {
    icon: "x",
    label: "Annuler",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, "photo-", active + 1, ".jpg"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, "1,2 Mo \xB7 ", active + 1, "/3 fichiers")), /*#__PURE__*/React.createElement(PBD2, {
    tone: "success",
    size: "sm",
    icon: "check"
  }, "compress\xE9e \xB7 4,1 \u2192 1,2 Mo")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '92%',
      aspectRatio: '3/4',
      borderRadius: 12,
      background: 'var(--bg-muted)',
      border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      color: 'var(--text-disabled)'
    }
  }, /*#__PURE__*/React.createElement(PIC2, {
    name: "image",
    size: 44,
    strokeWidth: 1.2
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-tertiary)'
    }
  }, "Aper\xE7u \u2014 d\xE9mo"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      padding: '12px 18px 16px',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: caption,
    onChange: e => setCaption(e.target.value),
    onKeyDown: e => e.key === 'Enter' && onSend(caption),
    placeholder: "Ajouter une l\xE9gende\u2026",
    style: {
      height: 42,
      borderRadius: 9999,
      border: '1px solid var(--border-default)',
      background: 'var(--bg-subtle)',
      padding: '0 16px',
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      color: 'var(--text-primary)',
      outline: 'none',
      maxWidth: 520
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      maxWidth: 520
    }
  }, [0, 1, 2].map(i => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => setActive(i),
    style: {
      width: 56,
      height: 56,
      borderRadius: 10,
      cursor: 'pointer',
      border: `2.5px solid ${i === active ? 'var(--accent-400)' : 'var(--border-subtle)'}`,
      background: 'var(--bg-muted)',
      color: 'var(--text-disabled)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: i === active ? 'translateY(-2px)' : 'none',
      boxShadow: i === active ? 'var(--shadow-md)' : 'none',
      transition: 'transform var(--dur-fast) linear'
    }
  }, /*#__PURE__*/React.createElement(PIC2, {
    name: "image",
    size: 19,
    strokeWidth: 1.3
  }))), /*#__PURE__*/React.createElement("button", {
    style: {
      width: 56,
      height: 56,
      borderRadius: 10,
      cursor: 'pointer',
      border: '1.5px dashed var(--border-strong)',
      background: 'transparent',
      color: 'var(--text-tertiary)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(PIC2, {
    name: "plus",
    size: 17
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => onSend(caption),
    "aria-label": "Envoyer",
    style: {
      width: 54,
      height: 54,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      background: 'var(--accent-500)',
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'var(--grain-btn)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(PIC2, {
    name: "send",
    size: 18
  }))))));
}
window.ProChatParts = {
  PLIc,
  PReceipt,
  PVoicePlayer,
  PRecorder,
  PBubbleMenu,
  PAlbum,
  PViewer,
  PPreview,
  pNow,
  pMS,
  pWave
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/professionnel_desktop/chat-pro.jsx", error: String((e && e.message) || e) }); }

// ui_kits/professionnel_desktop/cockpit.jsx
try { (() => {
/* ULAMU — App professionnel : cockpit de session (dossier patient +
   messagerie chiffrée + ordonnance) et contrôleur racine ProApp. */
const DK = window.ULAMUDesignSystem_d14300;
const {
  Button: KB,
  IconButton: KIB,
  Badge: KBD,
  Avatar: KAV,
  Input: KIN,
  Textarea: KTX,
  Card: KC,
  Icon: KIC,
  Banner: KBN,
  Tabs: KTB
} = DK;
const kFmtF = window.proFmtF;
const {
  PLIc: KLIc,
  PReceipt: KRcpt,
  PVoicePlayer: KVoice,
  PRecorder: KRec,
  PBubbleMenu: KMenu,
  PAlbum: KAlbum,
  PViewer: KViewer,
  PPreview: KPreview,
  pNow: kNow,
  pMS: kMS,
  pWave: kWave
} = window.ProChatParts;
let _kid = 100;
const COCKPIT_SEED = () => [{
  id: 1,
  who: 'me',
  kind: 'text',
  t: 'Bonsoir Mireille, j\'ai lu votre pré-consultation. Depuis quand ressentez-vous ces douleurs ?',
  time: '19:42',
  status: 'lu',
  readAt: '19:43'
}, {
  id: 2,
  who: 'pt',
  kind: 'text',
  t: 'Bonsoir docteur. Depuis trois semaines, surtout le soir après le marché.',
  time: '19:43'
}, {
  id: 3,
  who: 'pt',
  kind: 'voice',
  dur: 38,
  wave: kWave(36),
  time: '19:44'
}, {
  id: 4,
  who: 'me',
  kind: 'text',
  t: 'Merci, c\'est très clair. Avez-vous de la fièvre ou un essoufflement à l\'effort ?',
  time: '19:45',
  status: 'lu',
  readAt: '19:46',
  replyTo: {
    name: 'Mireille N.',
    text: 'Note vocale · 0:38'
  }
}];
function Cockpit({
  r,
  sec,
  onClose
}) {
  const [msgs, setMsgs] = React.useState(COCKPIT_SEED);
  const [draft, setDraft] = React.useState('');
  const [tab, setTab] = React.useState('dossier');
  const [signed, setSigned] = React.useState(false);
  const [replyTo, setReplyTo] = React.useState(null);
  const [editing, setEditing] = React.useState(null);
  const [menuFor, setMenuFor] = React.useState(null);
  const [hovId, setHovId] = React.useState(null);
  const [typing, setTyping] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [attachOpen, setAttachOpen] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const [viewer, setViewer] = React.useState(false);
  const [showDown, setShowDown] = React.useState(false);
  const boxRef = React.useRef(null);
  const refsMap = React.useRef({});
  const taRef = React.useRef(null);
  const toBottom = () => {
    const b = boxRef.current;
    if (b) b.scrollTo({
      top: b.scrollHeight
    });
  };
  React.useEffect(() => {
    toBottom();
  }, [msgs.length, typing]);
  React.useEffect(() => {
    if (menuFor == null && !attachOpen) return;
    const close = () => {
      setMenuFor(null);
      setAttachOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuFor, attachOpen]);
  const patch = (id, p) => setMsgs(ms => ms.map(m => m.id === id ? {
    ...m,
    ...p
  } : m));
  const lifecycle = id => {
    setTimeout(() => patch(id, {
      status: 'sent'
    }), 450);
    setTimeout(() => patch(id, {
      status: 'remis'
    }), 1400);
    setTimeout(() => patch(id, {
      status: 'lu',
      readAt: kNow()
    }), 3000);
  };
  const pushMine = m => {
    const id = ++_kid;
    setMsgs(ms => [...ms, {
      id,
      who: 'me',
      time: kNow(),
      status: 'pending',
      ...m
    }]);
    lifecycle(id);
  };
  const ptReply = (text, delay = 2100) => {
    setTimeout(() => setTyping(true), delay - 1300);
    setTimeout(() => {
      setTyping(false);
      setMsgs(ms => [...ms, {
        id: ++_kid,
        who: 'pt',
        kind: 'text',
        t: text,
        time: kNow()
      }]);
    }, delay);
  };
  const send = () => {
    const t = draft.trim();
    if (!t) return;
    if (editing) {
      patch(editing.id, {
        t,
        edited: true
      });
      setEditing(null);
      setDraft('');
      return;
    }
    pushMine({
      kind: 'text',
      t,
      replyTo
    });
    setDraft('');
    setReplyTo(null);
    if (taRef.current) taRef.current.style.height = '38px';
    ptReply('D\'accord docteur, je comprends. Merci pour vos explications.');
  };
  const onMenuAction = (m, act) => {
    setMenuFor(null);
    if (act === 'reply') setReplyTo({
      name: m.who === 'me' ? 'Vous' : 'Mireille N.',
      text: m.kind === 'voice' ? `Note vocale · ${kMS(m.dur)}` : m.kind === 'album' ? 'Photos' : (m.t || '').slice(0, 120)
    });else if (act === 'copy') {
      try {
        navigator.clipboard && navigator.clipboard.writeText(m.t || '');
      } catch (e) {}
    } else if (act === 'edit') {
      setEditing({
        id: m.id
      });
      setDraft(m.t || '');
      setReplyTo(null);
    } else if (act === 'delete-me') setMsgs(ms => ms.filter(x => x.id !== m.id));else if (act === 'delete-all') patch(m.id, {
      deleted: true
    });
  };
  const scrollToMsg = mid => {
    const el = refsMap.current[mid];
    const b = boxRef.current;
    if (el && b) b.scrollTo({
      top: Math.max(0, el.offsetTop - 80),
      behavior: 'smooth'
    });
  };
  const onScroll = () => {
    const b = boxRef.current;
    if (!b) return;
    setShowDown(b.scrollHeight - b.scrollTop - b.clientHeight > 220);
  };
  const renderMsg = (m, i) => {
    const prev = msgs[i - 1];
    const grouped = prev && prev.who === m.who;
    const mine = m.who === 'me';
    const lastMine = mine && !msgs.slice(i + 1).some(x => x.who === 'me');
    if (m.deleted) return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      ref: el => refsMap.current[m.id] = el,
      style: {
        display: 'flex',
        justifyContent: mine ? 'flex-end' : 'flex-start',
        marginTop: grouped ? 2 : 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 13px',
        borderRadius: 12,
        border: '1px dashed var(--border-default)',
        color: 'var(--text-disabled)',
        fontSize: 12.5,
        fontStyle: 'italic'
      }
    }, /*#__PURE__*/React.createElement(KIC, {
      name: "eye-off",
      size: 13
    }), "Message supprim\xE9"));
    return /*#__PURE__*/React.createElement("div", {
      key: m.id,
      ref: el => refsMap.current[m.id] = el,
      style: {
        display: 'flex',
        justifyContent: mine ? 'flex-end' : 'flex-start',
        marginTop: grouped ? 2 : 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      onMouseEnter: () => setHovId(m.id),
      onMouseLeave: () => setHovId(h => h === m.id ? null : h),
      style: {
        position: 'relative',
        maxWidth: '68%',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        opacity: m.status === 'pending' ? 0.75 : 1,
        transition: 'opacity var(--dur-base) linear'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        padding: m.kind === 'album' ? '5px 5px 7px' : '9px 13px',
        borderRadius: 12,
        borderBottomRightRadius: mine ? 3 : 12,
        borderBottomLeftRadius: mine ? 12 : 3,
        background: mine ? 'var(--accent-500)' : 'var(--bg-elevated)',
        color: mine ? '#fff' : 'var(--text-primary)',
        border: mine ? 'none' : '1px solid var(--border-subtle)',
        boxShadow: mine ? 'none' : '0 1px 1px rgba(0,0,0,0.04)'
      }
    }, m.replyTo && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const orig = msgs.find(x => (x.t || '').startsWith((m.replyTo.text || '').slice(0, 24)) && x.id !== m.id);
        if (orig) scrollToMsg(orig.id);
      },
      style: {
        display: 'flex',
        alignItems: 'stretch',
        gap: 8,
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        margin: '0 0 6px',
        padding: '5px 8px',
        borderRadius: 6,
        border: 'none',
        background: mine ? 'rgba(255,255,255,0.16)' : 'var(--bg-muted)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 3,
        borderRadius: 2,
        background: mine ? 'rgba(255,255,255,0.6)' : 'var(--accent-400)',
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 11,
        fontWeight: 700,
        color: mine ? '#fff' : 'var(--text-accent)'
      }
    }, m.replyTo.name), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 11,
        opacity: 0.85,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 260,
        color: mine ? '#fff' : 'var(--text-secondary)'
      }
    }, m.replyTo.text))), m.kind === 'voice' ? /*#__PURE__*/React.createElement(KVoice, {
      wave: m.wave,
      dur: m.dur,
      mine: mine
    }) : m.kind === 'album' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(KAlbum, {
      count: m.count,
      onOpen: () => setViewer(true)
    }), m.t && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        lineHeight: 1.5,
        padding: '6px 6px 0',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }
    }, m.t)) : /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }
    }, m.t), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 5,
        height: 14,
        marginTop: 3,
        padding: m.kind === 'album' ? '0 6px' : 0
      }
    }, m.edited && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9.5,
        fontStyle: 'italic',
        color: mine ? 'rgba(255,255,255,0.7)' : 'var(--text-disabled)'
      }
    }, "modifi\xE9 \xB7"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        color: mine ? 'rgba(255,255,255,0.75)' : 'var(--text-disabled)'
      }
    }, m.time), mine && /*#__PURE__*/React.createElement(KRcpt, {
      status: m.status
    })), /*#__PURE__*/React.createElement("button", {
      onMouseDown: e => e.stopPropagation(),
      onClick: () => setMenuFor(f => f === m.id ? null : m.id),
      "aria-label": "Options du message",
      style: {
        position: 'absolute',
        top: 2,
        right: 4,
        width: 22,
        height: 18,
        border: 'none',
        cursor: 'pointer',
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: mine ? 'rgba(255,255,255,0.18)' : 'var(--bg-muted)',
        color: mine ? 'rgba(255,255,255,0.95)' : 'var(--text-secondary)',
        opacity: hovId === m.id || menuFor === m.id ? 1 : 0,
        transition: 'opacity 0.12s linear'
      }
    }, /*#__PURE__*/React.createElement(KIC, {
      name: "chevron-down",
      size: 12
    })), menuFor === m.id && /*#__PURE__*/React.createElement("span", {
      onMouseDown: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement(KMenu, {
      mine: mine,
      canEdit: mine && m.kind === 'text',
      onAction: act => onMenuAction(m, act)
    }))), lastMine && m.status && m.status !== 'pending' && /*#__PURE__*/React.createElement("span", {
      style: {
        alignSelf: 'flex-end',
        fontSize: 10,
        color: m.status === 'lu' ? 'var(--text-accent)' : 'var(--text-tertiary)',
        paddingRight: 2
      }
    }, m.status === 'lu' ? `Lu à ${m.readAt || m.time}` : m.status === 'remis' ? 'Remis' : 'Envoyé')));
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      minWidth: 0,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 360,
      flexShrink: 0,
      borderRight: '1px solid var(--border-subtle)',
      overflowY: 'auto',
      padding: 20,
      background: 'var(--bg-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(KAV, {
    name: r.name,
    size: "lg",
    status: "online"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 16,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, r.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, "PAT-2026-08317 \xB7 ", r.age, " ans \xB7 ", r.zone))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8,
      marginBottom: 14
    }
  }, [['activity', '13/8', 'tension'], ['heart-pulse', '78', 'bpm'], ['clock', '36,8°', 'temp.']].map(([ic, v, l]) => /*#__PURE__*/React.createElement(KC, {
    key: l,
    padding: "9px 6px",
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent-300)',
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 4
    }
  }, /*#__PURE__*/React.createElement(KIC, {
    name: ic,
    size: 13
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9.5,
      color: 'var(--text-tertiary)'
    }
  }, l)))), /*#__PURE__*/React.createElement(KTB, {
    value: tab,
    onChange: setTab,
    items: [{
      id: 'dossier',
      label: 'Dossier',
      icon: 'file-medical'
    }, {
      id: 'ordo',
      label: 'Ordonnance',
      icon: 'ordonnance'
    }],
    style: {
      marginBottom: 14
    }
  }), tab === 'dossier' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(KBN, {
    tone: "error",
    title: "Allergie connue : p\xE9nicilline"
  }, "Garde-fou actif \u2014 toute prescription incompatible sera bloqu\xE9e."), /*#__PURE__*/React.createElement(KC, {
    padding: "13px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)',
      marginBottom: 8
    }
  }, "Pr\xE9-consultation"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-secondary)',
      lineHeight: 1.6
    }
  }, r.motif, ". Pas de fi\xE8vre d\xE9clar\xE9e. Fatigue inhabituelle depuis deux semaines.")), /*#__PURE__*/React.createElement(KC, {
    padding: "13px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)',
      marginBottom: 6
    }
  }, "Ant\xE9c\xE9dents"), [['Hypertension', 'traitée depuis 2019'], ['Amlodipine 5 mg', 'en cours'], ['Dernier triage', '8 mars · Nadège L.']].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 10,
      padding: '7px 0',
      borderTop: i ? '1px solid var(--border-subtle)' : 'none',
      fontSize: 12.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-primary)',
      fontWeight: 500
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-tertiary)',
      textAlign: 'right'
    }
  }, v)))), /*#__PURE__*/React.createElement(KB, {
    variant: "ghost",
    size: "sm",
    fullWidth: true,
    iconLeft: "file-medical"
  }, "Ouvrir le dossier complet")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, [['Amlodipine 5 mg', '1 cp / jour, le matin · 30 jours'], ['Ramipril 10 mg', '1 cp / jour, le soir · 30 jours']].map(([m, p]) => /*#__PURE__*/React.createElement(KC, {
    key: m,
    padding: "12px 13px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.16)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(KIC, {
    name: "pill",
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      color: 'var(--text-primary)'
    }
  }, m), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-tertiary)',
      marginTop: 1
    }
  }, p)), /*#__PURE__*/React.createElement(KIB, {
    icon: "x",
    size: "sm",
    label: "Retirer"
  })))), /*#__PURE__*/React.createElement(KB, {
    variant: "ghost",
    size: "sm",
    fullWidth: true,
    iconLeft: "plus"
  }, "Ajouter un m\xE9dicament"), /*#__PURE__*/React.createElement(KBN, {
    tone: "success",
    title: "V\xE9rification des allergies : aucun conflit"
  }), signed ? /*#__PURE__*/React.createElement(KC, {
    padding: "14px",
    style: {
      textAlign: 'center',
      borderColor: 'var(--success-border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--success-dot)',
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement(KIC, {
    name: "qr-code",
    size: 26,
    strokeWidth: 1.3
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 13,
      color: 'var(--text-primary)'
    }
  }, "ORD-2026-00412 sign\xE9e"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, "QR transmis au patient \xB7 valable 30 jours")) : /*#__PURE__*/React.createElement(KB, {
    variant: "primary",
    fullWidth: true,
    iconLeft: "ordonnance",
    onClick: () => setSigned(true)
  }, "Signer l'ordonnance (QR)"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      minHeight: 0,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '11px 20px',
      borderBottom: '1px solid var(--border-subtle)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(KIB, {
    icon: "arrow-left",
    label: "Quitter la session",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 14.5,
      color: 'var(--text-primary)'
    }
  }, "Session avec ", r.name.split(' ')[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--success-text)',
      fontWeight: 600
    }
  }, "\u25CF en ligne"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-tertiary)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(KIC, {
    name: "lock",
    size: 10
  }), "chiffr\xE9 de bout en bout \xB7 compte-rendu obligatoire en fin de session"))), /*#__PURE__*/React.createElement(KBD, {
    tone: "accent",
    icon: "lock"
  }, "Confidentiel"), /*#__PURE__*/React.createElement(KIB, {
    icon: "more-vertical",
    label: "Options"
  })), /*#__PURE__*/React.createElement("div", {
    ref: boxRef,
    onScroll: onScroll,
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '14px 24px 18px',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 4,
      zIndex: 3,
      textAlign: 'center',
      margin: '2px 0 8px',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      fontSize: 10.5,
      fontWeight: 600,
      color: 'var(--text-secondary)',
      background: 'var(--bg-overlay)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      padding: '4px 12px',
      borderRadius: 9999,
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
    }
  }, "Aujourd'hui")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9.5,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: 'var(--text-disabled)',
      background: 'var(--bg-muted)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-full)',
      padding: '3px 10px'
    }
  }, "Session ouverte \xB7 19:42 \xB7 30 min")), msgs.map(renderMsg), typing && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-start',
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      gap: 4,
      padding: '12px 14px',
      borderRadius: 12,
      borderBottomLeftRadius: 3,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes kdot{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}'), [0, 1, 2].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'var(--text-tertiary)',
      animation: `kdot 1.1s ${i * 0.18}s infinite`
    }
  }))))), showDown && /*#__PURE__*/React.createElement("button", {
    onClick: toBottom,
    "aria-label": "Descendre",
    style: {
      position: 'absolute',
      right: 24,
      bottom: replyTo || editing ? 150 : 92,
      zIndex: 5,
      width: 38,
      height: 38,
      borderRadius: '50%',
      border: '1px solid var(--border-default)',
      cursor: 'pointer',
      background: 'var(--bg-elevated)',
      color: 'var(--text-secondary)',
      boxShadow: 'var(--shadow-lg)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(KIC, {
    name: "chevron-down",
    size: 17
  })), (replyTo || editing) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '7px 20px',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--bg-subtle)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 3,
      alignSelf: 'stretch',
      borderRadius: 2,
      background: 'var(--accent-400)',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--text-accent)'
    }
  }, editing ? 'Modifier le message' : `Répondre à ${replyTo.name}`), replyTo && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 11.5,
      color: 'var(--text-tertiary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, replyTo.text)), /*#__PURE__*/React.createElement(KIB, {
    icon: "x",
    size: "sm",
    label: "Annuler",
    onClick: () => {
      setReplyTo(null);
      setEditing(null);
      setDraft('');
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 20px',
      borderTop: replyTo || editing ? 'none' : '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'flex-end',
      gap: 8,
      flexShrink: 0
    }
  }, recording ? /*#__PURE__*/React.createElement(KRec, {
    onCancel: () => setRecording(false),
    onSend: s => {
      setRecording(false);
      pushMine({
        kind: 'voice',
        dur: Math.max(1, s),
        wave: kWave(36)
      });
      ptReply('Bien reçu docteur, je vous écoute.', 2400);
    }
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative'
    },
    onMouseDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement(KIB, {
    icon: "paperclip",
    variant: "solid",
    label: "Joindre",
    onClick: () => setAttachOpen(o => !o)
  }), attachOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 'calc(100% + 8px)',
      left: 0,
      zIndex: 50,
      width: 210,
      padding: 4,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 10,
      boxShadow: 'var(--shadow-xl)'
    }
  }, [['image', 'Photos et vidéos', () => {
    setAttachOpen(false);
    setPreview(true);
  }], ['file-medical', 'Document', () => {
    setAttachOpen(false);
    pushMine({
      kind: 'text',
      t: 'examens-prescrits.pdf · 1,4 Mo'
    });
  }]].map(([ic, l, fn]) => /*#__PURE__*/React.createElement("button", {
    key: l,
    onClick: fn,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      width: '100%',
      padding: '9px 10px',
      border: 'none',
      cursor: 'pointer',
      background: 'transparent',
      borderRadius: 7,
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      color: 'var(--text-primary)',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent-300)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(KIC, {
    name: ic,
    size: 15
  })), l)))), /*#__PURE__*/React.createElement("textarea", {
    ref: taRef,
    value: draft,
    rows: 1,
    placeholder: "\xC9crire au patient\u2026",
    onChange: e => {
      setDraft(e.target.value);
      const el = e.target;
      el.style.height = '38px';
      el.style.height = Math.min(120, el.scrollHeight) + 'px';
    },
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    style: {
      flex: 1,
      minHeight: 38,
      height: 38,
      maxHeight: 120,
      resize: 'none',
      borderRadius: 20,
      border: '1px solid var(--border-default)',
      background: 'var(--bg-base)',
      padding: '9px 14px',
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      lineHeight: 1.4,
      color: 'var(--text-primary)',
      outline: 'none'
    }
  }), draft.trim() ? /*#__PURE__*/React.createElement("button", {
    onClick: send,
    "aria-label": "Envoyer",
    style: {
      width: 38,
      height: 38,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      background: 'var(--accent-500)',
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'var(--grain-btn)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(KIC, {
    name: editing ? 'check' : 'send',
    size: 15
  }))) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setRecording(true),
    "aria-label": "Note vocale",
    style: {
      width: 38,
      height: 38,
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      background: 'transparent',
      color: 'var(--text-accent)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(KIC, {
    name: "mic",
    size: 19
  })), /*#__PURE__*/React.createElement(KB, {
    variant: "secondary",
    iconLeft: "file-medical"
  }, "Compte-rendu"))), preview && /*#__PURE__*/React.createElement(KPreview, {
    onClose: () => setPreview(false),
    onSend: caption => {
      setPreview(false);
      pushMine({
        kind: 'album',
        count: 3,
        t: caption || undefined
      });
    }
  }), viewer && /*#__PURE__*/React.createElement(KViewer, {
    onClose: () => setViewer(false)
  })));
}

/* ── Racine ── */
function ProApp() {
  const [nav, setNav] = React.useState('dashboard');
  const [online, setOnline] = React.useState(true);
  const [active, setActive] = React.useState(null);
  const [sec, setSec] = React.useState(30 * 60 - 95);
  const [theme, setThemeState] = React.useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const toggleTheme = () => setThemeState(t => {
    const n = t === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    try {
      localStorage.setItem('ulamu-theme', n);
    } catch (e) {}
    return n;
  });
  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSec(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [active]);
  const NAMES = {
    dashboard: 'Tableau de bord',
    consultation: 'Consultations',
    patient: 'Patients',
    'rendez-vous': 'Agenda',
    ordonnance: 'Ordonnances',
    'credit-card': 'Gains',
    users: 'Annuaire'
  };
  const Page = window.ProPages[nav];
  let main;
  if (active) main = /*#__PURE__*/React.createElement(Cockpit, {
    r: active,
    sec: sec,
    onClose: () => setActive(null)
  });else if (nav === 'dashboard') main = /*#__PURE__*/React.createElement(window.ProDashboard, {
    online: online,
    onOpen: r => {
      setActive(r);
      setSec(30 * 60 - 95);
    }
  });else if (Page) main = /*#__PURE__*/React.createElement(Page, {
    onOpen: r => {
      setActive(r);
      setSec(30 * 60 - 95);
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement(window.ProSidebar, {
    nav: nav,
    setNav: n => {
      setNav(n);
      setActive(null);
    },
    theme: theme,
    onTheme: toggleTheme
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(window.ProTopbar, {
    crumb: active ? [NAMES[nav] || 'Consultations', 'Session — ' + active.name] : [NAMES[nav]],
    online: online,
    setOnline: setOnline,
    session: active ? sec : null,
    theme: theme,
    onTheme: toggleTheme
  }), main));
}
window.ProApp = ProApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/professionnel_desktop/cockpit.jsx", error: String((e && e.message) || e) }); }

// ui_kits/professionnel_desktop/desktop.jsx
try { (() => {
/* ULAMU — App professionnel (desktop). Cockpit soignant : sidebar glass,
   topbar contextuelle, tableau de bord (KPIs, poignées de main, gains en
   area chart — seul dégradé autorisé), session de consultation complète. */
const D = window.ULAMUDesignSystem_d14300;
const {
  Button,
  IconButton,
  Badge,
  Avatar,
  Input,
  Card,
  SessionTimer,
  VerifiedBadge,
  Icon,
  Banner,
  NavItem,
  Tabs,
  Switch
} = D;
const REQUESTS = [{
  id: 1,
  name: 'Mireille Nkounkou',
  age: 32,
  motif: 'Douleurs thoraciques le soir, fatigue inhabituelle',
  zone: 'Talangaï',
  price: 5000,
  wait: '2 min',
  tags: ['Hypertension traitée', 'Triage versé']
}, {
  id: 2,
  name: 'Prisca Bahounga',
  age: 22,
  motif: 'Question de santé intime — discrétion demandée',
  zone: 'Centre-ville',
  price: 5000,
  wait: '6 min',
  tags: ['Première consultation']
}];
const AGENDA = [{
  h: '18:30',
  t: 'Session — Papa Gaston',
  s: 'Suivi hypertension · tarif réduit',
  state: 'done'
}, {
  h: '19:42',
  t: 'Session — Mireille Nkounkou',
  s: 'Consultation 30 min',
  state: 'now'
}, {
  h: '20:30',
  t: 'Session — Prisca Bahounga',
  s: 'Consultation 30 min',
  state: 'next'
}, {
  h: '21:00',
  t: 'Fin de disponibilité',
  s: 'Passage hors ligne automatique',
  state: 'next'
}];
const GAINS = [12, 22, 16, 30, 24, 38, 34]; // milliers F, Lun→Dim
const fmtF = n => n.toLocaleString('fr-FR') + ' F';
function SectionLabel({
  children,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      margin: '0 0 12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)'
    }
  }, children), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--border-subtle)'
    }
  }), right);
}

/* ── Sidebar ── */
function Sidebar({
  nav,
  setNav,
  theme,
  onTheme
}) {
  const main = [['dashboard', 'Tableau de bord', null], ['consultation', 'Consultations', '2'], ['patient', 'Patients', null], ['rendez-vous', 'Agenda', null]];
  const gestion = [['ordonnance', 'Ordonnances', null], ['credit-card', 'Gains', null], ['users', 'Annuaire', null]];
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [hovItem, setHovItem] = React.useState(null);
  const menuRef = React.useRef(null);
  React.useEffect(() => {
    if (!menuOpen) return;
    const close = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);
  const itemStyle = (id, danger) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    height: 34,
    padding: '0 10px',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 'var(--radius-md)',
    textAlign: 'left',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    fontWeight: 500,
    background: hovItem === id ? danger ? 'var(--error-bg)' : 'var(--bg-subtle)' : 'transparent',
    color: danger ? 'var(--error-text)' : 'var(--text-primary)',
    transition: 'background var(--dur-fast) linear'
  });
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 240,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderRight: '1px solid var(--glass-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '14px 16px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 'var(--radius-md)',
      background: 'var(--accent-500)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'var(--grain-btn)'
    }
  }), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 2C5.8 2 4 3.8 4 6c0 1.4.7 2.6 1.8 3.3L5 12h6l-.8-2.7C11.3 8.6 12 7.4 12 6c0-2.2-1.8-4-4-4z",
    fill: "#fff",
    fillOpacity: ".92"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5.5",
    y: "12.5",
    width: "5",
    height: "1.5",
    rx: ".75",
    fill: "#fff",
    fillOpacity: ".72"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)'
    }
  }, "ulamu"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.05em',
      color: 'var(--accent-300)',
      border: '1px solid rgba(111,146,218,0.3)',
      background: 'rgba(39,86,166,0.16)',
      borderRadius: 4,
      padding: '2px 5px'
    }
  }, "PRO")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '12px 12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-disabled)',
      padding: '2px 12px 6px'
    }
  }, "Activit\xE9"), main.map(([ic, l, b]) => /*#__PURE__*/React.createElement(NavItem, {
    key: ic,
    icon: ic,
    label: l,
    badge: b,
    active: nav === ic,
    onClick: () => setNav(ic)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-disabled)',
      padding: '14px 12px 6px'
    }
  }, "Gestion"), gestion.map(([ic, l, b]) => /*#__PURE__*/React.createElement(NavItem, {
    key: ic,
    icon: ic,
    label: l,
    badge: b,
    active: nav === ic,
    onClick: () => setNav(ic)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--accent-500)',
      padding: '12px 14px',
      boxShadow: 'var(--shadow-sm)',
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 0.1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.66)'
    }
  }, "Gains du jour"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 7,
      marginTop: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 19,
      letterSpacing: '-0.4px',
      color: '#fff'
    }
  }, "34 000 F"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontSize: 11,
      fontWeight: 600,
      color: 'rgba(255,255,255,0.85)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "trending-up",
    size: 11
  }), "+12 %"))))), /*#__PURE__*/React.createElement("div", {
    ref: menuRef,
    style: {
      flexShrink: 0,
      position: 'relative',
      padding: 12,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, menuOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 'calc(100% + 6px)',
      left: 12,
      right: 12,
      zIndex: 50,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-xl)',
      padding: 6,
      animation: 'ulamu-menu-in var(--dur-base) var(--ease-spring)'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes ulamu-menu-in{from{transform:translateY(6px) scale(.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 10px 10px'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Armel Konat\xE9",
    size: "md",
    status: "online"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, "Dr Armel Konat\xE9"), /*#__PURE__*/React.createElement(VerifiedBadge, {
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginTop: 1
    }
  }, "M\xE9decin g\xE9n\xE9raliste \xB7 R\xF4le : prescripteur"))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-subtle)',
      margin: '0 4px 6px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      height: 34,
      padding: '0 10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: theme === 'dark' ? 'moon' : 'sun',
    size: 15
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-primary)'
    }
  }, "Th\xE8me sombre"), /*#__PURE__*/React.createElement(Switch, {
    checked: theme === 'dark',
    onChange: onTheme
  })), /*#__PURE__*/React.createElement("button", {
    style: itemStyle('settings'),
    onMouseEnter: () => setHovItem('settings'),
    onMouseLeave: () => setHovItem(null)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 15
  })), "Param\xE8tres"), /*#__PURE__*/React.createElement("button", {
    style: itemStyle('profile'),
    onMouseEnter: () => setHovItem('profile'),
    onMouseLeave: () => setHovItem(null)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "user",
    size: 15
  })), "Mon profil public"), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-subtle)',
      margin: '6px 4px'
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: itemStyle('logout', true),
    onMouseEnter: () => setHovItem('logout'),
    onMouseLeave: () => setHovItem(null)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "log-out",
    size: 15
  })), "Se d\xE9connecter")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMenuOpen(o => !o),
    "aria-expanded": menuOpen,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      width: '100%',
      padding: '7px 8px',
      border: '1px solid transparent',
      cursor: 'pointer',
      borderRadius: 'var(--radius-md)',
      textAlign: 'left',
      background: menuOpen ? 'var(--bg-subtle)' : 'transparent',
      borderColor: menuOpen ? 'var(--border-default)' : 'transparent',
      transition: 'background var(--dur-fast) linear'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Armel Konat\xE9",
    size: "sm",
    status: "online"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 12.5,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, "Dr Armel Konat\xE9"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 10.5,
      color: 'var(--text-tertiary)'
    }
  }, "Prescripteur")), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-tertiary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: menuOpen ? 'chevron-down' : 'chevron-up',
    size: 14
  })))));
}

/* Bascule de thème — SVG inline (soleil/lune, style charte) */
function ProThemeToggle({
  theme,
  onTheme
}) {
  const dark = theme === 'dark';
  return /*#__PURE__*/React.createElement("button", {
    onClick: onTheme,
    title: dark ? 'Passer en clair' : 'Passer en sombre',
    "aria-label": "Changer de th\xE8me",
    style: {
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-muted)',
      border: '1px solid var(--border-default)',
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, dark ? /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "8",
    cy: "8",
    r: "3.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
  })) : /*#__PURE__*/React.createElement("path", {
    d: "M13.5 10A5.5 5.5 0 0 1 6 2.5a.5.5 0 0 0-.6-.6A6.5 6.5 0 1 0 14.1 10.6a.5.5 0 0 0-.6-.6z"
  })));
}

/* ── Topbar ── */
function Topbar({
  crumb,
  online,
  setOnline,
  session,
  theme,
  onTheme
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '0 24px',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--glass-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      fontSize: 13,
      color: 'var(--text-tertiary)'
    }
  }, crumb.map((c, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: c
  }, i > 0 && /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 12
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: i === crumb.length - 1 ? 'var(--text-primary)' : undefined,
      fontWeight: i === crumb.length - 1 ? 500 : 400
    }
  }, c)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      maxWidth: 360,
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    leftIcon: "search",
    placeholder: "Patient, ordonnance, dossier\u2026",
    style: {
      height: 32,
      fontSize: 13
    }
  })), session != null && /*#__PURE__*/React.createElement(SessionTimer, {
    seconds: session,
    warnBelow: 120
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 4px'
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: online,
    onChange: () => setOnline(!online),
    label: online ? 'En ligne' : 'Hors ligne'
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "bell",
    variant: "solid",
    label: "Notifications"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 4,
      right: 5,
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'var(--error-dot)',
      border: '2px solid var(--bg-base)'
    }
  })));
}

/* ── Area chart (seul dégradé autorisé de la charte) ── */
function GainsChart() {
  const W = 560,
    H = 150,
    P = 8;
  const max = 40;
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const pts = GAINS.map((v, i) => [P + i * ((W - 2 * P) / 6), H - P - v / max * (H - 2 * P)]);
  const line = pts.map(p => p.join(',')).join(' ');
  const area = `${P},${H - P} ${line} ${W - P},${H - P}`;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W} ${H}`,
    style: {
      width: '100%',
      height: 'auto',
      display: 'block',
      overflow: 'visible'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "ggains",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#2756A6",
    stopOpacity: ".18"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#2756A6",
    stopOpacity: "0"
  }))), [0.25, 0.5, 0.75].map(f => /*#__PURE__*/React.createElement("line", {
    key: f,
    x1: P,
    x2: W - P,
    y1: H - P - f * (H - 2 * P),
    y2: H - P - f * (H - 2 * P),
    stroke: "var(--border-subtle)",
    strokeWidth: "1",
    strokeDasharray: "3 4"
  })), /*#__PURE__*/React.createElement("line", {
    x1: P,
    x2: W - P,
    y1: H - P,
    y2: H - P,
    stroke: "var(--border-default)",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: area,
    fill: "url(#ggains)"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: line,
    fill: "none",
    stroke: "var(--accent-400)",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), pts.map((p, i) => i === 5 ? /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("circle", {
    cx: p[0],
    cy: p[1],
    r: "7",
    fill: "var(--accent-500)",
    opacity: ".22"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: p[0],
    cy: p[1],
    r: "3",
    fill: "var(--accent-400)"
  })) : /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: p[0],
    cy: p[1],
    r: "2.4",
    fill: "var(--accent-400)",
    opacity: ".55"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 2px 0'
    }
  }, days.map(d => /*#__PURE__*/React.createElement("span", {
    key: d,
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--text-disabled)'
    }
  }, d))));
}

/* ── Tableau de bord ── */
function Dashboard({
  onOpen,
  online
}) {
  const kpis = [['Sessions du jour', '7', 'consultation', '+2 vs hier', 'success'], ['Gains de la semaine', '176 000 F', 'trending-up', '+12 % vs S-1', 'success'], ['Note moyenne', '4,8', 'star', '214 avis', 'neutral'], ['Comptes-rendus', '6/7', 'file-medical', '1 à rédiger', 'warning']];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '28px 32px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--accent-300)',
      marginBottom: 6
    }
  }, "Jeudi 11 juin 2026 \xB7 19:40"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 27,
      letterSpacing: '-0.7px',
      color: 'var(--text-primary)'
    }
  }, "Bonsoir, Dr Konat\xE9"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-tertiary)',
      marginTop: 4
    }
  }, "Tarif affich\xE9 : 30 min / 5 000 F \xB7 commission contractuelle incluse")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    iconLeft: "settings"
  }, "Mes tarifs"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconLeft: "rendez-vous"
  }, "Mes disponibilit\xE9s"))), !online && /*#__PURE__*/React.createElement(Banner, {
    tone: "warning",
    title: "Vous \xEAtes hors ligne",
    style: {
      marginBottom: 18
    }
  }, "Les patients ne peuvent pas initier de poign\xE9e de main. R\xE9activez votre pr\xE9sence en haut \xE0 droite."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16,
      marginBottom: 26
    }
  }, kpis.map(([l, v, ic, d, tone]) => /*#__PURE__*/React.createElement(Card, {
    key: l,
    padding: "15px 16px",
    grain: true,
    interactive: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-tertiary)'
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.14)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 25,
      letterSpacing: '-0.6px',
      color: 'var(--text-primary)',
      lineHeight: 1,
      whiteSpace: 'nowrap'
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: tone,
    size: "sm",
    dot: true
  }, d))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.55fr 1fr',
      gap: 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 26
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionLabel, {
    right: /*#__PURE__*/React.createElement(Badge, {
      tone: "accent",
      dot: true
    }, REQUESTS.length, " en attente")
  }, "Poign\xE9es de main \xE0 confirmer"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, REQUESTS.map(r => /*#__PURE__*/React.createElement(Card, {
    key: r.id,
    padding: "16px",
    interactive: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: r.name,
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 15,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap'
    }
  }, r.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-tertiary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, r.age, " ans \xB7 ", r.zone), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--warning-text)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 12
  }), "attend ", r.wait)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)',
      margin: '5px 0 9px',
      lineHeight: 1.5
    }
  }, r.motif), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, r.tags.map(t => /*#__PURE__*/React.createElement(Badge, {
    key: t,
    tone: "neutral",
    size: "sm"
  }, t)), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'inline-flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 15,
      color: 'var(--text-primary)'
    }
  }, fmtF(r.price)), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm"
  }, "Plus tard"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    iconLeft: "stethoscope",
    onClick: () => onOpen(r)
  }, "Confirmer"))))))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionLabel, {
    right: /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text-tertiary)'
      }
    }, "en milliers de F")
  }, "Gains de la semaine"), /*#__PURE__*/React.createElement(Card, {
    padding: "18px 18px 12px"
  }, /*#__PURE__*/React.createElement(GainsChart, null)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 26
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionLabel, null, "Agenda de ce soir"), /*#__PURE__*/React.createElement(Card, {
    padding: "6px 16px"
  }, AGENDA.map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: a.h,
    style: {
      display: 'flex',
      gap: 12,
      padding: '12px 0',
      borderTop: i ? '1px solid var(--border-subtle)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11.5,
      color: a.state === 'now' ? 'var(--accent-300)' : 'var(--text-tertiary)',
      width: 38,
      flexShrink: 0,
      paddingTop: 1
    }
  }, a.h), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flexShrink: 0,
      paddingTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: a.state === 'now' ? 'var(--accent-400)' : a.state === 'done' ? 'var(--success-dot)' : 'var(--bg-muted)',
      border: a.state === 'next' ? '1px solid var(--border-strong)' : 'none'
    }
  }), i < AGENDA.length - 1 && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      flex: 1,
      minHeight: 18,
      background: 'var(--border-subtle)',
      marginTop: 4
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      color: a.state === 'next' ? 'var(--text-secondary)' : 'var(--text-primary)'
    }
  }, a.t), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 11.5,
      color: 'var(--text-tertiary)',
      marginTop: 1
    }
  }, a.s)), a.state === 'now' && /*#__PURE__*/React.createElement(Badge, {
    tone: "accent",
    dot: true,
    size: "sm",
    style: {
      marginLeft: 'auto',
      alignSelf: 'center'
    }
  }, "Maintenant"))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionLabel, null, "Avis r\xE9cents"), /*#__PURE__*/React.createElement(Card, {
    padding: "6px 16px"
  }, [['Mireille N.', 'Réponses claires, je recommande.', '5,0'], ['Gaston B.', 'Très patient avec moi, merci docteur.', '4,5']].map(([n, t, note], i) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      padding: '12px 0',
      borderTop: i ? '1px solid var(--border-subtle)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 12.5,
      color: 'var(--text-primary)'
    }
  }, n), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "star",
    size: 11,
    color: "var(--warning-dot)"
  }), note)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-tertiary)',
      marginTop: 3,
      lineHeight: 1.5
    }
  }, t))))))));
}
window.ProSidebar = Sidebar;
window.ProTopbar = Topbar;
window.ProDashboard = Dashboard;
window.ProGainsChart = GainsChart;
window.ProSectionLabel = SectionLabel;
window.PRO_REQUESTS = REQUESTS;
window.proFmtF = fmtF;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/professionnel_desktop/desktop.jsx", error: String((e && e.message) || e) }); }

// ui_kits/professionnel_desktop/pages.jsx
try { (() => {
/* ULAMU — App professionnel : vues de navigation (Consultations, Patients,
   Agenda, Ordonnances, Gains, Annuaire). Compactes, données réalistes. */
const P = window.ULAMUDesignSystem_d14300;
const {
  Button: PB,
  IconButton: PIB,
  Badge: PBD,
  Avatar: PAV,
  Input: PIN,
  Card: PC,
  Icon: PIC,
  Banner: PBN,
  Tabs: PTB,
  Switch: PSW,
  VerifiedBadge: PVB
} = P;
const PSL = window.ProSectionLabel;
const pF = window.proFmtF;
function PageShell({
  title,
  sub,
  actions,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '28px 32px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 24,
      letterSpacing: '-0.6px',
      color: 'var(--text-primary)'
    }
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-tertiary)',
      marginTop: 4
    }
  }, sub)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, actions)), children);
}
function Row({
  children,
  last
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 0',
      borderBottom: last ? 'none' : '1px solid var(--border-subtle)'
    }
  }, children);
}

/* ── Consultations ── */
function ConsultationsPage({
  onOpen
}) {
  const [f, setF] = React.useState('attente');
  const DONE = [['Papa Gaston Bemba', 'Suivi hypertension', '18:30 · 15 min', 2500, 'Terminée'], ['Clarisse Moukala', 'Migraines récurrentes', 'hier · 30 min', 5000, 'Terminée'], ['Prisca Bahounga', 'Consultation', '9 juin · 30 min', 5000, 'Compte-rendu manquant']];
  return /*#__PURE__*/React.createElement(PageShell, {
    title: "Consultations",
    sub: "Poign\xE9es de main, sessions en cours et historique",
    actions: /*#__PURE__*/React.createElement(PB, {
      variant: "ghost",
      iconLeft: "filter"
    }, "Filtrer")
  }, /*#__PURE__*/React.createElement(PTB, {
    value: f,
    onChange: setF,
    items: [{
      id: 'attente',
      label: 'En attente',
      badge: '2'
    }, {
      id: 'historique',
      label: 'Historique',
      icon: 'consultation'
    }],
    style: {
      marginBottom: 18
    }
  }), f === 'attente' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, window.PRO_REQUESTS.map(r => /*#__PURE__*/React.createElement(PC, {
    key: r.id,
    padding: "16px",
    interactive: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(PAV, {
    name: r.name,
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 14.5,
      color: 'var(--text-primary)'
    }
  }, r.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-secondary)',
      marginTop: 2
    }
  }, r.motif)), /*#__PURE__*/React.createElement(PBD, {
    tone: "warning",
    dot: true,
    size: "sm"
  }, "attend ", r.wait), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, pF(r.price)), /*#__PURE__*/React.createElement(PB, {
    variant: "primary",
    size: "sm",
    iconLeft: "stethoscope",
    onClick: () => onOpen(r)
  }, "Confirmer"))))) : /*#__PURE__*/React.createElement(PC, {
    padding: "4px 18px"
  }, DONE.map(([n, m, when, price, st], i) => /*#__PURE__*/React.createElement(Row, {
    key: n,
    last: i === DONE.length - 1
  }, /*#__PURE__*/React.createElement(PAV, {
    name: n,
    size: "sm"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, m)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11.5,
      color: 'var(--text-tertiary)'
    }
  }, when), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-primary)',
      width: 64,
      textAlign: 'right'
    }
  }, pF(price)), /*#__PURE__*/React.createElement(PBD, {
    tone: st === 'Terminée' ? 'success' : 'warning',
    size: "sm",
    dot: true
  }, st)))));
}

/* ── Patients ── */
function PatientsPage() {
  const ROWS = [['Mireille Nkounkou', '32 ans · Talangaï', '3 sessions', 'Allergie pénicilline', 'error'], ['Papa Gaston Bemba', '58 ans · Pointe-Noire', '8 sessions', 'Hypertension', 'warning'], ['Prisca Bahounga', '22 ans · Centre-ville', '1 session', 'RAS', 'neutral'], ['Clarisse Moukala', '41 ans · Moungali', '2 sessions', 'RAS', 'neutral']];
  return /*#__PURE__*/React.createElement(PageShell, {
    title: "Patients",
    sub: "Patients rencontr\xE9s en session \u2014 acc\xE8s dossier limit\xE9 au cadre de soin",
    actions: /*#__PURE__*/React.createElement(PIN, {
      leftIcon: "search",
      placeholder: "Rechercher un patient\u2026",
      wrapperStyle: {
        width: 260
      }
    })
  }, /*#__PURE__*/React.createElement(PC, {
    padding: "4px 18px"
  }, ROWS.map(([n, meta, s, tag, tone], i) => /*#__PURE__*/React.createElement(Row, {
    key: n,
    last: i === ROWS.length - 1
  }, /*#__PURE__*/React.createElement(PAV, {
    name: n,
    size: "md"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, meta)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11.5,
      color: 'var(--text-tertiary)'
    }
  }, s), /*#__PURE__*/React.createElement(PBD, {
    tone: tone,
    size: "sm",
    dot: tone !== 'neutral'
  }, tag), /*#__PURE__*/React.createElement(PIB, {
    icon: "chevron-right",
    label: "Ouvrir"
  })))));
}

/* ── Agenda ── */
function AgendaPage() {
  const SLOTS = [['17:00', 'Disponibilité ouverte', 'créneau libre', 'free'], ['18:30', 'Papa Gaston Bemba', 'Suivi hypertension · 2 500 F', 'done'], ['19:42', 'Mireille Nkounkou', 'Consultation 30 min · 5 000 F', 'now'], ['20:30', 'Prisca Bahounga', 'Consultation 30 min · 5 000 F', 'next'], ['21:00', 'Fin de disponibilité', 'passage hors ligne automatique', 'off']];
  const C = {
    done: 'var(--success-dot)',
    now: 'var(--accent-400)',
    next: 'var(--bg-muted)',
    free: 'var(--bg-muted)',
    off: 'var(--bg-muted)'
  };
  return /*#__PURE__*/React.createElement(PageShell, {
    title: "Agenda",
    sub: "Jeudi 11 juin 2026 \u2014 vos cr\xE9neaux de disponibilit\xE9",
    actions: /*#__PURE__*/React.createElement(PB, {
      variant: "primary",
      iconLeft: "plus"
    }, "Ajouter un cr\xE9neau")
  }, /*#__PURE__*/React.createElement(PC, {
    padding: "6px 18px"
  }, SLOTS.map(([h, t, s, st], i) => /*#__PURE__*/React.createElement("div", {
    key: h,
    style: {
      display: 'flex',
      gap: 14,
      padding: '13px 0',
      borderBottom: i < SLOTS.length - 1 ? '1px solid var(--border-subtle)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: st === 'now' ? 'var(--accent-300)' : 'var(--text-tertiary)',
      width: 42,
      flexShrink: 0,
      paddingTop: 1
    }
  }, h), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: C[st],
      border: st === 'next' || st === 'free' || st === 'off' ? '1px solid var(--border-strong)' : 'none',
      marginTop: 5,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: st === 'off' || st === 'free' ? 'var(--text-tertiary)' : 'var(--text-primary)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)',
      marginTop: 1
    }
  }, s)), st === 'now' && /*#__PURE__*/React.createElement(PBD, {
    tone: "accent",
    dot: true,
    size: "sm"
  }, "En cours"), st === 'free' && /*#__PURE__*/React.createElement(PB, {
    variant: "ghost",
    size: "sm"
  }, "Fermer le cr\xE9neau")))));
}

/* ── Ordonnances ── */
function OrdonnancesPage() {
  const ROWS = [['ORD-2026-00412', 'Mireille Nkounkou', 'Amlodipine · Ramipril', '11 juin', 'Réservée', 'accent'], ['ORD-2026-00398', 'Papa Gaston Bemba', 'Ramipril 10 mg', '4 juin', 'Délivrée', 'success'], ['ORD-2026-00371', 'Clarisse Moukala', 'Paracétamol · Sumatriptan', '28 mai', 'Délivrée', 'success'], ['ORD-2026-00342', 'Prisca Bahounga', 'Contraceptif oral', '12 mai', 'Expirée', 'neutral']];
  return /*#__PURE__*/React.createElement(PageShell, {
    title: "Ordonnances",
    sub: "Sign\xE9es num\xE9riquement \xB7 QR v\xE9rifiable en pharmacie \xB7 garde-fou allergies",
    actions: /*#__PURE__*/React.createElement(PB, {
      variant: "ghost",
      iconLeft: "download"
    }, "Exporter")
  }, /*#__PURE__*/React.createElement(PC, {
    padding: "4px 18px"
  }, ROWS.map(([code, n, meds, dte, st, tone], i) => /*#__PURE__*/React.createElement(Row, {
    key: code,
    last: i === ROWS.length - 1
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.14)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(PIC, {
    name: "ordonnance",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 150,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-accent)'
    }
  }, code), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-tertiary)',
      marginTop: 1
    }
  }, dte, " 2026")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      color: 'var(--text-primary)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, meds)), /*#__PURE__*/React.createElement(PBD, {
    tone: tone,
    size: "sm",
    dot: true
  }, st), /*#__PURE__*/React.createElement(PIB, {
    icon: "qr-code",
    label: "Voir le QR"
  })))));
}

/* ── Gains ── */
function GainsPage() {
  const TX = [['Consultation — Mireille N.', '11 juin · 19:42', '+4 500 F', 'Commission 500 F'], ['Suivi — Papa Gaston B.', '11 juin · 18:30', '+2 250 F', 'Commission 250 F'], ['Retrait MTN MoMo', '10 juin', '-150 000 F', 'Vers 06 612 45 90'], ['Consultation — Clarisse M.', '10 juin', '+4 500 F', 'Commission 500 F']];
  return /*#__PURE__*/React.createElement(PageShell, {
    title: "Gains",
    sub: "L'argent aveugle : cr\xE9dit\xE9 apr\xE8s chaque acte, retirable \xE0 tout moment",
    actions: /*#__PURE__*/React.createElement(PB, {
      variant: "primary",
      iconLeft: "credit-card"
    }, "Retirer vers MoMo")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1.4fr',
      gap: 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 'var(--radius-xl)',
      background: 'var(--accent-500)',
      padding: 20,
      boxShadow: 'var(--shadow-md)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 0.1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.66)'
    }
  }, "Solde disponible"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 34,
      letterSpacing: '-1px',
      color: '#fff',
      margin: '6px 0 10px'
    }
  }, "86 750 F"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 11.5,
      color: 'rgba(255,255,255,0.85)'
    }
  }, /*#__PURE__*/React.createElement(PIC, {
    name: "shield-check",
    size: 13
  }), "Commission contractuelle : 10 % \xB7 jamais modifi\xE9e sans pr\xE9avis"))), /*#__PURE__*/React.createElement(PC, {
    padding: "18px 18px 12px"
  }, /*#__PURE__*/React.createElement(PSL, {
    right: /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text-tertiary)'
      }
    }, "milliers de F")
  }, "Semaine"), /*#__PURE__*/React.createElement(window.ProGainsChart, null))), /*#__PURE__*/React.createElement(PC, {
    padding: "4px 18px"
  }, TX.map(([t, when, amt, note], i) => /*#__PURE__*/React.createElement(Row, {
    key: i,
    last: i === TX.length - 1
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-md)',
      background: amt.startsWith('+') ? 'var(--success-bg)' : 'rgba(39,86,166,0.14)',
      color: amt.startsWith('+') ? 'var(--success-dot)' : 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(PIC, {
    name: amt.startsWith('+') ? 'trending-up' : 'credit-card',
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      color: 'var(--text-primary)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-tertiary)'
    }
  }, when, " \xB7 ", note)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      fontWeight: 600,
      color: amt.startsWith('+') ? 'var(--success-text)' : 'var(--text-primary)'
    }
  }, amt))))));
}

/* ── Annuaire (vitrine publique M05) ── */
function AnnuairePage() {
  const [online, setOnline] = React.useState(true);
  return /*#__PURE__*/React.createElement(PageShell, {
    title: "Annuaire",
    sub: "Votre vitrine publique \u2014 ce que les patients voient avant la poign\xE9e de main"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(PC, {
    padding: "20px"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(PAV, {
    name: "Armel Konat\xE9",
    size: "xl",
    status: online ? 'online' : undefined
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 17,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap'
    }
  }, "Dr Armel Konat\xE9"), /*#__PURE__*/React.createElement(PVB, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, "M\xE9decin g\xE9n\xE9raliste \xB7 Brazzaville"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(PBD, {
    tone: online ? 'success' : 'neutral',
    dot: true,
    size: "sm"
  }, online ? 'En ligne' : 'Hors ligne'), /*#__PURE__*/React.createElement(PBD, {
    tone: "neutral",
    size: "sm",
    icon: "star"
  }, "4,8 \xB7 214 avis")))), /*#__PURE__*/React.createElement(PSW, {
    checked: online,
    onChange: () => setOnline(!online),
    label: "Visible dans les recherches des patients"
  }), /*#__PURE__*/React.createElement(PBN, {
    tone: "info",
    style: {
      marginTop: 14
    },
    title: "Badge v\xE9rifi\xE9 actif"
  }, "Votre dossier de v\xE9rification (dipl\xF4me + ordre des m\xE9decins) est valid\xE9 \u2014 il prot\xE8ge votre r\xE9putation contre les usurpateurs.")), /*#__PURE__*/React.createElement(PC, {
    padding: "6px 18px"
  }, [['stethoscope', 'Consultation messagerie', '30 min', '5 000 F', true], ['refresh', 'Session de suivi', '15 min', '2 500 F', true], ['video', 'Téléconsultation vidéo', '—', 'V1', false]].map(([ic, t, dur, p, on], i) => /*#__PURE__*/React.createElement(Row, {
    key: t,
    last: i === 2
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.14)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(PIC, {
    name: ic,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: on ? 'var(--text-primary)' : 'var(--text-tertiary)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-tertiary)'
    }
  }, dur)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 13.5,
      color: on ? 'var(--text-primary)' : 'var(--text-disabled)'
    }
  }, p), /*#__PURE__*/React.createElement(PIB, {
    icon: "edit",
    label: "Modifier",
    size: "sm"
  }))))));
}
window.ProPages = {
  consultation: ConsultationsPage,
  patient: PatientsPage,
  'rendez-vous': AgendaPage,
  ordonnance: OrdonnancesPage,
  'credit-card': GainsPage,
  users: AnnuairePage
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/professionnel_desktop/pages.jsx", error: String((e && e.message) || e) }); }

// ui_kits/structure_labo/labo.jsx
try { (() => {
/* ULAMU — Espace structure : Laboratoire Avenir (Moungali).
   Demandes d'examens prescrites via ULAMU, accueil patient par scan QR,
   résultats saisis puis validés par le biologiste, versés au dossier. */
const LB = window.ULAMUDesignSystem_d14300;
const {
  Button,
  IconButton,
  Badge,
  Avatar,
  Input,
  Card,
  Icon,
  Banner,
  NavItem,
  Modal,
  Switch,
  VerifiedBadge
} = LB;
const DEMANDES = [{
  id: 'EX-2026-0089',
  patient: 'Mireille Nkounkou',
  age: 32,
  prescripteur: 'Dr Armel Konaté',
  exams: ['NFS', 'Glycémie à jeun', 'Bilan lipidique', 'Créatininémie'],
  total: '18 500 F',
  state: 'attendu',
  when: 'aujourd\'hui'
}, {
  id: 'EX-2026-0087',
  patient: 'Papa Gaston Bemba',
  age: 58,
  prescripteur: 'Dr Armel Konaté',
  exams: ['Créatininémie', 'Ionogramme'],
  total: '9 000 F',
  state: 'preleve',
  when: '11:20'
}, {
  id: 'EX-2026-0085',
  patient: 'Clarisse Moukala',
  age: 41,
  prescripteur: 'Dr Solange Mbemba',
  exams: ['Test paludisme (TDR)', 'NFS'],
  total: '7 500 F',
  state: 'preleve',
  when: '09:48'
}];
const STATES = {
  attendu: ['info', 'Patient attendu'],
  preleve: ['warning', 'En analyse'],
  valider: ['warning', 'À valider'],
  verse: ['success', 'Versé au dossier']
};
function LSectionLabel({
  children,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      margin: '0 0 12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)'
    }
  }, children), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--border-subtle)'
    }
  }), right);
}

/* ── Sidebar shadcn : entête / corps / pied avec menu utilisateur ── */
function LaboSidebar({
  nav,
  setNav,
  theme,
  onTheme
}) {
  const items = [['dashboard', 'Tableau de bord', null], ['syringe', 'Demandes', '3'], ['activity', 'Résultats', '2'], ['file-medical', 'Catalogue', null], ['credit-card', 'Gains', null], ['users', 'Membres', null]];
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [hovItem, setHovItem] = React.useState(null);
  const menuRef = React.useRef(null);
  React.useEffect(() => {
    if (!menuOpen) return;
    const close = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);
  const itemStyle = (id, danger) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    height: 34,
    padding: '0 10px',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 'var(--radius-md)',
    textAlign: 'left',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    fontWeight: 500,
    background: hovItem === id ? danger ? 'var(--error-bg)' : 'var(--bg-subtle)' : 'transparent',
    color: danger ? 'var(--error-text)' : 'var(--text-primary)',
    transition: 'background var(--dur-fast) linear'
  });
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 240,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderRight: '1px solid var(--glass-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '14px 16px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 'var(--radius-md)',
      background: 'var(--accent-500)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'var(--grain-btn)'
    }
  }), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 2C5.8 2 4 3.8 4 6c0 1.4.7 2.6 1.8 3.3L5 12h6l-.8-2.7C11.3 8.6 12 7.4 12 6c0-2.2-1.8-4-4-4z",
    fill: "#fff",
    fillOpacity: ".92"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5.5",
    y: "12.5",
    width: "5",
    height: "1.5",
    rx: ".75",
    fill: "#fff",
    fillOpacity: ".72"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)'
    }
  }, "ulamu"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.05em',
      color: 'var(--accent-300)',
      border: '1px solid rgba(111,146,218,0.3)',
      background: 'rgba(39,86,166,0.16)',
      borderRadius: 4,
      padding: '2px 5px'
    }
  }, "LABO")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '12px 12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padding: "11px 12px",
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.16)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "syringe",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 12.5,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, "Laboratoire Avenir"), /*#__PURE__*/React.createElement(VerifiedBadge, {
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: 'var(--text-tertiary)'
    }
  }, "Moungali, Brazzaville")))), items.map(([ic, l, b]) => /*#__PURE__*/React.createElement(NavItem, {
    key: ic,
    icon: ic,
    label: l,
    badge: b,
    active: nav === ic,
    onClick: () => setNav(ic)
  }))), /*#__PURE__*/React.createElement("div", {
    ref: menuRef,
    style: {
      flexShrink: 0,
      position: 'relative',
      padding: 12,
      borderTop: '1px solid var(--border-subtle)'
    }
  }, menuOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 'calc(100% + 6px)',
      left: 12,
      right: 12,
      zIndex: 50,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-xl)',
      padding: 6,
      animation: 'ulamu-menu-in2 var(--dur-base) var(--ease-spring)'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes ulamu-menu-in2{from{transform:translateY(6px) scale(.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 10px 10px'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Honorine Samba",
    size: "md",
    status: "online"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, "Dr Honorine Samba"), /*#__PURE__*/React.createElement(VerifiedBadge, {
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginTop: 1
    }
  }, "Biologiste \xB7 R\xF4le : titulaire"))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-subtle)',
      margin: '0 4px 6px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      height: 34,
      padding: '0 10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: theme === 'dark' ? 'moon' : 'sun',
    size: 15
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-primary)'
    }
  }, "Th\xE8me sombre"), /*#__PURE__*/React.createElement(Switch, {
    checked: theme === 'dark',
    onChange: onTheme
  })), /*#__PURE__*/React.createElement("button", {
    style: itemStyle('settings'),
    onMouseEnter: () => setHovItem('settings'),
    onMouseLeave: () => setHovItem(null)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings",
    size: 15
  })), "Param\xE8tres"), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-subtle)',
      margin: '6px 4px'
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: itemStyle('logout', true),
    onMouseEnter: () => setHovItem('logout'),
    onMouseLeave: () => setHovItem(null)
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "log-out",
    size: 15
  })), "Se d\xE9connecter")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setMenuOpen(o => !o),
    "aria-expanded": menuOpen,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      width: '100%',
      padding: '7px 8px',
      border: '1px solid transparent',
      cursor: 'pointer',
      borderRadius: 'var(--radius-md)',
      textAlign: 'left',
      background: menuOpen ? 'var(--bg-subtle)' : 'transparent',
      borderColor: menuOpen ? 'var(--border-default)' : 'transparent',
      transition: 'background var(--dur-fast) linear'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Honorine Samba",
    size: "sm",
    status: "online"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 12.5,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, "Dr Honorine Samba"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 10.5,
      color: 'var(--text-tertiary)'
    }
  }, "Titulaire \xB7 Biologiste")), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-tertiary)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: menuOpen ? 'chevron-down' : 'chevron-up',
    size: 14
  })))));
}
function LaboTopbar({
  crumb
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 24px',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--glass-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-primary)',
      fontWeight: 500
    }
  }, crumb), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      maxWidth: 340,
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    leftIcon: "search",
    placeholder: "Demande, patient, examen\u2026",
    style: {
      height: 32,
      fontSize: 13
    }
  })), /*#__PURE__*/React.createElement(Badge, {
    tone: "success",
    dot: true
  }, "R\xE9sultats sous 6 h en moyenne"), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "bell",
    variant: "solid",
    label: "Notifications"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 4,
      right: 5,
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'var(--error-dot)',
      border: '2px solid var(--bg-base)'
    }
  })));
}

/* ── Accueil patient : scan du QR de la demande ── */
function LaboScanModal({
  onClose,
  onDone
}) {
  const [phase, setPhase] = React.useState('scan');
  React.useEffect(() => {
    if (phase !== 'scan') return;
    const t = setTimeout(() => setPhase('found'), 2200);
    return () => clearTimeout(t);
  }, [phase]);
  const d = DEMANDES[0];
  return /*#__PURE__*/React.createElement(Modal, {
    title: phase === 'done' ? 'Prélèvement enregistré' : 'Accueillir un patient',
    onClose: onClose,
    width: 460,
    footer: phase === 'found' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onClose
    }, "Annuler"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      iconLeft: "syringe",
      onClick: () => setPhase('done')
    }, "Enregistrer le pr\xE9l\xE8vement")) : phase === 'done' ? /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      iconLeft: "check-circle",
      onClick: () => {
        onDone();
        onClose();
      }
    }, "Terminer") : /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onClose
    }, "Annuler")
  }, phase === 'scan' && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '14px 0 18px'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes lscan{0%,100%{transform:translateY(-44px)}50%{transform:translateY(44px)}}'), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 130,
      height: 130,
      margin: '0 auto 14px',
      borderRadius: 'var(--radius-lg)',
      border: '1.5px dashed var(--accent-400)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      background: 'var(--bg-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "qr-code",
    size: 56,
    strokeWidth: 1.2,
    color: "var(--text-disabled)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 10,
      right: 10,
      height: 2,
      borderRadius: 1,
      background: 'var(--accent-400)',
      boxShadow: '0 0 12px rgba(39,86,166,0.8)',
      animation: 'lscan 1.6s ease-in-out infinite'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, "Pr\xE9sentez le QR de la demande d'examens"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-tertiary)',
      marginTop: 3
    }
  }, "Recherche de la demande en cours\u2026")), phase === 'found' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      paddingBottom: 6
    }
  }, /*#__PURE__*/React.createElement(Banner, {
    tone: "success",
    title: `Demande authentique — ${d.id}`
  }, "Prescrite par ", d.prescripteur, " \xB7 11 juin 2026 \xB7 pay\xE9e via ULAMU."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '9px 12px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-subtle)',
      border: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: d.patient,
    size: "sm"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      fontFamily: 'var(--font-body)',
      color: 'var(--text-primary)'
    }
  }, d.patient), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      color: 'var(--text-tertiary)'
    }
  }, "PAT-2026-08317 \xB7 ", d.age, " ans")), /*#__PURE__*/React.createElement(Badge, {
    tone: "accent",
    size: "sm",
    icon: "shield-check"
  }, "Identit\xE9 confirm\xE9e")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6
    }
  }, d.exams.map(x => /*#__PURE__*/React.createElement(Badge, {
    key: x,
    tone: "neutral",
    icon: "activity"
  }, x))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 13
  }), "4 tubes \xE0 \xE9tiqueter \u2014 les codes s'impriment \xE0 l'enregistrement.")), phase === 'done' && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '14px 0 16px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 56,
      height: 56,
      borderRadius: '50%',
      background: 'var(--success-bg)',
      border: '1px solid var(--success-border)',
      color: 'var(--success-dot)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check-circle",
    size: 28
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 16,
      color: 'var(--text-primary)'
    }
  }, "Pr\xE9l\xE8vement de ", d.patient.split(' ')[0], " enregistr\xE9"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-tertiary)',
      marginTop: 4,
      lineHeight: 1.5
    }
  }, "4 tubes \xE9tiquet\xE9s \xB7 le prescripteur est notifi\xE9", /*#__PURE__*/React.createElement("br", null), "R\xE9sultats attendus sous 6 h")));
}

/* ── Tableau de bord ── */
function LaboDashboard({
  onScan,
  onResults,
  sampled
}) {
  const kpis = [['Demandes du jour', sampled ? '13' : '12', 'syringe', '3 en attente'], ['Résultats à valider', '2', 'activity', 'biologiste requis'], ['Délai moyen', '4 h 10', 'clock', 'prélèvement → résultat'], ['Gains du jour', '86 000 F', 'trending-up', '+9 % vs hier']];
  const list = sampled ? [{
    ...DEMANDES[0],
    state: 'preleve',
    when: 'à l\'instant'
  }, ...DEMANDES.slice(1)] : DEMANDES;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '28px 32px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--accent-300)',
      marginBottom: 6
    }
  }, "Jeudi 11 juin 2026 \xB7 20:05"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 26,
      letterSpacing: '-0.7px',
      color: 'var(--text-primary)'
    }
  }, "Laboratoire Avenir"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-tertiary)',
      marginTop: 4
    }
  }, "Chaque r\xE9sultat valid\xE9 est vers\xE9 au dossier du patient et notifi\xE9 au prescripteur.")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    iconLeft: "qr-code",
    onClick: onScan
  }, "Accueillir un patient")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16,
      marginBottom: 26
    }
  }, kpis.map(([l, v, ic, d]) => /*#__PURE__*/React.createElement(Card, {
    key: l,
    padding: "15px 16px",
    grain: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-tertiary)'
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.14)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 25,
      letterSpacing: '-0.6px',
      color: 'var(--text-primary)',
      lineHeight: 1,
      whiteSpace: 'nowrap'
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-tertiary)',
      marginTop: 8
    }
  }, d)))), /*#__PURE__*/React.createElement(LSectionLabel, {
    right: /*#__PURE__*/React.createElement(Badge, {
      tone: "accent",
      dot: true
    }, list.length, " demandes")
  }, "Demandes d'examens \u2014 prescrites via ULAMU"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, sampled && /*#__PURE__*/React.createElement(Banner, {
    tone: "success",
    title: "Pr\xE9l\xE8vement de Mireille N. enregistr\xE9"
  }, "4 tubes \xE9tiquet\xE9s \xB7 prescripteur notifi\xE9 \xB7 r\xE9sultats attendus sous 6 h."), list.map(d => {
    const [tone, label] = STATES[d.state];
    return /*#__PURE__*/React.createElement(Card, {
      key: d.id,
      padding: "16px",
      interactive: true
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: d.patient,
      size: "md"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--text-accent)'
      }
    }, d.id), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        fontSize: 14,
        color: 'var(--text-primary)'
      }
    }, d.patient), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text-tertiary)'
      }
    }, d.age, " ans \xB7 ", d.when)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: 'var(--text-secondary)',
        marginTop: 4
      }
    }, d.exams.join(' · ')), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: 'var(--text-tertiary)',
        marginTop: 3
      }
    }, "Prescrit par ", d.prescripteur)), /*#__PURE__*/React.createElement(Badge, {
      tone: tone,
      size: "sm",
      dot: true
    }, label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 15,
        color: 'var(--text-primary)',
        whiteSpace: 'nowrap'
      }
    }, d.total), d.state === 'attendu' ? /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      iconLeft: "qr-code",
      onClick: onScan
    }, "Accueillir") : /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      iconLeft: "activity",
      onClick: onResults
    }, "R\xE9sultats")));
  })));
}
window.LaboSidebar = LaboSidebar;
window.LaboTopbar = LaboTopbar;
window.LaboScanModal = LaboScanModal;
window.LaboDashboard = LaboDashboard;
window.LaboSectionLabel = LSectionLabel;
window.LABO_DEMANDES = DEMANDES;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/structure_labo/labo.jsx", error: String((e && e.message) || e) }); }

// ui_kits/structure_labo/labo2.jsx
try { (() => {
/* ULAMU — Espace laboratoire : Résultats (saisie + validation biologiste),
   Catalogue, Gains, Membres + contrôleur racine LaboApp. */
const LB2 = window.ULAMUDesignSystem_d14300;
const {
  Button: LBB,
  IconButton: LIB,
  Badge: LBD,
  Avatar: LAV,
  Input: LIN,
  Card: LC,
  Icon: LICn,
  Banner: LBN,
  Switch: LSW
} = LB2;
const LSL = window.LaboSectionLabel;
function LRow({
  children,
  last
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 0',
      borderBottom: last ? 'none' : '1px solid var(--border-subtle)'
    }
  }, children);
}
function LShell({
  title,
  sub,
  actions,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '28px 32px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 24,
      letterSpacing: '-0.6px',
      color: 'var(--text-primary)'
    }
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-tertiary)',
      marginTop: 4
    }
  }, sub)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, actions)), children);
}

/* ── Résultats : saisie + validation par le biologiste ── */
const ANALYTES = [{
  name: 'Glycémie à jeun',
  val: '1,26',
  unit: 'g/L',
  ref: '0,70 – 1,10',
  flag: 'high'
}, {
  name: 'Créatininémie',
  val: '11',
  unit: 'mg/L',
  ref: '6 – 12',
  flag: 'ok'
}, {
  name: 'Cholestérol total',
  val: '2,38',
  unit: 'g/L',
  ref: '< 2,00',
  flag: 'high'
}, {
  name: 'Hémoglobine (NFS)',
  val: '12,8',
  unit: 'g/dL',
  ref: '12 – 16',
  flag: 'ok'
}];
function ResultatsPage({
  onValidated,
  validated
}) {
  const [open, setOpen] = React.useState(true);
  const pending = [['EX-2026-0087', 'Papa Gaston Bemba', 'Créatininémie · Ionogramme', 'saisie en cours']];
  return /*#__PURE__*/React.createElement(LShell, {
    title: "R\xE9sultats",
    sub: "Saisis par le technicien, valid\xE9s par le biologiste, puis vers\xE9s au dossier patient",
    actions: /*#__PURE__*/React.createElement(LBB, {
      variant: "ghost",
      iconLeft: "filter"
    }, "Filtrer")
  }, validated && /*#__PURE__*/React.createElement(LBN, {
    tone: "success",
    title: "EX-2026-0089 vers\xE9 au dossier de Mireille N.",
    style: {
      marginBottom: 16
    }
  }, "Le prescripteur Dr Armel Konat\xE9 est notifi\xE9 \xB7 2 valeurs hors normes signal\xE9es."), !validated && /*#__PURE__*/React.createElement(LC, {
    padding: "0",
    style: {
      marginBottom: 16,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      padding: '14px 18px',
      border: 'none',
      cursor: 'pointer',
      background: 'transparent',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-md)',
      background: 'var(--warning-bg)',
      border: '1px solid var(--warning-border)',
      color: 'var(--warning-dot)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(LICn, {
    name: "activity",
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12.5,
      fontWeight: 600,
      color: 'var(--text-accent)'
    }
  }, "EX-2026-0089"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 700,
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, "Mireille Nkounkou")), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 12,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, "Bilan cardiaque \xB7 4 analytes saisis \xB7 prescrit par Dr Armel Konat\xE9")), /*#__PURE__*/React.createElement(LBD, {
    tone: "warning",
    dot: true,
    size: "sm"
  }, "\xC0 valider"), /*#__PURE__*/React.createElement(LICn, {
    name: open ? 'chevron-up' : 'chevron-down',
    size: 15,
    color: "var(--text-tertiary)"
  })), open && /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-subtle)',
      padding: '6px 18px 16px'
    }
  }, ANALYTES.map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: a.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '11px 0',
      borderBottom: i < ANALYTES.length - 1 ? '1px solid var(--border-subtle)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      color: 'var(--text-primary)'
    }
  }, a.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      fontWeight: 600,
      color: a.flag === 'high' ? 'var(--warning-text)' : 'var(--text-primary)',
      width: 70,
      textAlign: 'right'
    }
  }, a.val, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'var(--text-tertiary)',
      fontWeight: 400
    }
  }, a.unit)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-tertiary)',
      width: 110,
      textAlign: 'right'
    }
  }, "r\xE9f. ", a.ref), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 96,
      display: 'flex',
      justifyContent: 'flex-end'
    }
  }, a.flag === 'high' ? /*#__PURE__*/React.createElement(LBD, {
    tone: "warning",
    size: "sm",
    icon: "trending-up"
  }, "\xC9lev\xE9") : /*#__PURE__*/React.createElement(LBD, {
    tone: "success",
    size: "sm",
    dot: true
  }, "Normal")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement(LICn, {
    name: "shield-check",
    size: 13,
    color: "var(--success-dot)"
  }), "Signature \xE9lectronique du biologiste requise"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(LBB, {
    variant: "ghost",
    size: "sm",
    iconLeft: "edit"
  }, "Corriger la saisie"), /*#__PURE__*/React.createElement(LBB, {
    variant: "primary",
    size: "sm",
    iconLeft: "check-circle",
    onClick: onValidated
  }, "Valider & verser au dossier")))), /*#__PURE__*/React.createElement(LSL, null, "En cours de saisie"), /*#__PURE__*/React.createElement(LC, {
    padding: "4px 18px"
  }, pending.map(([id, n, ex, st], i) => /*#__PURE__*/React.createElement(LRow, {
    key: id,
    last: i === pending.length - 1
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.14)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(LICn, {
    name: "syringe",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 150,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-accent)'
    }
  }, id)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      color: 'var(--text-primary)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, ex)), /*#__PURE__*/React.createElement(LBD, {
    tone: "neutral",
    size: "sm",
    dot: true
  }, st), /*#__PURE__*/React.createElement(LIB, {
    icon: "chevron-right",
    label: "Ouvrir"
  })))));
}

/* ── Catalogue d'examens ── */
function CataloguePage() {
  const [visible, setVisible] = React.useState(true);
  const ROWS = [['NFS (Numération formule sanguine)', 'Hématologie', '4 h', '5 000 F', true], ['Glycémie à jeun', 'Biochimie', '2 h', '2 500 F', true], ['Bilan lipidique', 'Biochimie', '4 h', '6 000 F', true], ['Créatininémie', 'Biochimie', '2 h', '3 000 F', true], ['Test paludisme (TDR)', 'Parasitologie', '30 min', '2 000 F', true], ['ECBU', 'Bactériologie', '48 h', '7 500 F', false]];
  return /*#__PURE__*/React.createElement(LShell, {
    title: "Catalogue",
    sub: "Vos examens, d\xE9lais et tarifs \u2014 visibles par les prescripteurs au moment de la demande",
    actions: /*#__PURE__*/React.createElement(LBB, {
      variant: "primary",
      iconLeft: "plus"
    }, "Ajouter un examen")
  }, /*#__PURE__*/React.createElement(LC, {
    padding: "14px 16px",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(LSW, {
    checked: visible,
    onChange: () => setVisible(!visible),
    label: "Visible dans les demandes des prescripteurs"
  })), /*#__PURE__*/React.createElement(LC, {
    padding: "4px 18px"
  }, ROWS.map(([n, fam, delai, prix, on], i) => /*#__PURE__*/React.createElement(LRow, {
    key: n,
    last: i === ROWS.length - 1
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.14)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(LICn, {
    name: "activity",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: on ? 'var(--text-primary)' : 'var(--text-tertiary)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-tertiary)'
    }
  }, fam)), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontFamily: 'var(--font-mono)',
      fontSize: 11.5,
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement(LICn, {
    name: "clock",
    size: 12
  }), delai), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 14,
      color: on ? 'var(--text-primary)' : 'var(--text-disabled)',
      width: 70,
      textAlign: 'right'
    }
  }, prix), /*#__PURE__*/React.createElement(LBD, {
    tone: on ? 'success' : 'neutral',
    size: "sm",
    dot: true
  }, on ? 'Proposé' : 'Suspendu'), /*#__PURE__*/React.createElement(LIB, {
    icon: "edit",
    size: "sm",
    label: "Modifier"
  })))));
}

/* ── Gains ── */
function LaboGains() {
  return /*#__PURE__*/React.createElement(LShell, {
    title: "Gains",
    sub: "Examens pay\xE9s via ULAMU \u2014 cr\xE9dit\xE9s \xE0 la validation des r\xE9sultats",
    actions: /*#__PURE__*/React.createElement(LBB, {
      variant: "primary",
      iconLeft: "credit-card"
    }, "Retirer vers MoMo")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1.4fr',
      gap: 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 'var(--radius-xl)',
      background: 'var(--accent-500)',
      padding: 20,
      boxShadow: 'var(--shadow-md)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 0.1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.66)'
    }
  }, "Solde disponible"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 34,
      letterSpacing: '-1px',
      color: '#fff',
      margin: '6px 0 10px'
    }
  }, "241 500 F"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 11.5,
      color: 'rgba(255,255,255,0.85)'
    }
  }, /*#__PURE__*/React.createElement(LICn, {
    name: "shield-check",
    size: 13
  }), "Cr\xE9dit\xE9 \xE0 la validation \xB7 commission contractuelle incluse"))), /*#__PURE__*/React.createElement(LC, {
    padding: "4px 18px"
  }, [['Bilan cardiaque — Mireille N.', 'EX-2026-0089 · en attente de validation', '18 500 F', false], ['Ionogramme — Papa Gaston B.', 'EX-2026-0087 · 11 juin', '+9 000 F', true], ['TDR + NFS — Clarisse M.', 'EX-2026-0085 · 11 juin', '+7 500 F', true], ['Retrait MTN MoMo', '8 juin', '-120 000 F', true]].map(([t, s, a, done], i, arr) => /*#__PURE__*/React.createElement(LRow, {
    key: i,
    last: i === arr.length - 1
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-md)',
      background: a.startsWith('+') ? 'var(--success-bg)' : 'rgba(39,86,166,0.14)',
      color: a.startsWith('+') ? 'var(--success-dot)' : 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(LICn, {
    name: a.startsWith('-') ? 'credit-card' : 'activity',
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      color: 'var(--text-primary)'
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-tertiary)'
    }
  }, s)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      fontWeight: 600,
      color: !done ? 'var(--text-disabled)' : a.startsWith('+') ? 'var(--success-text)' : 'var(--text-primary)'
    }
  }, a))))));
}

/* ── Membres ── */
function LaboMembres() {
  const ROWS = [['Honorine Samba', 'Titulaire · Biologiste', 'Validation des résultats · signature', 'accent', 'online'], ['Trésor Mabiala', 'Membre · Technicien', 'Prélèvements · saisie des résultats', 'neutral', 'online'], ['Grâce Okandzi', 'Membre · Accueil', 'Accueil patients · scan des demandes', 'neutral', undefined]];
  return /*#__PURE__*/React.createElement(LShell, {
    title: "Membres",
    sub: "Un titulaire biologiste responsable, des membres aux droits limit\xE9s (M02)",
    actions: /*#__PURE__*/React.createElement(LBB, {
      variant: "primary",
      iconLeft: "plus"
    }, "Inviter un membre")
  }, /*#__PURE__*/React.createElement(LC, {
    padding: "4px 18px"
  }, ROWS.map(([n, role, rights, tone, st], i) => /*#__PURE__*/React.createElement(LRow, {
    key: n,
    last: i === ROWS.length - 1
  }, /*#__PURE__*/React.createElement(LAV, {
    name: n,
    size: "md",
    status: st
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, rights)), /*#__PURE__*/React.createElement(LBD, {
    tone: tone,
    size: "sm"
  }, role), /*#__PURE__*/React.createElement(LIB, {
    icon: "more-vertical",
    label: "Options"
  })))), /*#__PURE__*/React.createElement(LBN, {
    tone: "info",
    style: {
      marginTop: 16
    },
    title: "Seul le biologiste valide"
  }, "Un r\xE9sultat saisi par un technicien n'est vers\xE9 au dossier qu'apr\xE8s signature du titulaire \u2014 trac\xE9e au journal inalt\xE9rable (M04)."));
}

/* ── Racine ── */
function LaboApp() {
  const [nav, setNav] = React.useState('dashboard');
  const [scan, setScan] = React.useState(false);
  const [sampled, setSampled] = React.useState(false);
  const [validated, setValidated] = React.useState(false);
  const [theme, setThemeState] = React.useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const toggleTheme = () => setThemeState(t => {
    const n = t === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    try {
      localStorage.setItem('ulamu-theme', n);
    } catch (e) {}
    return n;
  });
  const NAMES = {
    dashboard: 'Tableau de bord',
    syringe: 'Demandes',
    activity: 'Résultats',
    'file-medical': 'Catalogue',
    'credit-card': 'Gains',
    users: 'Membres'
  };
  let main;
  if (nav === 'activity') main = /*#__PURE__*/React.createElement(ResultatsPage, {
    validated: validated,
    onValidated: () => setValidated(true)
  });else if (nav === 'file-medical') main = /*#__PURE__*/React.createElement(CataloguePage, null);else if (nav === 'credit-card') main = /*#__PURE__*/React.createElement(LaboGains, null);else if (nav === 'users') main = /*#__PURE__*/React.createElement(LaboMembres, null);else main = /*#__PURE__*/React.createElement(window.LaboDashboard, {
    sampled: sampled,
    onScan: () => setScan(true),
    onResults: () => setNav('activity')
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement(window.LaboSidebar, {
    nav: nav === 'syringe' ? 'dashboard' : nav,
    setNav: n => setNav(n === 'syringe' ? 'dashboard' : n),
    theme: theme,
    onTheme: toggleTheme
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(window.LaboTopbar, {
    crumb: NAMES[nav]
  }), main), scan && /*#__PURE__*/React.createElement(window.LaboScanModal, {
    onClose: () => setScan(false),
    onDone: () => setSampled(true)
  }));
}
window.LaboApp = LaboApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/structure_labo/labo2.jsx", error: String((e && e.message) || e) }); }

// ui_kits/structure_pharmacie/pharmacie.jsx
try { (() => {
/* ULAMU — Espace structure : Pharmacie du Marché (Poto-Poto).
   Sidebar, topbar, tableau de bord (réservations 24 h issues des
   dévoilements) et flux de délivrance par scan QR (M09/M11). */
const PH = window.ULAMUDesignSystem_d14300;
const {
  Button,
  IconButton,
  Badge,
  Avatar,
  Input,
  Card,
  Icon,
  Banner,
  NavItem,
  Modal,
  Switch,
  VerifiedBadge
} = PH;
const RESAS = [{
  id: 'RSV-2210',
  ord: 'ORD-2026-00412',
  meds: ['Amlodipine 5 mg', 'Ramipril 10 mg'],
  total: '5 500 F',
  left: '22 h 10',
  fresh: true
}, {
  id: 'RSV-2207',
  ord: 'ORD-2026-00405',
  meds: ['Paracétamol 1 g'],
  total: '1 200 F',
  left: '6 h 02',
  fresh: false
}, {
  id: 'RSV-2199',
  ord: 'ORD-2026-00398',
  meds: ['Métronidazole 500 mg', 'ORS sachets'],
  total: '4 800 F',
  left: '14 h 45',
  fresh: true
}];
function SectionLabel({
  children,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      margin: '0 0 12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)'
    }
  }, children), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--border-subtle)'
    }
  }), right);
}
function ThemeToggle({
  theme,
  onTheme
}) {
  const dark = theme === 'dark';
  return /*#__PURE__*/React.createElement("button", {
    onClick: onTheme,
    "aria-label": "Changer de th\xE8me",
    title: dark ? 'Passer en clair' : 'Passer en sombre',
    style: {
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-muted)',
      border: '1px solid var(--border-default)',
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "15",
    height: "15",
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, dark ? /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "8",
    cy: "8",
    r: "3.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
  })) : /*#__PURE__*/React.createElement("path", {
    d: "M13.5 10A5.5 5.5 0 0 1 6 2.5a.5.5 0 0 0-.6-.6A6.5 6.5 0 1 0 14.1 10.6a.5.5 0 0 0-.6-.6z"
  })));
}
function Sidebar({
  nav,
  setNav
}) {
  const items = [['dashboard', 'Tableau de bord', null], ['clock', 'Réservations', '3'], ['database', 'Stock', null], ['qr-code', 'Délivrances', null], ['credit-card', 'Gains', null], ['users', 'Membres', null]];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 240,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 12px',
      gap: 3,
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderRight: '1px solid var(--glass-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '4px 8px 14px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 'var(--radius-md)',
      background: 'var(--accent-500)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 'var(--grain-btn)'
    }
  }), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 2C5.8 2 4 3.8 4 6c0 1.4.7 2.6 1.8 3.3L5 12h6l-.8-2.7C11.3 8.6 12 7.4 12 6c0-2.2-1.8-4-4-4z",
    fill: "#fff",
    fillOpacity: ".92"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5.5",
    y: "12.5",
    width: "5",
    height: "1.5",
    rx: ".75",
    fill: "#fff",
    fillOpacity: ".72"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: '-0.3px',
      color: 'var(--text-primary)'
    }
  }, "ulamu"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.05em',
      color: 'var(--accent-300)',
      border: '1px solid rgba(111,146,218,0.3)',
      background: 'rgba(39,86,166,0.16)',
      borderRadius: 4,
      padding: '2px 5px'
    }
  }, "STRUCTURE")), /*#__PURE__*/React.createElement(Card, {
    padding: "11px 12px",
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.16)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "hospital",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 12.5,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, "Pharmacie du March\xE9"), /*#__PURE__*/React.createElement(VerifiedBadge, {
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: 'var(--text-tertiary)'
    }
  }, "Poto-Poto, Brazzaville")))), items.map(([ic, l, b]) => /*#__PURE__*/React.createElement(NavItem, {
    key: ic,
    icon: ic,
    label: l,
    badge: b,
    active: nav === ic,
    onClick: () => setNav(ic)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border-subtle)',
      margin: '8px 0'
    }
  }), /*#__PURE__*/React.createElement(NavItem, {
    icon: "settings",
    label: "R\xE9glages"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '8px 8px 0'
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Destin Malonga",
    size: "sm",
    status: "online"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 12.5,
      color: 'var(--text-primary)'
    }
  }, "M. Destin Malonga"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: 'var(--text-tertiary)'
    }
  }, "Titulaire")), /*#__PURE__*/React.createElement(IconButton, {
    icon: "log-out",
    size: "sm",
    label: "D\xE9connexion"
  }))));
}
function Topbar({
  crumb,
  theme,
  onTheme,
  freshHours
}) {
  const stale = freshHours >= 48;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 24px',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--glass-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      fontSize: 13,
      color: 'var(--text-primary)',
      fontWeight: 500
    }
  }, crumb), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      maxWidth: 340,
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    leftIcon: "search",
    placeholder: "M\xE9dicament, lot, r\xE9servation\u2026",
    style: {
      height: 32,
      fontSize: 13
    }
  })), /*#__PURE__*/React.createElement(Badge, {
    tone: stale ? 'warning' : 'success',
    dot: true
  }, stale ? 'Stock périmé — invisible' : `Stock à jour il y a ${freshHours} h`), /*#__PURE__*/React.createElement(ThemeToggle, {
    theme: theme,
    onTheme: onTheme
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "bell",
    variant: "solid",
    label: "Notifications"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 4,
      right: 5,
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'var(--error-dot)',
      border: '2px solid var(--bg-base)'
    }
  })));
}

/* ── Flux de délivrance : scan → vérification → délivré ── */
function ScanModal({
  onClose,
  onDelivered
}) {
  const [phase, setPhase] = React.useState('scan'); // scan → found → done
  React.useEffect(() => {
    if (phase !== 'scan') return;
    const t = setTimeout(() => setPhase('found'), 2200);
    return () => clearTimeout(t);
  }, [phase]);
  return /*#__PURE__*/React.createElement(Modal, {
    title: phase === 'done' ? 'Délivrance confirmée' : 'Scanner une ordonnance',
    onClose: onClose,
    width: 440,
    footer: phase === 'found' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onClose
    }, "Annuler"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      iconLeft: "check",
      onClick: () => setPhase('done')
    }, "Confirmer la d\xE9livrance \xB7 5 500 F")) : phase === 'done' ? /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      iconLeft: "check-circle",
      onClick: () => {
        onDelivered();
        onClose();
      }
    }, "Terminer") : /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onClose
    }, "Annuler")
  }, phase === 'scan' && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '14px 0 18px'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes uscan{0%,100%{transform:translateY(-44px)}50%{transform:translateY(44px)}}'), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 130,
      height: 130,
      margin: '0 auto 14px',
      borderRadius: 'var(--radius-lg)',
      border: '1.5px dashed var(--accent-400)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      background: 'var(--bg-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "qr-code",
    size: 56,
    strokeWidth: 1.2,
    color: "var(--text-disabled)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 10,
      right: 10,
      height: 2,
      borderRadius: 1,
      background: 'var(--accent-400)',
      boxShadow: '0 0 12px rgba(39,86,166,0.8)',
      animation: 'uscan 1.6s ease-in-out infinite'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 14,
      color: 'var(--text-primary)'
    }
  }, "Pr\xE9sentez le QR du patient"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-tertiary)',
      marginTop: 3
    }
  }, "Recherche de l'ordonnance en cours\u2026")), phase === 'found' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      paddingBottom: 6
    }
  }, /*#__PURE__*/React.createElement(Banner, {
    tone: "success",
    title: "Ordonnance authentique \u2014 ORD-2026-00412"
  }, "Sign\xE9e par Dr Armel Konat\xE9 \xB7 11 juin 2026 \xB7 jamais d\xE9livr\xE9e."), [['Amlodipine 5 mg', 'lot AML-0925 · 1 boîte', '2 400 F'], ['Ramipril 10 mg', 'lot RAM-1124 · 1 boîte', '3 100 F']].map(([m, lot, p]) => /*#__PURE__*/React.createElement("div", {
    key: m,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '9px 12px',
      borderRadius: 'var(--radius-md)',
      background: 'var(--bg-subtle)',
      border: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent-300)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pill",
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      fontFamily: 'var(--font-body)',
      color: 'var(--text-primary)'
    }
  }, m), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      color: 'var(--text-tertiary)'
    }
  }, lot)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12.5,
      color: 'var(--text-primary)'
    }
  }, p))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "database",
    size: 13
  }), "Le stock sera d\xE9cr\xE9ment\xE9 automatiquement \xE0 la confirmation.")), phase === 'done' && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '14px 0 16px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      width: 56,
      height: 56,
      borderRadius: '50%',
      background: 'var(--success-bg)',
      border: '1px solid var(--success-border)',
      color: 'var(--success-dot)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check-circle",
    size: 28
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 16,
      color: 'var(--text-primary)'
    }
  }, "2 m\xE9dicaments d\xE9livr\xE9s"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: 'var(--text-tertiary)',
      marginTop: 4,
      lineHeight: 1.5
    }
  }, "Stock d\xE9cr\xE9ment\xE9 \xB7 vers\xE9 au dossier du patient", /*#__PURE__*/React.createElement("br", null), "R\xE9servation RSV-2210 cl\xF4tur\xE9e")));
}

/* ── Tableau de bord ── */
function Dashboard({
  onScan,
  delivered
}) {
  const kpis = [['Réservations actives', delivered ? '2' : '3', 'clock', 'expirent sous 24 h'], ['Délivrances du jour', delivered ? '9' : '8', 'qr-code', 'scan QR'], ['Gains dévoilements', '4 000 F', 'eye', '8 dévoilements'], ['Lignes de stock', '142', 'database', '3 lots à surveiller']];
  const list = delivered ? RESAS.slice(1) : RESAS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '28px 32px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--accent-300)',
      marginBottom: 6
    }
  }, "Jeudi 11 juin 2026 \xB7 19:55"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 26,
      letterSpacing: '-0.7px',
      color: 'var(--text-primary)'
    }
  }, "Pharmacie du March\xE9"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-tertiary)',
      marginTop: 4
    }
  }, "Les r\xE9servations vous am\xE8nent des clients s\xFBrs \u2014 le produit est d\xE9j\xE0 bloqu\xE9.")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    iconLeft: "qr-code",
    onClick: onScan
  }, "Scanner une ordonnance")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16,
      marginBottom: 26
    }
  }, kpis.map(([l, v, ic, d]) => /*#__PURE__*/React.createElement(Card, {
    key: l,
    padding: "15px 16px",
    grain: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: 'var(--text-tertiary)'
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.14)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 25,
      letterSpacing: '-0.6px',
      color: 'var(--text-primary)',
      lineHeight: 1
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11.5,
      color: 'var(--text-tertiary)',
      marginTop: 8
    }
  }, d)))), /*#__PURE__*/React.createElement(SectionLabel, {
    right: /*#__PURE__*/React.createElement(Badge, {
      tone: "accent",
      dot: true
    }, list.length, " actives")
  }, "R\xE9servations 24 h \u2014 issues des d\xE9voilements"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, delivered && /*#__PURE__*/React.createElement(Banner, {
    tone: "success",
    title: "RSV-2210 d\xE9livr\xE9e et cl\xF4tur\xE9e"
  }, "2 m\xE9dicaments remis \xB7 stock d\xE9cr\xE9ment\xE9 automatiquement."), list.map(r => /*#__PURE__*/React.createElement(Card, {
    key: r.id,
    padding: "16px",
    interactive: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.14)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12.5,
      fontWeight: 600,
      color: 'var(--text-accent)'
    }
  }, r.id), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, r.ord)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)',
      marginTop: 3
    }
  }, r.meds.join(' · '))), /*#__PURE__*/React.createElement(Badge, {
    tone: parseInt(r.left) < 8 ? 'warning' : 'neutral',
    size: "sm",
    icon: "clock"
  }, "expire dans ", r.left), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 15,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap'
    }
  }, r.total), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    iconLeft: "qr-code",
    onClick: onScan
  }, "D\xE9livrer"))))));
}
window.PharmaSidebar = Sidebar;
window.PharmaTopbar = Topbar;
window.PharmaDashboard = Dashboard;
window.PharmaScanModal = ScanModal;
window.PharmaSectionLabel = SectionLabel;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/structure_pharmacie/pharmacie.jsx", error: String((e && e.message) || e) }); }

// ui_kits/structure_pharmacie/pharmacie2.jsx
try { (() => {
/* ULAMU — Espace structure : Stock (lots, fraîcheur), Délivrances,
   Gains, Membres + contrôleur racine PharmaApp. */
const PH2 = window.ULAMUDesignSystem_d14300;
const {
  Button: SB,
  IconButton: SIB,
  Badge: SBD,
  Avatar: SAV,
  Input: SIN,
  Card: SC,
  Icon: SIC,
  Banner: SBN,
  Switch: SSW
} = PH2;
const SSL = window.PharmaSectionLabel;
function SRow({
  children,
  last
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 0',
      borderBottom: last ? 'none' : '1px solid var(--border-subtle)'
    }
  }, children);
}
function Shell({
  title,
  sub,
  actions,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      padding: '28px 32px 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 24,
      letterSpacing: '-0.6px',
      color: 'var(--text-primary)'
    }
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13.5,
      color: 'var(--text-tertiary)',
      marginTop: 4
    }
  }, sub)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, actions)), children);
}

/* ── Stock vivant par lots (M11, règle de fraîcheur anti-R-03) ── */
function StockPage({
  delivered
}) {
  const [visible, setVisible] = React.useState(true);
  const LOTS = [['Amlodipine 5 mg', 'AML-0925', '09/2027', delivered ? 23 : 24, 'ok'], ['Ramipril 10 mg', 'RAM-1124', '11/2026', delivered ? 11 : 12, 'ok'], ['Paracétamol 1 g', 'PAR-0326', '03/2026', 86, 'soon'], ['Métronidazole 500 mg', 'MET-0825', '08/2026', 40, 'ok'], ['Amoxicilline 500 mg', 'AMX-0126', '01/2026', 0, 'out']];
  const TONE = {
    ok: ['success', 'En stock'],
    soon: ['warning', 'Péremption proche'],
    out: ['error', 'Épuisé']
  };
  return /*#__PURE__*/React.createElement(Shell, {
    title: "Stock",
    sub: "Stock vivant par lots \u2014 mis \xE0 jour \xE0 chaque d\xE9livrance, visible dans les recherches anonymes",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SB, {
      variant: "ghost",
      iconLeft: "upload"
    }, "Importer"), /*#__PURE__*/React.createElement(SB, {
      variant: "primary",
      iconLeft: "plus"
    }, "Ajouter un lot"))
  }, /*#__PURE__*/React.createElement(SC, {
    padding: "14px 16px",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(SSW, {
    checked: visible,
    onChange: () => setVisible(!visible),
    label: "Visible dans les recherches des patients"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(SBD, {
    tone: visible ? 'success' : 'warning',
    dot: true
  }, visible ? 'Stock à jour il y a 3 h' : 'Masqué')), !visible && /*#__PURE__*/React.createElement(SBN, {
    tone: "warning",
    style: {
      marginTop: 12
    },
    title: "Votre pharmacie n'appara\xEEt plus dans les recherches"
  }, "R\xE8gle de fra\xEEcheur : un stock non mis \xE0 jour depuis 48 h est automatiquement masqu\xE9.")), /*#__PURE__*/React.createElement(SC, {
    padding: "4px 18px"
  }, LOTS.map(([m, lot, per, q, st], i) => /*#__PURE__*/React.createElement(SRow, {
    key: lot,
    last: i === LOTS.length - 1
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-md)',
      background: 'rgba(39,86,166,0.14)',
      color: 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(SIC, {
    name: "pill",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, m), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginTop: 1
    }
  }, "lot ", lot, " \xB7 p\xE9r. ", per)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      fontWeight: 600,
      color: q === 0 ? 'var(--error-text)' : 'var(--text-primary)',
      width: 70,
      textAlign: 'right'
    }
  }, q, " bo\xEEtes"), /*#__PURE__*/React.createElement(SBD, {
    tone: TONE[st][0],
    size: "sm",
    dot: true
  }, TONE[st][1]), /*#__PURE__*/React.createElement(SIB, {
    icon: "edit",
    size: "sm",
    label: "Modifier"
  })))));
}

/* ── Délivrances ── */
function DelivPage({
  delivered
}) {
  const ROWS = [...(delivered ? [['RSV-2210', 'ORD-2026-00412', 'Amlodipine · Ramipril', '19:58', '5 500 F']] : []), ['RSV-2188', 'ORD-2026-00391', 'Paracétamol 1 g', '17:24', '1 200 F'], ['RSV-2185', 'ORD-2026-00388', 'Métronidazole · ORS', '16:02', '4 800 F'], ['RSV-2179', 'ORD-2026-00375', 'Amoxicilline 500 mg', '11:48', '3 600 F']];
  return /*#__PURE__*/React.createElement(Shell, {
    title: "D\xE9livrances",
    sub: "Chaque scan QR cl\xF4t la r\xE9servation, d\xE9cr\xE9mente le stock et alimente le dossier patient"
  }, /*#__PURE__*/React.createElement(SC, {
    padding: "4px 18px"
  }, ROWS.map(([rsv, ord, meds, h, amt], i) => /*#__PURE__*/React.createElement(SRow, {
    key: rsv,
    last: i === ROWS.length - 1
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-md)',
      background: 'var(--success-bg)',
      border: '1px solid var(--success-border)',
      color: 'var(--success-dot)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(SIC, {
    name: "check-circle",
    size: 15
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 170,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-accent)'
    }
  }, rsv), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      color: 'var(--text-tertiary)'
    }
  }, ord)), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      color: 'var(--text-secondary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, meds), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11.5,
      color: 'var(--text-tertiary)'
    }
  }, h), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12.5,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, amt)))));
}

/* ── Gains ── */
function PharmaGains() {
  return /*#__PURE__*/React.createElement(Shell, {
    title: "Gains",
    sub: "D\xE9voilements et ventes r\xE9serv\xE9es \u2014 cr\xE9dit\xE9s automatiquement",
    actions: /*#__PURE__*/React.createElement(SB, {
      variant: "primary",
      iconLeft: "credit-card"
    }, "Retirer vers MoMo")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1.4fr',
      gap: 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 'var(--radius-xl)',
      background: 'var(--accent-500)',
      padding: 20,
      boxShadow: 'var(--shadow-md)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--grain-svg)',
      backgroundSize: 'var(--grain-size)',
      opacity: 0.1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.66)'
    }
  }, "Solde disponible"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 34,
      letterSpacing: '-1px',
      color: '#fff',
      margin: '6px 0 10px'
    }
  }, "52 300 F"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 11.5,
      color: 'rgba(255,255,255,0.85)'
    }
  }, /*#__PURE__*/React.createElement(SIC, {
    name: "eye",
    size: 13
  }), "500 F par d\xE9voilement \xB7 ventes encaiss\xE9es en caisse"))), /*#__PURE__*/React.createElement(SC, {
    padding: "4px 18px"
  }, [['Dévoilement — Talangaï', '19:32', '+500 F'], ['Dévoilement — Talangaï', '18:05', '+500 F'], ['Retrait Airtel Money', '9 juin', '-40 000 F'], ['Dévoilement — Poto-Poto', '8 juin', '+500 F']].map(([t, w, a], i, arr) => /*#__PURE__*/React.createElement(SRow, {
    key: i,
    last: i === arr.length - 1
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-md)',
      background: a.startsWith('+') ? 'var(--success-bg)' : 'rgba(39,86,166,0.14)',
      color: a.startsWith('+') ? 'var(--success-dot)' : 'var(--accent-300)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(SIC, {
    name: a.startsWith('+') ? 'eye' : 'credit-card',
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13,
      color: 'var(--text-primary)'
    }
  }, t), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11.5,
      color: 'var(--text-tertiary)'
    }
  }, w), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      fontWeight: 600,
      color: a.startsWith('+') ? 'var(--success-text)' : 'var(--text-primary)'
    }
  }, a))))));
}

/* ── Membres (M02 : titulaire + membres) ── */
function MembresPage() {
  const ROWS = [['Destin Malonga', 'Titulaire', 'Tous les droits · signature des contrats', 'accent', 'online'], ['Chancelle Ngoma', 'Membre', 'Délivrances · mise à jour du stock', 'neutral', 'online'], ['Rodrigue Itoua', 'Membre', 'Délivrances uniquement', 'neutral', undefined], ['Bénédicte Samba', 'Membre', 'Stock uniquement', 'neutral', 'away']];
  return /*#__PURE__*/React.createElement(Shell, {
    title: "Membres",
    sub: "Espace structure : un titulaire responsable, des membres aux droits limit\xE9s (M02)",
    actions: /*#__PURE__*/React.createElement(SB, {
      variant: "primary",
      iconLeft: "plus"
    }, "Inviter un membre")
  }, /*#__PURE__*/React.createElement(SC, {
    padding: "4px 18px"
  }, ROWS.map(([n, role, rights, tone, st], i) => /*#__PURE__*/React.createElement(SRow, {
    key: n,
    last: i === ROWS.length - 1
  }, /*#__PURE__*/React.createElement(SAV, {
    name: n,
    size: "md",
    status: st
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: 13.5,
      color: 'var(--text-primary)'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-tertiary)'
    }
  }, rights)), /*#__PURE__*/React.createElement(SBD, {
    tone: tone,
    size: "sm"
  }, role), /*#__PURE__*/React.createElement(SIB, {
    icon: "more-vertical",
    label: "Options"
  })))), /*#__PURE__*/React.createElement(SBN, {
    tone: "info",
    style: {
      marginTop: 16
    },
    title: "Le titulaire reste responsable"
  }, "Les actions des membres sont trac\xE9es dans le journal inalt\xE9rable (M04)."));
}

/* ── Racine ── */
function PharmaApp() {
  const [nav, setNav] = React.useState('dashboard');
  const [scan, setScan] = React.useState(false);
  const [delivered, setDelivered] = React.useState(false);
  const [theme, setThemeState] = React.useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const toggleTheme = () => setThemeState(t => {
    const n = t === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    try {
      localStorage.setItem('ulamu-theme', n);
    } catch (e) {}
    return n;
  });
  const NAMES = {
    dashboard: 'Tableau de bord',
    clock: 'Réservations',
    database: 'Stock',
    'qr-code': 'Délivrances',
    'credit-card': 'Gains',
    users: 'Membres'
  };
  let main;
  if (nav === 'database') main = /*#__PURE__*/React.createElement(StockPage, {
    delivered: delivered
  });else if (nav === 'qr-code') main = /*#__PURE__*/React.createElement(DelivPage, {
    delivered: delivered
  });else if (nav === 'credit-card') main = /*#__PURE__*/React.createElement(PharmaGains, null);else if (nav === 'users') main = /*#__PURE__*/React.createElement(MembresPage, null);else main = /*#__PURE__*/React.createElement(window.PharmaDashboard, {
    onScan: () => setScan(true),
    delivered: delivered
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement(window.PharmaSidebar, {
    nav: nav === 'clock' ? 'dashboard' : nav,
    setNav: n => setNav(n === 'clock' ? 'dashboard' : n)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement(window.PharmaTopbar, {
    crumb: NAMES[nav],
    theme: theme,
    onTheme: toggleTheme,
    freshHours: 3
  }), main), scan && /*#__PURE__*/React.createElement(window.PharmaScanModal, {
    onClose: () => setScan(false),
    onDelivered: () => setDelivered(true)
  }));
}
window.PharmaApp = PharmaApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/structure_pharmacie/pharmacie2.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.ICONS = __ds_scope.ICONS;

__ds_ns.ICON_NAMES = __ds_scope.ICON_NAMES;

__ds_ns.SessionTimer = __ds_scope.SessionTimer;

__ds_ns.VerifiedBadge = __ds_scope.VerifiedBadge;

__ds_ns.Banner = __ds_scope.Banner;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.FormField = __ds_scope.FormField;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.NavItem = __ds_scope.NavItem;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
