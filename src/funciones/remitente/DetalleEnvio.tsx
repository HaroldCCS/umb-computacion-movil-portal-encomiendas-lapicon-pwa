import { useQueryClient } from '@tanstack/react-query'
import { CircleMinus, MessageCircle, Package, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCalificadas, useRepos, useUid } from '../../app/contexto'
import { Aviso, ErrorCarga, EsqueletoLista, Vacio } from '../../core/componentes/Aviso'
import { Boton } from '../../core/componentes/Boton'
import { useHojas } from '../../core/componentes/Hoja'
import { Monto } from '../../core/componentes/Insignia'
import { AccionResaltada } from '../../core/componentes/Marca'
import { Pantalla } from '../../core/componentes/Pantalla'
import { Fila, Grupo } from '../../core/componentes/Tarjeta'
import { useToast } from '../../core/componentes/Toast'
import { Fmt } from '../../core/formato'
import { accionDeRuta, Rutas } from '../../core/rutas'
import { mensajeDe, useAccion } from '../../core/useAccion'
import { Claves } from '../../datos/consultas'
import { conEstado, type Encomienda } from '../../datos/modelos/encomienda'
import { esFinalizada } from '../../datos/modelos/estado'
import type { ArgsCalificar } from '../calificaciones/pantallas'
import type { ArgsChat } from '../chat/ChatPantalla'
import { FilaConfianza, LineaTiempo, TicketEnvio, useEncomiendaDeRuta, useNuevasTomadas } from './componentes'

/**
 * Detalle de una encomienda del remitente. La acción principal va fija abajo;
 * si se llega desde un aviso (`?accion=calificar`), se explica encima.
 */
export function DetalleEnvio() {
  const { id = '' } = useParams()
  const { encomienda, cargando, error, reintentar } = useEncomiendaDeRuta(id)

  if (encomienda) return <Detalle inicial={encomienda} />
  return (
    <Pantalla titulo="Tu envío" atras="Envíos">
      {cargando ? (
        <EsqueletoLista cantidad={2} />
      ) : error ? (
        <ErrorCarga mensaje={mensajeDe(error)} alReintentar={reintentar} />
      ) : (
        <Vacio titulo="No encontramos esta encomienda" icono={Package} texto="Puede que ya no esté en tus envíos." />
      )}
    </Pantalla>
  )
}

