import { useNavigate } from 'react-router-dom'
import { InsigniaEncomienda } from '../../core/componentes/Insignia'
import { RouteTicket, TicketDetail } from '../../core/componentes/RouteTicket'
import { Fmt } from '../../core/formato'
import { conAccion, Rutas, type AccionPendiente } from '../../core/rutas'
import type { Encomienda } from '../../datos/modelos/encomienda'
import { ETIQUETA_ENCOMIENDA } from '../../datos/modelos/estado'

/** Pase de una encomienda vista por el viajero: lo que le pagan, destacado. */
export function TicketEncomienda({ e, onClick }: { e: Encomienda; onClick?: () => void }) {
  return (
    <RouteTicket
      origen={e.ciudadOrigen}
      destino={e.ciudadDestino}
      compacto
      acento="viajero"
      onClick={onClick}
      etiqueta={`Encomienda de ${e.ciudadOrigen} a ${e.ciudadDestino}, te pagan ${Fmt.dinero(e.valor, e.moneda)}, ${ETIQUETA_ENCOMIENDA[e.estado]}`}
      detalles={[
        <TicketDetail key="p" etiqueta="Te pagan" valor={Fmt.dinero(e.valor, e.moneda)} />,
        ...(e.fechaVencimiento
          ? [<TicketDetail key="v" etiqueta="Vence" valor={Fmt.fecha(e.fechaVencimiento, { corta: true })} />]
          : []),
      ]}
      extremo={<InsigniaEncomienda estado={e.estado} />}
    />
  )
}

/** Abre el detalle del viajero (con la acción resaltada si viene de un aviso). */
export function useAbrirEncomiendaViajero() {
  const navigate = useNavigate()
  return (e: Encomienda, accion?: AccionPendiente) =>
    navigate(conAccion(Rutas.encomiendaViajero(e.id), accion), { state: { encomienda: e } })
}
