// Contrato con el backend: las respuestas reales guardadas el 22-oct-2026
// (copia de referencias/respuestas/ del repo de documentación, en pruebas/respuestas/).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ClienteApi } from '../core/red/cliente'
import { ApiError, SinSesionError } from '../core/red/errores'
import { resumenDesdeJson } from './modelos/calificaciones'
import { cuerpoEncomienda, encomiendaDesdeJson } from './modelos/encomienda'
import { parseEstadoEncomienda, parseEstadoViaje } from './modelos/estado'
import { leerFechaValor } from './modelos/json'
import { usuarioDesdeJson, perfilCompleto } from './modelos/usuario'
import { cuerpoViaje, viajeDesdeJson } from './modelos/viaje'
import { paraTomar } from '../funciones/viajero/logica'
import { crearRepositorios, limpiarLista, parseEstadoChat } from './repositorios'

const DIR = join(__dirname, '../../pruebas/respuestas')
const respuesta = (archivo: string) =>
  JSON.parse(readFileSync(join(DIR, archivo), 'utf8')) as { status?: number; respuesta: unknown }

describe('respuestas reales guardadas', () => {
  it('se pueden leer todas', () => {
    const archivos = readdirSync(DIR).filter((f) => f.endsWith('.json'))
    expect(archivos.length).toBeGreaterThan(40)
    for (const f of archivos) expect(() => respuesta(f)).not.toThrow()
  })

  it('GET /api/users/:uid viene envuelto en "user" y sin rol', () => {
    const u = usuarioDesdeJson(respuesta('users_get_propio.json').respuesta)
    expect(u.uid).toBe('Cpmc8Mv0CkTD0aJJMtiOBEzDNV03')
    expect(u.nombre).toBe('Harold')
    expect(perfilCompleto(u)).toBe(true)
    expect(u.rol).toBeNull() // el backend ignora el rol
    expect(u.creadoEn?.toISOString()).toBe('2026-10-22T18:53:50.787Z')
  })

  it('GET /api/encomiendas: remitente en uid, viajero en viajeroId', () => {
    const [e] = (respuesta('encomiendas_get_mias.json').respuesta as unknown[]).map(encomiendaDesdeJson)
    expect(e!.remitenteUid).toBe('Cpmc8Mv0CkTD0aJJMtiOBEzDNV03')
    expect(e!.viajeroUid).toBeNull()
    expect(e!.creadaEn?.toISOString()).toBe('2026-10-22T19:01:26.915Z')
    const t = (respuesta('encomiendas_get_mias_tomada.json').respuesta as unknown[])
      .map(encomiendaDesdeJson)
      .find((x) => x.estado === 'tomada')
    expect(t?.viajeroUid).not.toBeNull()
  })

  it('GET /disponibles trae remitenteNombre y no el uid', () => {
    const lista = (respuesta('encomiendas_get_disponibles.json').respuesta as unknown[]).map(encomiendaDesdeJson)
    expect(lista.length).toBeGreaterThan(0)
    for (const e of lista) {
      expect(e.remitenteUid).toBeNull()
      expect(e.remitenteNombre).not.toBeNull()
    }
  })

  it('PUT /tomar solo trae { mensaje }; PUT /estado trae la encomienda', () => {
    expect(encomiendaDesdeJson(respuesta('encomiendas_tomar.json').respuesta).id).toBe('')
    const e = encomiendaDesdeJson(respuesta('encomiendas_put_estado_vencida.json').respuesta)
    expect(e.estado).toBe('vencida')
    expect(e.id).not.toBe('')
  })

  it('viaje: la fecha de medianoche UTC es un día del calendario', () => {
    const v = viajeDesdeJson(respuesta('viajes_get_disponible.json').respuesta)
    expect(v.numeroVuelo).toBe('AV10')
    expect(v.viajeroUid).toBe('IeMGfjHQ7XTc0W08QrTzx1flvo13')
    // En Colombia (UTC-5) NO debe verse como 30 de noviembre.
    expect([v.fechaViaje!.getFullYear(), v.fechaViaje!.getMonth(), v.fechaViaje!.getDate()]).toEqual([2026, 11, 1])
    expect(v.estado).toBe('disponible')
  })

  it('GET /api/ratings usa "timestamp" como fecha', () => {
    const vacio = resumenDesdeJson(respuesta('ratings_get.json').respuesta)
    expect(vacio).toEqual({ total: 0, promedio: null, calificaciones: [] })
    const r = resumenDesdeJson({
      total: 1,
      promedio: 5,
      calificaciones: [{ calificacion: 5, comentario: 'ok', rolDestino: 'viajero', timestamp: '2026-10-22T19:05:39.400Z' }],
    })
    expect(r.calificaciones[0]!.fecha?.toISOString()).toBe('2026-10-22T19:05:39.400Z')
  })

  it('estados válidos del backend (no hay "cancelada")', () => {
    for (const v of ['disponible', 'tomada', 'vencida', 'entregada', 'recibida']) expect(parseEstadoEncomienda(v)).toBe(v)
    expect(parseEstadoEncomienda('cancelada')).toBe('desconocido')
  })
})