function Detalle({ inicial }: { inicial: Encomienda }) {
  const repos = useRepos()
  const uid = useUid()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()
  const { confirmar } = useHojas()
  const [params] = useSearchParams()
  const accion = accionDeRuta(params)
  const [cambiada, setCambiada] = useState<Encomienda | null>(null)
  const e = cambiada ?? inicial
  const calificada = useCalificadas().has(e.id)
  const { cargando, error, ejecutar } = useAccion()
  const { marcarVistas } = useNuevasTomadas()
  // Abrir el detalle cuenta como haber visto el aviso de "te la tomaron".
  useEffect(() => {
    if (e.estado === 'tomada') marcarVistas(e)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar de encomienda o de estado
  }, [e.id, e.estado])
  const quien = e.viajeroNombre ?? 'Un viajero'

  /** Irreversible: se confirma escribiendo RETIRAR. */
  const retirar = async () => {
    const ok = await confirmar({
      titulo: '¿Retirar la encomienda?',
      mensaje:
        'Los viajeros dejarán de verla y quedará en tu historial como vencida. Esta acción no se puede deshacer.',
      confirmarTexto: 'Sí, retirarla',
      destructivo: true,
      palabra: 'RETIRAR',
    })
    if (!ok) return
    void ejecutar(async () => {
      // El backend no tiene "cancelada": retirarla la deja vencida.
      const actualizada = await repos.encomiendas.cambiarEstado(e.id, 'vencida')
      setCambiada(actualizada && actualizada.id !== '' ? actualizada : conEstado(e, 'vencida'))
      void qc.invalidateQueries({ queryKey: Claves.misEncomiendas(uid) })
      toast('Encomienda retirada')
    })
  }

  const abrirChat = () => {
    if (!e.viajeroUid) return
    navigate(Rutas.chat(e.viajeroUid), { state: { otroNombre: e.viajeroNombre, encomienda: e } satisfies ArgsChat })
  }

  const calificar = () => {
    if (!e.viajeroUid) return
    navigate(Rutas.calificar, {
      state: {
        usuarioDestino: e.viajeroUid,
        rolDestino: 'viajero',
        nombreDestino: e.viajeroNombre,
        encomienda: e,
      } satisfies ArgsCalificar,
    })
  }

  let acciones = null
  if (e.estado === 'disponible') {
    acciones = (
      <Boton icono={CircleMinus} variante="peligro" cargando={cargando} textoCargando="Retirando…" onClick={() => void retirar()}>
        Retirar encomienda
      </Boton>
    )
  } else if (e.estado === 'tomada') {
    acciones = (
      <Boton icono={MessageCircle} onClick={e.viajeroUid ? abrirChat : null}>
        Abrir chat
      </Boton>
    )
  } else if (esFinalizada(e.estado)) {
    acciones = (
      <div className="flex flex-col gap-2">
        {calificada ? (
          <p className="text-center text-[15px] text-texto2">¡Gracias por calificar! Tu opinión ayuda a otros remitentes.</p>
        ) : (
          <Boton icono={Star} onClick={e.viajeroUid ? calificar : null}>
            Calificar al viajero
          </Boton>
        )}
        {e.viajeroUid && (
          <Boton icono={MessageCircle} variante="secundario" onClick={abrirChat}>
            Ver chat
          </Boton>
        )}
      </div>
    )
  }

  return (
    <Pantalla
      titulo="Tu envío"
      atras="Envíos"
      pie={
        acciones && (
          <AccionResaltada
            activa={accion === 'calificar' && esFinalizada(e.estado) && !calificada}
            aviso={`Califica a ${e.viajeroNombre ?? 'quien la llevó'}: tu opinión ayuda a otros remitentes.`}
          >
            {error && (
              <div className="mb-3">
                <Aviso tipo="error">{error}</Aviso>
              </div>
            )}
            {acciones}
          </AccionResaltada>
        )
      }
    >
      <TicketEnvio e={e} />
      {/* Con viajero: lo primero que se ve es quién la lleva (docs/11 §2G). */}
      {e.estado === 'tomada' && e.viajeroUid && (
        <Grupo titulo="Quién la lleva">
          <div className="flex flex-col gap-3 p-4">
            <FilaConfianza uid={e.viajeroUid} nombre={e.viajeroNombre} />
            <Boton chico ancho={false} variante="tonal" icono={MessageCircle} onClick={abrirChat}>
              Escribirle
            </Boton>
          </div>
        </Grupo>
      )}
      <Grupo
        titulo="Estado"
        pie={
          e.estado === 'disponible'
            ? 'Cuando un viajero de tu ruta la tome, te avisaremos aquí y podrán coordinar por chat.'
            : e.estado === 'tomada'
              ? `${quien} aceptó llevarla. Coordinen por chat dónde y cuándo se la entregas.`
              : null
        }
      >
        <div className="px-4 pt-4">
          <LineaTiempo estado={e.estado} calificada={calificada} />
        </div>
      </Grupo>
      <Grupo titulo="Detalles">
        <Fila etiqueta="Pago al viajero" valor={<Monto valor={e.valor} moneda={e.moneda} />} extra="Lo que ofreciste por llevarla." />
        <Fila etiqueta="Publicada" valor={Fmt.fecha(e.creadaEn)} />
        {e.fechaVencimiento && <Fila etiqueta="Fecha límite" valor={Fmt.fecha(e.fechaVencimiento)} extra="Después deja de verse." />}
      </Grupo>
      <Grupo titulo="Qué envías">
        <p className="p-4 text-[17px] leading-[1.4] text-texto">{e.observaciones || 'Sin descripción'}</p>
      </Grupo>
      {e.viajeroUid && e.estado !== 'tomada' && (
        <Grupo titulo="Quién la llevó">
          <div className="p-4">
            <FilaConfianza uid={e.viajeroUid} nombre={e.viajeroNombre} />
          </div>
        </Grupo>
      )}
    </Pantalla>
  )
}
