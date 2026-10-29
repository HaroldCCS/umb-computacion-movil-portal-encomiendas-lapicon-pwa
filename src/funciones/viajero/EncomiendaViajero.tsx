import { CircleCheck, Luggage, MessageCircle, Package, Star } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCalificadas, useLocal, useRepos, useUid } from '../../app/contexto'
import { Aviso, ErrorCarga, EsqueletoLista, Vacio } from '../../core/componentes/Aviso'
import { Boton } from '../../core/componentes/Boton'
import { useHojas } from '../../core/componentes/Hoja'
import { InsigniaEncomienda, Monto } from '../../core/componentes/Insignia'
import { AccionResaltada } from '../../core/componentes/Marca'
import { Pantalla } from '../../core/componentes/Pantalla'
import { RouteTicket, TicketDetail } from '../../core/componentes/RouteTicket'
import { Grupo } from '../../core/componentes/Tarjeta'
import { useToast } from '../../core/componentes/Toast'
import { Fmt } from '../../core/formato'
import { accionDeRuta, Rutas } from '../../core/rutas'
import { mensajeDe, useAccion } from '../../core/useAccion'
import { useDisponiblesEnMiRuta, useMisEntregas, useRefrescarViajero } from '../../datos/consultas'
import { Local } from '../../datos/local'
import { conEstado, type Encomienda } from '../../datos/modelos/encomienda'
import { esFinalizada } from '../../datos/modelos/estado'
import type { ArgsCalificar } from '../calificaciones/pantallas'
import type { ArgsChat } from '../chat/ChatPantalla'
import { FilaConfianza } from '../remitente/componentes'
import { conservarNombres, tomadaPorMi } from './logica'

/** La encomienda: por el estado de la navegación o, al recargar, en mis
 *  entregas y en las disponibles de mi ruta. */
function useEncomiendaViajero(id: string) {
  const { state } = useLocation() as { state: { encomienda?: Encomienda } | null }
  const entregas = useMisEntregas()
  const disponibles = useDisponiblesEnMiRuta()
  const desdeEstado = state?.encomienda?.id === id ? state.encomienda : undefined
  const encontrada =
    entregas.data?.find((e) => e.id === id) ?? desdeEstado ?? disponibles.data?.find((e) => e.id === id)
  const cargando = !encontrada && (entregas.isPending || disponibles.isPending)
  return { encontrada: encontrada ?? null, cargando, error: !encontrada && entregas.isError ? entregas.error : null, reintentar: () => void entregas.refetch() }
}

export function EncomiendaViajero() {
  const { id = '' } = useParams()
  const { encontrada, cargando, error, reintentar } = useEncomiendaViajero(id)
  if (encontrada) return <Detalle inicial={encontrada} />
  return (
    <Pantalla titulo="Encomienda" atras>
      {cargando ? (
        <EsqueletoLista cantidad={2} />
      ) : error ? (
        <ErrorCarga mensaje={mensajeDe(error)} alReintentar={reintentar} />
      ) : (
        <Vacio titulo="No encontramos esa encomienda" icono={Package} texto="Puede que ya no esté disponible en tu ruta." />
      )}
    </Pantalla>
  )
}

