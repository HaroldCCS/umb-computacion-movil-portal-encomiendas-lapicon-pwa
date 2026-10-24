import { Package, PlaneTakeoff } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import type { Rol } from '../../datos/modelos/rol'
import { Fmt } from '../formato'
import { Aviso } from './Aviso'
import { presionable } from './Boton'
import { Avatar } from './Insignia'
import { HERO } from './TarjetaHero'

/** Logotipo: avión sobre Medianoche + "Lapticon" en Space Grotesk. */
export function Marca({ tam = 40 }: { tam?: number }) {
  return (
    <span role="img" aria-label="Lapticon" className="inline-flex items-center gap-3">
      <span
        aria-hidden
        className="hero-remitente grid shrink-0 place-items-center text-remitente"
        style={{ width: tam, height: tam, borderRadius: tam * 0.3, boxShadow: 'none' }}
      >
        <PlaneTakeoff size={tam * 0.55} />
      </span>
      <span aria-hidden className="display tracking-[-0.3px] text-texto" style={{ fontSize: tam * 0.6 }}>
        Lapticon
      </span>
    </span>
  )
}

/** "Paso X de Y" del registro inicial. */
export function IndicadorPaso({ paso, total }: { paso: number; total: number }) {
  return (
    <div role="img" aria-label={`Paso ${paso} de ${total}`}>
      <p aria-hidden className="text-[11px] font-semibold tracking-[1.2px] text-texto2">
        PASO {paso} DE {total}
      </p>
      <div aria-hidden className="mt-2 flex gap-2">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < paso ? 'bg-marca' : 'bg-superficie2'}`} />
        ))}
      </div>
    </div>
  )
}

/** "Hola, Laura" (con el primer nombre). */
export function saludo(usuario: string): string {
  const nombre = usuario.trim().split(/\s+/)[0] ?? ''
  return nombre === '' ? 'Hola' : `Hola, ${nombre}`
}

/** Encabezado de Inicio: logotipo con el acento del rol, saludo, fecha,
 *  acciones y avatar que lleva al perfil. */
export function EncabezadoApp({
  usuario,
  rol,
  fecha = new Date(),
  acciones,
  alTocarAvatar,
}: {
  usuario: string
  rol: Rol
  fecha?: Date
  acciones?: ReactNode
  alTocarAvatar?: () => void
}) {
  const p = presionable(0.9)
  const Icono = rol === 'remitente' ? Package : PlaneTakeoff
  return (
    <header className="flex items-center gap-3 px-4 pb-2" style={{ paddingTop: 'calc(var(--seguro-arriba) + 10px)' }}>
      <span
        aria-hidden
        className={`${HERO[rol]} grid size-11 shrink-0 place-items-center rounded-[13px] ${rol === 'remitente' ? 'text-remitente' : 'text-blanco'}`}
        style={{ boxShadow: 'none' }}
      >
        <Icono size={24} />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[22px] font-bold tracking-[-0.3px] text-texto">{saludo(usuario)}</h1>
        <p className="truncate text-[13px] font-medium text-texto2">{Fmt.fechaLarga(fecha)}</p>
      </div>
      {acciones}
      <button
        type="button"
        onClick={alTocarAvatar}
        aria-label="Tu perfil"
        className={`${p.className} grid size-12 shrink-0 place-items-center`}
        style={p.style}
      >
        <Avatar nombre={usuario} />
      </button>
    </header>
  )
}

/**
 * Acciones de un detalle. Si se llega desde un aviso (`?accion=`), se
 * desplaza hasta aquí, enfoca el botón y explica encima qué falta (docs/08 §8.4).
 */
export function AccionResaltada({ activa, aviso, children }: { activa: boolean; aviso: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!activa) return
    const t = setTimeout(() => {
      ref.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
      ref.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus({ preventScroll: true })
    }, 120)
    return () => clearTimeout(t)
  }, [activa])
  return (
    <div ref={ref} className="flex flex-col">
      {activa && (
        <div className="mb-3">
          <Aviso tipo="atencion">{aviso}</Aviso>
        </div>
      )}
      {children}
    </div>
  )
}
