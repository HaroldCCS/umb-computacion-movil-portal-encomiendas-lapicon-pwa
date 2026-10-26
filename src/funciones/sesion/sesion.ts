import type { ServicioAuth, UsuarioAuth } from '../../core/auth'
import { AppError, SinSesionError } from '../../core/red/errores'
import { mensajeDe } from '../../core/useAccion'
import { Local } from '../../datos/local'
import type { Rol } from '../../datos/modelos/rol'
import { perfilCompleto, type Usuario } from '../../datos/modelos/usuario'
import type { Repositorios } from '../../datos/repositorios'

/** En qué punto del recorrido está el usuario (el router redirige según esto). */
export type EstadoSesion = 'cargando' | 'sinSesion' | 'sinPerfil' | 'sinRol' | 'listo' | 'error'

export interface InstantaneaSesion {
  estado: EstadoSesion
  usuario: UsuarioAuth | null
  perfil: Usuario | null
  rol: Rol | null
  error: string | null
  /** `true` si el backend confirmó que guardó el rol (reto 1). */
  rolEnServidor: boolean
}

/**
 * Estado global de la sesión: usuario de Firebase + perfil + rol. Port de
 * session_controller.dart, con la misma máquina de estados.
 */
export class Sesion {
  private s: InstantaneaSesion = {
    estado: 'cargando',
    usuario: null,
    perfil: null,
    rol: null,
    error: null,
    rolEnServidor: false,
  }
  private generacion = 0
  private readonly oyentes = new Set<() => void>()
  private readonly baja: () => void

  constructor(
    private readonly auth: ServicioAuth,
    private readonly usuarios: Repositorios['usuarios'],
  ) {
    try {
      this.baja = auth.alCambiar((u) => void this.alCambiarUsuario(u))
    } catch (e) {
      // Firebase no pudo iniciar (p. ej. falta la clave en el build): se muestra
      // el error en el splash en vez de dejar la pantalla en blanco.
      this.baja = () => {}
      this.s = { ...this.s, estado: 'error', error: mensajeDe(e, 'No pudimos iniciar la app. Intenta de nuevo.') }
    }
  }

  get instantanea(): InstantaneaSesion {
    return this.s
  }

  suscribir = (oyente: () => void): (() => void) => {
    this.oyentes.add(oyente)
    return () => this.oyentes.delete(oyente)
  }

  obtener = (): InstantaneaSesion => this.s

  private fijar(cambios: Partial<InstantaneaSesion>) {
    this.s = { ...this.s, ...cambios }
    for (const o of this.oyentes) o()
  }

  private async alCambiarUsuario(u: UsuarioAuth | null) {
    if (!u) {
      this.generacion++
      this.fijar({ usuario: null, perfil: null, rol: null, error: null, estado: 'sinSesion' })
      return
    }
    this.fijar({ usuario: u })
    await this.recargar()
  }

  /**
   * Carga el perfil y decide el siguiente paso. Con `silencioso` (jalar para
   * actualizar) no pasa por la carga y, si falla, lanza el error.
   */
  async recargar({ silencioso = false } = {}): Promise<void> {
    const u = this.s.usuario
    if (!u) return
    const generacion = ++this.generacion
    if (!silencioso) this.fijar({ error: null, estado: 'cargando' })

    try {
      const perfil = await this.usuarios.obtener(u.uid)
      if (generacion !== this.generacion) return // llegó otra sesión mientras tanto

      if (!perfil || !perfilCompleto(perfil)) {
        this.fijar({ perfil, estado: 'sinPerfil' })
        return
      }
      const rol = perfil.rol ?? Local.rol(u.uid)
      if (rol) Local.guardarRol(u.uid, rol)
      this.fijar({
        perfil: { ...perfil, email: u.email },
        rolEnServidor: perfil.rol !== null,
        rol,
        estado: rol ? 'listo' : 'sinRol',
      })
    } catch (e) {
      if (generacion !== this.generacion) return
      if (silencioso) throw e
      this.fijar({ error: mensajeDe(e), estado: 'error' })
    }
  }

  /** Primer registro del perfil (Completar perfil). */
  async registrarPerfil(datos: Usuario): Promise<void> {
    const u = this.s.usuario
    if (!u) throw new SinSesionError()
    const guardado = await this.usuarios.registrar(datos)
    const rol = guardado.rol ?? Local.rol(u.uid)
    this.fijar({ perfil: { ...guardado, email: u.email }, rol, estado: rol ? 'listo' : 'sinRol' })
  }

  /** Edición desde Perfil. */
  async actualizarPerfil(datos: Usuario): Promise<void> {
    const u = this.s.usuario
    if (!u) throw new SinSesionError()
    const guardado = await this.usuarios.actualizar(datos)
    this.fijar({ perfil: { ...guardado, email: u.email, rol: this.s.rol } })
  }

  /** Guarda el rol en el backend (si lo acepta) y siempre en el dispositivo. */
  async elegirRol(rol: Rol): Promise<void> {
    const u = this.s.usuario
    if (!u) throw new SinSesionError()
    Local.guardarRol(u.uid, rol)
    let rolEnServidor = false
    try {
      rolEnServidor = await this.usuarios.guardarRol(u.uid, rol)
    } catch (e) {
      // Si el backend no lo soporta o falla, el rol queda en el dispositivo.
      if (!(e instanceof AppError)) throw e
    }
    this.fijar({
      rol,
      rolEnServidor,
      perfil: this.s.perfil ? { ...this.s.perfil, rol } : null,
      estado: 'listo',
    })
  }

  cerrarSesion = (): Promise<void> => this.auth.cerrarSesion()

  destruir(): void {
    this.baja()
    this.oyentes.clear()
  }
}
