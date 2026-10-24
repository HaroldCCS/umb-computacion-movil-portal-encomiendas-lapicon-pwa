import { conversacionDesdeMapa, mensajeDesdeMapa, ordenarConversaciones, type Conversacion, type MensajeChat } from './modelos'
import type { ServicioChat } from './servicio'

/** Chat en memoria SOLO para pruebas (E2E y componentes). Mismo esquema. */
export function crearChatFalso(): ServicioChat {
  const chats = new Map<string, Record<string, unknown>>()
  const mensajes = new Map<string, MensajeChat[]>()
  const oyentesMensajes = new Map<string, Set<(m: MensajeChat[]) => void>>()
  const oyentesConv = new Set<{ uid: string; fn: (c: Conversacion[]) => void }>()

  const conversacionesDe = (uid: string) =>
    ordenarConversaciones(
      [...chats.entries()]
        .map(([id, data]) => conversacionDesdeMapa(id, data))
        .filter((c) => c.participantes.includes(uid)),
    )

  return {
    mensajes(chatId, alCambiar) {
      const set = oyentesMensajes.get(chatId) ?? new Set()
      set.add(alCambiar)
      oyentesMensajes.set(chatId, set)
      queueMicrotask(() => alCambiar([...(mensajes.get(chatId) ?? [])]))
      return () => set.delete(alCambiar)
    },
    conversaciones(uid, alCambiar) {
      const o = { uid, fn: alCambiar }
      oyentesConv.add(o)
      queueMicrotask(() => alCambiar(conversacionesDe(uid)))
      return () => oyentesConv.delete(o)
    },
    async enviar(d) {
      const texto = d.texto.trim()
      if (texto === '') return
      const ahora = new Date()
      const previo = chats.get(d.chatId) ?? {}
      chats.set(d.chatId, {
        ...previo,
        participantes: [d.emisorUid, d.receptorUid].sort(),
        nombres: {
          ...(previo['nombres'] as Record<string, string> | undefined),
          ...(d.nombreEmisor ? { [d.emisorUid]: d.nombreEmisor } : {}),
          ...(d.nombreReceptor ? { [d.receptorUid]: d.nombreReceptor } : {}),
        },
        ...(d.encomiendaId ? { encomiendaId: d.encomiendaId } : {}),
        ...(d.ruta ? { ruta: d.ruta } : {}),
        ultimoMensaje: texto,
        ultimoEmisorUid: d.emisorUid,
        actualizadoEn: ahora,
      })
      const lista = mensajes.get(d.chatId) ?? []
      lista.push(
        mensajeDesdeMapa(`m${lista.length + 1}`, { texto, emisorUid: d.emisorUid, creadoEn: ahora }),
      )
      mensajes.set(d.chatId, lista)
      for (const o of oyentesMensajes.get(d.chatId) ?? []) o([...lista])
      for (const o of oyentesConv) o.fn(conversacionesDe(o.uid))
    },
  }
}
