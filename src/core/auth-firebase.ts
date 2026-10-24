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
import { errorAuth, type ServicioAuth, type UsuarioAuth } from './auth'
import { appFirebase } from './firebase'

let auth: Auth | null = null

function obtenerAuth(): Auth {
  if (!auth) {
    // Sin el resolvedor de ventanas emergentes: solo correo y contraseña, así
    // no se carga el iframe de Google ni hace falta abrir la CSP.
    auth = initializeAuth(appFirebase(), {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    })
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
