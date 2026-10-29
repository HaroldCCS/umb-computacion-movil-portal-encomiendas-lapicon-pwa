import { desenvolverObjeto, leerFecha, leerTexto } from './json'
import { parseRol, type Rol } from './rol'

/** Perfil del usuario en el backend (`/api/users`), port de usuario.dart. */
export interface Usuario {
  uid: string
  nombre: string
  apellido: string
  telefono: string
  nacionalidad: string
  email: string | null
  /** Opcional (Swagger oficial), `YYYY-MM-DD`: se guarda como texto para no correr el día por zona horaria. */
  fechaNacimiento: string | null
  rol: Rol | null
  creadoEn: Date | null
}

/** El backend puede responder el perfil directo o envuelto (`{ user }`). */
export function usuarioDesdeJson(json: unknown, uidRespaldo?: string): Usuario {
  const m = desenvolverObjeto(json, ['usuario', 'user', 'perfil', 'data']) ?? {}
  const uid = leerTexto(m, ['uid', 'firebaseUid', 'userId', '_id'])
  const email = leerTexto(m, ['email', 'correo'])
  return {
    uid: uid !== '' ? uid : (uidRespaldo ?? ''),
    nombre: leerTexto(m, ['nombre', 'name', 'firstName']),
    apellido: leerTexto(m, ['apellido', 'lastName']),
    telefono: leerTexto(m, ['telefono', 'phone']),
    nacionalidad: leerTexto(m, ['nacionalidad', 'pais']),
    email: email === '' ? null : email,
    fechaNacimiento: /^\d{4}-\d{2}-\d{2}/.test(leerTexto(m, ['fechaNacimiento']))
      ? leerTexto(m, ['fechaNacimiento']).slice(0, 10)
      : null,
    rol: parseRol(m['rol'] ?? m['role']),
    creadoEn: leerFecha(m, ['createdAt', 'fechaRegistro']),
  }
}

/** Cuerpo de `POST /api/users/register` y `PUT /api/users/:uid`. Nunca lleva `uid` ni `email`:
 *  el `PUT` responde 400 si se intentan cambiar (Swagger oficial). */
export function cuerpoRegistro(u: Usuario) {
  return {
    nombre: u.nombre,
    apellido: u.apellido,
    telefono: u.telefono,
    nacionalidad: u.nacionalidad,
    ...(u.fechaNacimiento ? { fechaNacimiento: u.fechaNacimiento } : {}),
  }
}

/** Completo cuando tiene los datos que pide el registro. */
export function perfilCompleto(u: Usuario): boolean {
  return u.nombre !== '' && u.apellido !== '' && u.telefono !== ''
}

export function nombreCompleto(u: Pick<Usuario, 'nombre' | 'apellido'>): string {
  return `${u.nombre} ${u.apellido}`.trim()
}
