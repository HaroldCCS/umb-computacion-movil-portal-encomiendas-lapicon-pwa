import { useQueryClient } from '@tanstack/react-query'
import { CircleCheck, Clock, Earth, Headset, Luggage, Package, Plus, Star } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCalificadas, useSesion } from '../../app/contexto'
import { Bloques, ErrorCarga, EsqueletoLista, Vacio } from '../../core/componentes/Aviso'
import { Boton } from '../../core/componentes/Boton'
import { EncabezadoApp } from '../../core/componentes/Marca'
import { IndicadorActualizar, Seccion, useJalarParaActualizar } from '../../core/componentes/Pantalla'
import { GrillaMosaicos, Mosaico, TarjetaAccion } from '../../core/componentes/Tarjeta'
import { SubTarjetaVidrio, TarjetaHero } from '../../core/componentes/TarjetaHero'
import { conAccion, Rutas } from '../../core/rutas'
import { mensajeDe } from '../../core/useAccion'
import { Claves, useMisEncomiendas } from '../../datos/consultas'
import type { Encomienda } from '../../datos/modelos/encomienda'
import { Vocabulario } from '../../datos/modelos/rol'
import { nombreCompleto } from '../../datos/modelos/usuario'
import { resumenEnvios } from './logica'

/** Como mucho dos avisos sueltos; si hay más, uno que los resume. */
export const MAX_AVISOS = 2

/** Abre el detalle de un envío (con la acción resaltada si viene de un aviso). */
export function useAbrirEnvio() {
  const navigate = useNavigate()
  return (e: Encomienda, accion?: 'calificar') =>
    navigate(conAccion(Rutas.detalleEnvio(e.id), accion), { state: { encomienda: e } })
}

/**
 * Pestaña "Inicio" del remitente (docs/08 §8.4): tarjeta principal con los
 * envíos activos, avisos que llevan directo a la acción y "Vista rápida".
 */
export function InicioRemitente() {
  const s = useSesion()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const envios = useMisEncomiendas()
  const calificadas = useCalificadas()
  const abrir = useAbrirEnvio()
  const refrescar = () => qc.invalidateQueries({ queryKey: Claves.misEncomiendas(s.usuario?.uid ?? null) })
  const { distancia, actualizando } = useJalarParaActualizar(refrescar)

  useEffect(() => {
    document.title = 'Inicio · Lapticon'
  }, [])

  const irAEnvios = (pestana: 'activas' | 'entregadas') => navigate(`${Rutas.envios}?pestana=${pestana}`)

  let contenido
  if (envios.isError) {
    contenido = <ErrorCarga mensaje={mensajeDe(envios.error, 'No pudimos cargar tus envíos.')} alReintentar={() => void envios.refetch()} />
  } else if (!envios.data) {
    contenido = <EsqueletoLista primero={190} cantidad={2} alto={120} />
  } else {
    const lista = envios.data
    const r = resumenEnvios(lista, calificadas)
    const v = Vocabulario.remitente
    contenido = (
      <Bloques>
        {/* Sin ningún envío, la tarjeta en cero no aporta: basta la invitación. */}
        {lista.length > 0 && (
          <TarjetaHero
            rol="remitente"
            titulo={v.tituloHero}
            principal={r.activas}
            nota={r.nota}
            semantica={`${v.tituloHero}: ${r.activas}. ${r.nota}`}
            onClick={() => irAEnvios('activas')}
            subTarjetas={
              <>
                <SubTarjetaVidrio etiqueta="En camino" icono={Luggage} valor={r.enCamino} />
                <SubTarjetaVidrio etiqueta="Disponibles" icono={Clock} tono="vidrio-ambar" valor={r.disponibles} />
              </>
            }
          />
        )}
        {/* Avisos que empujan a la acción: abren el detalle con "Calificar" resaltado. */}
        {r.porCalificar.length <= MAX_AVISOS
          ? r.porCalificar.map((e) => (
              <TarjetaAccion
                key={e.id}
                titulo={`Tu encomienda a ${e.ciudadDestino} ya fue entregada`}
                texto={`Califica a ${e.viajeroNombre ?? 'quien la llevó'}: tu opinión ayuda a otros remitentes.`}
                onClick={() => abrir(e, 'calificar')}
              />
            ))
          : [
              <TarjetaAccion
                key="resumen"
                titulo={`Tienes ${r.porCalificar.length} entregas por calificar`}
                texto="Califica a quienes llevaron tus encomiendas."
                onClick={() => irAEnvios('entregadas')}
              />,
            ]}
        {lista.length === 0 && (
          <Vacio
            titulo="Aún no has enviado nada"
            icono={Package}
            texto="Publica tu primera encomienda y encuentra quién la lleve."
            accion={
              <Boton icono={Plus} onClick={() => navigate(Rutas.nuevaEncomienda)}>
                Publicar encomienda
              </Boton>
            }
          />
        )}
        <section>
          <Seccion>Vista rápida</Seccion>
          <GrillaMosaicos>
            {r.porCalificar.length > 0 && (
              <Mosaico
                icono={Star}
                tono="pastel-ambar"
                etiqueta="Por calificar"
                valor={r.porCalificar.length}
                onClick={() =>
                  r.porCalificar.length === 1 ? abrir(r.porCalificar[0]!, 'calificar') : irAEnvios('entregadas')
                }
              />
            )}
            <Mosaico
              icono={CircleCheck}
              tono="pastel-verde"
              etiqueta="Entregadas"
              valor={r.entregadas}
              onClick={() => irAEnvios('entregadas')}
            />
            <Mosaico
              icono={Earth}
              tono="pastel-azul"
              etiqueta="Buscar viajeros"
              valor="Por ciudad"
              onClick={() => navigate(Rutas.viajeros)}
            />
            <Mosaico
              icono={Headset}
              tono="pastel-violeta"
              etiqueta="Asistente"
              valor="Pregúntale"
              onClick={() => navigate(Rutas.asistente)}
            />
          </GrillaMosaicos>
        </section>
      </Bloques>
    )
  }

  return (
    <div className="min-h-dvh bg-fondo">
      <IndicadorActualizar distancia={distancia} actualizando={actualizando} />
      <div className="mx-auto max-w-app">
        <EncabezadoApp
          usuario={s.perfil ? nombreCompleto(s.perfil) : ''}
          rol="remitente"
          alTocarAvatar={() => navigate(Rutas.perfil)}
        />
        <main
          className="px-4 pt-3"
          style={{ paddingBottom: 'calc(var(--altura-tabbar) + var(--seguro-abajo) + 32px)' }}
        >
          {contenido}
        </main>
      </div>
    </div>
  )
}
