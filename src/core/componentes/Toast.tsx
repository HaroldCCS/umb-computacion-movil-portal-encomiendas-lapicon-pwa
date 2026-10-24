import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export type TipoToast = 'exito' | 'error' | 'info'
type Mostrar = (texto: string, tipo?: TipoToast) => void

const Ctx = createContext<Mostrar | null>(null)
const DURACION = 3200

/**
 * Avisos flotantes que caen desde arriba y se van solos (3,2 s): todo éxito
 * se confirma así (docs/08 §8.6-2). Región `aria-live` para el lector.
 */
export function ProveedorToasts({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<{ id: number; texto: string; tipo: TipoToast }[]>([])
  const id = useRef(0)
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())

  const quitar = useCallback((x: number) => setLista((l) => l.filter((t) => t.id !== x)), [])
  const mostrar = useCallback<Mostrar>(
    (texto, tipo = 'exito') => {
      const x = id.current++
      // Como mucho tres a la vez: el más viejo se va primero.
      setLista((l) => [...l.slice(-2), { id: x, texto, tipo }])
      const t = setTimeout(() => {
        timers.current.delete(t)
        quitar(x)
      }, DURACION)
      timers.current.add(t)
    },
    [quitar],
  )

  useEffect(() => {
    const t = timers.current
    return () => t.forEach(clearTimeout)
  }, [])

  return (
    <Ctx.Provider value={mostrar}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-[60] mx-auto flex max-w-[452px] flex-col gap-2 px-4"
        style={{ top: 'calc(var(--seguro-arriba) + 10px)' }}
      >
        {lista.map((t) => {
          const Icono = t.tipo === 'exito' ? CircleCheck : t.tipo === 'error' ? CircleAlert : Info
          const color = t.tipo === 'exito' ? 'text-exito' : t.tipo === 'error' ? 'text-peligro' : 'text-marca'
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => quitar(t.id)}
              className="toast vidrio pointer-events-auto flex items-center gap-3 rounded-campo border border-separador bg-superficie/95 px-4 py-3 text-left shadow-tarjeta"
            >
              <Icono aria-hidden size={20} className={`shrink-0 ${color}`} />
              <span className="text-[15px] font-medium text-texto">{t.texto}</span>
            </button>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): Mostrar {
  const c = useContext(Ctx)
  if (!c) throw new Error('Falta ProveedorToasts')
  return c
}
