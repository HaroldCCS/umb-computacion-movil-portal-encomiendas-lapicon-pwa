/**
 * Formatos en español (port de lib/core/utils/formatters.dart): mismos textos
 * que la app Flutter, sin depender de Intl para que las pruebas sean exactas.
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
// getDay(): 0 = domingo.
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const MINUTO = 60_000
const HORA = 60 * MINUTO
const DIA = 24 * HORA

export const Fmt = {
  /** `1 dic 2026` (o `1 dic` si es del año actual y `corta`). */
  fecha(d: Date | null | undefined, { corta = false, ahora = new Date() } = {}): string {
    if (!d) return '—'
    const base = `${d.getDate()} ${MESES[d.getMonth()]}`
    if (corta && d.getFullYear() === ahora.getFullYear()) return base
    return `${base} ${d.getFullYear()}`
  },

  /** `USD 10`, `COP 50.000`, `USD 12,50`. */
  dinero(valor: number, moneda: string): string {
    const entero = Math.trunc(valor)
    const decimales = Math.round(Math.abs(valor - entero) * 100)
    const miles = String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    const signo = valor < 0 ? '-' : ''
    const dec = decimales === 0 ? '' : `,${String(decimales).padStart(2, '0')}`
    return `${moneda.toUpperCase()} ${signo}${miles}${dec}`
  },

  /** "hace 5 min", "hace 2 h", "ayer", o la fecha. */
  relativo(d: Date | null | undefined, ahora: Date = new Date()): string {
    if (!d) return ''
    const diff = ahora.getTime() - d.getTime()
    if (diff < MINUTO) return 'ahora'
    if (diff < HORA) return `hace ${Math.floor(diff / MINUTO)} min`
    if (diff < DIA) return `hace ${Math.floor(diff / HORA)} h`
    if (Math.floor(diff / DIA) === 1) return 'ayer'
    return Fmt.fecha(d, { corta: true, ahora })
  },

  /** `Miércoles, 22 de octubre` (encabezado de Inicio). */
  fechaLarga(d: Date): string {
    const dia = DIAS[d.getDay()]!
    return `${dia[0]!.toUpperCase()}${dia.slice(1)}, ${d.getDate()} de ${MESES_LARGOS[d.getMonth()]}`
  },

  /** `14:05`. */
  hora(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },

  /** `4,5` (promedios con coma decimal). */
  decimal(n: number): string {
    return n.toFixed(1).replace('.', ',')
  },
}

/** `YYYY-MM-DD` en hora local (lo que espera `POST /api/viajes`). */
export function fechaIso(d: Date): string {
  return `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Solo el día (medianoche local). */
export function soloDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Suma meses como `DateTime(año, mes + n, día)` de Dart (se desborda igual). */
export function sumarMeses(d: Date, meses: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + meses, d.getDate())
}
