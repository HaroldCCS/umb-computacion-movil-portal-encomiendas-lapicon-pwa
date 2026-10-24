/**
 * Errores propios de la app (equivalen a `app_exception.dart`). Las pantallas
 * solo muestran `message`, que ya está en lenguaje humano.
 */
export abstract class AppError extends Error {}

/** El servidor respondió con un código de error (4xx / 5xx). */
export class ApiError extends AppError {
  readonly status: number

  constructor(status: number, mensaje: string) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
  }

  get noAutorizado() {
    return this.status === 401
  }
  get prohibido() {
    return this.status === 403
  }
  get noEncontrado() {
    return this.status === 404
  }
  /** Regla del negocio ("Ya tienes un viaje activo"): se explica en una hoja. */
  get reglaDeNegocio() {
    return this.status === 400 || this.status === 409
  }

  /** Mensaje por defecto cuando el backend no envía uno. */
  static mensajePorDefecto(status: number): string {
    if (status === 400) return 'Revisa los datos e intenta de nuevo.'
    if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
    if (status === 403) return 'No tienes permiso para hacer esto.'
    if (status === 404) return 'No encontramos lo que buscas.'
    if (status >= 500) return 'Algo falló en el servidor. Intenta de nuevo en un momento.'
    return `No se pudo completar la solicitud (${status}).`
  }
}

/** No hubo respuesta: sin internet, DNS o tiempo de espera agotado. */
export class RedError extends AppError {
  constructor(mensaje = 'No pudimos conectarnos. Revisa tu conexión a internet.') {
    super(mensaje)
    this.name = 'RedError'
  }
}

/** No hay sesión (no hay token para enviar). */
export class SinSesionError extends AppError {
  constructor(mensaje = 'Inicia sesión para continuar.') {
    super(mensaje)
    this.name = 'SinSesionError'
  }
}

const LLAVES_MENSAJE = ['message', 'mensaje', 'error', 'msg', 'detail'] as const

/** Busca un mensaje legible en las formas típicas de error de Express. */
export function extraerMensaje(cuerpo: unknown): string | null {
  if (typeof cuerpo === 'string' && cuerpo.length > 0 && cuerpo.length < 200) {
    // Evita mostrar páginas HTML de error.
    return cuerpo.startsWith('<') ? null : cuerpo
  }
  if (cuerpo && typeof cuerpo === 'object' && !Array.isArray(cuerpo)) {
    const mapa = cuerpo as Record<string, unknown>
    for (const llave of LLAVES_MENSAJE) {
      const valor = mapa[llave]
      if (typeof valor === 'string' && valor.trim()) return valor.trim()
      if (valor && typeof valor === 'object') {
        const anidado = extraerMensaje(valor)
        if (anidado) return anidado
      }
    }
    const errores = mapa.errors
    if (Array.isArray(errores) && errores.length > 0) {
      const primero: unknown = errores[0]
      if (typeof primero === 'string') return primero
      return extraerMensaje(primero)
    }
  }
  return null
}
