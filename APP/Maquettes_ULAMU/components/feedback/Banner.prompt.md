Message contextuel en bloc — 4 tons sémantiques avec icône, titre, corps, action et fermeture.

```jsx
<Banner tone="warning" title="Vous êtes hors ligne">
  Les données médicales ne se synchroniseront qu'au retour du réseau.
</Banner>
<Banner tone="success" title="Paiement confirmé" onClose={() => {}} />
```

Tons : info, success, warning, error. L'icône est choisie automatiquement selon le ton.
