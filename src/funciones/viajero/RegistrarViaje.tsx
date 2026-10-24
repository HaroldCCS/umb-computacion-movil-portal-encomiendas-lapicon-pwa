import { ArrowUpDown, BadgeCheck, Calendar, ChevronDown, PlaneLanding, PlaneTakeoff, Ticket } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRepos, useUid } from '../../app/contexto'
import { Aviso } from '../../core/componentes/Aviso'
import { Boton, BotonIcono } from '../../core/componentes/Boton'
import { Campo, Formulario, useFormulario } from '../../core/componentes/Campo'
import { useHojas, type CerrarHoja } from '../../core/componentes/Hoja'
import { Pantalla, useVolver } from '../../core/componentes/Pantalla'
import { useToast } from '../../core/componentes/Toast'
import { fechaIso, Fmt, soloDia } from '../../core/formato'
import { ApiError, AppError } from '../../core/red/errores'
import { Rutas } from '../../core/rutas'
import { useAccion } from '../../core/useAccion'
import { Validadores } from '../../core/validadores'
import { useRefrescarViajero } from '../../datos/consultas'
import { Local } from '../../datos/local'
import { CampoCiudad } from '../catalogo/selectores'
import { normalizarVuelo, resumenVuelo, validarNumeroVuelo } from './logica'

type Verificacion = 'ninguna' | 'verificando' | 'verificado' | 'noEncontrado' | 'noDisponible'

/** Contenido de la hoja de fecha: el selector nativo del teléfono y un botón. */
function SelectorFecha({ inicial, cerrar }: { inicial: Date; cerrar: CerrarHoja<Date> }) {
  const hoy = soloDia(new Date())
  const max = new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate())
  const [valor, setValor] = useState(fechaIso(inicial))
  const [a, m, d] = valor.split('-').map(Number)
  const elegida = a && m && d ? new Date(a, m - 1, d) : null
  const valida = elegida !== null && elegida >= hoy && elegida <= max
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col">
        <span className="mb-1.5 ml-1 text-[13px] font-medium text-texto2">Día del vuelo</span>
        <input
          type="date"
          value={valor}
          min={fechaIso(hoy)}
          max={fechaIso(max)}
          onChange={(e) => setValor(e.target.value)}
          className="min-h-[52px] rounded-campo bg-superficie2 px-4 text-[17px] text-texto outline-none focus:ring-2 focus:ring-marca"
        />
      </label>
      {!valida && <Aviso tipo="error">Elige una fecha entre hoy y dentro de un año.</Aviso>}
      <Boton onClick={valida ? () => cerrar(elegida!) : null}>Elegir esta fecha</Boton>
    </div>
  )
}

/** Registrar un viaje (`POST /api/viajes`) con verificación del vuelo
 *  (`GET /api/vuelos/:numero/:fecha`, hoy 500 en el servidor). */
