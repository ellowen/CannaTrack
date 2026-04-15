/** CannaTrack Service Worker — offline + push notifications */

const SHELL_CACHE  = 'ct-shell-v2'
const STATIC_CACHE = 'ct-static-v2'

// ── Instalación: pre-cachear el shell ─────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(['/', '/index.html', '/manifest.json', '/icon.svg']))
  )
  self.skipWaiting()
})

// ── Activación: limpiar caches viejos ────────────────────────────────────────
self.addEventListener('activate', (e) => {
  const valid = new Set([SHELL_CACHE, STATIC_CACHE])
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !valid.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ── Fetch: estrategia híbrida ─────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension')) return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navegación SPA → network first, fallback al shell cacheado
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(SHELL_CACHE).then((c) => c.put(request, clone))
          return res
        })
        .catch(() => caches.match('/index.html') ?? caches.match('/'))
    )
    return
  }

  // Assets con hash Vite (/assets/...) → cache first, actualiza en background
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((res) => {
          if (res.status === 200) {
            caches.open(STATIC_CACHE).then((c) => c.put(request, res.clone()))
          }
          return res
        })
        return cached ?? networkFetch
      })
    )
    return
  }

  // Resto (iconos, manifest) → stale-while-revalidate
  e.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((res) => {
        if (res.status === 200) {
          caches.open(SHELL_CACHE).then((c) => c.put(request, res.clone()))
        }
        return res
      })
      return cached ?? networkFetch
    })
  )
})

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  const data  = e.data?.json() ?? {}
  const title = data.title ?? 'CannaTrack'
  const body  = data.body  ?? 'Tenés tareas pendientes para hoy'
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:     '/icon.svg',
      badge:    '/icon.svg',
      tag:      'ct-tasks',
      renotify: false,
      vibrate:  [80, 40, 80],
      data:     { url: data.url ?? '/' },
    })
  )
})

// ── Click en notificación → abrir / enfocar la app ───────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const target = e.notification.data?.url ?? '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.location.origin))
      if (open) return open.focus()
      return self.clients.openWindow(target)
    })
  )
})
