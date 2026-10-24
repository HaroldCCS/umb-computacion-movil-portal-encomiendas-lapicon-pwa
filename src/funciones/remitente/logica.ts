/** Lógica pura del remitente (port de envios_logic.dart), probada aparte. */
import type { Encomienda } from '../../datos/modelos/encomienda'
import type { EstadoEncomienda } from '../../datos/modelos/estado'

/** Pestañas (chips) de "Mis envíos". */
export type PestanaEnvios = 'activas' | 'entregadas' | 'historial'
export const PESTANAS_ENVIOS: readonly PestanaEnvios[] = ['activas', 'entregadas', 'historial']
export const TITULO_PESTANA: Record<PestanaEnvios, string> = {
  activas: 'Activas',
  entregadas: 'Entregadas',
  historial: 'Historial',
}

export function pestanaDe(estado: EstadoEncomienda): PestanaEnvios {
  if (estado === 'disponible' || estado === 'tomada') return 'activas'
  if (estado === 'entregada' || estado === 'recibida') return 'entregadas'
  return 'historial'
}

export function parsePestana(v: string | null): PestanaEnvios {
  return v === 'entregadas' || v === 'historial' ? v : 'activas'
}

/** Agrupa por pestaña; dentro de cada una, las más recientes primero
 *  (las que no tienen fecha van al final). */
export function agruparEnvios(lista: Encomienda[]): Record<PestanaEnvios, Encomienda[]> {
  const grupos: Record<PestanaEnvios, Encomienda[]> = { activas: [], entregadas: [], historial: [] }
  for (const e of lista) grupos[pestanaDe(e.estado)].push(e)
  for (const g of Object.values(grupos)) {
    g.sort((a, b) => {
      if (!a.creadaEn && !b.creadaEn) return 0
      if (!a.creadaEn) return 1
      if (!b.creadaEn) return -1
      return b.creadaEn.getTime() - a.creadaEn.getTime()
    })
  }
  return grupos
}

/** Pasos de la línea de tiempo del detalle. */
export const PASOS_ENCOMIENDA = ['Publicada', 'Tomada', 'Entregada', 'Calificada'] as const

/** Paso actual (0..3) o `null` si es terminal sin entrega (vencida). */
export function pasoActual(estado: EstadoEncomienda, calificada = false): number | null {
  switch (estado) {
    case 'disponible':
      return 0
    case 'tomada':
      return 1
    case 'entregada':
    case 'recibida':
      return calificada ? 3 : 2
    default:
      return null
  }
}

/** "1.234.567" → 1234567; `null` si está vacío. Solo enteros. */
export function parseValor(texto: string | null | undefined): number | null {
  const digitos = (texto ?? '').replace(/[^\d]/g, '')
  return digitos === '' ? null : Number.parseInt(digitos, 10)
}

export function validarValor(texto: string | null | undefined): string | null {
  const v = parseValor(texto)
  if (v === null) return 'Escribe cuánto pagas por llevarla.'
  if (v <= 0) return 'El valor debe ser mayor que cero.'
  if (v > 100_000_000) return 'El valor es demasiado alto.'
  return null
}

/** Agrupa de a tres con punto mientras se escribe: `1234567` → `1.234.567`. */
export function formatearMiles(texto: string): string {
  const digitos = texto.replace(/[^\d]/g, '')
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function validarObservaciones(texto: string | null | undefined): string | null {
  const t = (texto ?? '').trim()
  if (t === '') return 'Cuéntale al viajero qué envías.'
  if (t.length < 3) return 'Describe un poco más el contenido.'
  if (t.length > 200) return 'Máximo 200 caracteres.'
  return null
}

/** Origen y destino deben ser distintos. */
export function validarRuta(origen: string, destino: string): string | null {
  if (origen.trim() === '' || destino.trim() === '') return null
  if (origen.trim().toLowerCase() === destino.trim().toLowerCase()) {
    return 'El origen y el destino no pueden ser la misma ciudad.'
  }
  return null
}

/** Lo que muestra el Inicio del remitente (docs/08 §8.4). */
export interface ResumenEnvios {
  enCamino: number
  disponibles: number
  entregadas: number
  porCalificar: Encomienda[]
  activas: number
  nota: string
}

export function resumenEnvios(lista: Encomienda[], calificadas: Set<string>): ResumenEnvios {
  const g = agruparEnvios(lista)
  const enCamino = g.activas.filter((e) => e.estado === 'tomada').length
  const disponibles = g.activas.filter((e) => e.estado === 'disponible').length
  const activas = enCamino + disponibles
  // Solo se puede calificar si se sabe quién la llevó.
  const porCalificar = g.entregadas.filter((e) => e.viajeroUid !== null && !calificadas.has(e.id))
  let nota: string
  if (activas === 0) {
    // Espacio de no separación: el "+" no queda solo en otra línea.
    nota = 'No tienes envíos activos. Publica uno con el botón +.'
  } else {
    const partes: string[] = []
    if (enCamino > 0) partes.push(`${enCamino} ${enCamino === 1 ? 'va' : 'van'} en camino`)
    if (disponibles > 0) partes.push(`${disponibles} ${disponibles === 1 ? 'espera' : 'esperan'} viajero`)
    nota = `${partes.join(' · ')}.`
  }
  return { enCamino, disponibles, entregadas: g.entregadas.length, porCalificar, activas, nota }
}
