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

// RN 0.81.5 requiere react@^19.1.0 — forzar TODOS los imports de react/* a usar
// la unica copia de React 19 del root, evitando el error de version duplicada.
// react-native esta hoisted al root (mobile/node_modules/react-native no existe).
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    const rootPath = path.join(workspaceRoot, 'node_modules', moduleName)
    try {
      return { filePath: require.resolve(rootPath), type: 'sourceFile' }
    } catch {}
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
