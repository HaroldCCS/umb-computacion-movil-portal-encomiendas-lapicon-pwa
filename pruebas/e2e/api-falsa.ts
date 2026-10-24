import type { BrowserContext, Page, Route } from '@playwright/test'

/**
 * Backend falso para las E2E: responde como el real (docs/03 y las respuestas
 * guardadas en referencias/respuestas/), con estado en memoria compartido
 * entre páginas. Así un remitente y un viajero pueden hacer el flujo completo.
 * Los tres endpoints que hoy fallan en el servidor responden 500 igual que allá.
 */

interface Perfil {
  uid: string
  nombre: string
  apellido: string
  telefono: string
  nacionalidad: string
  email?: string
}
interface EncomiendaApi {
  _id: string
  uid: string
  ciudadOrigen: string
  ciudadDestino: string
  observaciones: string
  moneda: string
  valor: number
  estado: string
  viajeroId: string | null
  fechaCreacion: string
  fechaVencimiento: string
}
interface ViajeApi {
  _id: string
  uid: string
  numeroVuelo: string
  ciudadOrigen: string
  ciudadDestino: string
  fechaViaje: string
  estado: string
  createdAt: string
}
interface RatingApi {
  usuarioOrigen: string
  usuarioDestino: string
  rolDestino: string
  calificacion: number
  comentario: string
  timestamp: string
}

export interface EstadoApi {
  usuarios: Map<string, Perfil>
  encomiendas: EncomiendaApi[]
  viajes: ViajeApi[]
  ratings: RatingApi[]
  /** Peticiones recibidas ("GET /api/…"), para comprobar qué se llamó. */
  llamadas: string[]
  /** Simula el arranque lento de Render (ms). */
  demora: number
}

export const PAISES = ['Argentina', 'Colombia', 'Ecuador', 'Mexico', 'Peru', 'Spain', 'United States']
export const CIUDADES = ['Bogota', 'Cali', 'Lima', 'Madrid', 'Medellin', 'Miami']

/** Igual que la identidad falsa de la app (src/core/auth-falsa.ts). */
export const uidDe = (email: string) => `uid-${email.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}`

export function crearEstado(): EstadoApi {
  return { usuarios: new Map(), encomiendas: [], viajes: [], ratings: [], llamadas: [], demora: 0 }
}

let siguiente = 1
const id = () => `e2e${String(siguiente++).padStart(6, '0')}`
const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString()

/** Crea un perfil completo (para entrar directo sin pasar por el registro). */
export function sembrarUsuario(estado: EstadoApi, email: string, nombre: string, apellido = 'Prueba'): string {
  const uid = uidDe(email)
  estado.usuarios.set(uid, { uid, nombre, apellido, telefono: '3001234567', nacionalidad: 'Colombia', email })
  return uid
}

export function sembrarEncomienda(estado: EstadoApi, d: Partial<EncomiendaApi> & { uid: string }): EncomiendaApi {
  const e: EncomiendaApi = {
    _id: id(),
    ciudadOrigen: 'Bogota',
    ciudadDestino: 'Miami',
    observaciones: 'Un libro y dos camisetas',
    moneda: 'USD',
    valor: 25,
    estado: 'disponible',
    viajeroId: null,
    fechaCreacion: hace(1),
    fechaVencimiento: new Date(Date.now() + 29 * 86_400_000).toISOString(),
    ...d,
  }
  estado.encomiendas.push(e)
  return e
}

export function sembrarViaje(estado: EstadoApi, d: Partial<ViajeApi> & { uid: string }): ViajeApi {
  const v: ViajeApi = {
    _id: id(),
    numeroVuelo: 'AV24',
    ciudadOrigen: 'Bogota',
    ciudadDestino: 'Miami',
    fechaViaje: '2026-12-01T00:00:00.000Z',
    estado: 'disponible',
    createdAt: hace(0),
    ...d,
  }
  estado.viajes.push(v)
  return v
}

function nombreDe(estado: EstadoApi, uid: string) {
  return estado.usuarios.get(uid)?.nombre ?? 'Alguien'
}

