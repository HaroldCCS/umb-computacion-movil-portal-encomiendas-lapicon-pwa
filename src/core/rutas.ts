import type { EstadoSesion } from '../funciones/sesion/sesion'

/** Rutas de la PWA (docs/10 §10.6). Cada pestaña es una ruta: el botón atrás
 *  del sistema y los enlaces funcionan. */
export const Rutas = {
  splash: '/',
  login: '/login',
  registro: '/registro',
  recuperar: '/recuperar',
  completarPerfil: '/completar-perfil',
  elegirRol: '/elegir-rol',

  // Pestañas
  inicio: '/inicio',
  envios: '/envios',
  miViaje: '/mi-viaje',
  explorar: '/explorar',
  chats: '/chats',
  perfil: '/perfil',

  editarPerfil: '/perfil/editar',
  nuevaEncomienda: '/remitente/nueva',
  detalleEnvio: (id: string) => `/remitente/encomienda/${encodeURIComponent(id)}`,
  viajeros: '/remitente/viajeros',
  registrarViaje: '/viajero/registrar',
  encomiendaViajero: (id: string) => `/viajero/encomienda/${encodeURIComponent(id)}`,
  chat: (otroUid: string) => `/chat/${encodeURIComponent(otroUid)}`,
  calificar: '/calificar',
  resenas: (uid: string) => `/resenas/${encodeURIComponent(uid)}`,
  asistente: '/asistente',
} as const

export const RUTAS_PUBLICAS: readonly string[] = [Rutas.login, Rutas.registro, Rutas.recuperar]

/**
 * Regla de redirección pura (la misma de `redirectFor` en app_router.dart).
 * `null` = quedarse en `ruta`.
 */
export function redirigirPara(estado: EstadoSesion, ruta: string): string | null {
  switch (estado) {
    case 'cargando':
    case 'error':
      return ruta === Rutas.splash ? null : Rutas.splash
    case 'sinSesion':
      return RUTAS_PUBLICAS.includes(ruta) ? null : Rutas.login
    case 'sinPerfil':
      return ruta === Rutas.completarPerfil ? null : Rutas.completarPerfil
    case 'sinRol':
      return ruta === Rutas.elegirRol ? null : Rutas.elegirRol
    case 'listo': {
      // Con la sesión lista no se vuelve al splash, login ni registro inicial.
      const bloqueada = ruta === Rutas.splash || ruta === Rutas.completarPerfil || RUTAS_PUBLICAS.includes(ruta)
      return bloqueada ? Rutas.inicio : null
    }
  }
}

/**
 * Acción pendiente a la que lleva un aviso: el detalle abre con esa acción
 * visible y resaltada (docs/08 §8.4). Va como `?accion=` en la ruta.
 */
export type AccionPendiente = 'calificar' | 'entregar'

export function accionDeRuta(busqueda: URLSearchParams): AccionPendiente | null {
  const v = busqueda.get('accion')
  return v === 'calificar' || v === 'entregar' ? v : null
}

export function conAccion(ruta: string, accion: AccionPendiente | null | undefined): string {
  return accion ? `${ruta}?accion=${accion}` : ruta
}
