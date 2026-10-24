import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Rol } from '../../datos/modelos/rol'
import { presionable } from './Boton'

/** Clases literales: Tailwind no ve las que se arman con plantillas. */
export const HERO: Record<Rol, string> = { remitente: 'hero-remitente', viajero: 'hero-viajero' }

/**
 * Tarjeta principal con el degradado del rol (Medianoche / Cielo), brillo
 * arriba a la izquierda, cifra grande y sub-tarjetas de vidrio. Texto blanco.
 */
export function TarjetaHero({
  rol,
  titulo,
  principal,
  nota,
  insignia,
  subTarjetas,
  onClick,
  semantica,
}: {
  rol: Rol
  titulo: string
  principal: ReactNode
  nota?: string
  insignia?: ReactNode
  subTarjetas?: ReactNode
  onClick?: () => void
  /** Resumen para el lector de pantalla (un solo nodo con la acción). */
  semantica?: string
}) {
  const cuerpo = (
    <>
      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="text-[15px] font-medium text-blanco/95">{titulo}</span>
        {insignia}
      </span>
      <span className="display cifras mt-1.5 block text-[40px] leading-none tracking-[-1px] text-blanco">{principal}</span>
      {nota && <span className="mt-2 block text-sm text-blanco/95">{nota}</span>}
      {subTarjetas && <span className="mt-4 grid grid-cols-2 gap-3">{subTarjetas}</span>}
    </>
  )
  const clase = `${HERO[rol]} brillo relative block w-full overflow-hidden rounded-hero p-5 text-left`
  if (onClick) {
    const p = presionable(0.98)
    return (
      <button type="button" onClick={onClick} aria-label={semantica} className={`${clase} ${p.className}`} style={p.style}>
        {cuerpo}
      </button>
    )
  }
  return (
    <section aria-label={semantica} className={clase}>
      {semantica ? <span aria-hidden>{cuerpo}</span> : cuerpo}
    </section>
  )
}

/** Sub-tarjeta "vidrio" dentro del hero: POR ENTREGAR 2 / TE PAGAN USD 40. */
export function SubTarjetaVidrio({
  etiqueta,
  icono: Icono,
  valor,
  tono = 'vidrio-menta',
}: {
  etiqueta: string
  icono: LucideIcon
  valor: ReactNode
  tono?: 'vidrio-menta' | 'vidrio-ambar' | 'vidrio-celeste'
}) {
  return (
    <span className="block rounded-[20px] border border-blanco/20 bg-blanco/10 p-3.5">
      <span className="flex items-center gap-2">
        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-lg bg-blanco/15">
          <Icono size={14} style={{ color: `rgb(var(--${tono}))` }} />
        </span>
        <span className="truncate text-[11px] font-semibold uppercase tracking-[1.2px] text-blanco/95">{etiqueta}</span>
      </span>
      <span className="cifras mt-2 block truncate text-[21px] font-bold text-blanco">{valor}</span>
    </span>
  )
}

/** Píldora de vidrio sobre la tarjeta principal ("Vuelo verificado"). */
export function EtiquetaVidrio({ texto, icono: Icono }: { texto: string; icono: LucideIcon }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blanco/30 bg-blanco/15 px-2.5 py-1 text-xs font-semibold text-blanco">
      <Icono aria-hidden size={14} />
      {texto}
    </span>
  )
}
