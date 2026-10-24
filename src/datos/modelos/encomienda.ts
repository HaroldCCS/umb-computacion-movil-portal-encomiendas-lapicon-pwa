import { parseEstadoEncomienda, type EstadoEncomienda } from './estado'
import { desenvolverObjeto, esMapa, leerFecha, leerNumero, leerTexto, type Mapa } from './json'

/**
 * Encomienda (`/api/encomiendas`), port de encomienda.dart. Forma confirmada
 * (22-oct-2026): el remitente viene en `uid`, el viajero en `viajeroId`, y en
 * `/disponibles` llega `remitenteNombre` pero no el `uid` (docs/03 §3.3).
 */
export interface Encomienda {
  id: string
  ciudadOrigen: string
  ciudadDestino: string
  observaciones: string
  moneda: string
  valor: number
  estado: EstadoEncomienda
  remitenteUid: string | null
  viajeroUid: string | null
  remitenteNombre: string | null
  viajeroNombre: string | null
  fechaVencimiento: Date | null
  creadaEn: Date | null
}

/** Campo que puede ser el uid (texto) o el usuario "populado". → [uid, nombre]. */
function persona(m: Mapa, llaves: readonly string[]): [string | null, string | null] {
  for (const llave of llaves) {
    const v = m[llave]
    if (typeof v === 'string' && v.trim() !== '') return [v.trim(), null]
    if (esMapa(v)) {
      const uid = leerTexto(v, ['uid', 'firebaseUid', '_id', 'id'])
      const nombre = `${leerTexto(v, ['nombre'])} ${leerTexto(v, ['apellido'])}`.trim()
      return [uid === '' ? null : uid, nombre === '' ? null : nombre]
    }
  }
  return [null, null]
}

function texto(m: Mapa, llave: string): string | null {
  const v = leerTexto(m, [llave])
  return v === '' ? null : v
}

export function encomiendaDesdeJson(json: unknown): Encomienda {
  const m = desenvolverObjeto(json, ['encomienda', 'data']) ?? {}
  const [remitenteUid, remitenteNombre] = persona(m, [
    'remitente', 'remitenteUid', 'remitenteId', 'usuario', 'userId', 'uid',
  ])
  const [viajeroUid, viajeroNombre] = persona(m, ['viajero', 'viajeroUid', 'viajeroId', 'tomadaPor'])
  const moneda = leerTexto(m, ['moneda'])
  return {
    id: leerTexto(m, ['_id', 'id']),
    ciudadOrigen: leerTexto(m, ['ciudadOrigen', 'origen']),
    ciudadDestino: leerTexto(m, ['ciudadDestino', 'destino']),
    observaciones: leerTexto(m, ['observaciones', 'descripcion']),
    moneda: moneda === '' ? 'USD' : moneda,
    valor: leerNumero(m, ['valor', 'precio']) ?? 0,
    estado: parseEstadoEncomienda(m['estado']),
    remitenteUid,
    remitenteNombre: remitenteNombre ?? texto(m, 'remitenteNombre'),
    viajeroUid,
    viajeroNombre: viajeroNombre ?? texto(m, 'viajeroNombre'),
    fechaVencimiento: leerFecha(m, ['fechaVencimiento', 'fechaLimite']),
    creadaEn: leerFecha(m, ['createdAt', 'fechaCreacion']),
  }
}

/** Cuerpo de `POST /api/encomiendas` (igual al de Postman). El backend ignora
 *  `fechaVencimiento`: siempre vence un mes después de creada. */
export function cuerpoEncomienda(d: {
  ciudadOrigen: string
  ciudadDestino: string
  observaciones: string
  moneda: string
  valor: number
}) {
  return {
    ciudadOrigen: d.ciudadOrigen,
    ciudadDestino: d.ciudadDestino,
    observaciones: d.observaciones,
    moneda: d.moneda,
    valor: d.valor,
  }
}

/** Serializa con las mismas llaves que lee `encomiendaDesdeJson` (registro
 *  local del viajero, igual que `encomiendaToJson` de Dart). */
export function encomiendaAJson(e: Encomienda): Mapa {
  return {
    _id: e.id,
    ciudadOrigen: e.ciudadOrigen,
    ciudadDestino: e.ciudadDestino,
    observaciones: e.observaciones,
    moneda: e.moneda,
    valor: e.valor,
    estado: e.estado,
    ...(e.remitenteUid !== null && { remitente: { uid: e.remitenteUid, nombre: e.remitenteNombre ?? '' } }),
    ...(e.viajeroUid !== null && { viajero: { uid: e.viajeroUid, nombre: e.viajeroNombre ?? '' } }),
    ...(e.fechaVencimiento && { fechaVencimiento: e.fechaVencimiento.toISOString() }),
    ...(e.creadaEn && { createdAt: e.creadaEn.toISOString() }),
  }
}

/** Copia con otro estado (y viajero, si se indica). */
export function conEstado(e: Encomienda, estado: EstadoEncomienda, viajeroUid?: string | null): Encomienda {
  return { ...e, estado, viajeroUid: viajeroUid ?? e.viajeroUid }
}
