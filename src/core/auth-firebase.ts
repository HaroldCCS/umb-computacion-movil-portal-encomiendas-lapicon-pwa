import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth'
import { AuthError, errorAuth, mensajeAuth, type ServicioAuth, type UsuarioAuth } from './auth'
import { appFirebase, hayConfigFirebase } from './firebase'

let auth: Auth | null = null

/** Sin clave (o con una inválida) Firebase lanza al iniciar: se convierte en un
 *  AuthError con mensaje humano para que la app lo muestre en vez de quedar en blanco. */
function obtenerAuth(): Auth {
  if (!hayConfigFirebase) {
    throw new AuthError(mensajeAuth('auth/invalid-api-key'), 'invalid-api-key')
  }
  if (!auth) {
    // Sin el resolvedor de ventanas emergentes: solo correo y contraseña, así
    // no se carga el iframe de Google ni hace falta abrir la CSP.
    try {
      auth = initializeAuth(appFirebase(), {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      })
    } catch (e) {
      throw errorAuth(e)
    }
    auth.languageCode = 'es'
  }
  return auth
}

async function proteger(accion: () => Promise<unknown>): Promise<void> {
  try {
    await accion()
  } catch (e) {
    throw errorAuth(e)
  }
}

const aUsuario = (u: { uid: string; email: string | null } | null): UsuarioAuth | null =>
  u ? { uid: u.uid, email: u.email } : null

/** Firebase Auth real (mismo proyecto que la app Flutter). */
export const authFirebase: ServicioAuth = {
  alCambiar: (oyente) => onAuthStateChanged(obtenerAuth(), (u) => oyente(aUsuario(u))),
  async token(forzar) {
    const u = obtenerAuth().currentUser
    return u ? u.getIdToken(forzar) : null
  },
  iniciarSesion: (email, password) =>
    proteger(() => signInWithEmailAndPassword(obtenerAuth(), email.trim(), password)),
  crearCuenta: (email, password) =>
    proteger(() => createUserWithEmailAndPassword(obtenerAuth(), email.trim(), password)),
  recuperarPassword: (email) => proteger(() => sendPasswordResetEmail(obtenerAuth(), email.trim())),
  cerrarSesion: () => signOut(obtenerAuth()),
}
