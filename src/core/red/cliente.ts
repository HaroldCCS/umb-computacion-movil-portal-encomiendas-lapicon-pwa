import { ApiError, RedError, SinSesionError, extraerMensaje } from './errores'

/** Devuelve el idToken de Firebase (o `null` sin sesión). */
export type ProveedorToken = (opciones: { forzar: boolean }) => Promise<string | null>

export interface OpcionesCliente {
  /** URL base de la API; vacía = mismo origen (proxy). */
  base: string
  obtenerToken?: ProveedorToken
  /** El backend gratuito puede tardar ~60 s en despertar. */
  tiempoMaximoMs?: number
  /** A partir de aquí se avisa "Despertando el servidor…". */
  umbralLentoMs?: number
  fetch?: typeof fetch
}

export interface OpcionesPeticion {
  query?: Record<string, string>
  cuerpo?: unknown
  /** `false` en las rutas públicas (ciudades, ratings GET). */
  auth?: boolean
}

type Oyente = (despertando: boolean) => void

/**
 * Cliente HTTP de Lapticon (equivale a `api_client.dart`):
 * - `Authorization: Bearer <idToken>` en las rutas protegidas.
 * - Si el backend responde 401, renueva el token y reintenta una vez.
 * - Tiempo de espera de 75 s y aviso de "servidor despertando" a los 5 s.
 * - Errores `{ error }` del backend → `ApiError` con mensaje humano.
 */
export class ClienteApi {
  private readonly base: string
  private readonly obtenerToken: ProveedorToken
  private readonly tiempoMaximoMs: number
  private readonly umbralLentoMs: number
  private readonly fetchImpl: typeof fetch
  private lentas = 0
  private readonly oyentes = new Set<Oyente>()

  constructor(opciones: OpcionesCliente) {
    this.base = opciones.base.replace(/\/+$/, '')
    this.obtenerToken = opciones.obtenerToken ?? (async () => null)
    this.tiempoMaximoMs = opciones.tiempoMaximoMs ?? 75_000
    this.umbralLentoMs = opciones.umbralLentoMs ?? 5_000
    this.fetchImpl = opciones.fetch ?? ((...args) => fetch(...args))
  }

  get despertando() {
    return this.lentas > 0
  }

  /** Avisa cuando cambia "despertando". Devuelve la función para dejar de oír. */
  alCambiarDespertando(oyente: Oyente): () => void {
    this.oyentes.add(oyente)
    return () => this.oyentes.delete(oyente)
  }

  get<T = unknown>(ruta: string, opciones: Omit<OpcionesPeticion, 'cuerpo'> = {}) {
    return this.enviar<T>('GET', ruta, opciones)
  }

  post<T = unknown>(ruta: string, opciones: OpcionesPeticion = {}) {
    return this.enviar<T>('POST', ruta, opciones)
  }

  put<T = unknown>(ruta: string, opciones: OpcionesPeticion = {}) {
    return this.enviar<T>('PUT', ruta, opciones)
  }

  patch<T = unknown>(ruta: string, opciones: OpcionesPeticion = {}) {
    return this.enviar<T>('PATCH', ruta, opciones)
  }

  /** `base + ruta + ?query` (con base vacía, ruta relativa al mismo origen). */
  url(ruta: string, query?: Record<string, string>): string {
    const params = query && Object.keys(query).length > 0 ? `?${new URLSearchParams(query)}` : ''
    return `${this.base}${ruta}${params}`
  }

  private async enviar<T>(metodo: string, ruta: string, opciones: OpcionesPeticion): Promise<T> {
    const auth = opciones.auth ?? true
    let respuesta = await this.pedir(metodo, ruta, opciones, auth, false)
    if (auth && respuesta.status === 401) {
      // El token pudo expirar justo ahora: se pide uno nuevo y se reintenta.
      respuesta = await this.pedir(metodo, ruta, opciones, auth, true)
    }
    const cuerpo = await leerCuerpo(respuesta)
    if (respuesta.ok) return cuerpo as T
    throw new ApiError(
      respuesta.status,
      extraerMensaje(cuerpo) ?? ApiError.mensajePorDefecto(respuesta.status),
    )
  }

  private async pedir(
    metodo: string,
    ruta: string,
    opciones: OpcionesPeticion,
    auth: boolean,
    forzar: boolean,
  ): Promise<Response> {
    const cabeceras: Record<string, string> = { Accept: 'application/json' }
    if (opciones.cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'
    if (auth) {
      const token = await this.obtenerToken({ forzar })
      if (!token) throw new SinSesionError()
      cabeceras.Authorization = `Bearer ${token}`
    }

    const control = new AbortController()
    const limite = setTimeout(() => control.abort(), this.tiempoMaximoMs)
    let lenta = false
    const aviso = setTimeout(() => {
      lenta = true
      this.marcarLenta(+1)
    }, this.umbralLentoMs)

    try {
      return await this.fetchImpl(this.url(ruta, opciones.query), {
        method: metodo,
        headers: cabeceras,
        body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
        signal: control.signal,
      })
    } catch {
      if (control.signal.aborted) {
        throw new RedError('El servidor tardó demasiado en responder. Intenta de nuevo.')
      }
      // TypeError de fetch: sin internet, DNS, servidor caído o CORS
      // bloqueado (el navegador no deja distinguirlos). Solo se culpa a la
      // conexión si de verdad no hay red.
      throw new RedError(
        typeof navigator !== 'undefined' && navigator.onLine === false
          ? 'Estás sin conexión. Revisa tu internet e intenta de nuevo.'
          : 'No pudimos comunicarnos con el servidor. Intenta de nuevo en un momento.',
      )
    } finally {
      clearTimeout(limite)
      clearTimeout(aviso)
      if (lenta) this.marcarLenta(-1)
    }
  }

  private marcarLenta(delta: 1 | -1) {
    const antes = this.despertando
    this.lentas = Math.max(0, this.lentas + delta)
    if (antes !== this.despertando) for (const o of this.oyentes) o(this.despertando)
  }
}

async function leerCuerpo(respuesta: Response): Promise<unknown> {
  const texto = (await respuesta.text()).trim()
  if (!texto) return null
  try {
    return JSON.parse(texto) as unknown
  } catch {
    return texto
  }
}
