import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { crearDependencias } from './app/servicios'
import { registrarServiceWorker } from './pwa/registro'
import './estilos.css'

const raiz = document.getElementById('raiz')
if (!raiz) throw new Error('Falta el elemento #raiz en index.html')

const deps = crearDependencias()
registrarServiceWorker()

createRoot(raiz).render(
  <StrictMode>
    <App deps={deps} />
  </StrictMode>,
)