describe('modelos tolerantes', () => {
  it('usuarios "populados", valores como texto y llaves alternativas', () => {
    const e = encomiendaDesdeJson({
      encomienda: { id: 'e2', valor: '12,5', estado: 'raro', viajero: { uid: 'v9', nombre: 'Andrés', apellido: 'Pérez' } },
    })
    expect(e).toMatchObject({ id: 'e2', valor: 12.5, moneda: 'USD', estado: 'desconocido', viajeroUid: 'v9', viajeroNombre: 'Andrés Pérez' })
    const s = encomiendaDesdeJson({ _id: 'e1', remitente: 'uidR', viajero: 'uidV', fechaVencimiento: '2026-12-01' })
    expect([s.remitenteUid, s.viajeroUid]).toEqual(['uidR', 'uidV'])
    expect(s.fechaVencimiento).toEqual(new Date(2026, 11, 1))
  })

  it('cuerpos iguales a los de Postman', () => {
    expect(cuerpoEncomienda({ ciudadOrigen: 'Bogota', ciudadDestino: 'Miami', observaciones: 'demo', moneda: 'USD', valor: 10 })).toEqual({
      ciudadOrigen: 'Bogota', ciudadDestino: 'Miami', observaciones: 'demo', moneda: 'USD', valor: 10,
    })
    expect(cuerpoViaje({ numeroVuelo: 'aa 123', ciudadOrigen: 'Bogota', ciudadDestino: 'Miami', fechaViaje: new Date(2026, 11, 1) })).toEqual({
      numeroVuelo: 'AA123', ciudadOrigen: 'Bogota', ciudadDestino: 'Miami', fechaViaje: '2026-12-01',
    })
  })

  it('fechas: ISO con hora es un instante; vacío o basura es null', () => {
    expect(leerFechaValor('2026-10-22T19:01:26.915Z')?.toISOString()).toBe('2026-10-22T19:01:26.915Z')
    expect(leerFechaValor('')).toBeNull()
    expect(leerFechaValor('mañana')).toBeNull()
    expect(leerFechaValor(1_700_000_000_000)?.getTime()).toBe(1_700_000_000_000)
  })

  it('estado del chat y limpieza de listas', () => {
    expect(parseEstadoChat({ estado: 'cerrado' })).toBe('cerrado')
    expect(parseEstadoChat({ cerrado: true })).toBe('cerrado')
    expect(parseEstadoChat({ estado: 'abierto' })).toBe('abierto')
    expect(parseEstadoChat(null)).toBe('abierto')
    expect(limpiarLista(['miami', 'Bogota', 'Miami', ' ', 'Bogot�a', 3, 'cali'])).toEqual(['Bogota', 'cali', 'miami'])
  })
})

