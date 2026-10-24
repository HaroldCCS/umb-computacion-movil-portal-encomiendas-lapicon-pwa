/**
 * Lectura tolerante del JSON del backend (port de json_utils.dart): el
 * contrato de algunas respuestas varía, así que se aceptan llaves alternativas.
 */

export type Mapa = Record<string, unknown>

export function esMapa(v: unknown): v is Mapa {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Si el objeto viene envuelto (p. ej. `{ "user": {...} }`), lo desenvuelve. */
export function desenvolverObjeto(json: unknown, llaves: readonly string[]): Mapa | null {
  if (!esMapa(json)) return null
  for (const llave of llaves) {
    const interno = json[llave]
    if (esMapa(interno)) return interno
  }
  return json
}

/** Si la lista viene envuelta (p. ej. `{ "data": [...] }`), la desenvuelve. */
export function desenvolverLista(json: unknown, llaves: readonly string[]): unknown[] {
  if (Array.isArray(json)) return json
  if (esMapa(json)) {
    for (const llave of llaves) {
      const interno = json[llave]
      if (Array.isArray(interno)) return interno
    }
  }
  return []
}

export function leerTexto(json: Mapa, llaves: readonly string[]): string {
  for (const llave of llaves) {
    const v = json[llave]
    if (v !== null && v !== undefined && !esMapa(v) && !Array.isArray(v)) {
      const t = String(v).trim()
      if (t !== '') return t
    }
  }
  return ''
}

export function leerNumero(json: Mapa, llaves: readonly string[]): number | null {
  for (const llave of llaves) {
    const v = json[llave]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string') {
      const t = v.trim().replace(',', '.')
      if (t !== '' && Number.isFinite(Number(t))) return Number(t)
    }
  }
  return null
}

const SOLO_DIA = /^(\d{4})-(\d{2})-(\d{2})$/
// El backend guarda las fechas de viaje como medianoche UTC
// ("2026-12-01T00:00:00.000Z"): es un día del calendario, no un instante.
// Leído como instante, en Colombia (UTC-5) se vería el 30 de noviembre.
const MEDIANOCHE_UTC = /^(\d{4})-(\d{2})-(\d{2})T00:00(:00(\.0+)?)?Z$/

/** Fecha desde texto ISO o milisegundos; `null` si no se reconoce. */
export function leerFechaValor(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v)
  if (typeof v !== 'string' || v.trim() === '') return null
  const t = v.trim()
  const dia = SOLO_DIA.exec(t) ?? MEDIANOCHE_UTC.exec(t)
  if (dia) return new Date(Number(dia[1]), Number(dia[2]) - 1, Number(dia[3]))
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? null : d
}

export function leerFecha(json: Mapa, llaves: readonly string[]): Date | null {
  for (const llave of llaves) {
    if (typeof json[llave] !== 'string') continue
    const d = leerFechaValor(json[llave])
    if (d) return d
  }
  return null
}

/** Texto o `null` si está vacío. */
export function textoONulo(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const t = String(v).trim()
  return t === '' ? null : t
}
