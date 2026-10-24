import type { LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Clase común de "algo que se toca": escala corta al presionar (Presionable). */
export function presionable(escala = 0.97): { className: string; style: CSSProperties } {
  return { className: 'presionable', style: { '--escala': escala } as CSSProperties }
}

export function Spinner({ tam = 18, className = '' }: { tam?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`girando inline-block shrink-0 rounded-full border-2 border-current border-r-transparent ${className}`}
      style={{ width: tam, height: tam }}
    />
  )
}

/** **primario** (la acción, uno por pantalla) · **tonal** · **secundario** · **peligro**. */
export type VarianteBoton = 'primario' | 'tonal' | 'secundario' | 'peligro'

const COLORES: Record<VarianteBoton, string> = {
  primario: 'bg-marca-solido text-sobre-marca shadow-primario',
  tonal: 'bg-marca-suave text-marca',
  secundario: 'bg-superficie2 text-texto',
  peligro: 'bg-peligro-suave text-peligro',
}

interface PropsBoton {
  children: ReactNode
  onClick?: (() => void) | null
  variante?: VarianteBoton
  icono?: LucideIcon
  /** Mientras carga muestra `textoCargando` y no responde (evita el doble toque). */
  cargando?: boolean
  textoCargando?: string
  /** 40 px visibles, pero con área táctil de 48 px. */
  chico?: boolean
  /** Ocupa todo el ancho disponible (por defecto). */
  ancho?: boolean
  tipo?: 'button' | 'submit'
  className?: string
}

/** Botón del sistema con estado de carga integrado (docs/08 §8.6-2). */
export function Boton({
  children,
  onClick,
  variante = 'primario',
  icono: Icono,
  cargando = false,
  textoCargando,
  chico = false,
  ancho = true,
  tipo = 'button',
  className = '',
}: PropsBoton) {
  const inactivo = !onClick && tipo !== 'submit'
  const p = presionable()
  return (
    <button
      type={tipo}
      onClick={cargando || !onClick ? undefined : () => onClick()}
      disabled={inactivo}
      aria-disabled={cargando || undefined}
      aria-busy={cargando || undefined}
      style={p.style}
      className={`${p.className} ${cargando ? '' : 'atenuado'} ${chico ? 'py-1' : ''} ${ancho ? 'flex w-full' : 'inline-flex'} ${className}`}
    >
      <span
        className={`flex w-full items-center justify-center gap-2 font-semibold ${COLORES[variante]} ${
          chico ? 'min-h-10 rounded-xl px-3.5 text-[15px]' : 'min-h-[52px] rounded-boton px-5 text-[17px]'
        } ${variante !== 'primario' ? 'shadow-none' : ''}`}
      >
        {cargando ? <Spinner /> : Icono ? <Icono aria-hidden size={20} /> : null}
        <span className="min-w-0 truncate py-2">{cargando ? (textoCargando ?? children) : children}</span>
      </span>
    </button>
  )
}

/** Botón redondo de solo ícono (48 px) con etiqueta para el lector de pantalla. */
export function BotonIcono({
  icono: Icono,
  etiqueta,
  onClick,
  borde = true,
  className = '',
}: {
  icono: LucideIcon
  etiqueta: string
  onClick?: (() => void) | null
  borde?: boolean
  className?: string
}) {
  const p = presionable(0.9)
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onClick ?? undefined}
      disabled={!onClick}
      style={p.style}
      className={`${p.className} atenuado grid size-12 shrink-0 place-items-center rounded-full text-texto ${
        borde ? 'border border-separador bg-superficie' : ''
      } ${className}`}
    >
      <Icono aria-hidden size={22} />
    </button>
  )
}

/** Acción de texto ("¿Olvidaste tu contraseña?"): área táctil de 48 px. */
export function Enlace({
  children,
  onClick,
  a,
}: {
  children: ReactNode
  onClick?: (() => void) | null
  /** Ruta interna: se dibuja como enlace real (abre con atrás del sistema). */
  a?: string
}) {
  const p = presionable()
  const clase = `${p.className} atenuado inline-flex min-h-12 min-w-12 items-center justify-center px-2 text-[15px] font-semibold text-marca`
  if (a) {
    return (
      <Link to={a} className={clase} style={p.style}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick ?? undefined} disabled={!onClick} className={clase} style={p.style}>
      {children}
    </button>
  )
}
