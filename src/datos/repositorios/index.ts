import type { ClienteApi } from '../../core/red/cliente'
import { ApiError } from '../../core/red/errores'
import { Local } from '../local'
import { resumenDesdeJson, type ResumenCalificaciones } from '../modelos/calificaciones'
import { cuerpoEncomienda, encomiendaDesdeJson, type Encomienda } from '../modelos/encomienda'
import type { EstadoChat, EstadoEncomienda } from '../modelos/estado'
import { desenvolverLista, esMapa, leerTexto, type Mapa } from '../modelos/json'
import type { Rol } from '../modelos/rol'
import { cuerpoRegistro, perfilCompleto, usuarioDesdeJson, type Usuario } from '../modelos/usuario'
import { cuerpoViaje, viajeDesdeJson, type Viaje } from '../modelos/viaje'
import { fechaIso } from '../../core/formato'

/**
 * Repositorios = contrato de la API (docs/03), port de lib/data/repositories.
 * Las pantallas usan estos métodos; nunca `fetch` ni el cliente directo.
 */
export function crearRepositorios(api: ClienteApi) {
  const listaEncomiendas = (json: unknown) =>
    desenvolverLista(json, ['encomiendas', 'data', 'items'])
      .filter(esMapa)
      .map(encomiendaDesdeJson)
      .filter((e) => e.id !== '')

  const listaViajes = (json: unknown) =>
    desenvolverLista(json, ['viajes', 'data', 'items', 'viajeros']).filter(esMapa).map(viajeDesdeJson)

  /** Si el backend devuelve el perfil, se usa; si no, se conserva lo enviado. */
  const combinarPerfil = (json: unknown, enviado: Usuario): Usuario => {
    if (!esMapa(json)) return enviado
    const recibido = usuarioDesdeJson(json, enviado.uid)
    return perfilCompleto(recibido) ? { ...recibido, email: enviado.email, rol: enviado.rol } : enviado
  }

  const usuarios = {
    /** El perfil o `null` si aún no se registró (404). */
    async obtener(uid: string): Promise<Usuario | null> {
      try {
        const json = await api.get(`/api/users/${uid}`)
        return json === null ? null : usuarioDesdeJson(json, uid)
      } catch (e) {
        if (e instanceof ApiError && e.noEncontrado) return null
        throw e
      }
    },
    /** Crea o actualiza el perfil propio (`POST /api/users/register`). */
    async registrar(datos: Usuario): Promise<Usuario> {
      return combinarPerfil(await api.post('/api/users/register', { cuerpo: cuerpoRegistro(datos) }), datos)
    },
    /** `PUT /api/users/:uid`. */
    async actualizar(datos: Usuario): Promise<Usuario> {
      return combinarPerfil(await api.put(`/api/users/${datos.uid}`, { cuerpo: cuerpoRegistro(datos) }), datos)
    },
    /** Intenta guardar el rol (reto 1). `false` si el backend no lo guarda
     *  (hoy lo ignora): entonces queda solo en el dispositivo. */
    async guardarRol(uid: string, rol: Rol): Promise<boolean> {
      try {
        const json = await api.put(`/api/users/${uid}`, { cuerpo: { rol } })
        return usuarioDesdeJson(json, uid).rol === rol
      } catch (e) {
        if (e instanceof ApiError && e.reglaDeNegocio) return false
        throw e
      }
    },
  }

  const viajes = {
    /** Historial (`GET /api/viajes`). */
    mios: async (): Promise<Viaje[]> => listaViajes(await api.get('/api/viajes')),
    /** Viaje activo (`GET /api/viajes/disponible`) o `null` (404). */
    async disponible(): Promise<Viaje | null> {
      try {
        const json = await api.get('/api/viajes/disponible')
        if (json === null) return null
        if (Array.isArray(json)) return listaViajes(json)[0] ?? null
        const v = viajeDesdeJson(json)
        return v.id === '' ? null : v
      } catch (e) {
        if (e instanceof ApiError && e.noEncontrado) return null
        throw e
      }
    },
    /** Viajeros que salen de `ciudad` (`GET /api/viajes/buscar?ciudad=`). */
    buscarPorOrigen: async (ciudad: string): Promise<Viaje[]> =>
      listaViajes(await api.get('/api/viajes/buscar', { query: { ciudad } })),
    /** `POST /api/viajes`. 400 si ya hay un viaje activo. */
    crear: async (d: Parameters<typeof cuerpoViaje>[0]): Promise<Viaje> =>
      viajeDesdeJson(await api.post('/api/viajes', { cuerpo: cuerpoViaje(d) })),
    /** Verifica el vuelo (`GET /api/vuelos/:numero/:fecha`); hoy responde 500. */
    async validarVuelo(numero: string, fecha: Date): Promise<Mapa> {
      const json = await api.get(`/api/vuelos/${numero.replaceAll(' ', '').toUpperCase()}/${fechaIso(fecha)}`)
      if (esMapa(json)) return json
      if (Array.isArray(json) && esMapa(json[0])) return json[0]
      return {}
    },
  }

  const encomiendas = {
    /** Mis encomiendas como remitente (`GET /api/encomiendas`). */
    mias: async (): Promise<Encomienda[]> => listaEncomiendas(await api.get('/api/encomiendas')),
    /** Las que un viajero puede tomar en su ruta. */
    disponibles: async (origen: string, destino: string): Promise<Encomienda[]> =>
      listaEncomiendas(await api.get('/api/encomiendas/disponibles', { query: { origen, destino } })),
    /** `POST /api/encomiendas`. */
    crear: async (d: Parameters<typeof cuerpoEncomienda>[0]): Promise<Encomienda> =>
      encomiendaDesdeJson(await api.post('/api/encomiendas', { cuerpo: cuerpoEncomienda(d) })),
    /** `PUT /api/encomiendas/tomar/:id`: responde solo `{ mensaje }`. */
    async tomar(id: string): Promise<Encomienda | null> {
      const json = await api.put(`/api/encomiendas/tomar/${id}`)
      const e = esMapa(json) ? encomiendaDesdeJson(json) : null
      return e && e.id !== '' ? e : null
    },
    /** `PUT /api/encomiendas/:id/estado` (vencida = retirar, entregada). */
    async cambiarEstado(id: string, estado: EstadoEncomienda): Promise<Encomienda | null> {
      const json = await api.put(`/api/encomiendas/${id}/estado`, { cuerpo: { estado } })
      return esMapa(json) ? encomiendaDesdeJson(json) : null
    },
  }

  const calificaciones = {
    /** `GET /api/ratings/:uid` (pública). */
    resumen: async (uid: string): Promise<ResumenCalificaciones> =>
      resumenDesdeJson(await api.get(`/api/ratings/${uid}`, { auth: false })),
    /** `POST /api/ratings`. El backend ignora `encomiendaId`; se envía igual. */
    async calificar(d: {
      usuarioDestino: string
      rolDestino: Rol
      calificacion: number
      comentario?: string
      encomiendaId?: string | null
    }): Promise<void> {
      await api.post('/api/ratings', {
        cuerpo: {
          usuarioDestino: d.usuarioDestino,
          rolDestino: d.rolDestino,
          calificacion: Math.min(5, Math.max(1, d.calificacion)),
          comentario: (d.comentario ?? '').trim(),
          ...(d.encomiendaId ? { encomiendaId: d.encomiendaId } : {}),
        },
      })
    },
  }

  const lista = async (clave: string, ruta: string): Promise<string[]> => {
    const guardada = Local.listaCacheada(clave)
    if (guardada && guardada.length > 0) return guardada
    const limpia = limpiarLista(desenvolverLista(await api.get(ruta, { auth: false }), ['data', 'paises', 'ciudades']))
    if (limpia.length > 0) Local.guardarLista(clave, limpia)
    return limpia
  }

  const catalogo = {
    paises: () => lista('paises', '/api/ciudades/paises'),
    ciudades: () => lista('ciudades', '/api/ciudades/ciudades'),
  }

  const chats = {
    /** Abierto/cerrado. 404 o 500 (hoy siempre 500) → abierto: no bloquea el chat. */
    async estado(id: string): Promise<EstadoChat> {
      try {
        return parseEstadoChat(await api.get(`/api/chats/estado/${id}`))
      } catch (e) {
        if (e instanceof ApiError && (e.noEncontrado || e.status >= 500)) return 'abierto'
        throw e
      }
    },
  }

  const chatbot = {
    /** `POST /api/chatbot` (hoy 500: falta la clave de OpenRouter). */
    async enviar(mensajeUsuario: string): Promise<string> {
      const json = await api.post('/api/chatbot', { cuerpo: { mensajeUsuario } })
      if (typeof json === 'string') return json
      if (esMapa(json)) {
        const t = leerTexto(json, ['respuesta', 'mensaje', 'reply', 'message', 'content', 'text'])
        if (t !== '') return t
      }
      return 'No recibí una respuesta del asistente.'
    },
  }

  return { usuarios, viajes, encomiendas, calificaciones, catalogo, chats, chatbot }
}

