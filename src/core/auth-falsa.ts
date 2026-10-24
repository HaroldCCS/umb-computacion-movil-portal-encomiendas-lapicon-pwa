import { AuthError, mensajeAuth, type ServicioAuth, type UsuarioAuth } from './auth'

/**
 * Identidad falsa SOLO para las pruebas E2E (`vite --mode e2e`): acepta
 * cualquier correo con contraseña de 6+ caracteres y deriva el uid del correo.
 * Guarda la sesión en sessionStorage para sobrevivir a una recarga (deep links).
 * Nunca se incluye en el build de producción.
 */
const CLAVE = 'lapticon_e2e_sesion'

function leer(): UsuarioAuth | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE)
    return crudo ? (JSON.parse(crudo) as UsuarioAuth) : null
  } catch {
    return null
  }
}

function uidDe(email: string) {
  return `uid-${email.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}`
}

export function crearAuthFalsa(): ServicioAuth {
  let actual = leer()
  const oyentes = new Set<(u: UsuarioAuth | null) => void>()
  const fijar = (u: UsuarioAuth | null) => {
    actual = u
    try {
      if (u) sessionStorage.setItem(CLAVE, JSON.stringify(u))
      else sessionStorage.removeItem(CLAVE)
    } catch {
      // Igual funciona en memoria.
    }
    for (const o of oyentes) o(u)
  }
  const entrar = async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 50))
    if (password.length < 6 || password === 'incorrecta') {
      throw new AuthError(mensajeAuth('auth/invalid-credential'), 'invalid-credential')
    }
    fijar({ uid: uidDe(email), email: email.trim() })
  }
  return {
    alCambiar(oyente) {
      oyentes.add(oyente)
      queueMicrotask(() => oyente(actual))
      return () => oyentes.delete(oyente)
    },
    token: async () => (actual ? `token-falso-${actual.uid}` : null),
    iniciarSesion: entrar,
    crearCuenta: entrar,
    recuperarPassword: async () => {},
    cerrarSesion: async () => fijar(null),
  }
}
