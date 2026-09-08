import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  // __DEV__ es un global que normalmente inyecta el runtime de Metro/RN --
  // fuera de la app real (bajo Vitest) no existe. Varios paquetes de Expo
  // (expo-modules-core, transitivo de expo-secure-store/expo-local-
  // authentication) lo referencian en codigo de nivel superior.
  define: {
    __DEV__: 'true',
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/__tests__/*.test.ts', 'src/**/__tests__/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.d.ts',
        'src/**/__tests__/**/*.test.ts',
        'src/**/__tests__/**/*.test.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../frontend/src'),
    },
  },
})
