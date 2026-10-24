import { useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useRepos, useUid } from '../../app/contexto'
import { Aviso, ErrorCarga, EsqueletoLista, Vacio } from '../../core/componentes/Aviso'
import { Boton, presionable } from '../../core/componentes/Boton'
import { Campo, ChipsMultiples } from '../../core/componentes/Campo'
import { Avatar, Estrellas, Progreso } from '../../core/componentes/Insignia'
import { Pantalla, useVolver } from '../../core/componentes/Pantalla'
import { RouteTicket } from '../../core/componentes/RouteTicket'
import { Grupo, Tarjeta } from '../../core/componentes/Tarjeta'
import { useToast } from '../../core/componentes/Toast'
import { Fmt } from '../../core/formato'
import { Rutas } from '../../core/rutas'
import { mensajeDe, useAccion } from '../../core/useAccion'
import { Claves, useResumenCalificaciones } from '../../datos/consultas'
import { Local } from '../../datos/local'
import {
  componerComentario,
  distribucion,
  etiquetaPuntaje,
  sugerenciasPara,
  type ResumenCalificaciones,
} from '../../datos/modelos/calificaciones'
import type { Encomienda } from '../../datos/modelos/encomienda'
import { opuesto, Vocabulario, type Rol } from '../../datos/modelos/rol'

/** Lo que llega al calificar (equivale a `CalificarArgs`). */
export interface ArgsCalificar {
  usuarioDestino: string
  /** Rol de la persona calificada (el remitente califica al `viajero`). */
  rolDestino: Rol
  nombreDestino?: string | null
  encomienda?: Encomienda
}

const MAX_COMENTARIO = 300

/** 5 estrellas grandes (≥ 48 px): grupo de opciones, con flechas del teclado. */
export function EntradaEstrellas({ valor, alCambiar }: { valor: number; alCambiar: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center">
      <div
        role="radiogroup"
        aria-label="Calificación"
        className="flex"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') alCambiar(Math.min(5, valor + 1))
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') alCambiar(Math.max(1, valor - 1))
        }}
      >
        {[1, 2, 3, 4, 5].map((i) => {
          const llena = i <= valor
          const p = presionable(0.9)
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={i === valor}
              aria-label={`${i} de 5 estrellas`}
              tabIndex={i === (valor || 1) ? 0 : -1}
              onClick={() => alCambiar(i)}
              className={`${p.className} grid size-14 place-items-center`}
              style={p.style}
            >
              <Star
                aria-hidden
                size={44}
                strokeWidth={1.5}
                fill={llena ? 'currentColor' : 'none'}
                className={`transition-transform duration-200 ${llena ? 'scale-110 text-pastel-ambar' : 'text-texto3'}`}
              />
            </button>
          )
        })}
      </div>
      <p aria-live="polite" className={`mt-2 ${valor === 0 ? 'text-[15px] text-texto2' : 'text-[17px] font-semibold text-texto'}`}>
        {valor === 0 ? 'Toca una estrella' : etiquetaPuntaje(valor)}
      </p>
    </div>
  )
}

/** Calificar → `POST /api/ratings`. Recuerda en el dispositivo qué entrega se calificó. */
export function CalificarPantalla() {
  const { state } = useLocation() as { state: ArgsCalificar | null }
  const repos = useRepos()
  const uid = useUid()
  const qc = useQueryClient()
  const toast = useToast()
  const volver = useVolver(Rutas.inicio)
  const [puntaje, setPuntaje] = useState(0)
  const [sugerencias, setSugerencias] = useState<Set<string>>(new Set())
  const [comentario, setComentario] = useState('')
  const { cargando, error, ejecutar } = useAccion()

  if (!state?.usuarioDestino) {
    return (
      <Pantalla titulo="Calificar" atras>
        <Vacio
          titulo="No pudimos abrir la calificación"
          icono={Star}
          texto="Vuelve al detalle de la encomienda e inténtalo de nuevo."
        />
      </Pantalla>
    )
  }
  const args = state
  const nombre = args.nombreDestino?.trim() || Vocabulario[opuesto(args.rolDestino)].laContraparte

  const cambiarPuntaje = (p: number) => {
    // Las sugerencias positivas y negativas no se mezclan.
    if (p >= 4 !== puntaje >= 4) setSugerencias(new Set())
    setPuntaje(p)
  }

  const enviar = () =>
    void ejecutar(async () => {
      await repos.calificaciones.calificar({
        usuarioDestino: args.usuarioDestino,
        rolDestino: args.rolDestino,
        calificacion: puntaje,
        comentario: componerComentario(sugerencias, comentario, MAX_COMENTARIO),
        encomiendaId: args.encomienda?.id,
      })
      void qc.invalidateQueries({ queryKey: Claves.calificaciones(args.usuarioDestino) })
      if (uid && args.encomienda?.id) Local.marcarCalificada(uid, args.encomienda.id)
      toast('¡Gracias por calificar!')
      volver()
    })

  return (
    <Pantalla titulo="Calificar" atras>
      <div className="flex flex-col">
        <div className="flex justify-center">
          <Avatar nombre={nombre} tam={72} />
        </div>
        <h2 className="mt-4 text-center text-xl font-bold text-texto">¿Cómo te fue con {nombre}?</h2>
        <p className="mt-2 text-center text-[15px] text-texto2">
          Tu calificación ayuda a otras personas a confiar en la comunidad.
        </p>
        {args.encomienda && (
          <div aria-hidden className="mt-5">
            <RouteTicket origen={args.encomienda.ciudadOrigen} destino={args.encomienda.ciudadDestino} compacto />
          </div>
        )}
        <div className="mt-6">
          <EntradaEstrellas valor={puntaje} alCambiar={cambiarPuntaje} />
        </div>
        {puntaje > 0 && (
          <div className="mt-4">
            <ChipsMultiples
              opciones={sugerenciasPara(puntaje)}
              seleccionadas={sugerencias}
              alCambiar={(o) =>
                setSugerencias((s) => {
                  const n = new Set(s)
                  if (!n.delete(o)) n.add(o)
                  return n
                })
              }
            />
          </div>
        )}
        <div className="mt-6">
          <Campo
            etiqueta="Comentario (opcional)"
            valor={comentario}
            alCambiar={setComentario}
            pista="Cuéntanos cómo fue la entrega"
            mayusculas="sentences"
            lineas={3}
            maxLength={MAX_COMENTARIO}
            checkValido={false}
          />
        </div>
        <div className="mt-6 flex flex-col gap-3">
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Boton cargando={cargando} textoCargando="Enviando…" onClick={puntaje === 0 ? null : enviar}>
            Enviar calificación
          </Boton>
          {puntaje === 0 && <p className="text-center text-[13px] text-texto2">Elige de 1 a 5 estrellas para poder enviar.</p>}
        </div>
      </div>
    </Pantalla>
  )
}

