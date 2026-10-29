import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useLocal, useRepos, useUid } from '../app/contexto'
import { AppError } from '../core/red/errores'
import { conNombresDeViajeros } from '../funciones/remitente/logica'
import { combinarEntregas, paraTomar } from '../funciones/viajero/logica'
import { Local } from './local'
import type { Encomienda } from './modelos/encomienda'
import type { BusquedaEncomiendas } from './repositorios'

/**
 * Datos del servidor con TanStack Query (equivale a los FutureProvider de
 * Riverpod). Las claves llevan el uid para no mezclar usuarios.
 */
export const Claves = {
  misEncomiendas: (uid: string | null) => ['encomiendas', uid] as const,
  miViaje: (uid: string | null) => ['viaje-activo', uid] as const,
  historial: (uid: string | null) => ['viajes', uid] as const,
  entregas: (uid: string | null) => ['entregas', uid] as const,
  disponibles: (uid: string | null) => ['disponibles', uid] as const,
  viajeros: (origen: string, destino: string) => ['viajeros', origen, destino] as const,
  calificaciones: (uid: string) => ['calificaciones', uid] as const,
  paises: ['paises'] as const,
  ciudades: ['ciudades'] as const,
}

/** Mis encomiendas como remitente, con el nombre del viajero cuando se conoce: `GET /api/encomiendas`
 *  no lo trae, pero `GET /api/viajes/disponibles` sí, mientras su viaje siga disponible (docs/11 §2C). */
export function useMisEncomiendas() {
  const repos = useRepos()
  const uid = useUid()
  return useQuery({
    queryKey: Claves.misEncomiendas(uid),
    enabled: uid !== null,
    queryFn: async () => conNombresDeViajeros(await repos.encomiendas.mias(), repos.viajes.disponiblesEnRuta),
  })
}

export function useMiViaje() {
  const repos = useRepos()
  const uid = useUid()
  return useQuery({ queryKey: Claves.miViaje(uid), queryFn: repos.viajes.disponible, enabled: uid !== null })
}

/** Historial, más recientes primero. */
export function useHistorialViajes() {
  const repos = useRepos()
  const uid = useUid()
  return useQuery({
    queryKey: Claves.historial(uid),
    queryFn: async () =>
      (await repos.viajes.mios()).sort(
        (a, b) => (b.fechaViaje?.getTime() ?? 946684800000) - (a.fechaViaje?.getTime() ?? 946684800000),
      ),
    enabled: uid !== null,
  })
}

/** `GET /api/encomiendas/buscar` en la ruta de mi viaje activo. Explorar y "Mis entregas" comparten
 *  la misma consulta (misma clave), así que se pide una sola vez. */
function useBusquedaEnMiRuta() {
  const repos = useRepos()
  const uid = useUid()
  const viaje = useMiViaje()
  const v = viaje.data
  const clave = [...Claves.disponibles(uid), v?.ciudadOrigen, v?.ciudadDestino] as const
  const buscar = (): Promise<BusquedaEncomiendas> =>
    v ? repos.encomiendas.buscar(v.ciudadOrigen, v.ciudadDestino) : Promise.resolve({ disponibles: [], tomadas: [] })
  return { viaje, clave, buscar }
}

/** Encomiendas que tomé: las `tomadas` del servidor en mi ruta más las guardadas en el dispositivo,
 *  que siguen haciendo falta porque `buscar` deja de traerlas al entregarlas (ver `combinarEntregas`). */
export function useMisEntregas() {
  const qc = useQueryClient()
  const uid = useUid()
  const version = useLocal()
  const { viaje, clave, buscar } = useBusquedaEnMiRuta()
  return useQuery({
    queryKey: [...Claves.entregas(uid), version, ...clave.slice(2)],
    // Sin viaje (o si falla) quedan al menos las del dispositivo.
    enabled: uid !== null && !viaje.isPending,
    placeholderData: (previo) => previo,
    queryFn: async (): Promise<Encomienda[]> => {
      if (!uid) return []
      const locales = Local.entregas(uid)
      let servidor: Encomienda[] = []
      if (viaje.data) {
        try {
          servidor = (await qc.fetchQuery({ queryKey: clave, queryFn: buscar, staleTime: 5_000 })).tomadas
        } catch (e) {
          // Sin servidor se muestran al menos las registradas en el dispositivo.
          if (!(e instanceof AppError) || locales.length === 0) throw e
        }
      }
      return combinarEntregas({ servidor, locales, uid })
    },
  })
}

/** Disponibles en la ruta de mi viaje activo (sin las que publiqué yo: `buscar` sí las incluye). */
export function useDisponiblesEnMiRuta() {
  const uid = useUid()
  const { viaje, clave, buscar } = useBusquedaEnMiRuta()
  return useQuery({
    queryKey: clave,
    queryFn: buscar,
    enabled: uid !== null && viaje.isSuccess,
    staleTime: 5_000,
    select: (r: BusquedaEncomiendas) => paraTomar(r.disponibles, uid),
  })
}

/** Viajeros con viaje disponible en la ruta, con nombre (pública). */
export function useViajerosEnRuta(origen: string | null, destino: string | null) {
  const repos = useRepos()
  return useQuery({
    queryKey: Claves.viajeros(origen ?? '', destino ?? ''),
    queryFn: () => repos.viajes.disponiblesEnRuta(origen!, destino!),
    enabled: !!origen && !!destino,
  })
}

export function useResumenCalificaciones(uid: string | null) {
  const repos = useRepos()
  return useQuery({
    queryKey: Claves.calificaciones(uid ?? ''),
    queryFn: () => repos.calificaciones.resumen(uid!),
    enabled: uid !== null && uid !== '',
  })
}

export function usePaises() {
  const repos = useRepos()
  return useQuery({ queryKey: Claves.paises, queryFn: repos.catalogo.paises, staleTime: Infinity })
}

export function useCiudades() {
  const repos = useRepos()
  return useQuery({ queryKey: Claves.ciudades, queryFn: repos.catalogo.ciudades, staleTime: Infinity })
}

/** Refresca todo lo del viajero después de una acción (refrescarViajero). */
export function refrescarViajero(qc: QueryClient, uid: string | null) {
  for (const k of [Claves.miViaje(uid), Claves.historial(uid), Claves.entregas(uid), Claves.disponibles(uid)]) {
    void qc.invalidateQueries({ queryKey: k })
  }
}

export function useRefrescarViajero() {
  const qc = useQueryClient()
  const uid = useUid()
  return () => refrescarViajero(qc, uid)
}
