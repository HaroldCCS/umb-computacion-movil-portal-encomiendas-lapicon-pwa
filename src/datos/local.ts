import { encomiendaAJson, encomiendaDesdeJson, type Encomienda } from './modelos/encomienda'
import { esMapa } from './modelos/json'
import { parseRol, type Rol } from './modelos/rol'
import { claveVuelo } from '../funciones/viajero/logica'

/**
 * Almacenamiento local con las MISMAS claves que la app Flutter (prefs.dart y
 * viajero_local_store.dart). localStorage puede fallar (modo privado, sitio
 * bloqueado): nunca rompe la app, solo deja de recordar.
 */

const TTL_CACHE = 7 * 24 * 60 * 60 * 1000

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}

function guardar(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor)
  } catch {
    // Sin almacenamiento: la app sigue, solo no recuerda.
  }
}

function borrar(clave: string): void {
  try {
    localStorage.removeItem(clave)
  } catch {
    // Igual que arriba.
  }
}

function leerJson(clave: string): unknown {
  const crudo = leer(clave)
  if (crudo === null) return null
  try {
    return JSON.parse(crudo) as unknown
  } catch {
    return null
  }
}

function listaDeTextos(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

// Avisa a los componentes que leen estas claves (p. ej. contadores).
type Oyente = () => void
const oyentes = new Set<Oyente>()
let version = 0
function cambio() {
  version++
  for (const o of oyentes) o()
}
export function alCambiarLocal(o: Oyente): () => void {
  oyentes.add(o)
  return () => oyentes.delete(o)
}
export const versionLocal = () => version

export const Local = {
  rol(uid: string): Rol | null {
    return parseRol(leer(`rol_${uid}`))
  },
  guardarRol(uid: string, rol: Rol): void {
    guardar(`rol_${uid}`, rol)
    cambio()
  },
  borrarRol(uid: string): void {
    borrar(`rol_${uid}`)
    cambio()
  },

  /** Encomiendas que este usuario ya calificó desde este dispositivo: el
   *  backend ignora `encomiendaId` al calificar (docs/03). */
  calificadas(uid: string): Set<string> {
    return new Set(listaDeTextos(leerJson(`calificadas_${uid}`)))
  },
  marcarCalificada(uid: string, encomiendaId: string): void {
    const s = Local.calificadas(uid)
    s.add(encomiendaId)
    guardar(`calificadas_${uid}`, JSON.stringify([...s]))
    cambio()
  },

  /** Lista cacheada (países, ciudades) con 7 días de vigencia. */
  listaCacheada(clave: string, ahora = Date.now()): string[] | null {
    const guardadaEn = Number(leer(`cache_${clave}_at`))
    const lista = leerJson(`cache_${clave}`)
    if (!Number.isFinite(guardadaEn) || guardadaEn <= 0 || !Array.isArray(lista)) return null
    if (ahora - guardadaEn > TTL_CACHE) return null
    return listaDeTextos(lista)
  },
  guardarLista(clave: string, valores: readonly string[], ahora = Date.now()): void {
    guardar(`cache_${clave}`, JSON.stringify(valores))
    guardar(`cache_${clave}_at`, String(ahora))
  },

  /** Encomiendas que tomé como viajero (no hay endpoint de "mis entregas"). */
  entregas(uid: string): Encomienda[] {
    const m = leerJson(`viajero_entregas_${uid}`)
    if (!esMapa(m)) return []
    return Object.values(m).filter(esMapa).map(encomiendaDesdeJson)
  },
  idsEntregas(uid: string): Set<string> {
    return new Set(Local.entregas(uid).map((e) => e.id))
  },
  guardarEntrega(uid: string, e: Encomienda): void {
    const actuales = new Map(Local.entregas(uid).map((x) => [x.id, x]))
    actuales.set(e.id, e)
    const json = Object.fromEntries([...actuales.values()].map((x) => [x.id, encomiendaAJson(x)]))
    guardar(`viajero_entregas_${uid}`, JSON.stringify(json))
    cambio()
  },

  vueloVerificado(uid: string, numero: string, fecha: Date | null): boolean {
    return listaDeTextos(leerJson(`viajero_vuelos_verificados_${uid}`)).includes(claveVuelo(numero, fecha))
  },
  marcarVueloVerificado(uid: string, numero: string, fecha: Date): void {
    const s = new Set(listaDeTextos(leerJson(`viajero_vuelos_verificados_${uid}`)))
    s.add(claveVuelo(numero, fecha))
    guardar(`viajero_vuelos_verificados_${uid}`, JSON.stringify([...s]))
    cambio()
  },

  /** Preferencias propias de la PWA (no existen en Flutter). */
  leer,
  guardar,
}
