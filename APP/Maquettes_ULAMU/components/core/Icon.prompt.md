Icône SVG du système Ulamu (style Lucide, grille 16×16, `stroke: currentColor`). Source unique des icônes — jamais d'emoji ni de caractère Unicode.

```jsx
<Icon name="stethoscope" size={20} />
<Icon name="ordonnance" size={16} color="var(--accent-500)" />
<button className="...">
  <Icon name="plus" size={14} /> Nouvelle consultation
</button>
```

Tailles : 12 (xs · badges), 14 (sm · boutons), 16 (md · nav, défaut), 20 (lg · titres), 24 (xl · empty states). `strokeWidth` 1.5 par défaut. Catalogue : voir `icons.js` (navigation, actions, états, médical, communication/données).
