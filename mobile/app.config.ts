import { ExpoConfig, ConfigContext } from 'expo/config'

const IS_DEV  = process.env.EXPO_PUBLIC_APP_ENV === 'development'
const IS_PREV = process.env.EXPO_PUBLIC_APP_ENV === 'preview'
// Solo testing local en Expo Go sin login: quita projectId/updates de EAS (Expo Go exige cuenta si estan)
const NO_EAS = process.env.CULTITRACK_NO_EAS === '1'

// Bundle ID base — dev y preview tienen sufijo para coexistir con prod en el mismo dispositivo
const BUNDLE_ID = IS_DEV ? 'com.cultitrack.app.dev' : IS_PREV ? 'com.cultitrack.app.preview' : 'com.cultitrack.app'
const APP_NAME  = IS_DEV ? 'Cultitrack Dev' : IS_PREV ? 'Cultitrack Preview' : 'Cultitrack'

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name:    APP_NAME,
  slug:    'cultitrack',
  version: '0.1.0',
  orientation: 'portrait',
  icon:    './assets/icon.png',
  scheme:  IS_DEV ? 'cultitrack-dev' : IS_PREV ? 'cultitrack-preview' : 'cultitrack',
  userInterfaceStyle: 'automatic',
  updates: NO_EAS ? undefined : {
    url: 'https://u.expo.dev/9a9b9006-d949-4f7e-90e6-016abf5ccd90',
    fallbackToCacheTimeout: 0,
  },
  runtimeVersion: NO_EAS ? undefined : { policy: 'appVersion' },
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
    'expo-asset',
    'expo-font',
    'expo-secure-store',
    'expo-sharing',
    'expo-status-bar',
    'expo-web-browser',
    '@react-native-community/datetimepicker',
    [
      'expo-splash-screen',
      {
        image:           './assets/splash.png',
        resizeMode:      'contain',
        backgroundColor: '#0C1410',
      },
    ],
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
        faceIDPermission: 'Cultitrack usa Face ID para que puedas ingresar mas rapido.',
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
        photosPermission: 'Cultitrack necesita acceso a tus fotos para el diario de cultivo.',
        cameraPermission: 'Cultitrack necesita acceso a la camara para fotografiar tus plantas.',
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
    eas: NO_EAS ? undefined : {
      projectId: '9a9b9006-d949-4f7e-90e6-016abf5ccd90',
    },
  },
})
