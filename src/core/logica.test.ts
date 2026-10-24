// Port de validators_test.dart, router_redirect_test.dart y Fmt de contrato_test.dart.
import { Fmt, fechaIso, sumarMeses } from './formato'
import { accionDeRuta, conAccion, redirigirPara, Rutas } from './rutas'
import { Validadores } from './validadores'

describe('Validadores.email', () => {
  it('acepta correos válidos', () => {
    expect(Validadores.email('test30@gmail.com')).toBeNull()
    expect(Validadores.email('  laura.gomez+envios@umb.edu.co ')).toBeNull()
  })
  it('rechaza vacíos e incompletos', () => {
    for (const v of ['', 'laura@', 'laura@correo', 'sin-arroba.com']) expect(Validadores.email(v)).not.toBeNull()
  })
})

describe('Validadores.password', () => {
  it('mínimo 6 caracteres (regla de Firebase)', () => {
    expect(Validadores.password('12345')).not.toBeNull()
    expect(Validadores.password('123456')).toBeNull()
    expect(Validadores.password('')).not.toBeNull()
  })
  it('confirmación lee el valor actual del original', () => {
    let original = 'secreta1'
    const v = Validadores.confirmarPassword(() => original)
    expect(v('secreta1')).toBeNull()
    expect(v('otra')).not.toBeNull()
    original = 'otra'
    expect(v('otra')).toBeNull()
  })
  it('fortaleza', () => {
    expect(Validadores.fortalezaPassword('')).toBe(0)
    expect(Validadores.fortalezaPassword('abc')).toBe(1)
    expect(Validadores.fortalezaPassword('abcdef')).toBe(1)
    expect(Validadores.fortalezaPassword('abcdefg1')).toBe(2)
    expect(Validadores.fortalezaPassword('Abcdefg1!')).toBe(3)
  })
})

describe('Validadores.nombre y teléfono', () => {
  it('nombres con tildes, ñ y espacios', () => {
    expect(Validadores.nombre('María José')).toBeNull()
    expect(Validadores.nombre('Núñez')).toBeNull()
    expect(Validadores.nombre('A')).not.toBeNull()
    expect(Validadores.nombre('R2D2')).not.toBeNull()
  })
  it('teléfonos', () => {
    expect(Validadores.telefono('300 000 0000')).toBeNull()
    expect(Validadores.telefono('+57 (300) 000-0000')).toBeNull()
    expect(Validadores.telefono('123')).not.toBeNull()
    expect(Validadores.telefono('300abc0000')).not.toBeNull()
  })
})

describe('Fmt', () => {
  it('dinero', () => {
    expect(Fmt.dinero(10, 'usd')).toBe('USD 10')
    expect(Fmt.dinero(50000, 'COP')).toBe('COP 50.000')
    expect(Fmt.dinero(12.5, 'USD')).toBe('USD 12,50')
    expect(Fmt.dinero(1234567, 'COP')).toBe('COP 1.234.567')
  })
  it('fecha, relativo y hora', () => {
    expect(Fmt.fecha(new Date(2026, 11, 1))).toBe('1 dic 2026')
    expect(Fmt.fecha(new Date(2026, 11, 1), { corta: true, ahora: new Date(2026, 0, 1) })).toBe('1 dic')
    expect(Fmt.fecha(null)).toBe('—')
    const ahora = new Date(2026, 9, 22, 12)
    expect(Fmt.relativo(new Date(ahora.getTime() - 5 * 60_000), ahora)).toBe('hace 5 min')
    expect(Fmt.relativo(new Date(ahora.getTime() - 3 * 3_600_000), ahora)).toBe('hace 3 h')
    expect(Fmt.relativo(new Date(ahora.getTime() - 30 * 3_600_000), ahora)).toBe('ayer')
    expect(Fmt.relativo(new Date(ahora.getTime() - 10_000), ahora)).toBe('ahora')
    expect(Fmt.hora(new Date(2026, 0, 1, 9, 5))).toBe('09:05')
  })
  it('fecha larga y decimales', () => {
    expect(Fmt.fechaLarga(new Date(2026, 9, 22))).toBe('Jueves, 22 de octubre')
    expect(Fmt.decimal(4.25)).toBe('4,3')
  })
  it('fecha ISO local y un mes después (como DateTime de Dart)', () => {
    expect(fechaIso(new Date(2026, 11, 1))).toBe('2026-12-01')
    expect(fechaIso(sumarMeses(new Date(2026, 9, 24), 1))).toBe('2026-11-24')
  })
})

describe('redirigirPara (redirectFor de Flutter)', () => {
  it('sin sesión solo permite pantallas públicas', () => {
    expect(redirigirPara('sinSesion', Rutas.inicio)).toBe(Rutas.login)
    for (const r of [Rutas.login, Rutas.registro, Rutas.recuperar]) expect(redirigirPara('sinSesion', r)).toBeNull()
  })
  it('cargando y error muestran el splash', () => {
    expect(redirigirPara('cargando', Rutas.login)).toBe(Rutas.splash)
    expect(redirigirPara('error', Rutas.inicio)).toBe(Rutas.splash)
    expect(redirigirPara('cargando', Rutas.splash)).toBeNull()
  })
  it('onboarding obligatorio: perfil y luego rol', () => {
    expect(redirigirPara('sinPerfil', Rutas.inicio)).toBe(Rutas.completarPerfil)
    expect(redirigirPara('sinRol', Rutas.inicio)).toBe(Rutas.elegirRol)
    expect(redirigirPara('sinRol', Rutas.elegirRol)).toBeNull()
  })
  it('con todo listo no se vuelve al login ni al onboarding', () => {
    expect(redirigirPara('listo', Rutas.login)).toBe(Rutas.inicio)
    expect(redirigirPara('listo', Rutas.splash)).toBe(Rutas.inicio)
    expect(redirigirPara('listo', Rutas.completarPerfil)).toBe(Rutas.inicio)
    expect(redirigirPara('listo', Rutas.editarPerfil)).toBeNull()
    expect(redirigirPara('listo', Rutas.elegirRol)).toBeNull() // cambiar de rol desde el perfil
    expect(redirigirPara('listo', Rutas.detalleEnvio('x'))).toBeNull()
  })
})

describe('acción pendiente (?accion=)', () => {
  it('se lee y se escribe en la URL', () => {
    expect(accionDeRuta(new URLSearchParams('accion=calificar'))).toBe('calificar')
    expect(accionDeRuta(new URLSearchParams('accion=entregar'))).toBe('entregar')
    expect(accionDeRuta(new URLSearchParams('accion=otra'))).toBeNull()
    expect(conAccion('/viajero/encomienda/1', 'entregar')).toBe('/viajero/encomienda/1?accion=entregar')
    expect(conAccion('/x', null)).toBe('/x')
  })
})
