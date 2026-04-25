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

// extraNodeModules solo captura el nombre exacto del paquete, no sub-paths como react/jsx-runtime.
// resolveRequest intercepta TODOS los imports para forzar React 18 desde mobile/node_modules.
const localPackages = ['react', 'react-dom', 'react-native', 'scheduler']

config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const pkg of localPackages) {
    if (moduleName === pkg || moduleName.startsWith(pkg + '/')) {
      const suffix = moduleName.slice(pkg.length)
      const localPath = path.resolve(projectRoot, 'node_modules', pkg) + suffix
      try {
        return { filePath: require.resolve(localPath), type: 'sourceFile' }
      } catch {}
    }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
