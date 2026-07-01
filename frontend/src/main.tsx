import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { initI18n } from './i18n'
import { useUserStore } from './store/userStore'

// Inicializar i18n con el idioma guardado del usuario
initI18n(useUserStore.getState().language ?? 'es')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)

// Registrar Service Worker para soporte offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => { /* silencioso en dev */ })
  })
}
