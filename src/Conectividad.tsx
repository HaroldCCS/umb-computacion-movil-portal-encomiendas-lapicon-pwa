import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { ClienteApi } from './core/red/cliente'
import { modoApi } from './core/red/config'
import { AppError } from './core/red/errores'

interface Resultado {
  total: number
  ejemplos: string[]
  ms: number
}

/**
 * Fase 0 (docs/10 §10.10): comprueba que esta URL llega a la API del backend,
 * directo o por el proxy, con una ruta pública (`/api/ciudades/paises`).
 */
export default function Conectividad({ api, base }: { api: ClienteApi; base: string }) {
  const [despertando, setDespertando] = useState(api.despertando)
  useEffect(() => api.alCambiarDespertando(setDespertando), [api])

  const consulta = useQuery({
    queryKey: ['conectividad', base],
    queryFn: async (): Promise<Resultado> => {
      const inicio = performance.now()
      const paises = await api.get<unknown>('/api/ciudades/paises', { auth: false })
      const lista = Array.isArray(paises) ? paises.filter((p): p is string => typeof p === 'string') : []
      return { total: lista.length, ejemplos: lista.slice(0, 3), ms: Math.round(performance.now() - inicio) }
    },
    retry: false,
    // Es una prueba manual: no se repite sola al volver a la pestaña.
    refetchOnWindowFocus: false,
  })

  const cargando = consulta.isFetching
  const modo = modoApi(base)

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col gap-5 px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Fase 0 · Conectividad</p>
        <h1 className="text-3xl font-bold tracking-tight">Lapticon PWA</h1>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-3xl bg-white p-4 text-[15px] shadow-sm dark:bg-neutral-900">
        <dt className="opacity-70">Modo de la API</dt>
        <dd data-testid="modo" className="text-right font-semibold">
          {modo === 'directo' ? 'Directo al backend' : 'Proxy (mismo origen)'}
        </dd>
        <dt className="opacity-70">Origen</dt>
        <dd className="break-all text-right font-semibold">{window.location.origin}</dd>
        <dt className="opacity-70">API</dt>
        <dd className="break-all text-right font-semibold">{base || `${window.location.origin}/api`}</dd>
      </dl>

      <section aria-live="polite" className="rounded-3xl bg-white p-4 shadow-sm dark:bg-neutral-900">
        {cargando && (
          <p>
            {despertando
              ? 'Despertando el servidor… la primera carga puede tardar hasta un minuto.'
              : 'Llamando a /api/ciudades/paises…'}
          </p>
        )}
        {!cargando && consulta.data && (
          <>
            <p className="text-lg font-semibold" data-testid="resultado">
              ✓ La API respondió: {consulta.data.total} países en {consulta.data.ms} ms
            </p>
            <p className="opacity-70">Por ejemplo: {consulta.data.ejemplos.join(', ')}…</p>
          </>
        )}
        {!cargando && consulta.error && (
          <p role="alert" className="font-semibold text-red-700 dark:text-red-400">
            ✗ {consulta.error instanceof AppError ? consulta.error.message : 'Algo falló. Intenta de nuevo.'}
          </p>
        )}
      </section>

      <button
        type="button"
        onClick={() => void consulta.refetch()}
        disabled={cargando}
        className="min-h-[52px] rounded-2xl bg-[#1B2A4A] px-5 text-[17px] font-semibold text-white transition active:scale-[.97] disabled:opacity-60 dark:bg-[#AFC6FF] dark:text-[#0E1A33]"
      >
        {cargando ? 'Probando…' : 'Probar de nuevo'}
      </button>
    </main>
  )
}