export type Repositorios = ReturnType<typeof crearRepositorios>

/** Quita nombres con caracteres corruptos y duplicados por mayúsculas; ordena. */
export function limpiarLista(crudo: readonly unknown[]): string[] {
  const vistos = new Set<string>()
  const resultado: string[] = []
  for (const item of crudo) {
    if (typeof item !== 'string') continue
    const nombre = item.trim()
    if (nombre === '' || nombre.includes('�') || nombre.includes('ï¿½')) continue
    const clave = nombre.toLowerCase()
    if (vistos.has(clave)) continue
    vistos.add(clave)
    resultado.push(nombre)
  }
  return resultado.sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0))
}

/** El id del chat es `uidA_uidB` ordenados: el mismo par abre el mismo chat. */
export function idChat(a: string, b: string): string {
  return [a, b].sort().join('_')
}

export function parseEstadoChat(json: unknown): EstadoChat {
  if (esMapa(json)) {
    const estado = String(json['estado'] ?? '').toLowerCase()
    if (estado === 'cerrado' || estado === 'closed') return 'cerrado'
    if (json['cerrado'] === true || json['abierto'] === false) return 'cerrado'
  }
  if (typeof json === 'string' && json.toLowerCase().includes('cerrado')) return 'cerrado'
  return 'abierto'
}
