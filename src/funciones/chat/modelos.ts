/** Modelos del chat en Firestore (port de conversacion.dart y mensaje_chat.dart). */
import { Fmt } from '../../core/formato'
import { esMapa, leerFechaValor, textoONulo } from '../../datos/modelos/json'

/** `chats/{chatId}`: `{ participantes, nombres: {uid: nombre}, encomiendaId?,
 *  ruta?, ultimoMensaje, ultimoEmisorUid, actualizadoEn }`. */
export interface Conversacion {
  id: string
  participantes: string[]
  nombres: Record<string, string>
  encomiendaId: string | null
  ruta: string | null
  ultimoMensaje: string | null
  ultimoEmisorUid: string | null
  actualizadoEn: Date | null
}

export function conversacionDesdeMapa(id: string, data: Record<string, unknown>): Conversacion {
  const participantes = Array.isArray(data['participantes'])
    ? data['participantes'].map(String).filter((p) => p !== '')
    : id.split('_').filter((p) => p !== '')
  const nombres: Record<string, string> = {}
  const crudos = data['nombres']
  if (esMapa(crudos)) {
    for (const [uid, v] of Object.entries(crudos)) {
      const n = textoONulo(v)
      if (n) nombres[uid] = n
    }
  }
  return {
    id,
    participantes,
    nombres,
    encomiendaId: textoONulo(data['encomiendaId']),
    ruta: textoONulo(data['ruta']),
    ultimoMensaje: textoONulo(data['ultimoMensaje']),
    ultimoEmisorUid: textoONulo(data['ultimoEmisorUid']),
    actualizadoEn: leerFechaValor(data['actualizadoEn']),
  }
}

/** uid de la otra persona (el chat es siempre entre dos). */
export function otroUid(c: Conversacion, miUid: string): string | null {
  return c.participantes.find((p) => p !== miUid) ?? null
}

export function nombreDe(c: Conversacion, uid: string | null): string {
  return (uid && c.nombres[uid]) || 'Usuario'
}

/** Más recientes primero; las que tienen la hora pendiente van arriba. */
export function ordenarConversaciones(lista: Conversacion[]): Conversacion[] {
  return [...lista].sort((a, b) => {
    if (!a.actualizadoEn && !b.actualizadoEn) return 0
    if (!a.actualizadoEn) return -1
    if (!b.actualizadoEn) return 1
    return b.actualizadoEn.getTime() - a.actualizadoEn.getTime()
  })
}

/** "Laura Gómez" → "LG" (máximo dos). */
export function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  if (partes.length === 0) return '?'
  return partes.map((p) => String.fromCodePoint(p.codePointAt(0)!).toUpperCase()).join('')
}

/** `chats/{chatId}/mensajes/{id}`. */
export interface MensajeChat {
  id: string
  texto: string
  emisorUid: string
  /** Hora del servidor o, mientras se envía, la local. */
  fecha: Date
  /** `true` mientras el serverTimestamp no se confirma ("Enviando…"). */
  pendiente: boolean
}

export function mensajeDesdeMapa(
  id: string,
  data: Record<string, unknown>,
  { pendienteDeEscritura = false, ahora = new Date() } = {},
): MensajeChat {
  const servidor = leerFechaValor(data['creadoEn'])
  const local = leerFechaValor(data['creadoLocal'])
  return {
    id,
    texto: String(data['texto'] ?? ''),
    emisorUid: String(data['emisorUid'] ?? ''),
    fecha: servidor ?? local ?? ahora,
    pendiente: servidor === null || pendienteDeEscritura,
  }
}

export type ItemChat = { tipo: 'dia'; dia: Date; etiqueta: string } | { tipo: 'mensaje'; mensaje: MensajeChat }

/** Ordena por fecha e inserta un separador cada vez que cambia el día. */
export function agruparPorDia(mensajes: MensajeChat[], ahora = new Date()): ItemChat[] {
  const ordenados = [...mensajes].sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
  const items: ItemChat[] = []
  let diaActual: number | null = null
  for (const m of ordenados) {
    const dia = new Date(m.fecha.getFullYear(), m.fecha.getMonth(), m.fecha.getDate())
    if (diaActual === null || dia.getTime() !== diaActual) {
      diaActual = dia.getTime()
      items.push({ tipo: 'dia', dia, etiqueta: etiquetaDia(dia, ahora) })
    }
    items.push({ tipo: 'mensaje', mensaje: m })
  }
  return items
}

/** "Hoy", "Ayer" o "3 oct". */
export function etiquetaDia(dia: Date, ahora = new Date()): string {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const d = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate())
  const diff = Math.round((hoy.getTime() - d.getTime()) / 86_400_000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  return Fmt.fecha(d, { corta: true, ahora })
}
