import { ClienteApi } from './cliente'
import { API_URL } from './config'

/**
 * Cliente único de la app. En la fase 1 recibe `obtenerToken` de Firebase
 * Auth; por ahora solo se usan rutas públicas.
 */
export const api = new ClienteApi({ base: API_URL })
