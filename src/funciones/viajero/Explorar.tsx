import { useQueryClient } from '@tanstack/react-query'
import { Headset, Inbox, Luggage, PlaneTakeoff } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUid } from '../../app/contexto'
import { Aviso, ErrorCarga, EsqueletoLista, Vacio } from '../../core/componentes/Aviso'
import { Boton, BotonIcono } from '../../core/componentes/Boton'
import { Chips } from '../../core/componentes/Campo'
import { Pantalla } from '../../core/componentes/Pantalla'
import { RouteTicket, TicketDetail } from '../../core/componentes/RouteTicket'
import { Fmt } from '../../core/formato'
import { Rutas } from '../../core/rutas'
import { mensajeDe } from '../../core/useAccion'
import { Claves, useDisponiblesEnMiRuta, useMiViaje, useMisEntregas } from '../../datos/consultas'
import { TicketEncomienda, useAbrirEncomiendaViajero } from './componentes'
import { ordenarDisponibles, porEntregar, TITULO_ORDEN, type OrdenExplorar } from './logica'

/** Pestaña "Explorar": encomiendas disponibles en la ruta de mi viaje, con
 *  lo que pagan a la vista. */
export function Explorar() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const uid = useUid()
  const viaje = useMiViaje()
  const disponibles = useDisponiblesEnMiRuta()
  const llevo = porEntregar(useMisEntregas().data ?? [])
  const abrir = useAbrirEncomiendaViajero()
  const [orden, setOrden] = useState<OrdenExplorar>('recientes')
  const v = viaje.data
  const hayVarias = (disponibles.data?.length ?? 0) > 1

  let contenido
  if (viaje.isError) {
    contenido = <ErrorCarga mensaje={mensajeDe(viaje.error, 'No pudimos cargar tu viaje.')} alReintentar={() => void viaje.refetch()} />
  } else if (viaje.isPending) {
    contenido = <EsqueletoLista />
  } else if (!v) {
    contenido = (
      <Vacio
        titulo="Primero registra tu viaje"
        icono={Luggage}
        texto="Te mostraremos las encomiendas que van por tu misma ruta y lo que pagan por llevarlas."
        accion={
          <Boton icono={PlaneTakeoff} onClick={() => navigate(Rutas.registrarViaje)}>
            Registrar viaje
          </Boton>
        }
      />
    )
  } else {
    const ruta = (
      <RouteTicket
        key="ruta"
        origen={v.ciudadOrigen}
        destino={v.ciudadDestino}
        compacto
        acento="viajero"
        detalles={[
          <TicketDetail key="v" etiqueta="Tu vuelo" valor={v.numeroVuelo || '—'} />,
          <TicketDetail key="f" etiqueta="Fecha" valor={Fmt.fecha(v.fechaViaje, { corta: true })} />,
        ]}
      />
    )
    // Las que tomé van aparte y arriba, para no confundirlas con las disponibles (docs/11 §2G).
    const lasQueLlevo =
      llevo.length > 0
        ? [
            <h2 key="llevo-titulo" className="text-xl font-bold tracking-[-0.3px] text-texto">
              Las que llevas
            </h2>,
            ...llevo.map((e) => <TicketEncomienda key={`llevo-${e.id}`} e={e} onClick={() => abrir(e)} />),
          ]
        : []
    if (disponibles.isError) {
      contenido = [
        ruta,
        ...lasQueLlevo,
        <Aviso
          key="error"
          tipo="error"
          accion={
            <Boton chico ancho={false} variante="secundario" onClick={() => void disponibles.refetch()}>
              Reintentar
            </Boton>
          }
        >
          {mensajeDe(disponibles.error, 'No pudimos cargar las encomiendas.')}
        </Aviso>,
      ]
    } else if (!disponibles.data) {
      contenido = [ruta, ...lasQueLlevo, <EsqueletoLista key="carga" cantidad={2} />]
    } else if (disponibles.data.length === 0) {
      contenido = [
        ruta,
        ...lasQueLlevo,
        <Vacio
          key="vacio"
          titulo="Aún no hay encomiendas para esta ruta"
          icono={Inbox}
          texto="Desliza hacia abajo para actualizar más tarde."
        />,
      ]
    } else {
      const n = disponibles.data.length
      contenido = [
        ruta,
        ...lasQueLlevo,
        <h2 key="titulo" className="text-xl font-bold tracking-[-0.3px] text-texto">
          {n} {n === 1 ? 'encomienda disponible' : 'encomiendas disponibles'}
        </h2>,
        ...ordenarDisponibles(disponibles.data, orden).map((e) => (
          <TicketEncomienda key={e.id} e={e} onClick={() => abrir(e)} />
        )),
      ]
    }
  }

  return (
    <Pantalla
      titulo="Explorar"
      subtitulo={v ? 'Encomiendas que van por tu ruta.' : null}
      conBarraPestanas
      alActualizar={async () => {
        await qc.invalidateQueries({ queryKey: Claves.miViaje(uid) })
        await qc.invalidateQueries({ queryKey: Claves.disponibles(uid) })
      }}
      accion={<BotonIcono icono={Headset} etiqueta="Asistente" borde={false} onClick={() => navigate(Rutas.asistente)} />}
      cabecera={
        v && hayVarias ? (
          <Chips
            etiqueta="Ordenar"
            opciones={(Object.keys(TITULO_ORDEN) as OrdenExplorar[]).map((o) => ({ valor: o, texto: TITULO_ORDEN[o] }))}
            valor={orden}
            alCambiar={setOrden}
          />
        ) : undefined
      }
    >
      {contenido}
    </Pantalla>
  )
}
