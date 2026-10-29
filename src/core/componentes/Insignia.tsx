import {
  CalendarX,
  CheckCheck,
  CircleCheck,
  CircleHelp,
  CircleX,
  Clock,
  Luggage,
  MessageCircle,
  PlaneLanding,
  PlaneTakeoff,
  Star,
  StarHalf,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { ETIQUETA_VIAJE, etiquetaEstado, type EstadoEncomienda, type EstadoViaje } from '../../datos/modelos/estado'
import { Fmt } from '../formato'

export type TipoInsignia = 'exito' | 'atencion' | 'peligro' | 'info' | 'neutra'

const COLORES: Record<TipoInsignia, string> = {
  exito: 'bg-exito-suave text-exito',
  atencion: 'bg-atencion-suave text-atencion',
  peligro: 'bg-peligro-suave text-peligro',
  info: 'bg-info-suave text-info',
  neutra: 'bg-superficie2 text-texto2',
}

/** Estado en píldora: color + **ícono** + texto, nunca solo color. */
export function Insignia({
  texto,
  icono: Icono,
  tipo = 'neutra',
  semantica,
}: {
  texto: string
  icono?: LucideIcon
  tipo?: TipoInsignia
  semantica?: string
}) {
  return (
    <span
      role="img"
      aria-label={semantica ?? texto}
      className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold ${COLORES[tipo]}`}
    >
      {Icono && <Icono aria-hidden size={15} className="shrink-0" />}
      <span className="truncate">{texto}</span>
    </span>
  )
}

const ENCOMIENDA: Record<EstadoEncomienda, [LucideIcon, TipoInsignia]> = {
  disponible: [Clock, 'info'],
  tomada: [Luggage, 'atencion'],
  entregada: [CircleCheck, 'exito'],
  recibida: [CheckCheck, 'exito'],
  vencida: [CalendarX, 'neutra'],
  desconocido: [CircleHelp, 'neutra'],
}

/** `rol` = quién mira: con `tomada`, el remitente ve "Tomada" (persona que la aceptó) y el
 *  viajero que la lleva, "La llevas tú" (maleta). */
export function InsigniaEncomienda({ estado, rol = 'remitente' }: { estado: EstadoEncomienda; rol?: 'remitente' | 'viajero' }) {
  const [iconoBase, tipo] = ENCOMIENDA[estado]
  const icono = estado === 'tomada' && rol === 'remitente' ? UserCheck : iconoBase
  const t = etiquetaEstado(estado, rol)
  return <Insignia texto={t} icono={icono} tipo={tipo} semantica={`Estado: ${t}`} />
}

const VIAJE: Record<EstadoViaje, [LucideIcon, TipoInsignia]> = {
  disponible: [PlaneTakeoff, 'info'],
  completado: [PlaneLanding, 'neutra'],
  cancelado: [CircleX, 'peligro'],
  contactado: [MessageCircle, 'info'],
  desconocido: [CircleHelp, 'neutra'],
}

export function InsigniaViaje({ estado }: { estado: EstadoViaje }) {
  const [icono, tipo] = VIAJE[estado]
  const t = ETIQUETA_VIAJE[estado]
  return <Insignia texto={t} icono={icono} tipo={tipo} semantica={`Estado: ${t}`} />
}

/** "Laura Gómez" → "LG"; "laura" → "L"; vacío → "?". */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  const primera = partes[0]![0]!
  const ultima = partes.length > 1 ? partes[partes.length - 1]![0]! : ''
  return (primera + ultima).toUpperCase()
}

/** Tono 0..359, siempre el mismo para el mismo nombre. */
export function tono(nombre: string): number {
  let h = 0
  for (const ch of nombre.trim().toLowerCase()) h = (h * 31 + ch.codePointAt(0)!) % 360
  return h
}

/** Iniciales con un color estable por persona. Decorativo: el nombre va al lado. */
export function Avatar({ nombre, tam = 44 }: { nombre: string; tam?: number }) {
  const h = tono(nombre)
  return (
    <span
      aria-hidden
      className="avatar grid shrink-0 place-items-center rounded-full font-semibold"
      style={
        {
          width: tam,
          height: tam,
          fontSize: tam * 0.38,
          '--h': h,
        } as CSSProperties
      }
    >
      {iniciales(nombre)}
    </span>
  )
}

/** Barra de progreso (0..1) que se anima al aparecer. */
export function Progreso({
  valor,
  alto = 6,
  claseFondo = 'bg-superficie2',
  claseBarra = 'bg-marca',
  etiqueta,
}: {
  valor: number
  alto?: number
  claseFondo?: string
  claseBarra?: string
  etiqueta?: string
}) {
  const v = Math.min(1, Math.max(0, valor))
  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={`overflow-hidden ${claseFondo}`}
      style={{ height: alto, borderRadius: alto }}
    >
      <div
        className={`progreso h-full ${claseBarra}`}
        // Un mínimo visible para que 0 % no parezca "sin barra".
        style={{ width: `${Math.max(2, v * 100)}%`, borderRadius: alto }}
      />
    </div>
  )
}

/** Toda cifra de dinero pasa por aquí (cifras tabulares). */
export function Monto({ valor, moneda, className = '' }: { valor: number; moneda: string; className?: string }) {
  return <span className={`cifras truncate ${className}`}>{Fmt.dinero(valor, moneda)}</span>
}

/** Estrellas de solo lectura con lectura accesible del valor. */
export function Estrellas({ valor, tam = 18 }: { valor: number; tam?: number }) {
  return (
    <span role="img" aria-label={`${Fmt.decimal(valor)} de 5 estrellas`} className="inline-flex text-pastel-ambar">
      {[1, 2, 3, 4, 5].map((i) =>
        valor >= i ? (
          <Star key={i} aria-hidden size={tam} fill="currentColor" strokeWidth={1.5} />
        ) : valor >= i - 0.5 ? (
          <StarHalf key={i} aria-hidden size={tam} fill="currentColor" strokeWidth={1.5} />
        ) : (
          <Star key={i} aria-hidden size={tam} strokeWidth={1.5} />
        ),
      )}
    </span>
  )
}
