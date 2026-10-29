import { CalendarX, Circle, CircleCheck, CircleDot, MessageCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLocal, useUid } from '../../app/contexto'
import { Aviso } from '../../core/componentes/Aviso'
import { Boton } from '../../core/componentes/Boton'
import { Avatar, InsigniaEncomienda } from '../../core/componentes/Insignia'
import { RouteTicket, TicketDetail } from '../../core/componentes/RouteTicket'
import { Fmt } from '../../core/formato'
import { Rutas } from '../../core/rutas'
import { useMisEncomiendas, useResumenCalificaciones } from '../../datos/consultas'
import { Local } from '../../datos/local'
import type { Encomienda } from '../../datos/modelos/encomienda'
import { ETIQUETA_ENCOMIENDA, type EstadoEncomienda } from '../../datos/modelos/estado'
import type { ArgsChat } from '../chat/ChatPantalla'
import { actualizarVistos, nuevasTomadas, PASOS_ENCOMIENDA, pasoActual } from './logica'

/** Tarjeta-pase de una encomienda del remitente (FECHA · VALOR · estado). */
export function TicketEnvio({ e, onClick, compacto }: { e: Encomienda; onClick?: () => void; compacto?: boolean }) {
  const vence = e.fechaVencimiento
  return (
    <RouteTicket
      origen={e.ciudadOrigen || '—'}
      destino={e.ciudadDestino || '—'}
      compacto={compacto}
      // Ámbar oscuro (acento del remitente) para que el avión se vea en claro.
      acento="atencion"
      onClick={onClick}
      etiqueta={`Encomienda de ${e.ciudadOrigen} a ${e.ciudadDestino}, ${Fmt.dinero(e.valor, e.moneda)}, ${
        e.estado === 'tomada' ? (e.viajeroNombre ? `tomada por ${e.viajeroNombre}` : 'un viajero la tomó') : ETIQUETA_ENCOMIENDA[e.estado]
      }`}
      detalles={[
        <TicketDetail key="f" etiqueta={vence ? 'Vence' : 'Fecha'} valor={Fmt.fecha(vence ?? e.creadaEn, { corta: true })} />,
        <TicketDetail key="v" etiqueta="Valor" valor={Fmt.dinero(e.valor, e.moneda)} />,
      ]}
      extremo={<InsigniaEncomienda estado={e.estado} />}
    />
  )
}

/**
 * Encomiendas que un viajero tomó y el remitente aún no ha visto (docs/11 §2G), con la clave
 * local `remitente_estados_vistos_{uid}`. Al cargar la lista se guarda como visto todo lo demás.
 */
export function useNuevasTomadas() {
  const uid = useUid()
  useLocal()
  const envios = useMisEncomiendas()
  const lista = envios.data
  const nuevas = uid && lista ? nuevasTomadas(lista, Local.estadosVistos(uid)) : []
  useEffect(() => {
    if (uid && lista) Local.guardarEstadosVistos(uid, actualizarVistos(lista, Local.estadosVistos(uid)))
  }, [uid, lista])
  const marcarVistas = (...vistas: Encomienda[]) => {
    if (!uid) return
    const mapa = { ...(Local.estadosVistos(uid) ?? {}) }
    for (const e of vistas) mapa[e.id] = e.estado
    Local.guardarEstadosVistos(uid, mapa)
  }
  return { nuevas, marcarVistas }
}

/** "¡Un viajero tomó tu encomienda…!": va arriba en Inicio y Envíos hasta que se ve. */
export function AvisoTomada({ e, alVer }: { e: Encomienda; alVer: (e: Encomienda) => void }) {
  const navigate = useNavigate()
  const quien = e.viajeroNombre ?? 'Un viajero'
  const escribir = () => {
    alVer(e)
    navigate(Rutas.chat(e.viajeroUid!), { state: { otroNombre: e.viajeroNombre, encomienda: e } satisfies ArgsChat })
  }
  return (
    <Aviso
      tipo="exito"
      titulo={`¡${quien} tomó tu encomienda ${e.ciudadOrigen} → ${e.ciudadDestino}!`}
      accion={
        <>
          <Boton chico ancho={false} icono={MessageCircle} onClick={e.viajeroUid ? escribir : null}>
            Escribirle
          </Boton>
          <Boton
            chico
            ancho={false}
            variante="secundario"
            onClick={() => navigate(Rutas.detalleEnvio(e.id), { state: { encomienda: e } })}
          >
            Ver envío
          </Boton>
          <Boton chico ancho={false} variante="secundario" onClick={() => alVer(e)}>
            Entendido
          </Boton>
        </>
      }
    >
      Coordinen por chat dónde y cuándo se la entregas.
    </Aviso>
  )
}

