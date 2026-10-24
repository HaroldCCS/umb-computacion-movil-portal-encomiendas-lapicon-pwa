import { Headset, RefreshCw } from 'lucide-react'
import { useReducer } from 'react'
import { useRepos, useSesion } from '../../app/contexto'
import { Vacio } from '../../core/componentes/Aviso'
import { Boton, BotonIcono, Spinner } from '../../core/componentes/Boton'
import { BarraSuperior, BotonAtras } from '../../core/componentes/Pantalla'
import { Rutas } from '../../core/rutas'
import { Compositor, formaBurbuja, ListaMensajes, PantallaConversacion } from '../chat/componentes'
import {
  esNueva,
  estadoInicial,
  mensajeErrorAsistente,
  reducirAsistente,
  sugerenciasAsistente,
  type MensajeAsistente,
} from './logica'

function Burbuja({ m, alReintentar }: { m: MensajeAsistente; alReintentar?: () => void }) {
  const propia = m.autor === 'usuario'
  const color = m.error
    ? 'bg-peligro-suave text-peligro'
    : propia
      ? 'bg-marca-solido text-sobre-marca'
      : 'tarjeta bg-superficie text-texto'
  return (
    <div className={`flex py-[3px] ${propia ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] px-3.5 py-2.5 ${formaBurbuja(propia)} ${color}`}>
        <span className="solo-lector">{propia ? 'Tú: ' : 'Asistente: '}</span>
        <p className="whitespace-pre-wrap break-words text-[17px] leading-[1.35]">{m.texto}</p>
        {alReintentar && (
          <div className="mt-2">
            <Boton icono={RefreshCw} chico ancho={false} variante="secundario" onClick={alReintentar}>
              Reintentar
            </Boton>
          </div>
        )}
      </div>
    </div>
  )
}

/** Chat con el asistente de IA (`POST /api/chatbot`). Hoy el backend responde
 *  500: el error se muestra en la propia burbuja con "Reintentar". */
export default function Asistente() {
  const repos = useRepos()
  const { rol } = useSesion()
  const [estado, despachar] = useReducer(reducirAsistente, undefined, estadoInicial)

  const pedir = async (pregunta: string) => {
    try {
      despachar({ tipo: 'respuesta', texto: await repos.chatbot.enviar(pregunta) })
    } catch (e) {
      despachar({ tipo: 'fallo', texto: mensajeErrorAsistente(e), pregunta })
    }
  }

  const enviar = (texto: string) => {
    if (texto.trim() === '' || estado.escribiendo) return
    despachar({ tipo: 'preguntar', texto })
    void pedir(texto.trim())
  }

  const reintentar = (m: MensajeAsistente) => {
    if (!m.reintentarCon || estado.escribiendo) return
    despachar({ tipo: 'reintentar', error: m })
    void pedir(m.reintentarCon)
  }

  return (
    <PantallaConversacion
      barra={
        <BarraSuperior
          conLinea
          izquierda={<BotonAtras respaldo={Rutas.inicio} />}
          centro={<span className="text-[17px] font-semibold text-texto">Asistente</span>}
          derecha={
            <BotonIcono
              icono={RefreshCw}
              etiqueta="Nueva conversación"
              borde={false}
              onClick={esNueva(estado) ? null : () => despachar({ tipo: 'reiniciar' })}
            />
          }
        />
      }
    >
      {esNueva(estado) && !estado.escribiendo ? (
        <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto p-4">
          <Vacio
            titulo="¿En qué te ayudo?"
            icono={Headset}
            texto="Pregúntame cómo publicar, viajar o qué puedes llevar."
            accion={
              <div className="flex flex-wrap justify-center gap-2">
                {sugerenciasAsistente(rol).map((s) => (
                  <Boton key={s} chico ancho={false} variante="tonal" onClick={() => enviar(s)}>
                    {s}
                  </Boton>
                ))}
              </div>
            }
          />
        </div>
      ) : (
        <ListaMensajes cambio={`${estado.mensajes.length}-${estado.escribiendo}`}>
          {estado.mensajes.map((m) => (
            <Burbuja key={m.id} m={m} alReintentar={m.error ? () => reintentar(m) : undefined} />
          ))}
          {estado.escribiendo && (
            <p role="status" className="flex items-center gap-2 py-2 text-[15px] text-texto2">
              <Spinner tam={16} className="text-marca" />
              Escribiendo…
            </p>
          )}
        </ListaMensajes>
      )}
      <p className="px-4 pb-1.5 text-center text-[13px] text-texto2">
        Respuestas generadas por IA; verifica la información importante.
      </p>
      <Compositor
        pista="Escribe tu pregunta…"
        enviando={estado.escribiendo}
        alEnviar={async (t) => {
          enviar(t)
          return true
        }}
      />
    </PantallaConversacion>
  )
}
