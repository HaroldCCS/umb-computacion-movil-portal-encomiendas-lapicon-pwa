import { House, MapPinned, MessageCircle, Package, Plane, Search, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ErrorCarga, Vacio } from '../core/componentes/Aviso'
import { Boton } from '../core/componentes/Boton'
import { BarraPestanas, type PestanaItem } from '../core/componentes/BarraPestanas'
import { Marca } from '../core/componentes/Marca'
import { Progreso } from '../core/componentes/Insignia'
import { redirigirPara, Rutas } from '../core/rutas'
import { useMiViaje, useMisEncomiendas, useMisEntregas } from '../datos/consultas'
import { Vocabulario, type Rol } from '../datos/modelos/rol'
import { useNuevasTomadas } from '../funciones/remitente/componentes'
import { resumenEnvios } from '../funciones/remitente/logica'
import { porEntregar } from '../funciones/viajero/logica'
import { useCalificadas, useSesion } from './contexto'

/**
 * Guardia de navegación: aplica `redirigirPara` (la regla de Flutter). Mientras
 * la sesión carga se muestra el splash SIN cambiar la URL, para que un enlace
 * directo (p. ej. `/viajero/encomienda/x?accion=entregar`) siga ahí al terminar.
 */
export function Raiz() {
  const s = useSesion()
  const { pathname } = useLocation()
  if (s.estado === 'cargando' || s.estado === 'error') return <Splash />
  const destino = redirigirPara(s.estado, pathname)
  if (destino && destino !== pathname) return <Navigate to={destino} replace />
  return <Outlet />
}

/** Mientras se revisa la sesión; si falla, reintentar o cerrar sesión. */
export function Splash() {
  const s = useSesion()
  if (s.estado === 'error') {
    return (
      <main className="mx-auto grid min-h-dvh max-w-app place-items-center px-4">
        <div className="w-full">
          <ErrorCarga
            mensaje={s.error ?? 'Intenta de nuevo.'}
            // Sin usuario no hay perfil que recargar: el error fue al iniciar, se recarga la app.
            alReintentar={() => (s.usuario ? void s.control.recargar() : window.location.reload())}
            textoSecundario={s.usuario ? 'Cerrar sesión' : undefined}
            alSecundario={s.usuario ? () => void s.control.cerrarSesion() : undefined}
          />
        </div>
      </main>
    )
  }
  return (
    <main className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-8">
        <Marca tam={56} />
        <div className="w-40">
          <Progreso valor={0.35} etiqueta="Cargando tu cuenta" claseBarra="bg-marca esqueleto" />
        </div>
      </div>
    </main>
  )
}

/** Cada rol tiene sus propias pestañas: la otra ruta lleva a la equivalente. */
export function SoloRol({ rol, otra, children }: { rol: Rol; otra: string; children: ReactNode }) {
  const s = useSesion()
  if ((s.rol ?? 'remitente') !== rol) return <Navigate to={otra} replace />
  return <>{children}</>
}

/**
 * Inicio por rol con la barra de pestañas flotante y el "+" (docs/08 §8.4):
 *   REMITENTE  Inicio · Envíos · Chats · Perfil      (+) Nueva encomienda
 *   VIAJERO    Mi viaje · Explorar · Chats · Perfil  (+) Registrar viaje, solo sin viaje activo.
 */
export function Pestanas() {
  const s = useSesion()
  return (
    <>
      <Outlet />
      {(s.rol ?? 'remitente') === 'remitente' ? <ItemsRemitente /> : <ItemsViajero />}
    </>
  )
}

const CHATS: PestanaItem = { ruta: Rutas.chats, texto: 'Chats', icono: MessageCircle }
const PERFIL: PestanaItem = { ruta: Rutas.perfil, texto: 'Perfil', icono: User }

function ItemsRemitente() {
  const navigate = useNavigate()
  const envios = useMisEncomiendas()
  const calificadas = useCalificadas()
  const porCalificar = envios.data ? resumenEnvios(envios.data, calificadas).porCalificar.length : 0
  const nuevas = useNuevasTomadas().nuevas.length
  const etiquetas = [
    nuevas > 0 ? `${nuevas} ${nuevas === 1 ? 'nueva' : 'nuevas'}` : null,
    porCalificar > 0 ? `${porCalificar} por calificar` : null,
  ].filter(Boolean)
  return (
    <BarraPestanas
      items={[
        { ruta: Rutas.inicio, texto: 'Inicio', icono: House },
        {
          ruta: Rutas.envios,
          texto: 'Envíos',
          icono: Package,
          contador: nuevas + porCalificar,
          etiquetaContador: etiquetas.join(' · '),
        },
        CHATS,
        PERFIL,
      ]}
      alMas={() => navigate(Rutas.nuevaEncomienda)}
      etiquetaMas={Vocabulario.remitente.crear}
    />
  )
}

function ItemsViajero() {
  const navigate = useNavigate()
  const viaje = useMiViaje()
  const entregas = useMisEntregas()
  const pendientes = entregas.data ? porEntregar(entregas.data).length : 0
  // Solo se puede tener un viaje a la vez: con uno activo no hay "+".
  const sinViaje = viaje.isSuccess && viaje.data === null
  return (
    <BarraPestanas
      items={[
        {
          ruta: Rutas.miViaje,
          texto: 'Mi viaje',
          icono: Plane,
          contador: pendientes,
          etiquetaContador: `${pendientes} por entregar`,
        },
        { ruta: Rutas.explorar, texto: 'Explorar', icono: Search },
        CHATS,
        PERFIL,
      ]}
      alMas={sinViaje ? () => navigate(Rutas.registrarViaje) : null}
      etiquetaMas={Vocabulario.viajero.crear}
    />
  )
}

export function NoEncontrada() {
  const navigate = useNavigate()
  return (
    <main className="mx-auto grid min-h-dvh max-w-app place-items-center px-4">
      <div className="w-full">
        <Vacio
          titulo="Página no encontrada"
          icono={MapPinned}
          texto="El enlace no lleva a ninguna parte de Lapticon."
          accion={<Boton onClick={() => navigate(Rutas.inicio, { replace: true })}>Ir al inicio</Boton>}
        />
      </div>
    </main>
  )
}
