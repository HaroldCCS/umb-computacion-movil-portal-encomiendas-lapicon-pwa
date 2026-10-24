import { ClienteApi, type ProveedorToken } from './cliente'
import { API_URL } from './config'

let proveedor: ProveedorToken = async () => null

/** La sesión conecta aquí el idToken de Firebase (auth.ts). */
export function usarProveedorToken(p: ProveedorToken): void {
  proveedor = p
}

/** Cliente único de la app: las pantallas nunca llaman a `fetch` directo. */
export const api = new ClienteApi({ base: API_URL, obtenerToken: (o) => proveedor(o) })
