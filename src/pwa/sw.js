/**
 * Service worker de Lapticon (plantilla de Cuentas Claras).
 *
 * PLANTILLA: vite.config.ts inyecta la versión y la lista de archivos al construir.
 *
 * Reglas:
 *  - La API NUNCA se cachea. Son encomiendas, viajes y pagos: un estado viejo mostrado como
 *    actual es peor que un error. Además son datos privados.
 *  - Las pantallas (navegación) van primero a la red y, sin conexión, caen al
 *    index.html guardado: la app abre aunque no haya señal.
 *  - Los archivos con hash del build salen del caché: nunca cambian.
 */
const VERSION = '__VERSION__'
const CACHE = `lapticon-${VERSION}`
const PRECACHE = __PRECACHE__

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)))
  // No se activa solo: la app pregunta antes de cambiar de versión, para no
  // recargarle la pantalla a alguien que está llenando un formulario.
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (evento) => {
  if (evento.data === 'ACTIVAR') self.skipWaiting()
})

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    evento.respondWith(
      (async () => {
        try {
          return await fetch(request)
        } catch {
          // Sin conexión: la última interfaz guardada.
          return (await caches.match('/')) ?? Response.error()
        }
      })(),
    )
    return
  }

  // Solo se atienden los archivos del build; lo demás va directo a la red,
  // sin que el service worker pueda romperlo.
  if (!url.pathname.startsWith('/assets/') && !PRECACHE.includes(url.pathname)) return

  evento.respondWith(
    (async () => {
      const guardado = await caches.match(request)
      if (guardado) return guardado
      const respuesta = await fetch(request)
      if (respuesta.ok && url.pathname.startsWith('/assets/')) {
        const copia = respuesta.clone()
        void caches.open(CACHE).then((c) => c.put(request, copia))
      }
      return respuesta
    })(),
  )
})
