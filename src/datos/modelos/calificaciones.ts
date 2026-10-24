import { desenvolverLista, esMapa, leerFecha, leerNumero, leerTexto, type Mapa } from './json'

/** Respuesta de `GET /api/ratings/:uid`
 *  (verificada: `{ total: 0, promedio: null, calificaciones: [] }`). */
export interface ResumenCalificaciones {
  total: number
  promedio: number | null
  calificaciones: Calificacion[]
}

export interface Calificacion {
  calificacion: number
  comentario: string
  rolDestino: string | null
  fecha: Date | null
}

export function calificacionDesdeJson(m: Mapa): Calificacion {
  const rol = leerTexto(m, ['rolDestino'])
  const puntaje = Math.round(leerNumero(m, ['calificacion', 'rating']) ?? 0)
  return {
    calificacion: Math.min(5, Math.max(0, puntaje)),
    comentario: leerTexto(m, ['comentario', 'comment']),
    rolDestino: rol === '' ? null : rol,
    fecha: leerFecha(m, ['timestamp', 'createdAt', 'fecha']),
  }
}

export function resumenDesdeJson(json: unknown): ResumenCalificaciones {
  const m = esMapa(json) ? json : {}
  const lista = desenvolverLista(m, ['calificaciones', 'ratings']).filter(esMapa).map(calificacionDesdeJson)
  const total = leerNumero(m, ['total'])
  return {
    total: total === null ? lista.length : Math.trunc(total),
    promedio: leerNumero(m, ['promedio', 'average']),
    calificaciones: lista,
  }
}

export const sinCalificaciones = (r: ResumenCalificaciones) => r.total === 0

/** Cuántas calificaciones hay de cada puntaje (índice 1..5). */
export function distribucion(calificaciones: readonly Calificacion[]): number[] {
  const conteo = [0, 0, 0, 0, 0, 0]
  for (const c of calificaciones) {
    if (c.calificacion >= 1 && c.calificacion <= 5) conteo[c.calificacion]!++
  }
  return conteo
}

/** Etiqueta de cada puntaje (docs/07 §7.6 "Calificar"). */
export function etiquetaPuntaje(p: number): string {
  return ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'][p] ?? ''
}

/** Sugerencias rápidas según el puntaje elegido. */
export function sugerenciasPara(p: number): string[] {
  if (p <= 0) return []
  if (p >= 4) return ['Puntual', 'Buena comunicación', 'Cuidó el paquete', 'Amable']
  return ['Llegó tarde', 'Poca comunicación', 'Paquete con daños', 'Difícil de coordinar']
}

/** Une sugerencias y texto libre en un comentario (máximo `max` caracteres). */
export function componerComentario(sugerencias: Iterable<string>, texto: string, max = 300): string {
  const partes = [...sugerencias].map((s) => s.trim()).filter((s) => s !== '')
  if (texto.trim() !== '') partes.push(texto.trim())
  const unido = partes.join('. ')
  return unido.length <= max ? unido : unido.slice(0, max)
}
