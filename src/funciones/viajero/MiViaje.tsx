import { BadgeCheck, Banknote, CircleHelp, Headset, Luggage, Plane, PlaneTakeoff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCalificadas, useLocal, useUid } from '../../app/contexto'
import { Aviso, ErrorCarga, Esqueleto, EsqueletoLista, Vacio } from '../../core/componentes/Aviso'
import { Boton, BotonIcono } from '../../core/componentes/Boton'
import { InsigniaViaje, Monto } from '../../core/componentes/Insignia'
import { Pantalla, Seccion } from '../../core/componentes/Pantalla'
import { Grupo, TarjetaAccion } from '../../core/componentes/Tarjeta'
import { EtiquetaVidrio, SubTarjetaVidrio, TarjetaHero } from '../../core/componentes/TarjetaHero'
import { Fmt } from '../../core/formato'
import { Rutas } from '../../core/rutas'
import { mensajeDe } from '../../core/useAccion'
import { useHistorialViajes, useMiViaje, useMisEntregas, useRefrescarViajero } from '../../datos/consultas'
import { Local } from '../../datos/local'
import type { Viaje } from '../../datos/modelos/viaje'
import { TicketEncomienda, useAbrirEncomiendaViajero } from './componentes'
import { gananciasPorMoneda, porCalificarViajero, porEntregar } from './logica'

const MAX_HISTORIAL = 5

/** Pestaña "Mi viaje" (docs/08 §8.4): el viaje activo, lo que falta por
 *  hacer, mis entregas e historial. */
export function MiViaje() {
  const navigate = useNavigate()
  const viaje = useMiViaje()
  const refrescar = useRefrescarViajero()

  return (
    <Pantalla
      titulo="Mi viaje"
      conBarraPestanas
      alActualizar={async () => {
        refrescar()
        await viaje.refetch()
      }}
      accion={<BotonIcono icono={Headset} etiqueta="Asistente" borde={false} onClick={() => navigate(Rutas.asistente)} />}
    >
      {viaje.isError ? (
        <ErrorCarga mensaje={mensajeDe(viaje.error, 'No pudimos cargar tu viaje.')} alReintentar={() => void viaje.refetch()} />
      ) : viaje.isPending ? (
        <EsqueletoLista primero={220} cantidad={2} alto={150} />
      ) : viaje.data ? (
        <ConViaje viaje={viaje.data} />
      ) : (
        [
          <Vacio
            key="vacio"
            titulo="Aún no tienes un viaje activo"
            icono={PlaneTakeoff}
            texto="Registra tu vuelo para ver encomiendas de tu ruta y ganar llevándolas."
            accion={
              <Boton icono={PlaneTakeoff} onClick={() => navigate(Rutas.registrarViaje)}>
                Registrar viaje
              </Boton>
            }
          />,
          <Historial key="historial" />,
        ]
      )}
    </Pantalla>
  )
}

