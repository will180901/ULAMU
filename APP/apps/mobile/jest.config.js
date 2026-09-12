/**
 * Configuration des tests du téléphone.
 *
 * ⚠️ **`transformIgnorePatterns` — ajouté au chantier 106.** Par défaut, Jest ne transforme rien
 * dans `node_modules` ; le préréglage React Native y fait une exception pour les briques de
 * l'écosystème, listées une par une. `react-native-video-trim` est livrée en modules ES : sans
 * cette ligne, le simple fait de l'importer casse la suite sur un `import` que Jest ne sait pas
 * lire — et l'erreur accuse le fichier de test, pas la dépendance.
 *
 * *Une bibliothèque qu'on ajoute au projet doit aussi être ajoutée à ce qui le vérifie.*
 */
module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|react-native-video-trim)/)',
  ],
};