describe('respuestas del Swagger oficial (28-oct-2026)', () => {
  it('PATCH /api/viajes/:id/estado devuelve el viaje envuelto en "viaje"', () => {
    const v = viajeDesdeJson(respuesta('fase0_patch_viaje_cancelado.json').respuesta)
    expect([v.id, v.numeroVuelo, v.estado]).toEqual(['6ae25c6a411da1034525b232', 'A777', 'cancelado'])
    expect(viajeDesdeJson(respuesta('fase0_patch_viaje_completado.json').respuesta).estado).toBe('completado')
  })

  it('estados de viaje: cancelado y contactado; lo desconocido no rompe', () => {
    expect(parseEstadoViaje('Cancelado')).toBe('cancelado')
    expect(parseEstadoViaje('contactado')).toBe('contactado')
    expect(parseEstadoViaje('pausado')).toBe('desconocido')
    expect(parseEstadoViaje(null)).toBe('desconocido')
  })
})

/** Cliente con un fetch falso que responde lo que diga `rutas`. */
function repos(rutas: Record<string, [number, unknown]>, token: string | null = 'tk') {
  const llamadas: { url: string; init: RequestInit }[] = []
  const fetch = (async (url: string, init: RequestInit) => {
    llamadas.push({ url, init })
    const clave = `${init.method} ${url.split('?')[0]}`
    const [status, cuerpo] = rutas[clave] ?? [404, { error: `sin ruta ${clave}` }]
    return new Response(cuerpo === undefined ? '' : JSON.stringify(cuerpo), { status })
  }) as unknown as typeof globalThis.fetch
  const api = new ClienteApi({ base: '', obtenerToken: async () => token, fetch })
  return { r: crearRepositorios(api), llamadas }
}

