/** Rol con el que el usuario usa la app (port de rol.dart). */
export type Rol = 'remitente' | 'viajero'

export const ROLES: readonly Rol[] = ['remitente', 'viajero']

export const InfoRol: Record<Rol, { titulo: string; nombre: string; descripcion: string }> = {
  remitente: {
    titulo: 'Quiero enviar',
    nombre: 'Remitente',
    descripcion: 'Publica tu encomienda y encuentra quién la lleve.',
  },
  viajero: {
    titulo: 'Voy a viajar',
    nombre: 'Viajero',
    descripcion: 'Registra tu vuelo y gana llevando encomiendas de tu ruta.',
  },
}

export function opuesto(rol: Rol): Rol {
  return rol === 'remitente' ? 'viajero' : 'remitente'
}

/** Acepta "remitente", "Viajero", etc. `null` si no reconoce el valor. */
export function parseRol(v: unknown): Rol | null {
  if (typeof v !== 'string') return null
  const n = v.trim().toLowerCase()
  return n === 'remitente' || n === 'viajero' ? n : null
}

/** Textos que cambian según el rol, en un solo lugar (vocabulario.dart). */
export const Vocabulario: Record<
  Rol,
  { inicio: string; crear: string; tituloHero: string; verbo: string; contraparte: string; laContraparte: string }
> = {
  remitente: {
    inicio: 'Inicio',
    crear: 'Nueva encomienda',
    tituloHero: 'Tus envíos activos',
    verbo: 'Envías',
    contraparte: 'viajero',
    laContraparte: 'el viajero',
  },
  viajero: {
    inicio: 'Mi viaje',
    crear: 'Registrar viaje',
    tituloHero: 'Tu viaje',
    verbo: 'Llevas',
    contraparte: 'remitente',
    laContraparte: 'el remitente',
  },
}
