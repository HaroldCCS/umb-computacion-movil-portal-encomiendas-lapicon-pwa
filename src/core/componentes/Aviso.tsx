import { Check, CircleAlert, CloudOff, Info, RefreshCw, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Children, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import type { ClienteApi } from '../red/cliente'
import { Boton, Spinner } from './Boton'

export type TipoAviso = 'info' | 'exito' | 'atencion' | 'error'

const ESTILO: Record<TipoAviso, [string, string, LucideIcon]> = {
  // Sobre los fondos tintados el texto va con el color del tipo (texto2 no
  // alcanza 4.5:1 sobre todos ellos).
  info: ['bg-superficie2', 'text-texto2', Info],
  exito: ['bg-exito-suave', 'text-exito', Check],
  atencion: ['bg-atencion-suave', 'text-atencion', TriangleAlert],
  error: ['bg-peligro-suave', 'text-peligro', CircleAlert],
}

/**
 * Mensaje en línea. Los errores de una acción van **junto a lo que la causó**
 * (docs/08 §8.6-2) y se anuncian al lector de pantalla.
 */
export function Aviso({
  children,
  titulo,
  tipo = 'info',
  accion,
}: {
  children: ReactNode
  titulo?: string
  tipo?: TipoAviso
  accion?: ReactNode
}) {
  const [fondo, color, Icono] = ESTILO[tipo]
  return (
    <div
      role={tipo === 'error' ? 'alert' : undefined}
      className={`flex items-start gap-3 rounded-campo px-4 py-3.5 ${fondo}`}
    >
      <Icono aria-hidden size={20} className={`mt-0.5 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        {titulo && <p className={`text-[15px] font-semibold ${tipo === 'info' ? 'text-texto' : color}`}>{titulo}</p>}
        <div className={`whitespace-pre-line text-[15px] leading-[1.35] ${color}`}>{children}</div>
        {accion && <div className="mt-2 flex flex-wrap gap-2">{accion}</div>}
      </div>
    </div>
  )
}

/** Estado vacío: ícono en círculo + título + texto + acción. */
export function Vacio({
  titulo,
  icono: Icono,
  texto,
  accion,
  claseIcono = 'bg-marca-suave text-marca',
}: {
  titulo: string
  icono: LucideIcon
  texto?: ReactNode
  accion?: ReactNode
  claseIcono?: string
}) {
  return (
    <div className="tarjeta flex flex-col items-center px-6 py-10 text-center">
      <span aria-hidden className={`grid size-16 place-items-center rounded-full ${claseIcono}`}>
        <Icono size={30} />
      </span>
      <h2 className="mt-4 text-[19px] font-semibold text-texto">{titulo}</h2>
      {texto && <p className="mt-2 text-[15px] leading-[1.35] text-texto2">{texto}</p>}
      {accion && <div className="mt-5 flex w-full flex-col items-center gap-2">{accion}</div>}
    </div>
  )
}

/** Error al cargar una pantalla, con mensaje humano y "Reintentar". */
export function ErrorCarga({
  mensaje,
  alReintentar,
  textoSecundario,
  alSecundario,
}: {
  mensaje: string
  alReintentar: () => void
  textoSecundario?: string
  alSecundario?: () => void
}) {
  return (
    <div role="alert">
      <Vacio
        titulo="No pudimos cargar la información"
        icono={CloudOff}
        texto={mensaje}
        claseIcono="bg-peligro-suave text-peligro"
        accion={
          <>
            <Boton icono={RefreshCw} variante="tonal" onClick={alReintentar}>
              Reintentar
            </Boton>
            {textoSecundario && alSecundario && (
              <Boton variante="secundario" onClick={alSecundario}>
                {textoSecundario}
              </Boton>
            )}
          </>
        }
      />
    </div>
  )
}

/** Aviso flotante cuando el backend gratuito de Render está despertando. */
export function AvisoServidor({ api }: { api: ClienteApi }) {
  const visible = useSyncExternalStore(
    (o) => api.alCambiarDespertando(o),
    () => api.despertando,
  )
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-40 mx-auto max-w-app px-4 transition-all duration-[250ms] ease-entrada"
      style={{
        bottom: 'calc(var(--seguro-abajo) + var(--altura-tabbar) + 20px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(150%)',
      }}
    >
      {visible && (
        <div className="flex items-center gap-3 rounded-campo border border-separador bg-superficie p-4 shadow-tarjeta">
          <Spinner tam={20} className="text-marca" />
          <p className="text-[15px] text-texto">Despertando el servidor… la primera carga puede tardar hasta un minuto.</p>
        </div>
      )}
    </div>
  )
}

/** Bloque gris con brillo: anticipa la forma del contenido mientras carga. */
export function Esqueleto({ alto = 20, ancho, radio = 12 }: { alto?: number; ancho?: number | string; radio?: number }) {
  return <div aria-hidden className="esqueleto" style={{ height: alto, width: ancho, borderRadius: radio }} />
}

/** `cantidad` bloques con forma de tarjeta; se anuncia como "Cargando". */
export function EsqueletoLista({ cantidad = 3, alto = 168, primero }: { cantidad?: number; alto?: number; primero?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-3">
      {primero !== undefined && (
        <div className="mb-2">
          <Esqueleto alto={primero} radio={28} />
        </div>
      )}
      {Array.from({ length: cantidad }, (_, i) => (
        <Esqueleto key={i} alto={alto} radio={24} />
      ))}
    </div>
  )
}

/** Aparece con fade + 10 px hacia arriba; `indice` escalona (40 ms, máx. 8). */
export function Entrada({ children, indice = 0 }: { children: ReactNode; indice?: number }) {
  return (
    <div className="entrada" style={{ '--retraso': `${40 * Math.min(8, Math.max(0, indice))}ms` } as CSSProperties}>
      {children}
    </div>
  )
}

/** Columna con separación de bloque (20 px) y entrada escalonada. */
export function Bloques({ children }: { children: ReactNode }) {
  const hijos = Children.toArray(children).filter(Boolean)
  return (
    <div className="flex flex-col gap-bloque">
      {hijos.map((h, i) => (
        <Entrada key={i} indice={i}>
          {h}
        </Entrada>
      ))}
    </div>
  )
}
