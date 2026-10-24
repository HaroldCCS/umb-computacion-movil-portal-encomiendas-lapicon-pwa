import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import Conectividad from './Conectividad'
import { crearClienteConsultas } from './core/consultas'
import { api } from './core/red/api'
import { API_URL } from './core/red/config'

/** Fase 0: solo la prueba de conectividad. Las rutas llegan en la fase 1. */
export default function App() {
  const [consultas] = useState(crearClienteConsultas)
  return (
    <QueryClientProvider client={consultas}>
      <Conectividad api={api} base={API_URL} />
    </QueryClientProvider>
  )
}
