/**
 * Configuration React Native CLI.
 * `assets` : polices de la charte ULAMU (Plus Jakarta Sans, JetBrains Mono) embarquées dans l'app.
 *   Après modif des polices : `npx react-native-asset` puis rebuild.
 */
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts'],
};
