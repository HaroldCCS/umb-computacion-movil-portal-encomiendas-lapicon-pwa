import { QueryClient } from '@tanstack/react-query'

/**
 * Caché de datos del servidor (equivale a los FutureProvider de Riverpod).
 * Al volver a la app se refresca: los estados del backend cambian "lazy"
 * (docs/03 §3.4).
 */
export function crearClienteConsultas() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
    },
  })
}
