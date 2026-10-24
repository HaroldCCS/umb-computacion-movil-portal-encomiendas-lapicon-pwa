import { AppError } from './red/errores'

/** Lo que la app necesita del usuario de Firebase. */
export interface UsuarioAuth {
  uid: string
  email: string | null
}

/**
 * Identidad (port de auth_service.dart). Firebase es el único proveedor: el
 * backend solo verifica el idToken. Es una interfaz para poder usar una
 * versión falsa en las pruebas E2E (sin cuentas reales).
 */
export interface ServicioAuth {
  /** Llama con el usuario actual apenas se suscribe y en cada cambio. */
  alCambiar(oyente: (u: UsuarioAuth | null) => void): () => void
  token(forzar: boolean): Promise<string | null>
  iniciarSesion(email: string, password: string): Promise<void>
  crearCuenta(email: string, password: string): Promise<void>
  recuperarPassword(email: string): Promise<void>
  cerrarSesion(): Promise<void>
}

export class AuthError extends AppError {
  readonly codigo: string
  constructor(mensaje: string, codigo: string) {
    super(mensaje)
    this.name = 'AuthError'
    this.codigo = codigo
  }
}

/** Traduce los códigos de Firebase Auth (web: `auth/xxx`) a mensajes claros. */
export function mensajeAuth(codigoCrudo: string): string {
  const codigo = codigoCrudo.replace(/^auth\//, '')
  switch (codigo) {
    case 'invalid-email':
      return 'El correo no es válido.'
    case 'user-disabled':
      return 'Esta cuenta está deshabilitada.'
    case 'user-not-found':
    case 'wrong-password':
    case 'invalid-credential':
    case 'invalid-login-credentials':
    case 'INVALID_LOGIN_CREDENTIALS':
      return 'Correo o contraseña incorrectos.'
    case 'email-already-in-use':
      return 'Ya existe una cuenta con este correo. Inicia sesión.'
    case 'weak-password':
      return 'La contraseña es muy débil. Usa al menos 6 caracteres.'
    case 'too-many-requests':
      return 'Demasiados intentos. Espera un momento e intenta de nuevo.'
    case 'network-request-failed':
      return 'No hay conexión. Revisa tu internet.'
    case 'operation-not-allowed':
      return 'Este método de inicio de sesión no está habilitado.'
    case 'invalid-api-key':
    case 'api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'Falta configurar Firebase en esta versión de la app.'
    default:
      return `No pudimos completar la operación (${codigo}).`
  }
}

/** Convierte cualquier error de Firebase en `AuthError`. */
export function errorAuth(e: unknown): AuthError {
  const codigo =
    typeof e === 'object' && e !== null && 'code' in e && typeof e.code === 'string' ? e.code : 'desconocido'
  return new AuthError(mensajeAuth(codigo), codigo.replace(/^auth\//, ''))
}
