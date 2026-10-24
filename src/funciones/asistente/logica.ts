/** Conversación con el asistente (port de asistente_controller.dart). */
import { ApiError, AppError, RedError } from '../../core/red/errores'
import type { Rol } from '../../datos/modelos/rol'

export interface MensajeAsistente {
  id: number
  texto: string
  autor: 'usuario' | 'asistente'
  /** Aviso de error: muestra "Reintentar". */
  error?: boolean
  /** Pregunta a reenviar al tocar "Reintentar". */
  reintentarCon?: string
}

export interface EstadoAsistente {
  mensajes: MensajeAsistente[]
  escribiendo: boolean
}

export const BIENVENIDA: MensajeAsistente = {
  id: 0,
  texto:
    '¡Hola! Soy el asistente de Lapticon. Puedo ayudarte a publicar una encomienda, registrar tu viaje o ' +
    'resolver dudas sobre cómo funciona la app. ¿En qué te ayudo?',
  autor: 'asistente',
}

export const estadoInicial = (): EstadoAsistente => ({ mensajes: [BIENVENIDA], escribiendo: false })

/** Solo está el saludo: se muestran las sugerencias. */
export const esNueva = (e: EstadoAsistente) => e.mensajes.length <= 1

export type AccionAsistente =
  | { tipo: 'preguntar'; texto: string }
  | { tipo: 'reintentar'; error: MensajeAsistente }
  | { tipo: 'respuesta'; texto: string }
  | { tipo: 'fallo'; texto: string; pregunta: string }
  | { tipo: 'reiniciar' }

let siguienteId = 1

export function reducirAsistente(e: EstadoAsistente, a: AccionAsistente): EstadoAsistente {
  switch (a.tipo) {
    case 'preguntar':
      return {
        mensajes: [...e.mensajes, { id: siguienteId++, texto: a.texto.trim(), autor: 'usuario' }],
        escribiendo: true,
      }
    case 'reintentar':
      return { mensajes: e.mensajes.filter((m) => m.id !== a.error.id), escribiendo: true }
    case 'respuesta':
      return { mensajes: [...e.mensajes, { id: siguienteId++, texto: a.texto, autor: 'asistente' }], escribiendo: false }
    case 'fallo':
      return {
        mensajes: [
          ...e.mensajes,
          { id: siguienteId++, texto: a.texto, autor: 'asistente', error: true, reintentarCon: a.pregunta },
        ],
        escribiendo: false,
      }
    case 'reiniciar':
      return estadoInicial()
  }
}

/** Mensaje amable según el error (el backend puede no tener la clave de IA). */
export function mensajeErrorAsistente(e: unknown): string {
  if (e instanceof RedError) return e.message
  if (e instanceof ApiError) {
    const m = e.message.toLowerCase()
    if (e.status >= 500 || m.includes('openrouter') || m.includes('api key') || m.includes('apikey')) {
      return 'El asistente no está disponible ahora. Intenta más tarde.'
    }
  }
  return e instanceof AppError ? e.message : 'El asistente no está disponible ahora. Intenta más tarde.'
}

/** Sugerencias iniciales según el rol. */
export function sugerenciasAsistente(rol: Rol | null): string[] {
  return rol === 'viajero'
    ? ['¿Cómo registro mi vuelo?', '¿Qué no puedo llevar en mi maleta?', '¿Cómo tomo una encomienda?']
    : ['¿Cómo publico una encomienda?', 'Quiero enviar algo de Bogota a Miami', '¿Cómo elijo un viajero confiable?']
}
