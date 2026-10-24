/**
 * Registro del service worker y utilidades de instalación (plantilla de
 * Cuentas Claras). Solo en producción: en desarrollo un service worker
 * cachea cosas que no debería y hace perder horas.
 */

type Oyente = (hayActualizacion: boolean) => void
let esperando: ServiceWorker | null = null
const oyentes = new Set<Oyente>()

function avisar() {
  for (const o of oyentes) o(esperando !== null)
}

/** Aviso de "hay una versión nueva". Devuelve la baja. */
export function alHaberActualizacion(fn: Oyente): () => void {
  oyentes.add(fn)
  fn(esperando !== null)
  return () => oyentes.delete(fn)
}

/** Activa la versión nueva y recarga cuando tome el control. */
export function actualizarAhora(): void {
  if (!esperando) return
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  esperando.postMessage('ACTIVAR')
}

export function registrarServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        const vigilar = (sw: ServiceWorker | null) => {
          sw?.addEventListener('statechange', () => {
            // "installed" con un controlador previo = versión nueva lista.
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              esperando = sw
              avisar()
            }
          })
        }
        if (reg.waiting && navigator.serviceWorker.controller) {
          esperando = reg.waiting
          avisar()
        }
        reg.addEventListener('updatefound', () => vigilar(reg.installing))
        // Una app instalada puede quedar abierta días: revisar al volver a ella.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void reg.update().catch(() => {})
        })
      })
      .catch(() => {
        // Sin service worker la app funciona igual, solo sin modo sin conexión.
      })
  })
}

/** ¿Abierta como app instalada (desde el ícono)? */
export function esAppInstalada(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true
}

export function esIOS(): boolean {
  const ua = navigator.userAgent
  // iPadOS 13+ se presenta como Mac: se distingue por la pantalla táctil.
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

/** En iPhone solo Safari agrega a la pantalla de inicio de forma fiable. */
export function esSafariIOS(): boolean {
  const ua = navigator.userAgent
  return esIOS() && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua)
}

// Android / Chrome: el navegador ofrece su propio diálogo.
interface EventoInstalacion extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
let eventoInstalar: EventoInstalacion | null = null
const oyentesInstalar = new Set<(puede: boolean) => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    eventoInstalar = e as EventoInstalacion
    for (const o of oyentesInstalar) o(true)
  })
  window.addEventListener('appinstalled', () => {
    eventoInstalar = null
    for (const o of oyentesInstalar) o(false)
  })
}

export function alPoderInstalar(fn: (puede: boolean) => void): () => void {
  oyentesInstalar.add(fn)
  fn(eventoInstalar !== null)
  return () => oyentesInstalar.delete(fn)
}

export async function instalarNativo(): Promise<boolean> {
  if (!eventoInstalar) return false
  await eventoInstalar.prompt()
  const { outcome } = await eventoInstalar.userChoice
  eventoInstalar = null
  return outcome === 'accepted'
}
