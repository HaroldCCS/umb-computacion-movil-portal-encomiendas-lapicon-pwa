import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'
import type { ServicioAuth } from '../core/auth'
import { alCambiarLocal, Local, versionLocal } from '../datos/local'
import type { Repositorios } from '../datos/repositorios'
import type { ServicioChat } from '../funciones/chat/servicio'
import type { InstantaneaSesion, Sesion } from '../funciones/sesion/sesion'

/** Dependencias de la app (equivale a providers.dart). Las pantallas las leen
 *  con hooks; en las pruebas se inyectan versiones falsas. */
export interface Dependencias {
  sesion: Sesion
  auth: ServicioAuth
  repos: Repositorios
  cargarChat: () => Promise<ServicioChat>
}

const Contexto = createContext<Dependencias | null>(null)

export function ProveedorDependencias({ valor, children }: { valor: Dependencias; children: ReactNode }) {
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useDependencias(): Dependencias {
  const d = useContext(Contexto)
  if (!d) throw new Error('Falta ProveedorDependencias')
  return d
}

export const useRepos = () => useDependencias().repos

/** Sesión reactiva (se vuelve a pintar en cada cambio). */
export function useSesion(): InstantaneaSesion & { control: Sesion } {
  const { sesion } = useDependencias()
  const s = useSyncExternalStore(sesion.suscribir, sesion.obtener)
  return { ...s, control: sesion }
}

/** uid con sesión (o null). */
export const useUid = () => useSesion().usuario?.uid ?? null

/** Se vuelve a pintar cuando cambia algo guardado en el dispositivo. */
export function useLocal(): number {
  return useSyncExternalStore(alCambiarLocal, versionLocal)
}

/** Ids de las encomiendas que ya califiqué (en este dispositivo). */
export function useCalificadas(): Set<string> {
  const uid = useUid()
  useLocal()
  return uid ? Local.calificadas(uid) : new Set()
}
