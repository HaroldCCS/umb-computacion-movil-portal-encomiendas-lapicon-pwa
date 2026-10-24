import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useLocal, useRepos, useUid } from '../app/contexto'
import { AppError } from '../core/red/errores'
import { combinarEntregas, paraTomar } from '../funciones/viajero/logica'
import { Local } from './local'
import type { Encomienda } from './modelos/encomienda'

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
  viajeros: (ciudad: string) => ['viajeros', ciudad] as const,
  calificaciones: (uid: string) => ['calificaciones', uid] as const,
  paises: ['paises'] as const,
  ciudades: ['ciudades'] as const,
}

export function useMisEncomiendas() {
  const repos = useRepos()
  const uid = useUid()
  return useQuery({ queryKey: Claves.misEncomiendas(uid), queryFn: repos.encomiendas.mias, enabled: uid !== null })
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

/** Encomiendas que tomé (ver supuesto en `combinarEntregas`). */
export function useMisEntregas() {
  const repos = useRepos()
  const uid = useUid()
  const version = useLocal()
  return useQuery({
    queryKey: [...Claves.entregas(uid), version],
    enabled: uid !== null,
    placeholderData: (previo) => previo,
    queryFn: async (): Promise<Encomienda[]> => {
      if (!uid) return []
      const locales = Local.entregas(uid)
      let servidor: Encomienda[] = []
      try {
        servidor = await repos.encomiendas.mias()
      } catch (e) {
        // Sin servidor se muestran al menos las registradas en el dispositivo.
        if (!(e instanceof AppError) || locales.length === 0) throw e
      }
      return combinarEntregas({ servidor, locales, uid })
    },
  })
}

/** Disponibles en la ruta de mi viaje activo (sin las que publiqué yo). */
export function useDisponiblesEnMiRuta() {
  const repos = useRepos()
  const uid = useUid()
  const viaje = useMiViaje()
  const v = viaje.data
  return useQuery({
    queryKey: [...Claves.disponibles(uid), v?.ciudadOrigen, v?.ciudadDestino],
    enabled: uid !== null && viaje.isSuccess,
    queryFn: async () => {
      if (!v) return []
      const lista = await repos.encomiendas.disponibles(v.ciudadOrigen, v.ciudadDestino)
      let propias = new Set<string>()
      try {
        propias = new Set((await repos.encomiendas.mias()).map((e) => e.id))
      } catch {
        // Si falla, se muestran igual; el remitente no debería tomarlas.
      }
      return paraTomar(lista, uid, propias)
    },
  })
}

export function useViajerosPorOrigen(ciudad: string | null) {
  const repos = useRepos()
  return useQuery({
    queryKey: Claves.viajeros(ciudad ?? ''),
    queryFn: () => repos.viajes.buscarPorOrigen(ciudad!),
    enabled: ciudad !== null && ciudad !== '',
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
