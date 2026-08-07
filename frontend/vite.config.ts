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
  test: {
    globals: true,
    environment: 'node',
    // Los specs de e2e/ son de Playwright, no de vitest
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
})
