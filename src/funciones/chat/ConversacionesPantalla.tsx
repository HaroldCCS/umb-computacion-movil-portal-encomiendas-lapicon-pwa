import { MessagesSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUid } from '../../app/contexto'
import { ErrorCarga, EsqueletoLista, Vacio } from '../../core/componentes/Aviso'
import { presionable } from '../../core/componentes/Boton'
import { Avatar } from '../../core/componentes/Insignia'
import { Pantalla } from '../../core/componentes/Pantalla'
import { Grupo } from '../../core/componentes/Tarjeta'
import { Fmt } from '../../core/formato'
import { Rutas } from '../../core/rutas'
import type { ArgsChat } from './ChatPantalla'
import { useConversaciones, useServicioChat } from './hooks'
import { nombreDe, otroUid, type Conversacion } from './modelos'
import { mensajeErrorChat } from './servicio'

/** Fila: avatar, nombre, ruta, último mensaje y hora. */
function FilaConversacion({ c, miUid }: { c: Conversacion; miUid: string }) {
  const navigate = useNavigate()
  const otro = otroUid(c, miUid)
  const nombre = nombreDe(c, otro)
  const cuando = Fmt.relativo(c.actualizadoEn)
  const prefijo = c.ultimoEmisorUid === miUid ? 'Tú: ' : ''
  const p = presionable(0.99)
  return (
    <button
      type="button"
      disabled={!otro}
      onClick={() => otro && navigate(Rutas.chat(otro), { state: { otroNombre: nombre } satisfies ArgsChat })}
      className={`${p.className} flex w-full items-center gap-3 px-4 py-3 text-left`}
      style={p.style}
    >
      <Avatar nombre={nombre} tam={48} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="flex-1 truncate text-[17px] font-semibold text-texto">{nombre}</span>
          {cuando && <span className="shrink-0 text-[13px] text-texto2">{cuando}</span>}
        </span>
        {c.ruta && (
          <span className="block truncate text-[11px] font-semibold uppercase tracking-[1px] text-marca">{c.ruta}</span>
        )}
        <span className="block truncate text-[15px] text-texto2">
          {prefijo}
          {c.ultimoMensaje ?? 'Sin mensajes todavía'}
        </span>
      </span>
    </button>
  )
}

/** Pestaña "Chats": mis conversaciones en tiempo real (Práctica 5). */
export function ConversacionesPantalla() {
  const uid = useUid()
  const servicio = useServicioChat()
  const conv = useConversaciones(servicio, uid)
  return (
    <Pantalla titulo="Chats" conBarraPestanas>
      {!uid ? null : conv.error ? (
        <ErrorCarga mensaje={mensajeErrorChat(conv.error)} alReintentar={conv.reintentar} />
      ) : conv.cargando || !conv.datos ? (
        <EsqueletoLista cantidad={4} alto={72} />
      ) : conv.datos.length === 0 ? (
        <Vacio
          titulo="Aún no tienes conversaciones"
          icono={MessagesSquare}
          texto="Cuando una encomienda sea tomada podrán coordinar la entrega por aquí."
        />
      ) : (
        <Grupo>
          {conv.datos.map((c) => (
            <FilaConversacion key={c.id} c={c} miUid={uid} />
          ))}
        </Grupo>
      )}
    </Pantalla>
  )
}
