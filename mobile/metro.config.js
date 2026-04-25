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

// Fuerza React y React Native a resolverse desde mobile para evitar conflicto con React 19 del frontend
config.resolver.extraNodeModules = {
  'react':        path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
}

module.exports = config
