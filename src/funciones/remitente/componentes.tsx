import { CalendarX, Circle, CircleCheck, CircleDot } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Avatar, InsigniaEncomienda } from '../../core/componentes/Insignia'
import { RouteTicket, TicketDetail } from '../../core/componentes/RouteTicket'
import { Fmt } from '../../core/formato'
import { useMisEncomiendas, useResumenCalificaciones } from '../../datos/consultas'
import type { Encomienda } from '../../datos/modelos/encomienda'
import { ETIQUETA_ENCOMIENDA, type EstadoEncomienda } from '../../datos/modelos/estado'
import { PASOS_ENCOMIENDA, pasoActual } from './logica'

/** Tarjeta-pase de una encomienda del remitente (FECHA · VALOR · estado). */
export function TicketEnvio({ e, onClick, compacto }: { e: Encomienda; onClick?: () => void; compacto?: boolean }) {
  const vence = e.fechaVencimiento
  return (
    <RouteTicket
      origen={e.ciudadOrigen || '—'}
      destino={e.ciudadDestino || '—'}
      compacto={compacto}
      // Ámbar oscuro (acento del remitente) para que el avión se vea en claro.
      acento="atencion"
      onClick={onClick}
      etiqueta={`Encomienda de ${e.ciudadOrigen} a ${e.ciudadDestino}, ${Fmt.dinero(e.valor, e.moneda)}, ${ETIQUETA_ENCOMIENDA[e.estado]}`}
      detalles={[
        <TicketDetail key="f" etiqueta={vence ? 'Vence' : 'Fecha'} valor={Fmt.fecha(vence ?? e.creadaEn, { corta: true })} />,
        <TicketDetail key="v" etiqueta="Valor" valor={Fmt.dinero(e.valor, e.moneda)} />,
      ]}
      extremo={<InsigniaEncomienda estado={e.estado} />}
    />
  )
}

/** Línea de tiempo: Publicada → Tomada → Entregada → Calificada. */
export function LineaTiempo({ estado, calificada }: { estado: EstadoEncomienda; calificada: boolean }) {
  const actual = pasoActual(estado, calificada)
  if (actual === null) {
    return (
      <p className="flex items-center gap-3 text-[17px] text-texto">
        <CalendarX aria-hidden className="shrink-0 text-texto2" />
        <span>
          <span className="solo-lector">Estado final: {ETIQUETA_ENCOMIENDA[estado]}. </span>
          {estado === 'vencida'
            ? 'Ya no está publicada: venció o la retiraste.'
            : 'No conocemos el estado de esta encomienda.'}
        </span>
      </p>
    )
  }
  return (
    <ol className="flex flex-col">
      {PASOS_ENCOMIENDA.map((paso, i) => {
        const estadoPaso = i < actual ? 'completado' : i === actual ? 'paso actual' : 'pendiente'
        const Icono = i < actual ? CircleCheck : i === actual ? CircleDot : Circle
        return (
          <li key={paso} className="flex gap-3" aria-label={`${paso}: ${estadoPaso}`}>
            <span aria-hidden className="flex w-7 flex-col items-center">
              <Icono size={24} className={i <= actual ? 'text-exito' : 'text-separador'} />
              {i < PASOS_ENCOMIENDA.length - 1 && (
                <span className={`w-0.5 flex-1 ${i < actual ? 'bg-exito' : 'bg-separador'}`} />
              )}
            </span>
            <span
              aria-hidden
              className={`pb-4 ${i === actual ? 'text-[17px] font-semibold text-texto' : `text-[17px] ${i < actual ? 'text-texto' : 'text-texto2'}`}`}
            >
              {paso}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** Avatar · nombre · ★ promedio (total). */
export function FilaConfianza({
  uid,
  nombre,
  rol = 'Viajero',
  conRol = false,
  plural = 'reseñas',
}: {
  uid: string
  nombre: string | null
  rol?: string
  /** Muestra el rol en mayúsculas arriba del nombre (vista del viajero). */
  conRol?: boolean
  plural?: 'reseñas' | 'calificaciones'
}) {
  const resumen = useResumenCalificaciones(uid)
  const mostrado = nombre?.trim() || rol
  const r = resumen.data
  const singular = plural === 'reseñas' ? 'reseña' : 'calificación'
  const calificacion = resumen.isPending
    ? 'Cargando calificaciones…'
    : resumen.isError
      ? 'Calificaciones no disponibles'
      : r && r.total === 0
        ? 'Aún sin calificaciones'
        : `★ ${Fmt.decimal(r?.promedio ?? 0)} (${r?.total} ${r?.total === 1 ? singular : plural})`
  return (
    <div role="group" aria-label={`${rol}: ${mostrado}. ${calificacion}`} className="flex items-center gap-3">
      <Avatar nombre={mostrado} />
      <div aria-hidden className="min-w-0 flex-1">
        {conRol && <p className="text-[11px] font-semibold uppercase tracking-[1px] text-texto2">{rol}</p>}
        <p className="truncate text-[17px] font-semibold text-texto">{mostrado}</p>
        <p className="text-[15px] text-texto2">{calificacion}</p>
      </div>
    </div>
  )
}

/**
 * La encomienda del detalle: llega por el estado de la navegación; si se
 * recarga o se entra por un enlace, se busca en mis encomiendas (no existe
 * `GET /encomiendas/:id`, docs/10 §10.6).
 */
export function useEncomiendaDeRuta(id: string) {
  const { state } = useLocation() as { state: { encomienda?: Encomienda } | null }
  const mias = useMisEncomiendas()
  const desdeEstado = state?.encomienda?.id === id ? state.encomienda : undefined
  // La de la caché es la más fresca; la del estado sirve mientras carga.
  const encontrada = mias.data?.find((e) => e.id === id) ?? desdeEstado
  return {
    encomienda: encontrada ?? null,
    cargando: !encontrada && mias.isPending,
    error: !encontrada && mias.isError ? mias.error : null,
    reintentar: () => void mias.refetch(),
  }
}
