import { useQueryClient } from '@tanstack/react-query'
import { Package, Plus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCalificadas, useUid } from '../../app/contexto'
import { ErrorCarga, EsqueletoLista, Vacio } from '../../core/componentes/Aviso'
import { Boton } from '../../core/componentes/Boton'
import { Chips } from '../../core/componentes/Campo'
import { Pantalla } from '../../core/componentes/Pantalla'
import { Rutas } from '../../core/rutas'
import { mensajeDe } from '../../core/useAccion'
import { Claves, useMisEncomiendas } from '../../datos/consultas'
import { AvisosTomadas, TicketEnvio } from './componentes'
import { useAbrirEnvio } from './InicioRemitente'
import { agruparEnvios, parsePestana, PESTANAS_ENVIOS, resumenEnvios, TITULO_PESTANA, type PestanaEnvios } from './logica'

const VACIOS: Record<PestanaEnvios, [string, string]> = {
  activas: ['Aún no has enviado nada', 'Publica tu primera encomienda y encuentra quién la lleve.'],
  entregadas: ['Sin entregas todavía', 'Cuando un viajero entregue tu encomienda, aparecerá aquí.'],
  historial: ['Historial vacío', 'Aquí verás las encomiendas que retiraste o que vencieron.'],
}

/**
 * Pestaña "Envíos": mis encomiendas en chips (Activas · Entregadas ·
 * Historial). El chip va en la URL (`?pestana=`): Inicio abre uno concreto.
 * El contador de "Entregadas" son las que faltan por calificar.
 */
export function Envios() {
  const [params, setParams] = useSearchParams()
  const pestana = parsePestana(params.get('pestana'))
  const navigate = useNavigate()
  const qc = useQueryClient()
  const uid = useUid()
  const envios = useMisEncomiendas()
  const calificadas = useCalificadas()
  const abrir = useAbrirEnvio()

  const grupos = envios.data ? agruparEnvios(envios.data) : null
  const porCalificar = envios.data ? resumenEnvios(envios.data, calificadas).porCalificar.length : 0
  const [titulo, texto] = VACIOS[pestana]

  return (
    <Pantalla
      titulo="Mis envíos"
      conBarraPestanas
      alActualizar={() => qc.invalidateQueries({ queryKey: Claves.misEncomiendas(uid) })}
      cabecera={
        <Chips
          etiqueta="Filtrar envíos"
          opciones={PESTANAS_ENVIOS.map((p) => ({
            valor: p,
            texto: TITULO_PESTANA[p],
            contador: p === 'entregadas' ? porCalificar : null,
          }))}
          valor={pestana}
          alCambiar={(p) => setParams(p === 'activas' ? {} : { pestana: p }, { replace: true })}
        />
      }
    >
      <AvisosTomadas />
      {envios.isError ? (
        <ErrorCarga mensaje={mensajeDe(envios.error, 'No pudimos cargar tus envíos.')} alReintentar={() => void envios.refetch()} />
      ) : !grupos ? (
        <EsqueletoLista />
      ) : grupos[pestana].length === 0 ? (
        <Vacio
          titulo={titulo}
          icono={Package}
          texto={texto}
          accion={
            pestana === 'activas' ? (
              <Boton icono={Plus} onClick={() => navigate(Rutas.nuevaEncomienda)}>
                Publicar encomienda
              </Boton>
            ) : undefined
          }
        />
      ) : (
        grupos[pestana].map((e) => <TicketEnvio key={e.id} e={e} onClick={() => abrir(e)} />)
      )}
    </Pantalla>
  )
}