async function responder(estado: EstadoApi, route: Route) {
  const req = route.request()
  const url = new URL(req.url())
  const ruta = url.pathname
  const metodo = req.method()
  estado.llamadas.push(`${metodo} ${ruta}`)
  if (estado.demora) await new Promise((r) => setTimeout(r, estado.demora))

  const json = (status: number, cuerpo: unknown) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) })
  const cuerpo = (() => {
    try {
      return (req.postDataJSON() ?? {}) as Record<string, unknown>
    } catch {
      return {}
    }
  })()
  const token = req.headers()['authorization']?.replace(/^Bearer token-falso-/, '') ?? null
  const yo = token && token.startsWith('uid-') ? token : null
  const publica = ruta.startsWith('/api/ciudades/') || (metodo === 'GET' && ruta.startsWith('/api/ratings/'))
  if (!publica && !yo) return json(401, { error: 'Token no proporcionado' })
  const m = (re: RegExp) => re.exec(ruta)
  let x: RegExpExecArray | null

  // Catálogo
  if (ruta === '/api/ciudades/paises') return json(200, PAISES)
  if (ruta === '/api/ciudades/ciudades') return json(200, CIUDADES)

  // Usuarios
  if (metodo === 'POST' && ruta === '/api/users/register') {
    const u = { uid: yo!, ...(cuerpo as Omit<Perfil, 'uid'>) }
    estado.usuarios.set(yo!, u)
    return json(201, { message: 'Usuario registrado', user: u })
  }
  if ((x = m(/^\/api\/users\/([^/]+)$/))) {
    if (x[1] !== yo) return json(403, { error: 'No autorizado para consultar este usuario' })
    const u = estado.usuarios.get(yo)
    if (metodo === 'GET') return u ? json(200, { user: u }) : json(404, { error: 'Usuario no encontrado' })
    if (metodo === 'PUT') {
      // El backend ignora `rol` (docs/03).
      const { rol: _rol, ...resto } = cuerpo
      const nuevo = { ...(u ?? { uid: yo }), ...resto } as Perfil
      estado.usuarios.set(yo, nuevo)
      return json(200, { message: 'Usuario actualizado', user: nuevo })
    }
  }

  // Encomiendas
  if (metodo === 'GET' && ruta === '/api/encomiendas') {
    return json(200, estado.encomiendas.filter((e) => e.uid === yo))
  }
  if (metodo === 'GET' && ruta === '/api/encomiendas/disponibles') {
    const o = url.searchParams.get('origen')
    const d = url.searchParams.get('destino')
    // Como el real: trae remitenteNombre pero no el uid del remitente.
    return json(
      200,
      estado.encomiendas
        .filter((e) => e.estado === 'disponible' && e.ciudadOrigen === o && e.ciudadDestino === d)
        .map(({ uid, viajeroId: _v, ...e }) => ({ ...e, remitenteNombre: nombreDe(estado, uid) })),
    )
  }
  if (metodo === 'POST' && ruta === '/api/encomiendas') {
    const e = sembrarEncomienda(estado, { uid: yo!, ...(cuerpo as Partial<EncomiendaApi>), fechaCreacion: hace(0) })
    return json(201, e)
  }
  if (metodo === 'PUT' && (x = m(/^\/api\/encomiendas\/tomar\/([^/]+)$/))) {
    const e = estado.encomiendas.find((y) => y._id === x![1])
    if (!e) return json(404, { error: 'Encomienda no encontrada' })
    if (e.uid === yo) return json(400, { error: 'No puedes tomar tu propia encomienda' })
    if (e.estado !== 'disponible') return json(400, { error: 'La encomienda ya no está disponible' })
    e.estado = 'tomada'
    e.viajeroId = yo
    return json(200, { mensaje: 'Encomienda tomada exitosamente' })
  }
  if (metodo === 'PUT' && (x = m(/^\/api\/encomiendas\/([^/]+)\/estado$/))) {
    const e = estado.encomiendas.find((y) => y._id === x![1])
    if (!e) return json(404, { error: 'Encomienda no encontrada' })
    if (e.uid !== yo && e.viajeroId !== yo) return json(403, { error: 'No autorizado para modificar esta encomienda' })
    e.estado = String(cuerpo['estado'])
    return json(200, { mensaje: 'Estado actualizado', encomienda: e })
  }

  // Viajes y vuelos
  if (metodo === 'GET' && ruta === '/api/viajes') return json(200, estado.viajes.filter((v) => v.uid === yo))
  if (metodo === 'GET' && ruta === '/api/viajes/disponible') {
    const v = estado.viajes.find((y) => y.uid === yo && y.estado === 'disponible')
    return v ? json(200, v) : json(404, { mensaje: 'No hay viajes disponibles' })
  }
  if (metodo === 'GET' && ruta === '/api/viajes/buscar') {
    return json(200, estado.viajes.filter((v) => v.ciudadOrigen === url.searchParams.get('ciudad') && v.estado === 'disponible'))
  }
  if (metodo === 'POST' && ruta === '/api/viajes') {
    if (estado.viajes.some((v) => v.uid === yo && v.estado === 'disponible')) {
      return json(400, {
        error: 'Ya tienes un viaje disponible. Debes cerrarlo o cambiar su estado antes de registrar uno nuevo.',
      })
    }
    const v = sembrarViaje(estado, {
      uid: yo!,
      ...(cuerpo as Partial<ViajeApi>),
      fechaViaje: `${String(cuerpo['fechaViaje'])}T00:00:00.000Z`,
    })
    return json(201, v)
  }
  if (ruta.startsWith('/api/vuelos/')) return json(500, { error: 'RAPIDAPI_KEY no está configurada en el servidor' })

  // Calificaciones
  if (metodo === 'POST' && ruta === '/api/ratings') {
    const c = Number(cuerpo['calificacion'])
    if (!(c >= 1 && c <= 5)) return json(500, { error: 'Error al guardar la calificación' })
    estado.ratings.push({
      usuarioOrigen: yo!,
      usuarioDestino: String(cuerpo['usuarioDestino']),
      rolDestino: String(cuerpo['rolDestino']),
      calificacion: c,
      comentario: String(cuerpo['comentario'] ?? ''),
      timestamp: new Date().toISOString(),
    })
    return json(201, { message: 'Calificación guardada' })
  }
  if (metodo === 'GET' && (x = m(/^\/api\/ratings\/([^/]+)$/))) {
    const lista = estado.ratings.filter((r) => r.usuarioDestino === x![1])
    const promedio = lista.length ? lista.reduce((a, r) => a + r.calificacion, 0) / lista.length : null
    return json(200, { total: lista.length, promedio, calificaciones: lista })
  }

  // Los dos que hoy fallan en el servidor.
  if (ruta.startsWith('/api/chats/estado/')) return json(500, { error: 'Error interno del servidor' })
  if (ruta === '/api/chatbot') {
    return json(500, { error: 'Error al generar respuesta con OpenRouter', detalle: { error: { message: 'User not found.' } } })
  }

  return json(404, { error: `Ruta no simulada: ${metodo} ${ruta}` })
}

