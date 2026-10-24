import { X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Boton, presionable } from './Boton'
import { coincide, ConfirmacionEscrita } from './Campo'

/** Lo que recibe el contenido de una hoja para cerrarla con un resultado. */
export type CerrarHoja<T> = (resultado?: T) => void

interface HojaAbierta {
  id: number
  titulo: string
  altoCompleto: boolean
  contenido: (cerrar: CerrarHoja<unknown>) => ReactNode
  resolver: (r: unknown) => void
}

interface CtxHojas {
  mostrarHoja: <T>(o: {
    titulo: string
    altoCompleto?: boolean
    contenido: (cerrar: CerrarHoja<T>) => ReactNode
  }) => Promise<T | undefined>
}

const Ctx = createContext<CtxHojas | null>(null)

/**
 * Hojas inferiores (docs/08 §8.6-5): para formularios cortos y acciones con
 * consecuencias. Van en un portal sobre todo, con el foco atrapado, Esc para
 * cerrar y arrastre hacia abajo desde la manija.
 */
export function ProveedorHojas({ children }: { children: ReactNode }) {
  const [hojas, setHojas] = useState<HojaAbierta[]>([])
  const siguiente = useRef(1)

  const mostrarHoja = useCallback<CtxHojas['mostrarHoja']>(
    ({ titulo, altoCompleto = false, contenido }) =>
      new Promise((resolver) => {
        const id = siguiente.current++
        setHojas((h) => [
          ...h,
          {
            id,
            titulo,
            altoCompleto,
            contenido: contenido as HojaAbierta['contenido'],
            resolver: resolver as (r: unknown) => void,
          },
        ])
      }),
    [],
  )

  const cerrar = useCallback((id: number, resultado: unknown) => {
    setHojas((h) => {
      h.find((x) => x.id === id)?.resolver(resultado)
      return h.filter((x) => x.id !== id)
    })
  }, [])

  const valor = useMemo(() => ({ mostrarHoja }), [mostrarHoja])
  return (
    <Ctx.Provider value={valor}>
      {children}
      {hojas.map((h, i) => (
        <Hoja key={h.id} hoja={h} arriba={i === hojas.length - 1} alCerrar={(r) => cerrar(h.id, r)} />
      ))}
    </Ctx.Provider>
  )
}

function Hoja({ hoja, arriba, alCerrar }: { hoja: HojaAbierta; arriba: boolean; alCerrar: (r?: unknown) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const idTitulo = useId()
  const [arrastre, setArrastre] = useState(0)
  const [arrastrando, setArrastrando] = useState(false)
  const inicio = useRef<number | null>(null)

  // Foco dentro, Esc cierra, el fondo no se desplaza y al cerrar el foco vuelve.
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null
    const nodo = ref.current
    const enfocable = nodo?.querySelector<HTMLElement>('[autofocus], input, textarea, button:not([data-cerrar])')
    ;(enfocable ?? nodo)?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      previo?.focus?.()
    }
  }, [])

  useEffect(() => {
    if (!arriba) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        alCerrar()
      } else if (e.key === 'Tab' && ref.current) {
        const focos = [
          ...ref.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])',
          ),
        ]
        if (focos.length === 0) return
        const primero = focos[0]!
        const ultimo = focos[focos.length - 1]!
        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault()
          ultimo.focus()
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault()
          primero.focus()
        }
      }
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [arriba, alCerrar])

  const cerrarBoton = presionable(0.9)
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div aria-hidden className="velo absolute inset-0 bg-negro/45" onClick={() => alCerrar()} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="hoja relative flex w-full max-w-[560px] flex-col rounded-t-hero bg-superficie outline-none"
        style={{
          maxHeight: 'calc(92dvh - var(--seguro-arriba))',
          height: hoja.altoCompleto ? 'calc(92dvh - var(--seguro-arriba))' : undefined,
          transform: arrastre > 0 ? `translateY(${arrastre}px)` : undefined,
          transition: arrastrando ? 'none' : 'transform 200ms var(--curva-hoja)',
        }}
      >
        {/* Manija y cabecera: se arrastran hacia abajo para cerrar. */}
        <div
          className="touch-none select-none"
          onPointerDown={(e) => {
            inicio.current = e.clientY
            setArrastrando(true)
            ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (inicio.current !== null) setArrastre(Math.max(0, e.clientY - inicio.current))
          }}
          onPointerUp={() => {
            inicio.current = null
            setArrastrando(false)
            if (arrastre > 120) alCerrar()
            else setArrastre(0)
          }}
          onPointerCancel={() => {
            inicio.current = null
            setArrastrando(false)
            setArrastre(0)
          }}
        >
          <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-separador" />
          <div className="flex items-center gap-2 pb-1 pl-5 pr-2 pt-1.5">
            <h2 id={idTitulo} className="flex-1 text-xl font-bold text-texto">
              {hoja.titulo}
            </h2>
            <button
              type="button"
              data-cerrar
              aria-label="Cerrar"
              onClick={() => alCerrar()}
              className={`${cerrarBoton.className} grid size-12 place-items-center`}
              style={cerrarBoton.style}
            >
              <span className="grid size-8 place-items-center rounded-full bg-superficie2 text-texto2">
                <X aria-hidden size={18} />
              </span>
            </button>
          </div>
        </div>
        {hoja.altoCompleto ? (
          <div className="flex min-h-0 flex-1 flex-col">{hoja.contenido(alCerrar)}</div>
        ) : (
          <div
            className="min-h-0 overflow-y-auto overscroll-contain px-5 pt-2"
            style={{ paddingBottom: 'calc(20px + var(--seguro-abajo))' }}
          >
            {hoja.contenido(alCerrar)}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export interface OpcionesConfirmacion {
  titulo: string
  mensaje: string
  confirmarTexto: string
  cancelarTexto?: string
  destructivo?: boolean
  /** Con palabra, el botón se habilita al escribirla (acciones irreversibles). */
  palabra?: string
  detalle?: ReactNode
}

function ContenidoConfirmacion({ o, cerrar }: { o: OpcionesConfirmacion; cerrar: CerrarHoja<boolean> }) {
  const [escrito, setEscrito] = useState('')
  const listo = !o.palabra || coincide(escrito, o.palabra)
  return (
    <div className="flex flex-col">
      <p className="text-[17px] leading-[1.4] text-texto">{o.mensaje}</p>
      {o.detalle && <div className="mt-4">{o.detalle}</div>}
      {o.palabra && (
        <div className="mt-5">
          <ConfirmacionEscrita palabra={o.palabra} valor={escrito} alCambiar={setEscrito} />
        </div>
      )}
      <div className="mt-6 flex flex-col gap-2">
        <Boton variante={o.destructivo ? 'peligro' : 'primario'} onClick={listo ? () => cerrar(true) : null}>
          {o.confirmarTexto}
        </Boton>
        <Boton variante="secundario" onClick={() => cerrar(false)}>
          {o.cancelarTexto ?? 'No, volver'}
        </Boton>
      </div>
    </div>
  )
}

export function useHojas() {
  const c = useContext(Ctx)
  if (!c) throw new Error('Falta ProveedorHojas')
  const { mostrarHoja } = c
  /** Confirmación con verbo explícito; `true` solo si se confirma. */
  const confirmar = useCallback(
    async (o: OpcionesConfirmacion): Promise<boolean> =>
      (await mostrarHoja<boolean>({
        titulo: o.titulo,
        contenido: (cerrar) => <ContenidoConfirmacion o={o} cerrar={cerrar} />,
      })) === true,
    [mostrarHoja],
  )
  return { mostrarHoja, confirmar }
}
