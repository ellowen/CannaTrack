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

// extraNodeModules fuerza react-native a resolverse desde mobile (Metro maneja platform extensions)
config.resolver.extraNodeModules = {
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
}

// resolveRequest captura 'react' y todos sus sub-paths (react/jsx-runtime, etc.)
// path.join maneja separadores Windows correctamente, evitando fallas silenciosas en require.resolve
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
