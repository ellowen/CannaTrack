const CACHE = 'cannatrack-v1'
const PRECACHE = ['/', '/index.html', '/icon.svg', '/manifest.json']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  // Solo cachear GET, no requests de extensión
  if (e.request.method !== 'GET' || e.request.url.startsWith('chrome-extension')) return
  e.respondWith(
    caches.match(e.request).then((cached) => cached ?? fetch(e.request))
  )
})

// Click en notificación → abrir/enfocar la app
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return clients.openWindow('/')
    })
  )
})