/** Detalle del viajero: tomarla, abrir el chat, entregarla y calificar. */
function Detalle({ inicial }: { inicial: Encomienda }) {
  const repos = useRepos()
  const uid = useUid()
  useLocal()
  const navigate = useNavigate()
  const toast = useToast()
  const refrescar = useRefrescarViajero()
  const { confirmar } = useHojas()
  const [params] = useSearchParams()
  const accion = accionDeRuta(params)
  const [cambiada, setCambiada] = useState<Encomienda | null>(null)
  const e = cambiada ?? inicial
  const { cargando, error, ejecutar } = useAccion()
  const calificadas = useCalificadas()

  const mia = tomadaPorMi(e, uid, uid ? Local.idsEntregas(uid) : new Set())
  const sinRemitente = e.remitenteUid === null
  const calificada = calificadas.has(e.id)
  const resaltar =
    accion === 'entregar'
      ? mia && e.estado === 'tomada'
      : accion === 'calificar'
        ? mia && esFinalizada(e.estado) && !calificada && !sinRemitente
        : false

  const guardarLocal = (x: Encomienda) => {
    if (uid) Local.guardarEntrega(uid, x)
  }

  const tomar = async () => {
    const ok = await confirmar({
      titulo: '¿Tomar esta encomienda?',
      mensaje: `Llevarás un paquete de ${e.ciudadOrigen} a ${e.ciudadDestino} y te pagarán ${Fmt.dinero(e.valor, e.moneda)}.`,
      detalle: (
        <Aviso titulo="Antes de aceptar" tipo="atencion">
          Revisa el contenido antes de aceptarlo. Eres responsable de lo que llevas en tu equipaje.
        </Aviso>
      ),
      confirmarTexto: 'Sí, tomarla',
      cancelarTexto: 'Cancelar',
    })
    if (!ok) return
    void ejecutar(async () => {
      const respuesta = await repos.encomiendas.tomar(e.id)
      const actualizada = respuesta && respuesta.id !== '' ? respuesta : conEstado(e, 'tomada', uid)
      // Queda marcada como mía aunque el backend no lo diga.
      const propia = actualizada.viajeroUid ? actualizada : conEstado(actualizada, actualizada.estado, uid)
      guardarLocal(propia)
      setCambiada(propia)
      refrescar()
      toast('¡Listo! La encomienda es tuya. Coordina la entrega por chat.')
    })
  }

  /** Irreversible (cierra el chat): se confirma escribiendo ENTREGAR. */
  const entregar = async () => {
    const ok = await confirmar({
      titulo: '¿Ya la entregaste?',
      mensaje:
        'Hazlo solo cuando el paquete ya esté en manos del destinatario. La entrega queda registrada, el chat se cierra y podrán calificarse.',
      confirmarTexto: 'Sí, ya la entregué',
      palabra: 'ENTREGAR',
    })
    if (!ok) return
    void ejecutar(async () => {
      const r = await repos.encomiendas.cambiarEstado(e.id, 'entregada')
      const actualizada = r && r.id !== '' && r.estado === 'entregada' ? conservarNombres(r, e) : conEstado(e, 'entregada')
      guardarLocal(actualizada)
      setCambiada(actualizada)
      refrescar()
      toast('Entrega registrada. Ahora califica al remitente.')
    })
  }

  const abrirChat = () => {
    if (!e.remitenteUid) return
    navigate(Rutas.chat(e.remitenteUid), { state: { otroNombre: e.remitenteNombre, encomienda: e } satisfies ArgsChat })
  }

  const calificar = () => {
    if (!e.remitenteUid) return
    navigate(Rutas.calificar, {
      state: {
        usuarioDestino: e.remitenteUid,
        rolDestino: 'remitente',
        nombreDestino: e.remitenteNombre,
        encomienda: e,
      } satisfies ArgsCalificar,
    })
  }

  const info = (t: string) => <Aviso>{t}</Aviso>
  let acciones
  if (e.estado === 'disponible' || e.estado === 'desconocido') {
    acciones = mia
      ? info('Ya tomaste esta encomienda.')
      : (
          <Boton icono={Luggage} cargando={cargando} textoCargando="Tomando…" onClick={() => void tomar()}>
            Tomar encomienda
          </Boton>
        )
  } else if (e.estado === 'tomada') {
    acciones = !mia ? (
      info('Otra persona ya tomó esta encomienda.')
    ) : (
      <div className="flex flex-col gap-2">
        <Boton icono={CircleCheck} cargando={cargando} textoCargando="Guardando…" onClick={() => void entregar()}>
          Marcar como entregada
        </Boton>
        <Boton icono={MessageCircle} variante="secundario" onClick={sinRemitente || cargando ? null : abrirChat}>
          Abrir chat con el remitente
        </Boton>
      </div>
    )
  } else if (esFinalizada(e.estado)) {
    acciones = !mia ? (
      info('Esta encomienda ya fue entregada.')
    ) : (
      <div className="flex flex-col gap-2">
        {calificada ? (
          info('¡Gracias por calificar! Tu opinión ayuda a otros viajeros.')
        ) : (
          <Boton icono={Star} onClick={sinRemitente ? null : calificar}>
            Calificar al remitente
          </Boton>
        )}
        <Boton icono={MessageCircle} variante="secundario" onClick={sinRemitente ? null : abrirChat}>
          Ver chat
        </Boton>
      </div>
    )
  } else {
    acciones = info('Esta encomienda ya no está publicada.')
  }

  return (
    <Pantalla
      titulo="Encomienda"
      atras
      pie={
        <AccionResaltada
          activa={resaltar}
          aviso={
            accion === 'entregar'
              ? 'Cuando la dejes en destino, márcala como entregada: así el remitente sabe que llegó.'
              : `Califica a ${e.remitenteNombre ?? 'quien te la confió'}: tu opinión ayuda a otros viajeros.`
          }
        >
          {error && (
            <div className="mb-3">
              <Aviso tipo="error">{error}</Aviso>
            </div>
          )}
          {acciones}
        </AccionResaltada>
      }
    >
      <RouteTicket
        origen={e.ciudadOrigen}
        destino={e.ciudadDestino}
        acento="viajero"
        detalles={e.fechaVencimiento ? [<TicketDetail key="v" etiqueta="Vence" valor={Fmt.fecha(e.fechaVencimiento)} />] : []}
        extremo={<InsigniaEncomienda estado={e.estado} />}
      />
      <Grupo titulo="Lo que te pagan">
        <p className="display p-4 text-[32px] text-texto">
          <Monto valor={e.valor} moneda={e.moneda} />
        </p>
      </Grupo>
      <Grupo titulo="Qué llevas">
        <p className="p-4 text-[17px] leading-[1.4] text-texto">{e.observaciones || 'El remitente no agregó detalles.'}</p>
      </Grupo>
      <Grupo titulo="Remitente">
        <div className="p-4">
          {sinRemitente ? (
            // Solo pasa con encomiendas guardadas antes de usar /buscar, que trae el uid.
            <p className="text-[15px] text-texto2">
              {e.remitenteNombre ? `La publicó ${e.remitenteNombre}.` : 'Remitente'}
            </p>
          ) : (
            <FilaConfianza uid={e.remitenteUid!} nombre={e.remitenteNombre} rol="Remitente" conRol plural="calificaciones" />
          )}
        </div>
      </Grupo>
    </Pantalla>
  )
}
