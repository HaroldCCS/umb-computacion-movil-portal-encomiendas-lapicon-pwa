import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bloques } from './Aviso'
import { presionable, Spinner } from './Boton'

/** Vuelve atrás si hay historial dentro de la app; si se entró por un enlace
 *  directo, va a `respaldo` (no saca a la persona de la app). */
export function useVolver(respaldo = '/inicio') {
  const navigate = useNavigate()
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(respaldo, { replace: true })
  }
}

/** Botón atrás estilo iOS: flecha + "Envíos". */
export function BotonAtras({ texto, respaldo }: { texto?: string; respaldo?: string }) {
  const volver = useVolver(respaldo)
  const p = presionable(0.95)
  return (
    <button
      type="button"
      onClick={volver}
      aria-label={texto ? `Volver a ${texto}` : 'Volver'}
      className={`${p.className} -ml-2 flex min-h-12 min-w-12 items-center text-[17px] text-marca`}
      style={p.style}
    >
      <ChevronLeft aria-hidden size={28} strokeWidth={2.2} />
      {texto && <span className="-ml-1 max-w-[30vw] truncate">{texto}</span>}
    </button>
  )
}

/** Barra superior de vidrio con título compacto (lo comparten chat y asistente). */
export function BarraSuperior({
  izquierda,
  centro,
  derecha,
  visibleCentro = true,
  conLinea = false,
}: {
  izquierda?: ReactNode
  centro?: ReactNode
  derecha?: ReactNode
  visibleCentro?: boolean
  conLinea?: boolean
}) {
  return (
    <header
      className={`vidrio sticky top-0 z-30 transition-[border-color] ${conLinea || visibleCentro ? 'border-b border-separador/70' : 'border-b border-transparent'}`}
      style={{ paddingTop: 'var(--seguro-arriba)' }}
    >
      <div className="relative mx-auto flex min-h-[52px] max-w-app items-center justify-between px-4">
        <div className="flex min-w-12 items-center">{izquierda}</div>
        <div
          className="pointer-events-none absolute inset-x-20 flex justify-center truncate transition-opacity duration-200"
          style={{ opacity: visibleCentro ? 1 : 0 }}
          aria-hidden={!visibleCentro}
        >
          {centro}
        </div>
        <div className="flex min-w-12 items-center justify-end">{derecha}</div>
      </div>
    </header>
  )
}

/** Jalar para actualizar: al soltar después de 72 px con la página arriba. */
export function useJalarParaActualizar(alActualizar?: () => Promise<unknown>) {
  const [distancia, setDistancia] = useState(0)
  const [actualizando, setActualizando] = useState(false)

  useEffect(() => {
    if (!alActualizar) return
    let inicio: number | null = null
    let actual = 0
    const alTocar = (e: TouchEvent) => {
      inicio = window.scrollY <= 0 && !document.body.style.overflow ? e.touches[0]!.clientY : null
    }
    const alMover = (e: TouchEvent) => {
      if (inicio === null) return
      actual = Math.max(0, (e.touches[0]!.clientY - inicio) * 0.5)
      setDistancia(Math.min(actual, 110))
    }
    const alSoltar = () => {
      if (inicio === null) return
      inicio = null
      if (actual > 72) {
        setActualizando(true)
        setDistancia(56)
        void alActualizar()
          .catch(() => {})
          .finally(() => {
            setActualizando(false)
            setDistancia(0)
          })
      } else {
        setDistancia(0)
      }
      actual = 0
    }
    window.addEventListener('touchstart', alTocar, { passive: true })
    window.addEventListener('touchmove', alMover, { passive: true })
    window.addEventListener('touchend', alSoltar)
    window.addEventListener('touchcancel', alSoltar)
    return () => {
      window.removeEventListener('touchstart', alTocar)
      window.removeEventListener('touchmove', alMover)
      window.removeEventListener('touchend', alSoltar)
      window.removeEventListener('touchcancel', alSoltar)
    }
  }, [alActualizar])

  return { distancia, actualizando }
}

