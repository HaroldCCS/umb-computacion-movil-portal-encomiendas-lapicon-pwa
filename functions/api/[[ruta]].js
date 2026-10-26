/**
 * Plan B del CORS (docs/10 §10.4) — Cloudflare Pages Function.
 *
 * Toda petición a https://<este dominio>/api/* se reenvía al backend del curso.
 * Existe porque el backend solo permite por CORS a http://localhost:5500: desde
 * el dominio de la PWA el navegador bloquea las llamadas directas. Servidor a
 * servidor no hay CORS. Patrón tomado de Cuentas Claras.
 *
 * Cloudflare no cuenta como CPU el tiempo esperando la respuesta, así que el
 * arranque en frío de Render (~60 s) no corta la petición.
 *
 * Variable opcional en Cloudflare Pages: BACKEND_URL, sin /api al final (si falta, usa RESPALDO).
 * No hay wrangler.toml a propósito: con él, Cloudflare ignora las variables del panel
 * (entre ellas VITE_FIREBASE_API_KEY, que el build necesita).
 */
const RESPALDO = 'https://lapticon-backend.onrender.com'

/** Cabeceras que no deben cruzar el proxy. */
const SALTAR = new Set([
  'host',
  'origin',
  'referer',
  'cookie',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'x-forwarded-for',
  'x-real-ip',
])

/** @param {{ request: Request, env: Record<string, string | undefined>, fetchImpl?: typeof fetch }} contexto */
export async function onRequest({ request, env, fetchImpl = fetch }) {
  const origen = (env.BACKEND_URL || RESPALDO).replace(/\/+$/, '')
  const url = new URL(request.url)
  const destino = `${origen}${url.pathname}${url.search}`

  const cabeceras = new Headers()
  for (const [clave, valor] of request.headers) {
    if (!SALTAR.has(clave.toLowerCase())) cabeceras.set(clave, valor)
  }
  const ip = request.headers.get('cf-connecting-ip')
  if (ip) cabeceras.set('x-forwarded-for', ip)

  const conCuerpo = !['GET', 'HEAD'].includes(request.method)
  const respuesta = await fetchImpl(destino, {
    method: request.method,
    headers: cabeceras,
    body: conCuerpo ? request.body : undefined,
    redirect: 'manual',
  })

  // Datos privados de cada usuario: sin caché en el borde ni en el navegador.
  const salida = new Response(respuesta.body, respuesta)
  salida.headers.set('Cache-Control', 'no-store')
  return salida
}