/** Hasta dos avisos sueltos; con más, uno que los resume. */
export function AvisosTomadas() {
  const navigate = useNavigate()
  const { nuevas, marcarVistas } = useNuevasTomadas()
  if (nuevas.length === 0) return null
  if (nuevas.length <= 2) return <>{nuevas.map((e) => <AvisoTomada key={e.id} e={e} alVer={marcarVistas} />)}</>
  return (
    <Aviso
      tipo="exito"
      titulo={`¡Viajeros tomaron ${nuevas.length} de tus encomiendas!`}
      accion={
        <>
          <Boton chico ancho={false} onClick={() => navigate(Rutas.envios)}>
            Ver envíos
          </Boton>
          <Boton chico ancho={false} variante="secundario" onClick={() => marcarVistas(...nuevas)}>
            Entendido
          </Boton>
        </>
      }
    >
      Escríbeles por chat para coordinar la entrega.
    </Aviso>
  )
}

/** Línea de tiempo: Publicada → Tomada por un viajero → Entregada → Calificada. */
export function LineaTiempo({ estado, calificada }: { estado: EstadoEncomienda; calificada: boolean }) {
  const actual = pasoActual(estado, calificada)
  if (actual === null) {
    return (
      <p className="flex items-center gap-3 text-[17px] text-texto">
        <CalendarX aria-hidden className="shrink-0 text-texto2" />
        <span>
          <span className="solo-lector">Estado final: {ETIQUETA_ENCOMIENDA[estado]}. </span>
          {estado === 'vencida'
            ? 'Ya no está publicada: venció o la retiraste.'
            : 'No conocemos el estado de esta encomienda.'}
        </span>
      </p>
    )
  }
  return (
    <ol className="flex flex-col">
      {PASOS_ENCOMIENDA.map((paso, i) => {
        const estadoPaso = i < actual ? 'completado' : i === actual ? 'paso actual' : 'pendiente'
        const Icono = i < actual ? CircleCheck : i === actual ? CircleDot : Circle
        return (
          <li key={paso} className="flex gap-3" aria-label={`${paso}: ${estadoPaso}`}>
            <span aria-hidden className="flex w-7 flex-col items-center">
              <Icono size={24} className={i <= actual ? 'text-exito' : 'text-separador'} />
              {i < PASOS_ENCOMIENDA.length - 1 && (
                <span className={`w-0.5 flex-1 ${i < actual ? 'bg-exito' : 'bg-separador'}`} />
              )}
            </span>
            <span
              aria-hidden
              className={`pb-4 ${i === actual ? 'text-[17px] font-semibold text-texto' : `text-[17px] ${i < actual ? 'text-texto' : 'text-texto2'}`}`}
            >
              {paso}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** Avatar · nombre · ★ promedio (total). */
export function FilaConfianza({
  uid,
  nombre,
  rol = 'Viajero',
  conRol = false,
  plural = 'reseñas',
}: {
  uid: string
  nombre: string | null
  rol?: string
  /** Muestra el rol en mayúsculas arriba del nombre (vista del viajero). */
  conRol?: boolean
  plural?: 'reseñas' | 'calificaciones'
}) {
  const resumen = useResumenCalificaciones(uid)
  const mostrado = nombre?.trim() || rol
  const r = resumen.data
  const singular = plural === 'reseñas' ? 'reseña' : 'calificación'
  const calificacion = resumen.isPending
    ? 'Cargando calificaciones…'
    : resumen.isError
      ? 'Calificaciones no disponibles'
      : r && r.total === 0
        ? 'Aún sin calificaciones'
        : `★ ${Fmt.decimal(r?.promedio ?? 0)} (${r?.total} ${r?.total === 1 ? singular : plural})`
  return (
    <div role="group" aria-label={`${rol}: ${mostrado}. ${calificacion}`} className="flex items-center gap-3">
      <Avatar nombre={mostrado} />
      <div aria-hidden className="min-w-0 flex-1">
        {conRol && <p className="text-[11px] font-semibold uppercase tracking-[1px] text-texto2">{rol}</p>}
        <p className="truncate text-[17px] font-semibold text-texto">{mostrado}</p>
        <p className="text-[15px] text-texto2">{calificacion}</p>
      </div>
    </div>
  )
}

/**
 * La encomienda del detalle: llega por el estado de la navegación; si se
 * recarga o se entra por un enlace, se busca en mis encomiendas (no existe
 * `GET /encomiendas/:id`, docs/10 §10.6).
 */
export function useEncomiendaDeRuta(id: string) {
  const { state } = useLocation() as { state: { encomienda?: Encomienda } | null }
  const mias = useMisEncomiendas()
  const desdeEstado = state?.encomienda?.id === id ? state.encomienda : undefined
  // La de la caché es la más fresca; la del estado sirve mientras carga.
  const encontrada = mias.data?.find((e) => e.id === id) ?? desdeEstado
  return {
    encomienda: encontrada ?? null,
    cargando: !encontrada && mias.isPending,
    error: !encontrada && mias.isError ? mias.error : null,
    reintentar: () => void mias.refetch(),
  }
}
