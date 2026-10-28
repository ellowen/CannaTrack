// PRIMERO: migrar claves legacy antes de que los stores rehidraten
import './lib/storage-migration'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/fraunces/wght-italic.css'
import './styles/index.css'
import { initI18n } from './i18n'
import { useUserStore } from './store/userStore'
import { initSentry } from './lib/sentry'

initSentry()

// Inicializar i18n con el idioma guardado del usuario
initI18n(useUserStore.getState().language ?? 'es')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)

// Service Worker para soporte offline: solo en produccion. En desarrollo
// interceptaba los pedidos de Vite y, si el servidor se caia o reiniciaba,
// la pagina quedaba en blanco; ademas se limpia el que haya quedado de
// visitas anteriores.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => { /* sin SW: la app sigue funcionando online */ })
    } else {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => void r.unregister())
        if ('caches' in window) void caches.keys().then((keys) => keys.forEach((k) => void caches.delete(k)))
      })
    }
  })
}
