import type { Conversacion, MensajeChat } from './modelos'

export interface DatosEnvio {
  chatId: string
  emisorUid: string
  receptorUid: string
  texto: string
  nombreEmisor?: string | null
  nombreReceptor?: string | null
  encomiendaId?: string | null
  ruta?: string | null
}

/**
 * Chat en tiempo real (Práctica 5). Los mensajes NO pasan por el backend:
 * van a Firestore con el mismo esquema que la app Flutter, así un chat
 * abierto en la PWA se ve en Flutter y al revés.
 */
export interface ServicioChat {
  mensajes(chatId: string, alCambiar: (m: MensajeChat[]) => void, alError: (e: unknown) => void): () => void
  conversaciones(miUid: string, alCambiar: (c: Conversacion[]) => void, alError: (e: unknown) => void): () => void
  enviar(d: DatosEnvio): Promise<void>
}

/** Traduce errores de Firestore a mensajes para la persona. */
export function mensajeErrorChat(error: unknown): string {
  const codigo =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code.replace(/^firestore\//, '')
      : null
  switch (codigo) {
    case null:
      return 'No pudimos cargar el chat. Intenta de nuevo.'
    case 'permission-denied':
      return 'No tienes permiso para ver o escribir en este chat. Puede que las reglas de Firestore aún no lo permitan.'
    case 'unavailable':
    case 'deadline-exceeded':
      return 'No hay conexión con el chat. Revisa tu internet.'
    case 'unauthenticated':
      return 'Tu sesión expiró. Vuelve a iniciar sesión.'
    case 'failed-precondition':
      return 'El chat necesita una configuración adicional en Firestore.'
    default:
      return `No pudimos cargar el chat (${codigo}).`
  }
}

/** Firestore se carga solo al abrir el chat (es la parte más pesada del SDK). */
export async function cargarServicioChat(): Promise<ServicioChat> {
  if (import.meta.env.VITE_AUTH_FALSA === '1') {
    const { crearChatFalso } = await import('./servicio-falso')
    return crearChatFalso()
  }
  const { chatFirestore } = await import('./servicio-firestore')
  return chatFirestore
}
