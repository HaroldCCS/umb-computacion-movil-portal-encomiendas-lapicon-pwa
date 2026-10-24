import { Download, RefreshCw, Share, SquarePlus, WifiOff, X } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useSesion } from '../app/contexto'
import { Boton } from '../core/componentes/Boton'
import { useHojas } from '../core/componentes/Hoja'
import { Local } from '../datos/local'
import { actualizarAhora, alHaberActualizacion, alPoderInstalar, esAppInstalada, esSafariIOS, instalarNativo } from './registro'

const CLAVE_DESCARTE = 'pwa_invitacion_descartada'

function useEnLinea() {
  return useSyncExternalStore(
    (o) => {
      window.addEventListener('online', o)
      window.addEventListener('offline', o)
      return () => {
        window.removeEventListener('online', o)
        window.removeEventListener('offline', o)
      }
    },
    () => navigator.onLine,
  )
}

/** Instalar: diálogo propio de Android/Chrome o, en iPhone, las instrucciones
 *  de Safari (no tiene `beforeinstallprompt`). */
export function useInstalar() {
  const { mostrarHoja } = useHojas()
  const [nativo, setNativo] = useState(false)
  useEffect(() => alPoderInstalar(setNativo), [])
  const ios = esSafariIOS() && !esAppInstalada()
  const disponible = !esAppInstalada() && (nativo || ios)
  const abrir = async () => {
    if (nativo) {
      await instalarNativo()
      return
    }
    await mostrarHoja({
      titulo: 'Agrega Lapticon a tu inicio',
      contenido: (cerrar) => (
        <div className="flex flex-col gap-4">
          <ol className="flex flex-col gap-3 text-[17px] text-texto">
            <li className="flex items-center gap-3">
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca">
                <Share size={22} />
              </span>
              <span>
                1. Toca <strong>Compartir</strong> en la barra de Safari.
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca">
                <SquarePlus size={22} />
              </span>
              <span>
                2. Elige <strong>Agregar a inicio</strong>.
              </span>
            </li>
          </ol>
          <p className="text-[15px] text-texto2">
            Desde el ícono se abre a pantalla completa. Inicia sesión una vez dentro de la app: no comparte la sesión
            con Safari.
          </p>
          <Boton onClick={() => cerrar()}>Entendido</Boton>
        </div>
      ),
    })
  }
  return { disponible, abrir }
}

/**
 * Avisos de la PWA (docs/10 §10.9): sin conexión, versión nueva (no recarga
 * sola en medio de un formulario) e invitación a instalar, solo con la
 * sesión lista y una vez (se recuerda si se descarta).
 */
export function AvisosPwa() {
  const s = useSesion()
  const enLinea = useEnLinea()
  const [actualizacion, setActualizacion] = useState(false)
  const instalar = useInstalar()
  const [descartada, setDescartada] = useState(() => Local.leer(CLAVE_DESCARTE) === '1')
  useEffect(() => alHaberActualizacion(setActualizacion), [])

  const invitar = s.estado === 'listo' && instalar.disponible && !descartada
  const descartar = () => {
    Local.guardar(CLAVE_DESCARTE, '1')
    setDescartada(true)
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 mx-auto flex max-w-app flex-col gap-2 px-4"
      style={{ top: 'calc(var(--seguro-arriba) + 60px)' }}
    >
      {!enLinea && (
        <div role="status" className="pointer-events-auto flex items-center gap-3 rounded-campo bg-texto px-4 py-3 text-fondo shadow-tarjeta">
          <WifiOff aria-hidden size={20} className="shrink-0" />
          <p className="text-[15px] font-medium">Sin conexión. Verás lo último que cargó; los cambios esperan a la red.</p>
        </div>
      )}
      {actualizacion && (
        <div role="status" className="pointer-events-auto flex items-center gap-3 rounded-campo border border-separador bg-superficie px-4 py-2 shadow-tarjeta">
          <RefreshCw aria-hidden size={20} className="shrink-0 text-marca" />
          <p className="min-w-0 flex-1 text-[15px] text-texto">Hay una versión nueva.</p>
          <Boton chico ancho={false} variante="tonal" onClick={actualizarAhora}>
            Actualizar
          </Boton>
        </div>
      )}
      {invitar && (
        <div role="status" className="pointer-events-auto flex items-center gap-3 rounded-campo border border-separador bg-superficie py-2 pl-4 pr-1 shadow-tarjeta">
          <Download aria-hidden size={20} className="shrink-0 text-marca" />
          <p className="min-w-0 flex-1 text-[15px] text-texto">Instala Lapticon y ábrela desde tu pantalla de inicio.</p>
          <Boton
            chico
            ancho={false}
            variante="tonal"
            onClick={() => {
              descartar()
              void instalar.abrir()
            }}
          >
            Instalar
          </Boton>
          <button
            type="button"
            aria-label="Ahora no"
            onClick={descartar}
            className="grid size-12 shrink-0 place-items-center text-texto2"
          >
            <X aria-hidden size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
