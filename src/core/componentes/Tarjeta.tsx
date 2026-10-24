import { Check, ChevronRight, Star, type LucideIcon } from 'lucide-react'
import { Children, type ReactNode } from 'react'
import { presionable } from './Boton'

/** Color de un ícono pastel o de un token (canales RGB de tokens.css). */
export type Tono =
  | 'pastel-azul'
  | 'pastel-violeta'
  | 'pastel-ambar'
  | 'pastel-rojo'
  | 'pastel-verde'
  | 'pastel-celeste'
  | 'marca'
  | 'viajero'
  | 'atencion'
  | 'peligro'
  | 'exito'

const rgb = (t: Tono, alfa = 1) => `rgb(var(--${t}) / ${alfa})`

/**
 * Tarjeta: superficie, radio 24 y sombra suave solo en claro. Con `onClick`
 * es un solo botón para el lector (su texto es la etiqueta): por eso no se
 * anidan botones dentro de una tarjeta tocable.
 */
export function Tarjeta({
  children,
  onClick,
  borde,
  etiqueta,
  className = 'p-4',
}: {
  children: ReactNode
  onClick?: () => void
  /** Resalta una tarjeta que pide acción (p. ej. borde ámbar). */
  borde?: Tono
  etiqueta?: string
  className?: string
}) {
  const estilo = borde ? { borderColor: rgb(borde, 0.45) } : undefined
  if (!onClick) {
    return (
      <div className={`tarjeta ${className}`} style={estilo}>
        {children}
      </div>
    )
  }
  const p = presionable(0.98)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      className={`tarjeta ${p.className} block w-full text-left ${className}`}
      style={{ ...p.style, ...estilo }}
    >
      {children}
    </button>
  )
}

/** Recuadro pastel con ícono (decorativo: el texto de al lado dice qué es). */
export function IconoEnCaja({ icono: Icono, tono, tam = 44 }: { icono: LucideIcon; tono: Tono; tam?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center"
      style={{ width: tam, height: tam, borderRadius: tam * 0.32, background: rgb(tono, 0.14), color: rgb(tono) }}
    >
      <Icono size={tam * 0.5} />
    </span>
  )
}

/** Lista agrupada estilo iOS: filas separadas por una línea fina, título en
 *  mayúsculas arriba y nota opcional abajo. */
export function Grupo({ titulo, pie, children }: { titulo?: string; pie?: string | null; children: ReactNode }) {
  const hijos = Children.toArray(children).filter(Boolean)
  return (
    <section className="flex flex-col">
      {titulo && <h2 className="mb-2 ml-4 text-[13px] font-semibold uppercase tracking-[0.5px] text-texto2">{titulo}</h2>}
      <div className="tarjeta overflow-hidden">
        {hijos.map((h, i) => (
          <div key={i} className={i > 0 ? 'border-t border-separador' : ''}>
            {h}
          </div>
        ))}
      </div>
      {pie && <p className="mx-4 mt-2 text-[13px] text-texto2">{pie}</p>}
    </section>
  )
}

/** Fila etiqueta → valor con explicación opcional ("nunca un número solo"). */
export function Fila({ etiqueta, valor, extra }: { etiqueta: string; valor: ReactNode; extra?: string }) {
  return (
    <div className="flex min-h-[52px] items-start justify-between gap-4 px-4 py-3.5">
      <span className="min-w-0 flex-[2] text-[15px] text-texto2">{etiqueta}</span>
      <span className="flex min-w-0 flex-[3] flex-col items-end text-right">
        <span className="text-[15px] font-medium text-texto">{valor}</span>
        {extra && <span className="text-[13px] text-texto2">{extra}</span>}
      </span>
    </div>
  )
}

/** Fila que lleva a otra pantalla o hace una acción (estilo ajustes). */
export function FilaAccion({
  titulo,
  onClick,
  icono,
  tono = 'marca',
  subtitulo,
  destructiva = false,
  flecha = true,
}: {
  titulo: string
  onClick?: () => void
  icono?: LucideIcon
  tono?: Tono
  subtitulo?: string
  destructiva?: boolean
  flecha?: boolean
}) {
  const p = presionable(0.99)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`${p.className} atenuado flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left`}
      style={p.style}
    >
      {icono && <IconoEnCaja icono={icono} tono={destructiva ? 'peligro' : tono} tam={36} />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`text-[17px] font-medium ${destructiva ? 'text-peligro' : 'text-texto'}`}>{titulo}</span>
        {subtitulo && <span className="text-[13px] text-texto2">{subtitulo}</span>}
      </span>
      {flecha && !destructiva && <ChevronRight aria-hidden className="shrink-0 text-texto3" size={22} />}
    </button>
  )
}

/** Fila de una lista de selección (país, ciudad) con check en la elegida. */
export function FilaOpcion({
  texto,
  seleccionada,
  onClick,
  icono: Icono,
}: {
  texto: string
  seleccionada: boolean
  onClick: () => void
  icono?: LucideIcon
}) {
  const p = presionable(0.99)
  return (
    <button
      type="button"
      role="option"
      aria-selected={seleccionada}
      onClick={onClick}
      className={`${p.className} flex min-h-[52px] w-full items-center gap-3 border-b border-separador px-5 text-left`}
      style={p.style}
    >
      {Icono && <Icono aria-hidden size={22} className="shrink-0 text-texto2" />}
      <span className={`flex-1 text-[17px] ${seleccionada ? 'font-semibold text-marca' : 'text-texto'}`}>{texto}</span>
      {seleccionada && <Check aria-hidden className="text-marca" />}
    </button>
  )
}

/** "Vista rápida": ícono pastel, etiqueta y valor; lleva directo a la acción. */
export function Mosaico({
  icono,
  tono,
  etiqueta,
  valor,
  onClick,
}: {
  icono: LucideIcon
  tono: Tono
  etiqueta: string
  valor: ReactNode
  onClick?: () => void
}) {
  return (
    <Tarjeta onClick={onClick} className="h-full p-4">
      <span className="flex items-start justify-between">
        <IconoEnCaja icono={icono} tono={tono} />
        {onClick && <ChevronRight aria-hidden className="text-texto3" size={22} />}
      </span>
      <span className="mt-3 block text-[13px] text-texto2">{etiqueta}</span>
      <span className="cifras mt-0.5 block text-[19px] font-bold text-texto">{valor}</span>
    </Tarjeta>
  )
}

/** Dos columnas; cada tarjeta toma su propio alto. */
export function GrillaMosaicos({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

/** Aviso que empuja a la acción: borde ámbar, dos líneas y flecha (docs/08 §8.4). */
export function TarjetaAccion({
  titulo,
  texto,
  onClick,
  icono = Star,
  tono = 'pastel-ambar',
}: {
  titulo: string
  texto: string
  onClick: () => void
  icono?: LucideIcon
  tono?: Tono
}) {
  return (
    <Tarjeta borde="atencion" onClick={onClick}>
      <span className="flex items-center gap-3.5">
        <IconoEnCaja icono={icono} tono={tono} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-semibold text-texto">{titulo}</span>
          <span className="mt-0.5 text-sm text-texto2">{texto}</span>
        </span>
        <ChevronRight aria-hidden className="shrink-0 text-texto3" size={22} />
      </span>
    </Tarjeta>
  )
}