function Resumen({ r }: { r: ResumenCalificaciones }) {
  const promedio = r.promedio ?? 0
  const conteo = distribucion(r.calificaciones)
  const maximo = Math.max(0, ...conteo.slice(1))
  return (
    <div className="flex items-center gap-5">
      <div className="flex flex-col items-center">
        <span className="display cifras text-[48px] leading-none text-texto">{Fmt.decimal(promedio)}</span>
        <span className="mt-1">
          <Estrellas valor={promedio} />
        </span>
        <span className="mt-1 text-[13px] text-texto2">
          {r.total} {r.total === 1 ? 'calificación' : 'calificaciones'}
        </span>
      </div>
      <ul className="flex flex-1 flex-col gap-1.5">
        {[5, 4, 3, 2, 1].map((e) => (
          <li
            key={e}
            aria-label={`${e} estrellas: ${conteo[e]} ${conteo[e] === 1 ? 'calificación' : 'calificaciones'}`}
            className="flex items-center gap-2"
          >
            <span aria-hidden className="flex w-7 items-center text-[13px] text-texto2">
              {e}
              <Star size={12} fill="currentColor" className="text-pastel-ambar" />
            </span>
            <span aria-hidden className="flex-1">
              <Progreso valor={maximo === 0 ? 0 : conteo[e]! / maximo} alto={8} claseBarra="bg-pastel-ambar" />
            </span>
            <span aria-hidden className="cifras w-6 text-right text-[13px] text-texto2">
              {conteo[e]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Reseñas recibidas por un usuario (`GET /api/ratings/:uid`, pública). */
export function ResenasPantalla() {
  const { uid = '' } = useParams()
  const { state } = useLocation() as { state: { nombre?: string } | null }
  const qc = useQueryClient()
  const resumen = useResumenCalificaciones(uid)
  const titulo = state?.nombre ? `Calificaciones de ${state.nombre}` : 'Calificaciones'
  const r = resumen.data
  return (
    <Pantalla
      titulo={titulo}
      atras="Perfil"
      alActualizar={() => qc.invalidateQueries({ queryKey: Claves.calificaciones(uid) })}
    >
      {resumen.isError ? (
        <ErrorCarga mensaje={mensajeDe(resumen.error, 'No pudimos cargar las calificaciones.')} alReintentar={() => void resumen.refetch()} />
      ) : !r ? (
        <EsqueletoLista primero={150} cantidad={3} alto={80} />
      ) : r.total === 0 ? (
        <Vacio titulo="Aún no hay calificaciones" icono={Star} texto="Aparecerán aquí después de la primera entrega." />
      ) : (
        [
          <Tarjeta key="r">
            <Resumen r={r} />
          </Tarjeta>,
          <Grupo key="l" titulo="Reseñas">
            {r.calificaciones.map((c, i) => {
              const fecha = Fmt.relativo(c.fecha)
              return (
                <div key={i} className="p-4">
                  <div className="flex items-center justify-between">
                    <Estrellas valor={c.calificacion} />
                    {fecha && <span className="text-[13px] text-texto2">{fecha}</span>}
                  </div>
                  <p className={`mt-1.5 leading-[1.35] ${c.comentario ? 'text-[17px] text-texto' : 'text-[15px] italic text-texto2'}`}>
                    {c.comentario || 'Sin comentario.'}
                  </p>
                </div>
              )
            })}
          </Grupo>,
        ]
      )}
    </Pantalla>
  )
}
