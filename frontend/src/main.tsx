import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initI18n } from './i18n'
import './styles/index.css'

// Inicializar i18n antes de renderizar (sino todos los t() muestran la key cruda)
initI18n('es')

// Migrar claves localStorage de cannatrack-* a cultitrack-*
;['measurements', 'nutrition', 'plants', 'sync', 'tasks', 'user', 'weeklogs'].forEach((key) => {
  const oldKey = `cannatrack-${key}`
  const newKey = `cultitrack-${key}`
  const value = localStorage.getItem(oldKey)
  if (value && !localStorage.getItem(newKey)) {
    localStorage.setItem(newKey, value)
    localStorage.removeItem(oldKey)
  }
})

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
