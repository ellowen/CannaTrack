module.exports = function (api) {
  api.cache(true)
  // babel-preset-expo uses hasModule('expo-router') via require.resolve from root node_modules,
  // which can't see expo-router installed locally in mobile/node_modules. Add it explicitly.
  // SDK 57: el plugin se movio a build/plugins/expo-router-plugin (antes build/expo-router-plugin).
  const { expoRouterBabelPlugin } = require('babel-preset-expo/build/plugins/expo-router-plugin')
  return {
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    plugins: [
      expoRouterBabelPlugin,
      ['module-resolver', {
        root: ['.'],
        alias: {
          '@': './src',
          '@shared': '../frontend/src',
        },
      }],
    ],
  }
}
