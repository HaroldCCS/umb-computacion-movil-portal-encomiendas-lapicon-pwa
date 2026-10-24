/**
 * URL base de la API según el modo (docs/10 §10.4):
 * - vacía → mismo origen: el proxy de Vite (desarrollo) o la Pages Function
 *   (plan B en producción) reenvían `/api` al backend;
 * - `https://lapticon-backend.onrender.com` → directo (necesita que el origen
 *   esté en la lista blanca de CORS del backend).
 */
export const API_URL: string = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

export type ModoApi = 'directo' | 'proxy'

export const modoApi = (base: string = API_URL): ModoApi => (base ? 'directo' : 'proxy')
