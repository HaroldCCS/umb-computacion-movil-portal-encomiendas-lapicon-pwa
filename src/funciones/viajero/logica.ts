/** Lógica pura del viajero (port de viajero_logic.dart), probada aparte. */
import { fechaIso } from '../../core/formato'
import type { Encomienda } from '../../datos/modelos/encomienda'
import { esFinalizada, type EstadoEncomienda } from '../../datos/modelos/estado'
import { esMapa, type Mapa } from '../../datos/modelos/json'

/** Aerolínea (2 caracteres IATA) + 1 a 4 dígitos + sufijo opcional. */
const VUELO = /^[A-Z0-9]{2}\d{1,4}[A-Z]?$/

/** "av 24" → "AV24". */
export function normalizarVuelo(v: string): string {
  return v.replace(/[\s-]/g, '').toUpperCase()
}

export function validarNumeroVuelo(valor: string | null | undefined): string | null {
  const v = normalizarVuelo(valor ?? '')
  if (v === '') return 'Escribe el número de vuelo.'
  if (!/[A-Z]/.test(v.slice(0, 2))) return 'Empieza con el código de la aerolínea (p. ej. AV, AA, LA).'
  if (!VUELO.test(v)) return 'Revisa el número: debe verse como AV24 o AA123.'
  return null
}

/** Clave para recordar que un vuelo se verificó. */
export function claveVuelo(numero: string, fecha: Date | null): string {
  return `${normalizarVuelo(numero)}|${fecha ? fechaIso(fecha) : ''}`
}

const prioridad = (e: EstadoEncomienda) =>
  e === 'tomada' ? 0 : e === 'disponible' ? 1 : esFinalizada(e) ? 2 : 3

/**
 * "Mis entregas": no hay endpoint propio, así que se combinan las de
 * `GET /api/encomiendas` cuyo viajero soy yo y las que tomé desde este
 * dispositivo. Si está en ambos lados gana la del servidor (estado fresco).
 */
export function combinarEntregas(d: { servidor: Encomienda[]; locales: Encomienda[]; uid: string }): Encomienda[] {
  const idsLocales = new Set(d.locales.map((e) => e.id))
  const porId = new Map<string, Encomienda>()
  for (const e of d.locales) porId.set(e.id, e)
  for (const e of d.servidor) {
    const esMia = e.viajeroUid === d.uid || idsLocales.has(e.id)
    // Una encomienda propia como remitente no es una "entrega".
    if (esMia && e.remitenteUid !== d.uid) porId.set(e.id, e)
  }
  return [...porId.values()].sort((a, b) => {
    const p = prioridad(a.estado) - prioridad(b.estado)
    if (p !== 0) return p
    return (b.creadaEn?.getTime() ?? 946684800000) - (a.creadaEn?.getTime() ?? 946684800000)
  })
}

/** Las que puedo tomar: disponibles y no mías. `/disponibles` no trae el uid
 *  del remitente, por eso también se excluyen las que publiqué (`idsPropios`). */
export function paraTomar(lista: Encomienda[], uid: string | null, idsPropios: Set<string> = new Set()): Encomienda[] {
  return lista.filter(
    (e) =>
      (e.estado === 'disponible' || e.estado === 'desconocido') &&
      (uid === null || e.remitenteUid !== uid) &&
      !idsPropios.has(e.id),
  )
}

export function tomadaPorMi(e: Encomienda, uid: string | null, idsLocales: Set<string>): boolean {
  return uid !== null && (e.viajeroUid === uid || idsLocales.has(e.id))
}

/** `PUT /:id/estado` trae el uid del remitente pero no su nombre: se completa. */
export function conservarNombres(nueva: Encomienda, previa: Encomienda): Encomienda {
  return {
    ...nueva,
    remitenteUid: nueva.remitenteUid ?? previa.remitenteUid,
    viajeroUid: nueva.viajeroUid ?? previa.viajeroUid,
    remitenteNombre: nueva.remitenteNombre ?? previa.remitenteNombre,
    viajeroNombre: nueva.viajeroNombre ?? previa.viajeroNombre,
    fechaVencimiento: nueva.fechaVencimiento ?? previa.fechaVencimiento,
    creadaEn: nueva.creadaEn ?? previa.creadaEn,
  }
}

/** Datos legibles de `/api/vuelos/:numero/:fecha` (formas comunes de AeroDataBox). */
export function resumenVuelo(json: Mapa): string[] {
  const nombre = (v: unknown): string | null => {
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
    if (esMapa(v)) {
      for (const k of ['name', 'nombre', 'shortName', 'municipalityName']) {
        const x = v[k]
        if (typeof x === 'string' && x.trim() !== '') return x.trim()
      }
      const aeropuerto = v['airport'] ?? v['aeropuerto']
      if (aeropuerto !== undefined && aeropuerto !== null) return nombre(aeropuerto)
    }
    return null
  }
  const datos: string[] = []
  const aerolinea = nombre(json['airline'] ?? json['aerolinea'])
  if (aerolinea) datos.push(`Aerolínea: ${aerolinea}`)
  const salida = nombre(json['departure'] ?? json['salida'] ?? json['origen'])
  if (salida) datos.push(`Sale de: ${salida}`)
  const llegada = nombre(json['arrival'] ?? json['llegada'] ?? json['destino'])
  if (llegada) datos.push(`Llega a: ${llegada}`)
  return datos
}

/** Tomadas que todavía debo entregar. */
export const porEntregar = (entregas: Encomienda[]) => entregas.filter((e) => e.estado === 'tomada')

/** Entregadas sin calificar (y con remitente conocido). */
export function porCalificarViajero(entregas: Encomienda[], calificadas: Set<string>): Encomienda[] {
  return entregas.filter((e) => esFinalizada(e.estado) && e.remitenteUid !== null && !calificadas.has(e.id))
}

/** Lo que me pagan (tomadas o entregadas) por moneda, sin mezclar monedas. */
export function gananciasPorMoneda(entregas: Encomienda[]): Map<string, number> {
  const total = new Map<string, number>()
  for (const e of entregas) {
    if (e.estado === 'tomada' || esFinalizada(e.estado)) {
      const m = e.moneda.toUpperCase()
      total.set(m, (total.get(m) ?? 0) + e.valor)
    }
  }
  return total
}

/** Orden de Explorar. No se ordena por valor: comparar USD con COP engaña. */
export type OrdenExplorar = 'recientes' | 'vencenPronto'
export const TITULO_ORDEN: Record<OrdenExplorar, string> = {
  recientes: 'Más recientes',
  vencenPronto: 'Vencen pronto',
}

/** Ordena sin modificar `lista`; las que no tienen fecha van al final. */
export function ordenarDisponibles(lista: Encomienda[], orden: OrdenExplorar): Encomienda[] {
  const porFecha = (a: Date | null, b: Date | null, ascendente: boolean) => {
    if (!a && !b) return 0
    if (!a) return 1
    if (!b) return -1
    return ascendente ? a.getTime() - b.getTime() : b.getTime() - a.getTime()
  }
  return [...lista].sort((a, b) =>
    orden === 'recientes'
      ? porFecha(a.creadaEn, b.creadaEn, false)
      : porFecha(a.fechaVencimiento, b.fechaVencimiento, true),
  )
}
