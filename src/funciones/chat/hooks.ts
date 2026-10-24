import { useEffect, useState } from 'react'
import { useDependencias } from '../../app/contexto'
import type { Conversacion, MensajeChat } from './modelos'
import type { ServicioChat } from './servicio'

type Estado<T> = { datos: T | null; error: unknown; cargando: boolean }

/** El servicio de chat (Firestore se descarga al primer uso). */
export function useServicioChat(): ServicioChat | null {
  const { cargarChat } = useDependencias()
  const [servicio, setServicio] = useState<ServicioChat | null>(null)
  useEffect(() => {
    let vivo = true
    void cargarChat().then((s) => vivo && setServicio(s))
    return () => {
      vivo = false
    }
  }, [cargarChat])
  return servicio
}

function useSuscripcion<T>(
  servicio: ServicioChat | null,
  clave: string | null,
  suscribir: (s: ServicioChat, k: string, ok: (d: T) => void, mal: (e: unknown) => void) => () => void,
): Estado<T> & { reintentar: () => void } {
  const [intento, setIntento] = useState(0)
  const [estado, setEstado] = useState<Estado<T> & { de: string | null }>({ datos: null, error: null, cargando: true, de: null })
  useEffect(() => {
    if (!servicio || !clave) return
    return suscribir(
      servicio,
      clave,
      (datos) => setEstado({ datos, error: null, cargando: false, de: clave }),
      (error) => setEstado({ datos: null, error, cargando: false, de: clave }),
    )
    // `suscribir` es estable por diseño (se define fuera del componente).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicio, clave, intento])
  // Mientras llega lo de otra clave, se muestra cargando.
  const actual = estado.de === clave ? estado : { datos: null, error: null, cargando: true }
  return { datos: actual.datos, error: actual.error, cargando: actual.cargando, reintentar: () => setIntento((i) => i + 1) }
}

const subMensajes = (s: ServicioChat, k: string, ok: (d: MensajeChat[]) => void, mal: (e: unknown) => void) =>
  s.mensajes(k, ok, mal)
const subConversaciones = (s: ServicioChat, k: string, ok: (d: Conversacion[]) => void, mal: (e: unknown) => void) =>
  s.conversaciones(k, ok, mal)

/** Mensajes de un chat en tiempo real. */
export function useMensajes(servicio: ServicioChat | null, chatId: string | null) {
  return useSuscripcion(servicio, chatId, subMensajes)
}

/** Mis conversaciones en tiempo real. */
export function useConversaciones(servicio: ServicioChat | null, uid: string | null) {
  return useSuscripcion(servicio, uid, subConversaciones)
}
