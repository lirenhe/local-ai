const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Support GGUF model files served from the app bundle
    assetExts: [...getDefaultConfig(__dirname).resolver.assetExts, 'gguf', 'bin'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
