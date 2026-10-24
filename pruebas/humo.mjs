/**
 * Humo contra el servidor REAL (docs/10 §10.11): recorre los endpoints de la
 * matriz §10.5 en modo SOLO LECTURA y dice si responden como espera la app.
 *
 *   npm run humo                         → directo al backend de Render
 *   npm run humo -- https://lapticon-pwa.pages.dev   → a través del proxy desplegado
 *
 * Usa el token de prueba de Harold que deja lapticon_app/tool/obtener_token.sh en
 * ~/.lapticon/token.json (fuera del repo). Lo renueva con el refreshToken y la
 * clave pública de Firebase (.env.local). Nunca imprime ni guarda el token.
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const base = (process.argv[2] ?? 'https://lapticon-backend.onrender.com').replace(/\/+$/, '')
const cuenta = JSON.parse(readFileSync(join(homedir(), '.lapticon', 'token.json'), 'utf8'))
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const clave = /VITE_FIREBASE_API_KEY=(.+)/.exec(env)?.[1]?.trim()
if (!clave) throw new Error('Falta VITE_FIREBASE_API_KEY en .env.local')

const r = await fetch(`https://securetoken.googleapis.com/v1/token?key=${clave}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: cuenta.refreshToken }),
})
if (!r.ok) throw new Error(`No se pudo renovar el token de prueba (${r.status})`)
const { id_token: token, user_id: uid } = await r.json()

/** [nombre, método, ruta, ¿con token?, estados aceptados, cuerpo] */
const casos = [
  ['17 países', 'GET', '/api/ciudades/paises', false, [200]],
  ['18 ciudades', 'GET', '/api/ciudades/ciudades', false, [200]],
  ['2 perfil propio', 'GET', `/api/users/${uid}`, true, [200, 404]],
  ['5 historial de viajes', 'GET', '/api/viajes', true, [200]],
  ['6 viaje activo', 'GET', '/api/viajes/disponible', true, [200, 404]],
  ['7 buscar viajeros', 'GET', '/api/viajes/buscar?ciudad=Bogota', true, [200]],
  ['8 verificar vuelo', 'GET', '/api/vuelos/AV10/2026-12-01', true, [200, 404, 500]],
  ['10 mis encomiendas', 'GET', '/api/encomiendas', true, [200]],
  ['11 disponibles en ruta', 'GET', '/api/encomiendas/disponibles?origen=Bogota&destino=Miami', true, [200]],
  ['15 calificaciones (pública)', 'GET', `/api/ratings/${uid}`, false, [200]],
  ['16 estado del chat', 'GET', `/api/chats/estado/${uid}_x`, true, [200, 404, 500]],
  ['19 asistente', 'POST', '/api/chatbot', true, [200, 500], { mensajeUsuario: 'Hola' }],
  ['— sin token = 401', 'GET', '/api/encomiendas', false, [401]],
]

let fallas = 0
console.log(`Humo contra ${base}\n`)
for (const [nombre, metodo, ruta, conToken, aceptados, cuerpo] of casos) {
  const inicio = Date.now()
  let estado = 'red'
  try {
    const res = await fetch(base + ruta, {
      method: metodo,
      headers: {
        Accept: 'application/json',
        ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
        ...(conToken ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: AbortSignal.timeout(75_000),
    })
    estado = res.status
  } catch {
    // estado queda en "red"
  }
  const ok = aceptados.includes(estado)
  if (!ok) fallas++
  console.log(`${ok ? '✓' : '✗'} ${nombre.padEnd(28)} ${metodo.padEnd(4)} ${String(estado).padEnd(4)} ${Date.now() - inicio} ms`)
}
console.log(fallas ? `\n${fallas} endpoint(s) no respondieron como espera la app.` : '\nTodos responden como espera la app.')
process.exit(fallas ? 1 : 0)
