import { useQueryClient } from '@tanstack/react-query'
import { ArrowUpDown, CircleDot, Earth, MapPin, PlaneTakeoff, Plus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorCarga, EsqueletoLista, Vacio } from '../../core/componentes/Aviso'
import { Boton, BotonIcono } from '../../core/componentes/Boton'
import { Pantalla } from '../../core/componentes/Pantalla'
import { RouteTicket, TicketDetail } from '../../core/componentes/RouteTicket'
import { Fmt } from '../../core/formato'
import { Rutas } from '../../core/rutas'
import { mensajeDe } from '../../core/useAccion'
import { Claves, useViajerosEnRuta } from '../../datos/consultas'
import type { Viaje } from '../../datos/modelos/viaje'
import { CampoCiudad } from '../catalogo/selectores'
import { FilaConfianza } from './componentes'

/** Viajero con su nombre y calificación arriba y el pase de su viaje debajo
 *  (`viajes/disponibles` no trae el número de vuelo). */
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
        detalles={[<TicketDetail key="f" etiqueta="Viaja el" valor={Fmt.fecha(v.fechaViaje, { corta: true })} />]}
      />
    </div>
  )
}

/** "Buscar viajeros" (desde Vista rápida): quién viaja por tu ruta completa, con nombre y
 *  calificación (`GET /api/viajes/disponibles`, docs/11 §2C). La ruta va en la URL
 *  (`?origen=&destino=`) para poder volver o compartir la búsqueda. */
export function BuscarViajeros() {
  const [params, setParams] = useSearchParams()
  const origen = params.get('origen')
  const destino = params.get('destino')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const viajeros = useViajerosEnRuta(origen, destino)
  const cambiar = (o: string | null, d: string | null) =>
    setParams({ ...(o ? { origen: o } : {}), ...(d ? { destino: d } : {}) }, { replace: true })
  const ruta = `${origen} → ${destino}`

  let resultados
  if (!origen || !destino) {
    resultados = (
      <Vacio
        titulo="Encuentra quién viaja"
        icono={Earth}
        texto="Elige de dónde a dónde envías para ver los viajeros de esa ruta y sus calificaciones."
      />
    )
  } else if (viajeros.isError) {
    resultados = <ErrorCarga mensaje={mensajeDe(viajeros.error, 'No pudimos buscar viajeros.')} alReintentar={() => void viajeros.refetch()} />
  } else if (!viajeros.data) {
    resultados = <EsqueletoLista cantidad={2} alto={200} />
  } else if (viajeros.data.length === 0) {
    resultados = (
      <Vacio
        titulo={`Nadie viaja ${ruta} por ahora`}
        icono={PlaneTakeoff}
        texto="Publica tu encomienda igual: los viajeros que registren un vuelo en esa ruta la verán."
        accion={
          <Boton icono={Plus} onClick={() => navigate(Rutas.nuevaEncomienda)}>
            Publicar encomienda
          </Boton>
        }
      />
    )
  } else {
    resultados = viajeros.data.map((v, i) => <TarjetaViajero key={v.viajeroUid ?? i} v={v} />)
  }

  return (
    <Pantalla
      titulo="Buscar viajeros"
      atras="Inicio"
      subtitulo="Mira quién viaja por tu ruta y cómo lo califican."
      alActualizar={
        origen && destino ? () => qc.invalidateQueries({ queryKey: Claves.viajeros(origen, destino) }) : undefined
      }
      cabecera={
        <div className="px-4">
          <CampoCiudad
            etiqueta="¿Desde dónde envías?"
            valor={origen ?? ''}
            alCambiar={(c) => cambiar(c, destino)}
            pista="Elige la ciudad de origen"
            icono={CircleDot}
          />
          <div className="flex justify-end">
            <BotonIcono icono={ArrowUpDown} etiqueta="Intercambiar origen y destino" borde={false} onClick={() => cambiar(destino, origen)} />
          </div>
          <CampoCiudad
            etiqueta="¿A dónde?"
            valor={destino ?? ''}
            alCambiar={(c) => cambiar(origen, c)}
            pista="Elige la ciudad de destino"
            icono={MapPin}
          />
        </div>
      }
    >
      {resultados}
    </Pantalla>
  )
}