export function RegistrarViaje() {
  const repos = useRepos()
  const uid = useUid()
  const navigate = useNavigate()
  const toast = useToast()
  const volver = useVolver(Rutas.miViaje)
  const refrescar = useRefrescarViajero()
  const { mostrarHoja, confirmar } = useHojas()
  const form = useFormulario()
  const [vuelo, setVuelo] = useState('')
  const [fecha, setFecha] = useState<Date | null>(null)
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [verificacion, setVerificacion] = useState<Verificacion>('ninguna')
  const [datosVuelo, setDatosVuelo] = useState<string[]>([])
  const [errorVerificar, setErrorVerificar] = useState<string | null>(null)
  const { cargando, error, setError, ejecutar } = useAccion()

  const reiniciarVerificacion = () => {
    setVerificacion('ninguna')
    setDatosVuelo([])
    setErrorVerificar(null)
  }

  const elegirFecha = async () => {
    const f = await mostrarHoja<Date>({
      titulo: 'Fecha del vuelo',
      contenido: (cerrar) => <SelectorFecha inicial={fecha ?? soloDia(new Date())} cerrar={cerrar} />,
    })
    if (f) {
      setFecha(f)
      reiniciarVerificacion()
    }
  }

  const verificar = async () => {
    const errVuelo = validarNumeroVuelo(vuelo)
    if (errVuelo || !fecha) {
      setErrorVerificar(errVuelo ?? 'Elige la fecha del vuelo para verificarlo.')
      return
    }
    setVerificacion('verificando')
    setErrorVerificar(null)
    try {
      const json = await repos.viajes.validarVuelo(normalizarVuelo(vuelo), fecha)
      setDatosVuelo(resumenVuelo(json))
      setVerificacion('verificado')
    } catch (e) {
      if (e instanceof ApiError && e.noEncontrado) setVerificacion('noEncontrado')
      else if (e instanceof AppError) setVerificacion('noDisponible')
      else throw e
    }
  }

  const registrar = () => {
    if (!form.validar()) {
      setError('Revisa los campos marcados en rojo.')
      return
    }
    if (origen === destino) {
      setError('El origen y el destino deben ser ciudades distintas.')
      return
    }
    const numero = normalizarVuelo(vuelo)
    let regla: string | null = null
    void ejecutar(async () => {
      try {
        await repos.viajes.crear({ numeroVuelo: numero, ciudadOrigen: origen, ciudadDestino: destino, fechaViaje: fecha! })
      } catch (e) {
        // Regla del backend ("Ya tienes un viaje…"): se explica en una hoja.
        if (e instanceof ApiError && e.reglaDeNegocio) {
          regla = e.message
          return
        }
        throw e
      }
      if (uid && verificacion === 'verificado') Local.marcarVueloVerificado(uid, numero, fecha!)
      refrescar()
      toast('Viaje registrado. ¡Buen vuelo!')
      volver()
    }).then(async () => {
      if (!regla) return
      const ver = await confirmar({
        titulo: 'No pudimos registrar el viaje',
        mensaje: regla,
        confirmarTexto: 'Ver mi viaje',
        cancelarTexto: 'Cerrar',
      })
      if (ver) {
        refrescar()
        navigate(Rutas.miViaje, { replace: true })
      }
    })
  }

  const reintentar = (
    <Boton chico ancho={false} variante="secundario" onClick={cargando ? null : () => void verificar()}>
      Intentar de nuevo
    </Boton>
  )

  return (
    <Pantalla
      titulo="Registrar viaje"
      atras="Mi viaje"
      subtitulo="Lo verificamos con la aerolínea para que los remitentes confíen en ti."
    >
      <Formulario form={form} alEnviar={registrar} className="flex flex-col">
        <Campo
          etiqueta="Número de vuelo"
          valor={vuelo}
          alCambiar={(v) => {
            setVuelo(v.replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, 8))
            reiniciarVerificacion()
          }}
          pista="AV24"
          ayuda="Código de la aerolínea y número, como aparece en tu pasabordo."
          icono={Ticket}
          mayusculas="characters"
          autocompletar="off"
          teclaEnter="next"
          validador={validarNumeroVuelo}
        />
        <div className="mt-4">
          <Campo
            etiqueta="Fecha del vuelo"
            valor={fecha ? Fmt.fecha(fecha) : ''}
            pista="Elige la fecha"
            icono={Calendar}
            checkValido={false}
            sufijo={<ChevronDown aria-hidden size={22} className="mr-3 shrink-0 text-texto2" />}
            validador={(v) => Validadores.requerido(v, 'La fecha')}
            alTocar={() => void elegirFecha()}
          />
        </div>
        <div className="mt-4">
          <CampoCiudad etiqueta="Ciudad de origen" valor={origen} alCambiar={setOrigen} icono={PlaneTakeoff} />
        </div>
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
        <CampoCiudad etiqueta="Ciudad de destino" valor={destino} alCambiar={setDestino} icono={PlaneLanding} />

        {/* Si no se pudo verificar, se dice claro que quedará "sin verificar". */}
        <div className="mt-6" aria-live="polite">
          {verificacion === 'ninguna' || verificacion === 'verificando' ? (
            <div className="flex flex-col gap-2">
              <Boton
                icono={BadgeCheck}
                variante="tonal"
                cargando={verificacion === 'verificando'}
                textoCargando="Verificando vuelo…"
                onClick={cargando ? null : () => void verificar()}
              >
                Verificar vuelo
              </Boton>
              {errorVerificar && <Aviso tipo="error">{errorVerificar}</Aviso>}
            </div>
          ) : verificacion === 'verificado' ? (
            <Aviso titulo="Vuelo verificado" tipo="exito">
              {datosVuelo.length === 0 ? 'La aerolínea confirma tu vuelo.' : datosVuelo.join('\n')}
            </Aviso>
          ) : verificacion === 'noEncontrado' ? (
            <Aviso titulo="Vuelo no encontrado" tipo="atencion" accion={reintentar}>
              No encontramos ese vuelo para esa fecha. Revisa el número y la fecha; si estás seguro, puedes registrarlo
              igual y aparecerá como "sin verificar".
            </Aviso>
          ) : (
            <Aviso titulo="Verificación no disponible" tipo="atencion" accion={reintentar}>
              Ahora no pudimos verificar el vuelo. Puedes registrarlo igual: aparecerá como "sin verificar".
            </Aviso>
          )}
        </div>

        <div className="mt-7 flex flex-col gap-3">
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Boton
            tipo="submit"
            icono={PlaneTakeoff}
            cargando={cargando}
            textoCargando="Registrando…"
            className={verificacion === 'verificando' ? 'pointer-events-none opacity-40' : ''}
          >
            Registrar viaje
          </Boton>
        </div>
      </Formulario>
    </Pantalla>
  )
}
