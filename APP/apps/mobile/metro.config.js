const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * `react-native-svg-transformer` : les .svg déposés dans `assets/images` s'importent directement comme
 * des composants React (`import Illustration1 from '../../assets/images/illustration1.svg'`), rendus par
 * react-native-svg — pas de rebuild natif, juste Metro (redémarrer avec --reset-cache après ce changement).
 *
 * @type {import('metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
