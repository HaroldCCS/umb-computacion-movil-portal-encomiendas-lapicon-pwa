import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClienteApi } from './cliente'
import { ApiError, RedError, SinSesionError, extraerMensaje } from './errores'

/** Respuesta JSON falsa. */
const json = (status: number, cuerpo: unknown) =>
  new Response(cuerpo === undefined ? '' : JSON.stringify(cuerpo), { status })

function cliente(fetchFalso: typeof fetch, extra: Partial<ConstructorParameters<typeof ClienteApi>[0]> = {}) {
  return new ClienteApi({ base: 'https://api.test/', fetch: fetchFalso, ...extra })
}

afterEach(() => vi.useRealTimers())

describe('ClienteApi', () => {
  it('arma la URL con y sin base (modo proxy = mismo origen)', () => {
    const f = vi.fn() as unknown as typeof fetch
    expect(cliente(f).url('/api/encomiendas/disponibles', { origen: 'Bogota', destino: 'Miami' })).toBe(
      'https://api.test/api/encomiendas/disponibles?origen=Bogota&destino=Miami',
    )
    expect(new ClienteApi({ base: '', fetch: f }).url('/api/viajes')).toBe('/api/viajes')
  })

  it('envía el Bearer en rutas protegidas y no en las públicas', async () => {
    const f = vi.fn(async () => json(200, []))
    const c = cliente(f as unknown as typeof fetch, { obtenerToken: async () => 'tok-1' })
    await c.get('/api/encomiendas')
    await c.get('/api/ciudades/paises', { auth: false })
    const cabeceras = f.mock.calls.map((llamada) => (llamada as unknown as [string, RequestInit])[1].headers as Record<string, string>)
    expect(cabeceras[0]?.Authorization).toBe('Bearer tok-1')
    expect(cabeceras[1]?.Authorization).toBeUndefined()
  })

  it('ante un 401 renueva el token y reintenta una sola vez', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json(401, { error: 'Token inválido' }))
      .mockResolvedValueOnce(json(200, { user: { uid: 'u1' } }))
    const obtenerToken = vi.fn(async ({ forzar }: { forzar: boolean }) => (forzar ? 'nuevo' : 'viejo'))
    const c = cliente(f as unknown as typeof fetch, { obtenerToken })
    await expect(c.get('/api/users/u1')).resolves.toEqual({ user: { uid: 'u1' } })
    expect(obtenerToken).toHaveBeenNthCalledWith(1, { forzar: false })
    expect(obtenerToken).toHaveBeenNthCalledWith(2, { forzar: true })
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('sin sesión no llama al servidor', async () => {
    const f = vi.fn()
    await expect(cliente(f as unknown as typeof fetch).get('/api/viajes')).rejects.toBeInstanceOf(SinSesionError)
    expect(f).not.toHaveBeenCalled()
  })

  it('convierte { error } del backend en ApiError con su mensaje', async () => {
    const f = vi.fn(async () =>
      json(400, { error: 'Ya tienes un viaje disponible. Debes cerrarlo antes de registrar uno nuevo.' }),
    )
    const error = await cliente(f as unknown as typeof fetch, { obtenerToken: async () => 't' })
      .post('/api/viajes', { cuerpo: {} })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).reglaDeNegocio).toBe(true)
    expect((error as ApiError).message).toMatch(/Ya tienes un viaje/)
  })

  it('sin mensaje del backend usa el de su código', async () => {
    const f = vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502 }))
    const error = (await cliente(f as unknown as typeof fetch)
      .get('/api/ciudades/paises', { auth: false })
      .catch((e: unknown) => e)) as ApiError
    expect(error.message).toBe('Algo falló en el servidor. Intenta de nuevo en un momento.')
  })

  it('si fetch falla culpa a la conexión solo cuando de verdad no hay red', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    // En línea: puede ser CORS, DNS o el servidor; no se culpa al internet.
    const enLinea = (await cliente(f).get('/x', { auth: false }).catch((e: unknown) => e)) as RedError
    expect(enLinea).toBeInstanceOf(RedError)
    expect(enLinea.message).toMatch(/No pudimos comunicarnos con el servidor/)

    const espia = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const sinRed = (await cliente(f).get('/x', { auth: false }).catch((e: unknown) => e)) as RedError
    expect(sinRed.message).toMatch(/Estás sin conexión/)
    espia.mockRestore()
  })

  it('avisa "despertando" si tarda y corta al llegar al límite', async () => {
    vi.useFakeTimers()
    const f = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError')))
        }),
    )
    const c = cliente(f as unknown as typeof fetch, { umbralLentoMs: 5_000, tiempoMaximoMs: 75_000 })
    const avisos: boolean[] = []
    c.alCambiarDespertando((v) => avisos.push(v))

    const promesa = c.get('/api/ciudades/paises', { auth: false }).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(5_000)
    expect(c.despertando).toBe(true)
    await vi.advanceTimersByTimeAsync(70_000)
    const error = await promesa
    expect(error).toBeInstanceOf(RedError)
    expect((error as RedError).message).toMatch(/tardó demasiado/)
    expect(c.despertando).toBe(false)
    expect(avisos).toEqual([true, false])
  })
})

describe('extraerMensaje', () => {
  it('lee message, mensaje, error y estructuras anidadas', () => {
    expect(extraerMensaje({ message: 'Usuario guardado correctamente' })).toBe('Usuario guardado correctamente')
    expect(extraerMensaje({ mensaje: 'No hay viajes disponibles' })).toBe('No hay viajes disponibles')
    expect(extraerMensaje({ error: { message: 'User not found.' } })).toBe('User not found.')
    expect(extraerMensaje({ errors: ['Campo requerido'] })).toBe('Campo requerido')
    expect(extraerMensaje('<!doctype html>')).toBeNull()
    expect(extraerMensaje(null)).toBeNull()
  })
})
