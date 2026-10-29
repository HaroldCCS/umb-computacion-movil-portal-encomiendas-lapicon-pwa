import { Check, Clock, Hand, MessagesSquare } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useRepos, useSesion } from '../../app/contexto'
import { Aviso, ErrorCarga, Vacio } from '../../core/componentes/Aviso'
import { Spinner } from '../../core/componentes/Boton'
import { Avatar, InsigniaEncomienda } from '../../core/componentes/Insignia'
import { BarraSuperior, BotonAtras, Pantalla } from '../../core/componentes/Pantalla'
import { RouteTicket } from '../../core/componentes/RouteTicket'
import { Fmt } from '../../core/formato'
import { RedError } from '../../core/red/errores'
import { Rutas } from '../../core/rutas'
import type { Encomienda } from '../../datos/modelos/encomienda'
import { nombreCompleto } from '../../datos/modelos/usuario'
import { idChat } from '../../datos/repositorios'
import { Compositor, formaBurbuja, ListaMensajes, PantallaConversacion, SeparadorDia } from './componentes'
import { useMensajes, useServicioChat } from './hooks'
import { agruparPorDia, type MensajeChat } from './modelos'
import { mensajeErrorChat } from './servicio'

/** Lo que llega al abrir el chat (equivale a `ChatArgs`). El otro uid va en la URL. */
export interface ArgsChat {
  otroNombre?: string | null
  encomienda?: Encomienda
}

function Burbuja({ m, propia, nombreOtro }: { m: MensajeChat; propia: boolean; nombreOtro: string }) {
  const hora = m.pendiente ? 'Enviando…' : Fmt.hora(m.fecha)
  return (
    <div className={`flex py-[3px] ${propia ? 'justify-end' : 'justify-start'}`}>
      <div
        role="group"
        aria-label={`${propia ? 'Tú' : nombreOtro}: ${m.texto}. ${hora}`}
        className={`max-w-[78%] px-3.5 pb-2 pt-2.5 ${formaBurbuja(propia)} ${
          propia ? 'bg-marca-solido text-sobre-marca' : 'tarjeta bg-superficie text-texto'
        }`}
      >
        <p aria-hidden className="whitespace-pre-wrap break-words text-[17px] leading-[1.35]">
          {m.texto}
        </p>
        <p aria-hidden className={`cifras mt-0.5 flex items-center justify-end gap-1 text-xs ${propia ? 'text-sobre-marca/85' : 'text-texto2'}`}>
          {hora}
          {propia && (m.pendiente ? <Clock size={14} /> : <Check size={14} />)}
        </p>
      </div>
    </div>
  )
}

