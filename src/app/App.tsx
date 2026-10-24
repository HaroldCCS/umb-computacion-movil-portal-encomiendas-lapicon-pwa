import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useState } from 'react'
import { createBrowserRouter, Navigate, RouterProvider, ScrollRestoration, Outlet } from 'react-router-dom'
import { AvisoServidor } from '../core/componentes/Aviso'
import { ProveedorHojas } from '../core/componentes/Hoja'
import { ProveedorToasts } from '../core/componentes/Toast'
import { crearClienteConsultas } from '../core/consultas'
import { api } from '../core/red/api'
import { Rutas } from '../core/rutas'
import { Login, Recuperar, Registro } from '../funciones/auth/pantallas'
import { CalificarPantalla, ResenasPantalla } from '../funciones/calificaciones/pantallas'
import { ConversacionesPantalla } from '../funciones/chat/ConversacionesPantalla'
import { CompletarPerfil, ElegirRol } from '../funciones/onboarding/pantallas'
import { EditarPerfil, PerfilPantalla } from '../funciones/perfil/pantallas'
import { BuscarViajeros } from '../funciones/remitente/BuscarViajeros'
import { DetalleEnvio } from '../funciones/remitente/DetalleEnvio'
import { Envios } from '../funciones/remitente/Envios'
import { InicioRemitente } from '../funciones/remitente/InicioRemitente'
import { NuevaEncomienda } from '../funciones/remitente/NuevaEncomienda'
import { Explorar } from '../funciones/viajero/Explorar'
import { EncomiendaViajero } from '../funciones/viajero/EncomiendaViajero'
import { MiViaje } from '../funciones/viajero/MiViaje'
import { RegistrarViaje } from '../funciones/viajero/RegistrarViaje'
import { AvisosPwa } from '../pwa/AvisosPwa'
import { ProveedorDependencias, type Dependencias } from './contexto'
import { NoEncontrada, Pestanas, Raiz, SoloRol, Splash } from './estructura'

// Firestore y el asistente se cargan solo al abrirlos (code-splitting).
const ChatPantalla = lazy(() => import('../funciones/chat/ChatPantalla'))
const Asistente = lazy(() => import('../funciones/asistente/Asistente'))

function Perezosa() {
  return (
    <Suspense fallback={<Splash />}>
      <Outlet />
    </Suspense>
  )
}

export function crearRouter() {
  return createBrowserRouter([
    {
      element: (
        <>
          <ScrollRestoration />
          <Raiz />
        </>
      ),
      children: [
        { path: Rutas.splash, element: <Splash /> },
        { path: Rutas.login, element: <Login /> },
        { path: Rutas.registro, element: <Registro /> },
        { path: Rutas.recuperar, element: <Recuperar /> },
        { path: Rutas.completarPerfil, element: <CompletarPerfil /> },
        { path: Rutas.elegirRol, element: <ElegirRol /> },
        {
          element: <Pestanas />,
          children: [
            { path: Rutas.inicio, element: <SoloRol rol="remitente" otra={Rutas.miViaje}><InicioRemitente /></SoloRol> },
            { path: Rutas.envios, element: <SoloRol rol="remitente" otra={Rutas.explorar}><Envios /></SoloRol> },
            { path: Rutas.miViaje, element: <SoloRol rol="viajero" otra={Rutas.inicio}><MiViaje /></SoloRol> },
            { path: Rutas.explorar, element: <SoloRol rol="viajero" otra={Rutas.envios}><Explorar /></SoloRol> },
            { path: Rutas.chats, element: <ConversacionesPantalla /> },
            { path: Rutas.perfil, element: <PerfilPantalla /> },
          ],
        },
        { path: Rutas.editarPerfil, element: <EditarPerfil /> },
        { path: Rutas.nuevaEncomienda, element: <NuevaEncomienda /> },
        { path: '/remitente/encomienda/:id', element: <DetalleEnvio /> },
        { path: Rutas.viajeros, element: <BuscarViajeros /> },
        { path: Rutas.registrarViaje, element: <RegistrarViaje /> },
        { path: '/viajero/encomienda/:id', element: <EncomiendaViajero /> },
        { path: Rutas.calificar, element: <CalificarPantalla /> },
        { path: '/resenas/:uid', element: <ResenasPantalla /> },
        {
          element: <Perezosa />,
          children: [
            { path: '/chat/:otroUid', element: <ChatPantalla /> },
            { path: Rutas.asistente, element: <Asistente /> },
          ],
        },
        { path: '/home', element: <Navigate to={Rutas.inicio} replace /> },
        { path: '*', element: <NoEncontrada /> },
      ],
    },
  ])
}

/** Proveedores comunes (también los usan las pruebas de pantallas). */
export function Proveedores({
  deps,
  consultas,
  children,
}: {
  deps: Dependencias
  consultas: QueryClient
  children: React.ReactNode
}) {
  // Al cerrar sesión se borra la caché: no se mezclan los datos de dos cuentas.
  useEffect(
    () =>
      deps.sesion.suscribir(() => {
        if (!deps.sesion.obtener().usuario) consultas.clear()
      }),
    [deps, consultas],
  )
  return (
    <ProveedorDependencias valor={deps}>
      <QueryClientProvider client={consultas}>
        <ProveedorToasts>
          <ProveedorHojas>{children}</ProveedorHojas>
        </ProveedorToasts>
      </QueryClientProvider>
    </ProveedorDependencias>
  )
}

export default function App({ deps }: { deps: Dependencias }) {
  const [consultas] = useState(crearClienteConsultas)
  const [router] = useState(crearRouter)
  return (
    <Proveedores deps={deps} consultas={consultas}>
      <RouterProvider router={router} />
      <AvisoServidor api={api} />
      <AvisosPwa />
    </Proveedores>
  )
}
