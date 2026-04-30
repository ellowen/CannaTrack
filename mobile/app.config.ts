import { ExpoConfig, ConfigContext } from 'expo/config'

const IS_DEV  = process.env.EXPO_PUBLIC_APP_ENV === 'development'
const IS_PREV = process.env.EXPO_PUBLIC_APP_ENV === 'preview'

// Bundle ID base — dev y preview tienen sufijo para coexistir con prod en el mismo dispositivo
const BUNDLE_ID = IS_DEV ? 'com.cannatrack.app.dev' : IS_PREV ? 'com.cannatrack.app.preview' : 'com.cannatrack.app'
const APP_NAME  = IS_DEV ? 'CannaTrack Dev' : IS_PREV ? 'CannaTrack Preview' : 'CannaTrack'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name:    APP_NAME,
  slug:    'cannatrack',
  version: '0.1.0',
  orientation: 'portrait',
  icon:    './assets/icon.png',
  scheme:  IS_DEV ? 'cannatrack-dev' : IS_PREV ? 'cannatrack-preview' : 'cannatrack',
  userInterfaceStyle: 'automatic',
  splash: {
    image:           './assets/splash.png',
    resizeMode:      'contain',
    backgroundColor: '#0C1410',
  },
  updates: {
    url: 'https://u.expo.dev/' + (process.env.EAS_PROJECT_ID ?? ''),
    fallbackToCacheTimeout: 0,
  },
  runtimeVersion: { policy: 'appVersion' },
  ios: {
    supportsTablet:    false,
    bundleIdentifier:  BUNDLE_ID,
    buildNumber:       '1',
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0C1410',
    },
    package:     BUNDLE_ID,
    versionCode: 1,
  },
  plugins: [
    'expo-router',
    [
      '@sentry/react-native/expo',
      {
        organization: process.env.SENTRY_ORG ?? '',
        project:      process.env.SENTRY_PROJECT ?? '',
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'CannaTrack usa Face ID para que puedas ingresar mas rapido.',
      },
    ],
    [
      'expo-notifications',
      {
        icon:   './assets/icon.png',
        color:  '#0C1410',
        sounds: [],
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'CannaTrack necesita acceso a tus fotos para el diario de cultivo.',
        cameraPermission: 'CannaTrack necesita acceso a la camara para fotografiar tus plantas.',
      },
    ],
  ],
  web: {
    bundler: 'metro',
    output:  'single',
    favicon: './assets/icon.png',
  },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Disponible en runtime via Constants.expoConfig.extra
    appEnv:    process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '',
    },
  },
})