describe('repositorios (endpoints de la matriz §10.5)', () => {
  beforeEach(() => localStorage.clear())

  it('perfil: 404 = sin perfil; 403 se propaga; el rol no se guarda en el servidor', async () => {
    const { r } = repos({
      'GET /api/users/a': [404, { error: 'Usuario no encontrado' }],
      'GET /api/users/b': [403, { error: 'No autorizado para consultar este usuario' }],
      'PUT /api/users/c': [200, respuesta('users_put_rol.json').respuesta],
    })
    expect(await r.usuarios.obtener('a')).toBeNull()
    await expect(r.usuarios.obtener('b')).rejects.toMatchObject({ status: 403, message: 'No autorizado para consultar este usuario' })
    expect(await r.usuarios.guardarRol('c', 'viajero')).toBe(false)
  })

  it('viaje activo: 404 = sin viaje (no es error); segundo viaje = regla de negocio', async () => {
    const { r } = repos({
      'GET /api/viajes/disponible': [404, respuesta('viajes_get_disponible_vacio.json').respuesta],
      'POST /api/viajes': [400, respuesta('viajes_post_segundo_400.json').respuesta],
    })
    expect(await r.viajes.disponible()).toBeNull()
    const err = await r.viajes.crear({ numeroVuelo: 'AV12', ciudadOrigen: 'Bogota', ciudadDestino: 'Lima', fechaViaje: new Date(2026, 11, 5) }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).reglaDeNegocio).toBe(true)
    expect((err as ApiError).message).toMatch(/Ya tienes un viaje disponible/)
  })

  it('buscar: disponibles y tomadas, con uid y nombre del remitente', async () => {
    const { r } = repos({
      'GET /api/encomiendas/buscar': [200, respuesta('fase0_buscar_tomada.json').respuesta],
    })
    const b = await r.encomiendas.buscar('Cali', 'Lima')
    expect(b.disponibles).toEqual([])
    expect(b.tomadas.map((e) => [e.estado, e.remitenteUid, e.remitenteNombre, e.viajeroUid])).toEqual([
      ['tomada', 'Cpmc8Mv0CkTD0aJJMtiOBEzDNV03', 'Harold', 'IeMGfjHQ7XTc0W08QrTzx1flvo13'],
    ])
    const propia = await repos({
      'GET /api/encomiendas/buscar': [200, respuesta('fase0_buscar_propia.json').respuesta],
    }).r.encomiendas.buscar('Cali', 'Lima')
    expect(propia.disponibles[0]!.remitenteUid).toBe('Cpmc8Mv0CkTD0aJJMtiOBEzDNV03')
    expect(paraTomar(propia.disponibles, 'Cpmc8Mv0CkTD0aJJMtiOBEzDNV03')).toEqual([])
  })

  it('cancelar viaje: PATCH con el estado; 404 si no es mío', async () => {
    const { r, llamadas } = repos({
      'PATCH /api/viajes/v1/estado': [200, respuesta('fase0_patch_viaje_cancelado.json').respuesta],
      'PATCH /api/viajes/ajeno/estado': [404, respuesta('fase0_patch_viaje_ajeno.json').respuesta],
    })
    expect((await r.viajes.cambiarEstado('v1', 'cancelado'))?.estado).toBe('cancelado')
    expect(llamadas[0]!.init.method).toBe('PATCH')
    expect(JSON.parse(String(llamadas[0]!.init.body))).toEqual({ estado: 'cancelado' })
    await expect(r.viajes.cambiarEstado('ajeno', 'cancelado')).rejects.toMatchObject({
      status: 404,
      message: 'Viaje no encontrado o no autorizado',
    })
  })

  it('estado del chat (28-oct): activo, cerrado con fecha y 404 = abierto', async () => {
    const { r } = repos({
      'GET /api/chats/estado/a_b': [200, respuesta('fase0_chats_estado_200.json').respuesta],
      'GET /api/chats/estado/a_c': [200, respuesta('fase0_chats_estado_tras_entregada.json').respuesta],
      'GET /api/chats/estado/c_a': [404, respuesta('fase0_chats_estado_orden_inverso_404.json').respuesta],
    })
    expect(await r.chats.detalleEstado('a_b')).toEqual({ estado: 'abierto', fechaCierre: null })
    expect(await r.chats.detalleEstado('a_c')).toEqual({
      estado: 'cerrado',
      fechaCierre: new Date('2026-10-29T00:46:00.283Z'),
    })
    expect(await r.chats.estado('c_a')).toBe('abierto')
  })

  it('perfil: fechaNacimiento opcional y nunca uid ni email en el cuerpo', async () => {
    const { r, llamadas } = repos({ 'PUT /api/users/u1': [200, { message: 'ok', user: { uid: 'u1', nombre: 'Ana' } }] })
    const base = usuarioDesdeJson({ uid: 'u1', nombre: 'Ana', apellido: 'G', telefono: '300', nacionalidad: 'Peru', email: 'a@b.co' })
    await r.usuarios.actualizar({ ...base, fechaNacimiento: '2000-05-20' })
    await r.usuarios.actualizar(base)
    const [con, sin] = llamadas.map((l) => JSON.parse(String(l.init.body)) as Record<string, unknown>)
    expect(con).toEqual({ nombre: 'Ana', apellido: 'G', telefono: '300', nacionalidad: 'Peru', fechaNacimiento: '2000-05-20' })
    expect(sin).not.toHaveProperty('fechaNacimiento')
    for (const c of [con, sin]) {
      expect(c).not.toHaveProperty('uid')
      expect(c).not.toHaveProperty('email')
    }
    expect(usuarioDesdeJson({ user: { uid: 'x', fechaNacimiento: '1999-01-31T00:00:00.000Z' } }).fechaNacimiento).toBe('1999-01-31')
  })

  it('viajeros en ruta: pública, con nombre y uid', async () => {
    const { r, llamadas } = repos({
      'GET /api/viajes/disponibles': [200, respuesta('fase0_viajes_disponibles_publica.json').respuesta],
    })
    const v = await r.viajes.disponiblesEnRuta('Bogota', 'Miami')
    expect(v.map((x) => [x.viajeroUid, x.viajeroNombre])).toContainEqual(['IeMGfjHQ7XTc0W08QrTzx1flvo13', 'Harold Viajero'])
    expect((llamadas[0]!.init.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(llamadas[0]!.url).toBe('/api/viajes/disponibles?ciudadOrigen=Bogota&ciudadDestino=Miami')
  })

  it('vuelos, estado del chat y chatbot: el 500 del servidor se maneja como en Flutter', async () => {
    const { r } = repos({
      'GET /api/vuelos/AV10/2026-12-01': [500, respuesta('vuelos_get.json').respuesta],
      'GET /api/chats/estado/a_b': [500, respuesta('chats_get_estado.json').respuesta],
      'POST /api/chatbot': [500, respuesta('chatbot_post.json').respuesta],
    })
    await expect(r.viajes.validarVuelo('av 10', new Date(2026, 11, 1))).rejects.toMatchObject({ status: 500 })
    expect(await r.chats.estado('a_b')).toBe('abierto')
    await expect(r.chatbot.enviar('Hola')).rejects.toMatchObject({ status: 500 })
  })

  it('las rutas públicas no mandan token; las protegidas sí', async () => {
    const { r, llamadas } = repos({
      'GET /api/ratings/u': [200, { total: 0, promedio: null, calificaciones: [] }],
      'GET /api/ciudades/paises': [200, ['Colombia', 'Peru']],
      'GET /api/encomiendas/buscar': [200, { disponibles: [], tomadas: [] }],
    })
    await r.calificaciones.resumen('u')
    await r.catalogo.paises()
    await r.encomiendas.buscar('Bogota', 'Miami')
    const auth = llamadas.map((l) => (l.init.headers as Record<string, string>).Authorization ?? null)
    expect(auth).toEqual([null, null, 'Bearer tk'])
    expect(llamadas[2]!.url).toBe('/api/encomiendas/buscar?origen=Bogota&destino=Miami')
  })

  it('el catálogo se guarda 7 días con las mismas claves de Flutter', async () => {
    const { r, llamadas } = repos({ 'GET /api/ciudades/paises': [200, ['Peru', 'Colombia']] })
    expect(await r.catalogo.paises()).toEqual(['Colombia', 'Peru'])
    expect(await r.catalogo.paises()).toEqual(['Colombia', 'Peru'])
    expect(llamadas.length).toBe(1)
    expect(localStorage.getItem('cache_paises')).toBe('["Colombia","Peru"]')
    expect(Number(localStorage.getItem('cache_paises_at'))).toBeGreaterThan(0)
  })

  it('calificar limita a 1..5 y manda encomiendaId; tomar devuelve null sin encomienda', async () => {
    const { r, llamadas } = repos({
      'POST /api/ratings': [201, { message: 'ok' }],
      'PUT /api/encomiendas/tomar/x': [200, respuesta('encomiendas_tomar.json').respuesta],
    })
    await r.calificaciones.calificar({ usuarioDestino: 'v', rolDestino: 'viajero', calificacion: 9, comentario: ' bien ', encomiendaId: 'e1' })
    expect(JSON.parse(String(llamadas[0]!.init.body))).toEqual({ usuarioDestino: 'v', rolDestino: 'viajero', calificacion: 5, comentario: 'bien', encomiendaId: 'e1' })
    expect(await r.encomiendas.tomar('x')).toBeNull()
  })

  it('sin sesión no se llama a una ruta protegida', async () => {
    const { r, llamadas } = repos({}, null)
    await expect(r.encomiendas.mias()).rejects.toBeInstanceOf(SinSesionError)
    expect(llamadas).toEqual([])
  })
})