/** Intercepta `/api/**` de la página o del contexto con el backend falso. */
export async function instalarApiFalsa(destino: Page | BrowserContext, estado: EstadoApi) {
  await destino.route('**/api/**', (route) => responder(estado, route))
}

/** Entra con la identidad falsa (cualquier contraseña de 6+ caracteres). */
export async function entrar(page: Page, email: string, password = 'secreta123') {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Iniciar sesión' }).waitFor()
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  // La sesión queda lista cuando la app sale del login (o muestra el error).
  if (password !== 'incorrecta') await page.waitForURL((u) => !u.pathname.startsWith('/login'))
}

/** Deja el rol elegido en el dispositivo (como si ya lo hubiera escogido). */
export async function conRol(destino: Page | BrowserContext, email: string, rol: 'remitente' | 'viajero') {
  await destino.addInitScript(([clave, valor]) => localStorage.setItem(clave!, valor!), [`rol_${uidDe(email)}`, rol])
}

/** Sin scroll horizontal: nada se sale del ancho del teléfono. Si algo se sale,
 *  devuelve qué es (para que el error de CI lo diga). */
export async function sinDesborde(page: Page): Promise<true | string> {
  return page.evaluate(() => {
    // innerWidth: el ancho de la pantalla. Se mira cada elemento y no scrollWidth,
    // que en Linux con zoom suma la barra de scroll que los teléfonos no dibujan.
    const w = window.innerWidth
    const culpables: string[] = []
    // Lo que está dentro de algo con scroll propio o recortado (la fila de chips) no cuenta.
    const recortado = (el: HTMLElement) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (getComputedStyle(p).overflowX !== 'visible') return true
      }
      return false
    }
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.right > w + 1 && !recortado(el)) {
        culpables.push(`${el.tagName}.${String(el.className).slice(0, 50)} "${el.textContent?.trim().slice(0, 30)}" (${Math.round(r.right)}px)`)
      }
    }
    return culpables.length === 0 ? (true as const) : culpables.slice(0, 5).join(' | ')
  })
}