/**
 * Pantalla estilo iOS (docs/08 §8.8-4): título grande que se compacta en una
 * barra de vidrio al hacer scroll, "jalar para actualizar" y pie fijo con la
 * acción principal. El contenido va en una columna con separación de bloque y
 * entrada escalonada.
 */
export function Pantalla({
  titulo,
  subtitulo,
  accion,
  atras,
  alActualizar,
  conBarraPestanas = false,
  cabecera,
  pie,
  children,
}: {
  titulo: string
  subtitulo?: string | null
  /** A la derecha de la barra (p. ej. un BotonIcono). */
  accion?: ReactNode
  /** Botón atrás: `true` solo la flecha, o el texto ("Envíos"). */
  atras?: boolean | string
  /** Con él, en el teléfono se puede jalar hacia abajo para refrescar. */
  alActualizar?: () => Promise<unknown>
  /** Es una pestaña: deja espacio para la barra flotante. */
  conBarraPestanas?: boolean
  /** Fijo debajo del subtítulo (p. ej. Chips). */
  cabecera?: ReactNode
  pie?: ReactNode
  children?: ReactNode
}) {
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const [compacta, setCompacta] = useState(false)
  const { distancia, actualizando } = useJalarParaActualizar(alActualizar)

  useEffect(() => {
    const t = tituloRef.current
    if (!t || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([e]) => setCompacta(!(e?.isIntersecting ?? true)), {
      rootMargin: '-60px 0px 0px 0px',
    })
    obs.observe(t)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    document.title = `${titulo} · Lapticon`
  }, [titulo])

  const abajo = conBarraPestanas
    ? 'calc(var(--altura-tabbar) + var(--seguro-abajo) + 32px)'
    : pie
      ? '24px'
      : 'calc(var(--seguro-abajo) + 24px)'

  return (
    <div className="flex min-h-dvh flex-col bg-fondo">
      <BarraSuperior
        izquierda={atras ? <BotonAtras texto={typeof atras === 'string' ? atras : undefined} /> : null}
        centro={<span className="truncate text-[17px] font-semibold text-texto">{titulo}</span>}
        derecha={accion}
        visibleCentro={compacta}
      />
      {alActualizar && <IndicadorActualizar distancia={distancia} actualizando={actualizando} />}
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col" style={{ paddingBottom: abajo }}>
        <div className="px-4">
          <h1 ref={tituloRef} className="pt-1 text-[32px] font-bold leading-[1.15] tracking-[-0.5px] text-texto">
            {titulo}
          </h1>
          {subtitulo && <p className="mt-1 text-[15px] text-texto2">{subtitulo}</p>}
        </div>
        {cabecera && <div className="mt-3">{cabecera}</div>}
        <div className="mt-4 px-4">
          <Bloques>{children}</Bloques>
        </div>
      </main>
      {pie && (
        <div
          className="sticky bottom-0 z-20 border-t border-separador/70 bg-fondo"
          style={{ paddingBottom: 'calc(12px + var(--seguro-abajo))' }}
        >
          <div className="mx-auto max-w-app px-4 pt-3">{pie}</div>
        </div>
      )}
    </div>
  )
}

/** Indicador de "jalar para actualizar" (se estira con el gesto). */
export function IndicadorActualizar({ distancia, actualizando }: { distancia: number; actualizando: boolean }) {
  return (
    <div
      className="flex items-end justify-center overflow-hidden text-texto2 transition-[height] duration-150"
      style={{ height: distancia }}
    >
      <span aria-hidden className="mb-3" style={{ opacity: Math.min(1, distancia / 72) }}>
        <Spinner tam={22} className={actualizando ? '' : '[animation-play-state:paused]'} />
      </span>
      {actualizando && (
        <span role="status" className="solo-lector">
          Actualizando
        </span>
      )}
    </div>
  )
}

/** Título de sección dentro de una pantalla ("Vista rápida", "Ruta"). */
export function Seccion({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-xl font-bold tracking-[-0.3px] text-texto">{children}</h2>
}
