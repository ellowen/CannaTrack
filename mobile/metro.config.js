const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')

// Necesario para que expo-router encuentre el directorio app en monorepo
process.env.EXPO_ROUTER_APP_ROOT = './app'

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]

// Busca modulos en mobile primero, luego en root del monorepo
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// RN 0.81.5 incluye react-native-renderer@19.1.0 — react debe ser exactamente 19.1.0.
// Forzar react/* a mobile/node_modules/react (19.1.0) para que coincidan exactamente.
// Root tiene react@19.2.5 para el frontend web; mobile necesita 19.1.0 para RN.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    const localPath = path.join(projectRoot, 'node_modules', moduleName)
    try {
      return { filePath: require.resolve(localPath), type: 'sourceFile' }
    } catch {}
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