function ConViaje({ viaje }: { viaje: Viaje }) {
  const uid = useUid()
  useLocal()
  const entregas = useMisEntregas()
  const calificadas = useCalificadas()
  const abrir = useAbrirEncomiendaViajero()
  const verificado = uid !== null && Local.vueloVerificado(uid, viaje.numeroVuelo, viaje.fechaViaje)
  const lista = entregas.data ?? []
  const pendientes = porEntregar(lista)
  const porCalificar = porCalificarViajero(lista, calificadas)
  const ganancias = gananciasPorMoneda(lista)
  const vuelo = viaje.numeroVuelo || 'Vuelo'
  const nota = `${vuelo} · ${Fmt.fecha(viaje.fechaViaje)}`
  // Si el vuelo no se pudo verificar, la tarjeta lo dice siempre.
  const etiquetaVuelo = verificado ? 'Vuelo verificado' : 'Sin verificar'
  const [moneda, total] = [...ganancias.entries()][0] ?? []

  return (
    <div className="flex flex-col gap-bloque">
      <TarjetaHero
        rol="viajero"
        titulo="Tu viaje"
        principal={
          <span className="block text-[30px] leading-[1.1]">
            {viaje.ciudadOrigen} → {viaje.ciudadDestino}
          </span>
        }
        nota={nota}
        semantica={`Tu viaje de ${viaje.ciudadOrigen} a ${viaje.ciudadDestino}. ${nota}. ${etiquetaVuelo}. Llevas ${pendientes.length} por entregar.`}
        insignia={<EtiquetaVidrio texto={etiquetaVuelo} icono={verificado ? BadgeCheck : CircleHelp} />}
        subTarjetas={
          <>
            <SubTarjetaVidrio etiqueta="Por entregar" icono={Luggage} valor={entregas.data ? pendientes.length : '…'} />
            <SubTarjetaVidrio
              etiqueta="Te pagan"
              icono={Banknote}
              tono="vidrio-ambar"
              valor={
                !entregas.data ? (
                  '…'
                ) : ganancias.size === 0 ? (
                  'Aún nada'
                ) : ganancias.size === 1 ? (
                  <Monto valor={total!} moneda={moneda!} />
                ) : (
                  `${ganancias.size} monedas`
                )
              }
            />
          </>
        }
      />
      {pendientes.length > 0 && (
        <TarjetaAccion
          icono={Luggage}
          titulo={
            pendientes.length === 1
              ? 'Tienes una encomienda por entregar'
              : `Tienes ${pendientes.length} encomiendas por entregar`
          }
          texto={
            pendientes.length === 1
              ? `Va a ${pendientes[0]!.ciudadDestino}. Márcala como entregada al dejarla.`
              : 'Márcalas como entregadas cuando las dejes en destino.'
          }
          onClick={() => abrir(pendientes[0]!, 'entregar')}
        />
      )}
      {porCalificar.slice(0, 2).map((e) => (
        <TarjetaAccion
          key={e.id}
          titulo={`Entregaste la encomienda a ${e.ciudadDestino}`}
          texto={`Califica a ${e.remitenteNombre ?? 'quien te la confió'}: tu opinión ayuda a otros viajeros.`}
          onClick={() => abrir(e, 'calificar')}
        />
      ))}
      <MisEntregas />
      <Historial />
    </div>
  )
}

function MisEntregas() {
  const navigate = useNavigate()
  const entregas = useMisEntregas()
  const abrir = useAbrirEncomiendaViajero()
  let cuerpo
  if (entregas.isError) {
    cuerpo = (
      <Aviso
        tipo="error"
        accion={
          <Boton chico ancho={false} variante="secundario" onClick={() => void entregas.refetch()}>
            Reintentar
          </Boton>
        }
      >
        {mensajeDe(entregas.error, 'No pudimos cargar tus entregas.')}
      </Aviso>
    )
  } else if (!entregas.data) {
    cuerpo = <EsqueletoLista cantidad={1} alto={150} />
  } else if (entregas.data.length === 0) {
    cuerpo = (
      <Aviso
        accion={
          <Boton chico ancho={false} variante="tonal" onClick={() => navigate(Rutas.explorar)}>
            Ir a Explorar
          </Boton>
        }
      >
        Aún no has tomado encomiendas. En Explorar ves las de tu ruta.
      </Aviso>
    )
  } else {
    cuerpo = (
      <div className="flex flex-col gap-3">
        {entregas.data.map((e) => (
          <TicketEncomienda key={e.id} e={e} onClick={() => abrir(e)} />
        ))}
      </div>
    )
  }
  return (
    <section>
      <Seccion>Mis entregas</Seccion>
      {cuerpo}
    </section>
  )
}

/** Últimos viajes en lista agrupada. Si no hay ninguno, no se muestra. */
function Historial() {
  const historial = useHistorialViajes()
  if (historial.isError) {
    return (
      <Aviso
        tipo="error"
        accion={
          <Boton chico ancho={false} variante="secundario" onClick={() => void historial.refetch()}>
            Reintentar
          </Boton>
        }
      >
        No pudimos cargar el historial de viajes.
      </Aviso>
    )
  }
  if (!historial.data) return <Esqueleto alto={120} radio={24} />
  if (historial.data.length === 0) return null
  return (
    <Grupo
      titulo="Historial de viajes"
      pie={historial.data.length > MAX_HISTORIAL ? `Se muestran tus últimos ${MAX_HISTORIAL} viajes.` : null}
    >
      {historial.data.slice(0, MAX_HISTORIAL).map((v) => (
        <div key={v.id} className="flex min-h-[52px] items-center gap-3 px-4 py-3">
          <Plane aria-hidden className="shrink-0 text-viajero" size={22} />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-texto">
              {v.ciudadOrigen} → {v.ciudadDestino}
            </p>
            <p className="text-[13px] text-texto2">
              {v.numeroVuelo || 'Vuelo'} · {Fmt.fecha(v.fechaViaje)}
            </p>
          </div>
          <InsigniaViaje estado={v.estado} />
        </div>
      ))}
    </Grupo>
  )
}
