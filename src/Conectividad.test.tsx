import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import Conectividad from './Conectividad'
import { ClienteApi } from './core/red/cliente'

const conConsultas = (ui: ReactElement) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)

describe('Conectividad', () => {
  it('muestra cuántos países respondió la API y el modo proxy', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(['Colombia', 'Mexico', 'Peru', 'Spain'])))
    conConsultas(<Conectividad api={new ClienteApi({ base: '', fetch: f as unknown as typeof fetch })} base="" />)
    expect(await screen.findByTestId('resultado')).toHaveTextContent('4 países')
    expect(screen.getByTestId('modo')).toHaveTextContent('Proxy (mismo origen)')
    expect(f).toHaveBeenCalledWith('/api/ciudades/paises', expect.anything())
  })

  it('explica el error en lenguaje humano', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    conConsultas(
      <Conectividad
        api={new ClienteApi({ base: 'https://lapticon-backend.onrender.com', fetch: f as unknown as typeof fetch })}
        base="https://lapticon-backend.onrender.com"
      />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos comunicarnos con el servidor')
    expect(screen.getByTestId('modo')).toHaveTextContent('Directo al backend')
  })
})
