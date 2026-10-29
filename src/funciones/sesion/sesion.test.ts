// Máquina de estados de la sesión (port de session_controller.dart).
import { AuthError, type ServicioAuth, type UsuarioAuth } from '../../core/auth'
import { ApiError, RedError } from '../../core/red/errores'
import type { Usuario } from '../../datos/modelos/usuario'
import type { Repositorios } from '../../datos/repositorios'
import { Sesion } from './sesion'

const perfil = (d: Partial<Usuario> = {}): Usuario => ({
  uid: 'u1',
  nombre: 'Ana',
  apellido: 'Gómez',
  telefono: '3001234567',
  nacionalidad: 'Colombia',
  email: null,
  fechaNacimiento: null,
  rol: null,
  creadoEn: null,
  ...d,
})

function montar(obtener: () => Promise<Usuario | null>) {
  let oyente: (u: UsuarioAuth | null) => void = () => {}
  const auth: ServicioAuth = {
    alCambiar: (o) => {
      oyente = o
      return () => {}
    },
    token: async () => 't',
    iniciarSesion: async () => {},
    crearCuenta: async () => {},
    recuperarPassword: async () => {},
    cerrarSesion: async () => oyente(null),
  }
  const usuarios = {
    obtener: vi.fn(obtener),
    registrar: vi.fn(async (d: Usuario) => d),
    actualizar: vi.fn(async (d: Usuario) => d),
    guardarRol: vi.fn(async () => false),
  } as unknown as Repositorios['usuarios']
  const sesion = new Sesion(auth, usuarios)
  const entrar = async () => {
    oyente({ uid: 'u1', email: 'ana@correo.co' })
    await vi.waitFor(() => expect(sesion.obtener().estado).not.toBe('cargando'))
  }
  return { sesion, entrar, usuarios, salir: () => oyente(null) }
}

describe('Sesion', () => {
  beforeEach(() => localStorage.clear())

  it('empieza cargando y sin usuario va a sinSesion', () => {
    const { sesion, salir } = montar(async () => null)
    expect(sesion.obtener().estado).toBe('cargando')
    salir()
    expect(sesion.obtener().estado).toBe('sinSesion')
  })

  it('sin perfil (404) → sinPerfil; registrar → sinRol; elegir rol → listo y se guarda en el dispositivo', async () => {
    const { sesion, entrar } = montar(async () => null)
    await entrar()
    expect(sesion.obtener().estado).toBe('sinPerfil')
    await sesion.registrarPerfil(perfil())
    expect(sesion.obtener().estado).toBe('sinRol')
    await sesion.elegirRol('viajero')
    expect(sesion.obtener()).toMatchObject({ estado: 'listo', rol: 'viajero', rolEnServidor: false })
    expect(localStorage.getItem('rol_u1')).toBe('viajero')
  })

  it('perfil incompleto también pide completar perfil', async () => {
    const { sesion, entrar } = montar(async () => perfil({ telefono: '' }))
    await entrar()
    expect(sesion.obtener().estado).toBe('sinPerfil')
  })

  it('con perfil y rol recordado → listo directo, con el correo de Firebase', async () => {
    localStorage.setItem('rol_u1', 'remitente')
    const { sesion, entrar } = montar(async () => perfil())
    await entrar()
    expect(sesion.obtener()).toMatchObject({ estado: 'listo', rol: 'remitente' })
    expect(sesion.obtener().perfil?.email).toBe('ana@correo.co')
  })

  it('si el servidor falla → error con mensaje; recargar en silencio lanza el error', async () => {
    let falla: Error = new RedError('Estás sin conexión.')
    const { sesion, entrar } = montar(async () => {
      throw falla
    })
    await entrar()
    expect(sesion.obtener()).toMatchObject({ estado: 'error', error: 'Estás sin conexión.' })
    falla = new ApiError(500, 'Algo falló')
    await expect(sesion.recargar({ silencioso: true })).rejects.toThrow('Algo falló')
    expect(sesion.obtener().estado).toBe('error')
  })

  it('cerrar sesión borra perfil y rol de la memoria', async () => {
    localStorage.setItem('rol_u1', 'remitente')
    const { sesion, entrar } = montar(async () => perfil())
    await entrar()
    await sesion.cerrarSesion()
    expect(sesion.obtener()).toMatchObject({ estado: 'sinSesion', perfil: null, rol: null, usuario: null })
  })

  it('si Firebase no puede iniciar (falta la clave) queda en error con mensaje, no en blanco', () => {
    const auth = {
      alCambiar: () => {
        throw new AuthError('Falta configurar Firebase en esta versión de la app.', 'invalid-api-key')
      },
    } as unknown as ServicioAuth
    const sesion = new Sesion(auth, {} as Repositorios['usuarios'])
    expect(sesion.obtener()).toMatchObject({ estado: 'error', error: 'Falta configurar Firebase en esta versión de la app.' })
  })
})
