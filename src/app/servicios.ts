import { crearAuthFalsa } from '../core/auth-falsa'
import { authFirebase } from '../core/auth-firebase'
import { api, usarProveedorToken } from '../core/red/api'
import { crearRepositorios } from '../datos/repositorios'
import { cargarServicioChat } from '../funciones/chat/servicio'
import { Sesion } from '../funciones/sesion/sesion'
import type { Dependencias } from './contexto'

/** Arma las dependencias reales de la app (una vez, en main.tsx). Con
 *  `VITE_AUTH_FALSA=1` (solo `vite --mode e2e`) usa la identidad falsa. */
export function crearDependencias(): Dependencias {
  const auth = import.meta.env.VITE_AUTH_FALSA === '1' ? crearAuthFalsa() : authFirebase
  usarProveedorToken(({ forzar }) => auth.token(forzar))
  const repos = crearRepositorios(api)
  const sesion = new Sesion(auth, repos.usuarios)
  return { auth, repos, sesion, cargarChat: cargarServicioChat }
}
