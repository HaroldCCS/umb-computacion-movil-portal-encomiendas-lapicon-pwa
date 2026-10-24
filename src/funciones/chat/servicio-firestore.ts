import {
  collection,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { appFirebase } from '../../core/firebase'
import { conversacionDesdeMapa, mensajeDesdeMapa, ordenarConversaciones } from './modelos'
import type { ServicioChat } from './servicio'

let db: Firestore | null = null

function obtenerDb(): Firestore {
  if (!db) {
    let cache
    try {
      // Muestra lo último recibido sin conexión y envía al volver la red.
      cache = persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    } catch {
      cache = undefined // sin IndexedDB (modo privado): solo memoria
    }
    db = initializeFirestore(appFirebase(), cache ? { localCache: cache } : {})
  }
  return db
}

/** `Timestamp` → `Date` (los modelos son puros, sin Firebase). */
function convertirFechas(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v instanceof Timestamp ? v.toDate() : v]))
}

/** Estructura idéntica a lib/features/chat/chat_service.dart. */
export const chatFirestore: ServicioChat = {
  mensajes(chatId, alCambiar, alError) {
    return onSnapshot(
      collection(obtenerDb(), 'chats', chatId, 'mensajes'),
      { includeMetadataChanges: true },
      (snap) => {
        const lista = snap.docs.map((d) =>
          mensajeDesdeMapa(d.id, convertirFechas(d.data({ serverTimestamps: 'none' })), {
            pendienteDeEscritura: d.metadata.hasPendingWrites,
          }),
        )
        // En el cliente: incluye los que aún se envían (creadoEn en null).
        lista.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
        alCambiar(lista)
      },
      alError,
    )
  },

  conversaciones(miUid, alCambiar, alError) {
    // Orden en el cliente: así no hace falta un índice compuesto.
    return onSnapshot(
      query(collection(obtenerDb(), 'chats'), where('participantes', 'array-contains', miUid)),
      (snap) =>
        alCambiar(ordenarConversaciones(snap.docs.map((d) => conversacionDesdeMapa(d.id, convertirFechas(d.data()))))),
      alError,
    )
  },

  async enviar(d) {
    const limpio = d.texto.trim()
    if (limpio === '') return
    const chatRef = doc(obtenerDb(), 'chats', d.chatId)
    const mensajeRef = doc(collection(chatRef, 'mensajes'))
    const nombres: Record<string, string> = {}
    if (d.nombreEmisor) nombres[d.emisorUid] = d.nombreEmisor
    if (d.nombreReceptor) nombres[d.receptorUid] = d.nombreReceptor

    // Resumen + mensaje en una sola escritura atómica.
    const lote = writeBatch(obtenerDb())
    lote.set(
      chatRef,
      {
        participantes: [d.emisorUid, d.receptorUid].sort(),
        nombres,
        ...(d.encomiendaId ? { encomiendaId: d.encomiendaId } : {}),
        ...(d.ruta ? { ruta: d.ruta } : {}),
        ultimoMensaje: limpio,
        ultimoEmisorUid: d.emisorUid,
        actualizadoEn: serverTimestamp(),
      },
      { merge: true },
    )
    lote.set(mensajeRef, {
      texto: limpio,
      emisorUid: d.emisorUid,
      creadoEn: serverTimestamp(),
      creadoLocal: Date.now(),
    })
    await lote.commit()
  },
}
