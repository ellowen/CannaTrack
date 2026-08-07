import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  build: {
    rollupOptions: {
      output: {
        // Vendor libs cambian mucho menos que el codigo de la app — separarlas
        // mejora el cacheo del browser entre deploys (el usuario no vuelve a
        // bajar React/Supabase solo porque cambio una pagina).
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-i18n': ['i18next', 'react-i18next'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // Los specs de e2e/ son de Playwright, no de vitest
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
})
