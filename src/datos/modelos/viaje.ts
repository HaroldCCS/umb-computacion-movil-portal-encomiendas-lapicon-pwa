import { fechaIso } from '../../core/formato'
import { parseEstadoViaje, type EstadoViaje } from './estado'
import { desenvolverObjeto, esMapa, leerFecha, leerTexto } from './json'

/** Viaje de un viajero (`/api/viajes`), port de viaje.dart. */
export interface Viaje {
  id: string
  numeroVuelo: string
  ciudadOrigen: string
  ciudadDestino: string
  /** Día del vuelo (medianoche local); `null` si no llega. */
  fechaViaje: Date | null
  estado: EstadoViaje
  viajeroUid: string | null
  viajeroNombre: string | null
}

export function viajeDesdeJson(json: unknown): Viaje {
  const m = desenvolverObjeto(json, ['viaje', 'data']) ?? {}
  let uid: string | null = null
  let nombre: string | null = null
  for (const llave of ['viajero', 'viajeroUid', 'usuario', 'uid', 'userId']) {
    const v = m[llave]
    if (typeof v === 'string' && v !== '') {
      uid = v
      break
    }
    if (esMapa(v)) {
      const id = leerTexto(v, ['uid', '_id', 'id'])
      uid = id === '' ? null : id
      const n = `${leerTexto(v, ['nombre'])} ${leerTexto(v, ['apellido'])}`.trim()
      nombre = n === '' ? null : n
      break
    }
  }
  return {
    id: leerTexto(m, ['_id', 'id']),
    numeroVuelo: leerTexto(m, ['numeroVuelo', 'vuelo']),
    ciudadOrigen: leerTexto(m, ['ciudadOrigen', 'origen']),
    ciudadDestino: leerTexto(m, ['ciudadDestino', 'destino']),
    fechaViaje: leerFecha(m, ['fechaViaje', 'fecha']),
    estado: parseEstadoViaje(m['estado']),
    viajeroUid: uid,
    viajeroNombre: nombre,
  }
}

/** Cuerpo de `POST /api/viajes` (igual a Postman: fecha `YYYY-MM-DD`). */
export function cuerpoViaje(d: { numeroVuelo: string; ciudadOrigen: string; ciudadDestino: string; fechaViaje: Date }) {
  return {
    numeroVuelo: d.numeroVuelo.replaceAll(' ', '').toUpperCase(),
    ciudadOrigen: d.ciudadOrigen,
    ciudadDestino: d.ciudadDestino,
    fechaViaje: fechaIso(d.fechaViaje),
  }
}
