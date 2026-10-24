import { describe, expect, it, vi } from 'vitest'
import { onRequest } from './[[ruta]].js'

describe('proxy de /api (plan B del CORS)', () => {
  it('reenvía método, ruta, query y Authorization al backend, sin caché', async () => {
    const fetchImpl = vi.fn(async () => new Response('[]', { status: 200, headers: { 'Cache-Control': 'max-age=60' } }))
    const request = new Request('https://lapticon-pwa.pages.dev/api/encomiendas/disponibles?origen=Bogota&destino=Miami', {
      headers: { Authorization: 'Bearer abc', Origin: 'https://lapticon-pwa.pages.dev', Cookie: 'x=1' },
    })
    const respuesta = await onRequest({ request, env: {}, fetchImpl })

    const [destino, init] = fetchImpl.mock.calls[0]
    expect(destino).toBe('https://lapticon-backend.onrender.com/api/encomiendas/disponibles?origen=Bogota&destino=Miami')
    expect(init.method).toBe('GET')
    expect(init.headers.get('authorization')).toBe('Bearer abc')
    expect(init.headers.get('origin')).toBeNull()
    expect(init.headers.get('cookie')).toBeNull()
    expect(respuesta.headers.get('Cache-Control')).toBe('no-store')
  })

  it('usa BACKEND_URL y reenvía el cuerpo de un POST', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 201 }))
    const request = new Request('https://x.pages.dev/api/encomiendas', {
      method: 'POST',
      body: JSON.stringify({ valor: 10 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const respuesta = await onRequest({ request, env: { BACKEND_URL: 'https://otro.test/' }, fetchImpl })
    const [destino, init] = fetchImpl.mock.calls[0]
    expect(destino).toBe('https://otro.test/api/encomiendas')
    expect(init.method).toBe('POST')
    expect(await new Response(init.body).text()).toBe('{"valor":10}')
    expect(respuesta.status).toBe(201)
  })
})
