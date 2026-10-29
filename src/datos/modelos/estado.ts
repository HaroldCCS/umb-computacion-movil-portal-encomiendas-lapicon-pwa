/**
 * Estados (port de estado.dart). Los de encomienda son los únicos que acepta
 * `PUT /api/encomiendas/:id/estado`: no hay "cancelada"; retirar = `vencida`.
 */

export type EstadoEncomienda = 'disponible' | 'tomada' | 'entregada' | 'recibida' | 'vencida' | 'desconocido'

export const ETIQUETA_ENCOMIENDA: Record<EstadoEncomienda, string> = {
  disponible: 'Disponible',
  tomada: 'En camino',
  entregada: 'Entregada',
  recibida: 'Recibida',
  vencida: 'Vencida',
  desconocido: 'Sin estado',
}

const VALIDOS_ENCOMIENDA = ['disponible', 'tomada', 'entregada', 'recibida', 'vencida', 'desconocido'] as const

export function parseEstadoEncomienda(v: unknown): EstadoEncomienda {
  const t = v === null || v === undefined ? '' : String(v).trim().toLowerCase()
  return (VALIDOS_ENCOMIENDA as readonly string[]).includes(t) ? (t as EstadoEncomienda) : 'desconocido'
}

export const esActiva = (e: EstadoEncomienda) => e === 'disponible' || e === 'tomada'

/** Ya llegó a destino (entregada por el viajero o recibida). */
export const esFinalizada = (e: EstadoEncomienda) => e === 'entregada' || e === 'recibida'

/** `contactado` solo aparece en el Swagger oficial (el PATCH lo rechaza); se muestra si llega. */
export type EstadoViaje = 'disponible' | 'completado' | 'cancelado' | 'contactado' | 'desconocido'

export const ETIQUETA_VIAJE: Record<EstadoViaje, string> = {
  disponible: 'Activo',
  completado: 'Completado',
  cancelado: 'Cancelado',
  contactado: 'Contactado',
  desconocido: 'Sin estado',
}

const ESTADOS_VIAJE: readonly EstadoViaje[] = ['disponible', 'completado', 'cancelado', 'contactado']

export function parseEstadoViaje(v: unknown): EstadoViaje {
  const t = v === null || v === undefined ? '' : String(v).trim().toLowerCase()
  return ESTADOS_VIAJE.find((e) => e === t) ?? 'desconocido'
}

/** Estado del chat según `GET /api/chats/estado/:chatId`. */
export type EstadoChat = 'abierto' | 'cerrado'
