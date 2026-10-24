import { useQueryClient } from '@tanstack/react-query'
import { ArrowUpDown, CircleDot, MapPin } from 'lucide-react'
import { useState } from 'react'
import { useUid, useRepos } from '../../app/contexto'
import { Aviso } from '../../core/componentes/Aviso'
import { Boton, BotonIcono } from '../../core/componentes/Boton'
import { Campo, CampoMonto, Chips, EtiquetaCampo, Formulario, useFormulario } from '../../core/componentes/Campo'
import { Pantalla, Seccion, useVolver } from '../../core/componentes/Pantalla'
import { RouteTicket, TicketDetail } from '../../core/componentes/RouteTicket'
import { useToast } from '../../core/componentes/Toast'
import { Fmt, sumarMeses } from '../../core/formato'
import { Rutas } from '../../core/rutas'
import { useAccion } from '../../core/useAccion'
import { Claves } from '../../datos/consultas'
import { CampoCiudad } from '../catalogo/selectores'
import { parseValor, validarObservaciones, validarRuta, validarValor } from './logica'

const MONEDAS = ['USD', 'COP', 'EUR'] as const

/**
 * Publicar una encomienda → `POST /api/encomiendas` (docs/07 §7.6).
 * Secciones Ruta · Pago · Detalles y vista previa del pase.
 */
export function NuevaEncomienda() {
  const repos = useRepos()
  const uid = useUid()
  const qc = useQueryClient()
  const toast = useToast()
  const volver = useVolver(Rutas.inicio)
  const form = useFormulario()
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [valor, setValor] = useState('')
  const [moneda, setMoneda] = useState<(typeof MONEDAS)[number]>('USD')
  const [observaciones, setObservaciones] = useState('')
  const [intento, setIntento] = useState(false)
  const { cargando, error, setError, ejecutar } = useAccion()

  // El backend fija el vencimiento: un mes después de publicarla.
  const vence = sumarMeses(new Date(), 1)
  const rutaError = intento ? validarRuta(origen, destino) : null
  const monto = parseValor(valor)

  const publicar = () => {
    setIntento(true)
    const formOk = form.validar()
    const errRuta = validarRuta(origen, destino)
    if (!formOk || errRuta) {
      setError(errRuta ?? 'Revisa los campos marcados en rojo.')
      return
    }
    void ejecutar(async () => {
      await repos.encomiendas.crear({
        ciudadOrigen: origen.trim(),
        ciudadDestino: destino.trim(),
        observaciones: observaciones.trim(),
        moneda,
        valor: monto!,
      })
      await qc.invalidateQueries({ queryKey: Claves.misEncomiendas(uid) })
      toast('Encomienda publicada')
      volver()
    })
  }

  return (
    <Pantalla titulo="Nueva encomienda" atras subtitulo="Cuéntale al viajero qué lleva, a dónde y cuánto pagas.">
      <Formulario form={form} alEnviar={publicar} className="flex flex-col">
        <Seccion>Ruta</Seccion>
        <CampoCiudad etiqueta="Origen" valor={origen} alCambiar={setOrigen} pista="¿Desde dónde envías?" icono={CircleDot} />
        <div className="flex justify-end">
          <BotonIcono
            icono={ArrowUpDown}
            etiqueta="Intercambiar origen y destino"
            borde={false}
            onClick={() => {
              setOrigen(destino)
              setDestino(origen)
            }}
          />
        </div>
        <CampoCiudad etiqueta="Destino" valor={destino} alCambiar={setDestino} pista="¿A dónde va?" icono={MapPin} />
        {rutaError && (
          <div className="mt-2">
            <Aviso tipo="error">{rutaError}</Aviso>
          </div>
        )}

        <div className="mt-7">
          <Seccion>Pago al viajero</Seccion>
        </div>
        <CampoMonto valor={valor} alCambiar={setValor} moneda={moneda} etiqueta="¿Cuánto le pagas por llevarla?" validador={validarValor} />
        <div className="mt-3">
          <EtiquetaCampo>Moneda</EtiquetaCampo>
          <Chips
            etiqueta="Moneda"
            className=""
            opciones={MONEDAS.map((m) => ({ valor: m, texto: m }))}
            valor={moneda}
            alCambiar={setMoneda}
          />
        </div>

        <div className="mt-7">
          <Seccion>Detalles</Seccion>
        </div>
        <Campo
          etiqueta="Qué envías"
          valor={observaciones}
          alCambiar={setObservaciones}
          pista="Ej. Un libro y dos camisetas"
          ayuda="Sé claro: el viajero debe saber qué lleva en su maleta."
          mayusculas="sentences"
          lineas={3}
          maxLength={200}
          validador={validarObservaciones}
          checkValido={false}
        />
        <div className="mt-3">
          <Aviso>Estará publicada un mes: hasta el {Fmt.fecha(vence)}.</Aviso>
        </div>

        <div className="mt-7">
          <Seccion>Así la verán los viajeros</Seccion>
        </div>
        <div aria-hidden>
          <RouteTicket
            origen={origen || '¿Origen?'}
            destino={destino || '¿Destino?'}
            acento="atencion"
            detalles={[
              <TicketDetail key="p" etiqueta="Te pagan" valor={monto && monto > 0 ? Fmt.dinero(monto, moneda) : '—'} />,
              <TicketDetail key="v" etiqueta="Vence" valor={Fmt.fecha(vence, { corta: true })} />,
            ]}
          />
        </div>

        <div className="mt-7 flex flex-col gap-3">
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Boton tipo="submit" cargando={cargando} textoCargando="Publicando…">
            Publicar encomienda
          </Boton>
        </div>
      </Formulario>
    </Pantalla>
  )
}
