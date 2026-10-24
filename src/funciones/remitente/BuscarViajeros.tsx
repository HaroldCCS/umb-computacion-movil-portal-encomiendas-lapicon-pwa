import { useQueryClient } from '@tanstack/react-query'
import { CircleDot, Earth, PlaneTakeoff, Plus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorCarga, EsqueletoLista, Vacio } from '../../core/componentes/Aviso'
import { Boton } from '../../core/componentes/Boton'
import { InsigniaViaje } from '../../core/componentes/Insignia'
import { Pantalla } from '../../core/componentes/Pantalla'
import { RouteTicket, TicketDetail } from '../../core/componentes/RouteTicket'
import { Fmt } from '../../core/formato'
import { Rutas } from '../../core/rutas'
import { mensajeDe } from '../../core/useAccion'
import { Claves, useViajerosPorOrigen } from '../../datos/consultas'
import type { Viaje } from '../../datos/modelos/viaje'
import { CampoCiudad } from '../catalogo/selectores'
import { FilaConfianza } from './componentes'

/** Viajero con su calificación arriba y el pase de su vuelo debajo. */
function TarjetaViajero({ v }: { v: Viaje }) {
  return (
    <div className="flex flex-col">
      {v.viajeroUid && (
        <div className="mx-1 mb-3">
          <FilaConfianza uid={v.viajeroUid} nombre={v.viajeroNombre} />
        </div>
      )}
      <RouteTicket
        origen={v.ciudadOrigen}
        destino={v.ciudadDestino}
        compacto
        acento="viajero"
        detalles={[
          <TicketDetail key="v" etiqueta="Vuelo" valor={v.numeroVuelo || '—'} />,
          <TicketDetail key="f" etiqueta="Fecha" valor={Fmt.fecha(v.fechaViaje, { corta: true })} />,
        ]}
        extremo={<InsigniaViaje estado={v.estado} />}
      />
    </div>
  )
}

/** "Buscar viajeros" (desde Vista rápida): quién sale de una ciudad y cómo lo califican.
 *  La ciudad va en la URL (`?ciudad=`) para poder volver o compartir la búsqueda. */
export function BuscarViajeros() {
  const [params, setParams] = useSearchParams()
  const ciudad = params.get('ciudad')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const viajeros = useViajerosPorOrigen(ciudad)

  let resultados
  if (!ciudad) {
    resultados = (
      <Vacio
        titulo="Encuentra quién viaja"
        icono={Earth}
        texto="Elige tu ciudad para ver los viajeros que salen de allí y sus calificaciones."
      />
    )
  } else if (viajeros.isError) {
    resultados = <ErrorCarga mensaje={mensajeDe(viajeros.error, 'No pudimos buscar viajeros.')} alReintentar={() => void viajeros.refetch()} />
  } else if (!viajeros.data) {
    resultados = <EsqueletoLista cantidad={2} alto={200} />
  } else if (viajeros.data.length === 0) {
    resultados = (
      <Vacio
        titulo={`Nadie viaja desde ${ciudad} por ahora`}
        icono={PlaneTakeoff}
        texto={`Publica tu encomienda igual: los viajeros que registren un vuelo desde ${ciudad} la verán.`}
        accion={
          <Boton icono={Plus} onClick={() => navigate(Rutas.nuevaEncomienda)}>
            Publicar encomienda
          </Boton>
        }
      />
    )
  } else {
    resultados = viajeros.data.map((v) => <TarjetaViajero key={v.id || v.viajeroUid} v={v} />)
  }

  return (
    <Pantalla
      titulo="Buscar viajeros"
      atras="Inicio"
      subtitulo="Mira quién sale de tu ciudad y cómo lo califican."
      alActualizar={ciudad ? () => qc.invalidateQueries({ queryKey: Claves.viajeros(ciudad) }) : undefined}
      cabecera={
        <div className="px-4">
          <CampoCiudad
            etiqueta="¿Desde dónde envías?"
            valor={ciudad ?? ''}
            alCambiar={(c) => setParams({ ciudad: c }, { replace: true })}
            pista="Elige la ciudad de origen"
            icono={CircleDot}
          />
        </div>
      }
    >
      {resultados}
    </Pantalla>
  )
}
