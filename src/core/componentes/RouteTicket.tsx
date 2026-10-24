import { Plane } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { presionable } from './Boton'

/** Dato de la parte inferior del pase ("FECHA" / "12 dic"). */
export function TicketDetail({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-[11px] font-semibold uppercase tracking-[1px] text-texto2">{etiqueta}</span>
      <span className="cifras mt-0.5 truncate text-[17px] font-semibold text-texto">{valor}</span>
    </span>
  )
}

function Ciudad({ etiqueta, ciudad, compacto, fin }: { etiqueta: string; ciudad: string; compacto: boolean; fin?: boolean }) {
  const base = compacto ? 24 : 32
  // Como el FittedBox de Flutter: el nombre se achica para caber en una línea.
  const tam = `min(${base}px, calc(100cqi / ${Math.max(1, ciudad.length) * 0.6}))`
  return (
    <span className={`flex min-w-0 flex-[5] flex-col justify-center ${fin ? 'items-end text-right' : ''}`} style={{ containerType: 'inline-size' }}>
      <span className="text-[11px] font-semibold tracking-[1px] text-texto2">{etiqueta}</span>
      <span className="display mt-0.5 whitespace-nowrap leading-[1.1] tracking-[-0.5px] text-texto" style={{ fontSize: tam }}>
        {ciudad}
      </span>
    </span>
  )
}

/**
 * Firma visual de Lapticon: la ruta como un pase de abordar (docs/07 §7.5).
 * Arriba ORIGEN → DESTINO; si hay detalles, una línea perforada con muescas
 * laterales (máscara CSS) y la sección inferior.
 */
export function RouteTicket({
  origen,
  destino,
  detalles = [],
  extremo,
  onClick,
  acento = 'marca',
  compacto = false,
  etiqueta,
}: {
  origen: string
  destino: string
  detalles?: ReactNode[]
  extremo?: ReactNode
  onClick?: () => void
  /** Token del avión y la línea. */
  acento?: 'marca' | 'viajero' | 'atencion'
  compacto?: boolean
  /** Lo que lee el lector (por defecto "Ruta de X a Y"). */
  etiqueta?: string
}) {
  const conAbajo = detalles.length > 0 || extremo !== undefined
  const alto = compacto ? '5.25rem' : '6.5rem'
  const contenido = (
    <span
      className={`pase block ${conAbajo ? 'con-muescas' : ''}`}
      style={{ '--muesca-y': alto } as CSSProperties}
    >
      <span aria-hidden className="flex items-center px-5 py-4" style={{ minHeight: alto }}>
        <Ciudad etiqueta="ORIGEN" ciudad={origen} compacto={compacto} />
        <span className="flex flex-[3] items-center gap-1 px-1" style={{ color: `rgb(var(--${acento}))` }}>
          <span className="h-0 flex-1 border-t-[1.5px] border-dashed border-current" />
          <Plane size={22} className="shrink-0 rotate-45" />
          <span className="h-0 flex-1 border-t-[1.5px] border-dashed border-current" />
        </span>
        <Ciudad etiqueta="DESTINO" ciudad={destino} compacto={compacto} fin />
      </span>
      {conAbajo && (
        <span className="mx-[18px] block border-t-[1.5px] border-dashed border-separador" aria-hidden />
      )}
      {conAbajo && (
        <span className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 px-5 pb-4 pt-3">
          <span className="flex flex-wrap gap-x-5 gap-y-2.5">{detalles}</span>
          {extremo}
        </span>
      )}
    </span>
  )

  const leer = etiqueta ?? `Ruta de ${origen} a ${destino}`
  if (!onClick) {
    return (
      <div role="group" aria-label={leer} className="sombra-pase">
        {contenido}
      </div>
    )
  }
  const p = presionable(0.98)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={leer}
      className={`${p.className} sombra-pase block w-full text-left`}
      style={p.style}
    >
      {contenido}
    </button>
  )
}