/** Conversación remitente–viajero en tiempo real (Práctica 5). */
export default function ChatPantalla() {
  const { otroUid = '' } = useParams()
  const { state } = useLocation() as { state: ArgsChat | null }
  const s = useSesion()
  const repos = useRepos()
  const servicio = useServicioChat()
  const miUid = s.usuario?.uid ?? null
  const chatId = miUid && otroUid ? idChat(miUid, otroUid) : null
  const mensajes = useMensajes(servicio, chatId)
  const estado = useQuery({
    queryKey: ['chat-estado', chatId],
    queryFn: () => repos.chats.detalleEstado(chatId!),
    enabled: chatId !== null,
  })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cerradoAlEnviar, setCerradoAlEnviar] = useState(false)

  const nombreOtro = state?.otroNombre?.trim() || 'Chat'
  const encomienda = state?.encomienda
  const cerrado = cerradoAlEnviar || estado.data?.estado === 'cerrado'
  const fechaCierre = estado.data?.fechaCierre ?? null

  if (!miUid || !otroUid) {
    return (
      <Pantalla titulo="Chat" atras>
        <Vacio
          titulo="No encontramos esta conversación"
          icono={MessagesSquare}
          texto="Abre el chat desde una encomienda o desde la pestaña Chats."
        />
      </Pantalla>
    )
  }

  const enviar = async (texto: string): Promise<boolean> => {
    if (!servicio || !chatId) return false
    setEnviando(true)
    setError(null)
    try {
      // Reto 4: verificar que el chat siga abierto antes de cada envío.
      try {
        if ((await repos.chats.estado(chatId)) === 'cerrado') {
          setCerradoAlEnviar(true)
          return false
        }
      } catch (e) {
        if (e instanceof RedError) {
          setError(e.message)
          return false
        }
        // Si el backend no reconoce el chat, se permite enviar.
      }
      const escritura = servicio.enviar({
        chatId,
        emisorUid: miUid,
        receptorUid: otroUid,
        texto,
        nombreEmisor: s.perfil ? nombreCompleto(s.perfil) : null,
        nombreReceptor: state?.otroNombre ?? null,
        encomiendaId: encomienda?.id ?? null,
        ruta: encomienda ? `${encomienda.ciudadOrigen} → ${encomienda.ciudadDestino}` : null,
      })
      // Sin conexión Firestore deja el mensaje en cola y lo envía después:
      // no se bloquea la pantalla esperando al servidor.
      await Promise.race([escritura, new Promise((r) => setTimeout(r, 8000))])
      escritura.catch(() => {})
      return true
    } catch (e) {
      setError(mensajeErrorChat(e))
      return false
    } finally {
      setEnviando(false)
    }
  }

  return (
    <PantallaConversacion
      barra={
        <BarraSuperior
          conLinea
          izquierda={<BotonAtras respaldo={Rutas.chats} />}
          centro={
            <span className="flex items-center gap-2">
              <Avatar nombre={nombreOtro} tam={32} />
              <span className="flex min-w-0 flex-col text-left">
                <span className="truncate text-base font-semibold text-texto">{nombreOtro}</span>
                <span className="text-xs text-texto2">{cerrado ? 'Chat cerrado' : 'Coordinen la entrega aquí'}</span>
              </span>
            </span>
          }
        />
      }
    >
      {encomienda && (
        <div className="px-4 pb-1 pt-2">
          <RouteTicket
            origen={encomienda.ciudadOrigen}
            destino={encomienda.ciudadDestino}
            compacto
            extremo={
              <InsigniaEncomienda estado={encomienda.estado} rol={encomienda.viajeroUid === miUid ? 'viajero' : 'remitente'} />
            }
          />
        </div>
      )}
      {mensajes.error ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ErrorCarga mensaje={mensajeErrorChat(mensajes.error)} alReintentar={mensajes.reintentar} />
        </div>
      ) : mensajes.cargando || !mensajes.datos ? (
        <div role="status" aria-label="Cargando mensajes" className="grid flex-1 place-items-center text-marca">
          <Spinner tam={28} />
        </div>
      ) : mensajes.datos.length === 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <Vacio
            titulo={`Saluda a ${nombreOtro}`}
            icono={Hand}
            texto="Acuerden dónde y cuándo entregar el paquete. Revisen juntos el contenido antes del viaje."
          />
        </div>
      ) : (
        <ListaMensajes cambio={mensajes.datos.length}>
          {agruparPorDia(mensajes.datos).map((it) =>
            it.tipo === 'dia' ? (
              <SeparadorDia key={`d${it.dia.getTime()}`} etiqueta={it.etiqueta} />
            ) : (
              <Burbuja key={it.mensaje.id} m={it.mensaje} propia={it.mensaje.emisorUid === miUid} nombreOtro={nombreOtro} />
            ),
          )}
        </ListaMensajes>
      )}
      {error && (
        <div className="px-4 pb-2">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}
      <Compositor
        cerrado={cerrado}
        enviando={enviando}
        alEnviar={enviar}
        textoCerrado={
          fechaCierre
            ? `Este chat se cerró el ${Fmt.fecha(fechaCierre)}, cuando la encomienda se marcó como entregada.`
            : undefined
        }
      />
    </PantallaConversacion>
  )
}
