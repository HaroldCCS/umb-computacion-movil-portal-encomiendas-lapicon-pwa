import { expect, test, type Page } from '@playwright/test'
import {
  conRol,
  crearEstado,
  entrar,
  instalarApiFalsa,
  sembrarEncomienda,
  sembrarUsuario,
  sembrarViaje,
  sinDesborde,
  uidDe,
} from './api-falsa'

/**
 * Flujos completos en celular (iPhone 13 y Pixel 7) contra el backend falso:
 * los mismos pasos que en la app Flutter, con sus textos.
 */
test.use({ reducedMotion: 'reduce' })

async function elegirCiudad(page: Page, campo: string | RegExp, ciudad: string) {
  await page.getByRole('button', { name: campo }).click()
  const hoja = page.getByRole('dialog')
  await hoja.getByLabel('Buscar ciudad').fill(ciudad.slice(0, 4).toLowerCase())
  await hoja.getByRole('option', { name: ciudad }).click()
  await expect(hoja).toBeHidden()
}

test('cuenta nueva: registro → perfil → rol → inicio vacío', async ({ page }) => {
  const estado = crearEstado()
  await instalarApiFalsa(page, estado)
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('link', { name: 'Crear cuenta' }).click()
  await expect(page.getByRole('heading', { name: 'Crear cuenta', level: 1 })).toBeVisible()
  await page.getByLabel('Correo').fill('nueva@prueba.co')
  await page.getByLabel('Contraseña', { exact: true }).fill('secreta123')
  await expect(page.getByText('✓ Mínimo 6 caracteres.')).toBeVisible()
  await page.getByLabel('Confirmar contraseña').fill('otra-cosa')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible()
  await page.getByLabel('Confirmar contraseña').fill('secreta123')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()

  // Paso 1 de 2: perfil (POST /api/users/register).
  await expect(page.getByRole('heading', { name: 'Tu perfil', level: 1 })).toBeVisible()
  await page.getByLabel('Nombre').fill('Laura')
  await page.getByLabel('Apellido').fill('Gómez')
  await page.getByLabel('Teléfono').fill('300 123 4567')
  await page.getByRole('button', { name: /Colombia/ }).click()
  await page.getByRole('dialog').getByLabel('Buscar país').fill('per')
  await page.getByRole('option', { name: 'Peru' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Paso 2 de 2: rol.
  await expect(page.getByRole('heading', { name: 'Elige cómo empezar' })).toBeVisible()
  await page.getByRole('radio', { name: /Quiero enviar/ }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page).toHaveURL(/\/inicio$/)
  await expect(page.getByRole('heading', { name: 'Hola, Laura' })).toBeVisible()
  await expect(page.getByText('Aún no has enviado nada')).toBeVisible()
  expect(estado.usuarios.get(uidDe('nueva@prueba.co'))).toMatchObject({ nacionalidad: 'Peru', telefono: '3001234567' })
  expect(await sinDesborde(page)).toBe(true)
})

test('login con contraseña equivocada: error junto al botón', async ({ page }) => {
  await instalarApiFalsa(page, crearEstado())
  await entrar(page, 'ana@prueba.co', 'incorrecta')
  await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.')
  await expect(page).toHaveURL(/\/login$/)
})

test('de punta a punta: publicar, tomar, entregar y calificar (dos personas)', async ({ browser }) => {
  const estado = crearEstado()
  sembrarUsuario(estado, 'ana@prueba.co', 'Ana', 'Gómez')
  const luis = sembrarUsuario(estado, 'luis@prueba.co', 'Luis', 'Pérez')
  sembrarViaje(estado, { uid: luis })

  // Remitente: publica una encomienda con el botón "+".
  const ctxAna = await browser.newContext({ ...test.info().project.use, baseURL: 'http://localhost:5501', reducedMotion: 'reduce' })
  const ana = await ctxAna.newPage()
  await instalarApiFalsa(ana, estado)
  await conRol(ana, 'ana@prueba.co', 'remitente')
  await entrar(ana, 'ana@prueba.co')
  await ana.getByRole('button', { name: 'Nueva encomienda' }).click()
  await elegirCiudad(ana, /^Origen/, 'Bogota')
  await elegirCiudad(ana, /^Destino/, 'Bogota')
  await ana.getByLabel('¿Cuánto le pagas por llevarla?').fill('150000')
  await expect(ana.getByLabel('¿Cuánto le pagas por llevarla?')).toHaveValue('150.000')
  await ana.getByRole('radio', { name: 'COP' }).click()
  await ana.getByLabel('Qué envías').fill('Dos libros de cocina')
  await ana.getByRole('button', { name: 'Publicar encomienda' }).click()
  await expect(ana.getByRole('alert').filter({ hasText: 'no pueden ser la misma ciudad' }).first()).toBeVisible()
  await elegirCiudad(ana, /^Destino/, 'Miami')
  await ana.getByRole('button', { name: 'Publicar encomienda' }).click()
  await expect(ana.getByText('Encomienda publicada')).toBeVisible()
  await expect(ana).toHaveURL(/\/inicio$/)
  await expect(ana.getByText('1 espera viajero.')).toBeVisible()

  // Viajero: la ve en Explorar, la toma (hoja de responsabilidad).
  const ctxLuis = await browser.newContext({ ...test.info().project.use, baseURL: 'http://localhost:5501', reducedMotion: 'reduce' })
  const luisP = await ctxLuis.newPage()
  await instalarApiFalsa(luisP, estado)
  await conRol(luisP, 'luis@prueba.co', 'viajero')
  await entrar(luisP, 'luis@prueba.co')
  await expect(luisP).toHaveURL(/\/mi-viaje$/)
  await expect(luisP.getByText('Sin verificar')).toBeVisible()
  await luisP.getByRole('link', { name: /Explorar/ }).click()
  await luisP.getByRole('button', { name: /te pagan COP 150\.000/ }).click()
  await expect(luisP.getByText('La publicó Ana')).toBeVisible()
  await luisP.getByRole('button', { name: 'Tomar encomienda' }).click()
  await expect(luisP.getByRole('dialog')).toContainText('Eres responsable de lo que llevas')
  await luisP.getByRole('button', { name: 'Sí, tomarla' }).click()
  await expect(luisP.getByText('¡Listo! La encomienda es tuya.')).toBeVisible()
  await expect(luisP.getByRole('button', { name: 'Marcar como entregada' })).toBeVisible()

  // Mi viaje avisa y el aviso lleva directo a "entregar" (deep link ?accion=).
  await luisP.goto('/mi-viaje')
  await expect(luisP.getByRole('link', { name: /Mi viaje, 1 por entregar/ })).toBeVisible()
  await luisP.getByRole('button', { name: /Tienes una encomienda por entregar/ }).click()
  await expect(luisP).toHaveURL(/accion=entregar/)
  await expect(luisP.getByText('Cuando la dejes en destino, márcala como entregada')).toBeVisible()
  await luisP.getByRole('button', { name: 'Marcar como entregada' }).click()
  const confirmar = luisP.getByRole('button', { name: 'Sí, ya la entregué' })
  await expect(confirmar).toBeDisabled()
  await luisP.getByLabel('Escribe ENTREGAR para confirmar').fill('entregar')
  await confirmar.click()
  await expect(luisP.getByText('Entrega registrada. Ahora califica al remitente.')).toBeVisible()
  expect(estado.encomiendas[0]).toMatchObject({ estado: 'entregada', viajeroId: luis })

  // Remitente: el aviso de calificar abre el detalle con la acción resaltada.
  await ana.reload()
  await expect(ana.getByRole('link', { name: /Envíos, 1 por calificar/ })).toBeVisible()
  await ana.getByRole('button', { name: /Tu encomienda a Miami ya fue entregada/ }).click()
  await expect(ana).toHaveURL(/accion=calificar/)
  await ana.getByRole('button', { name: 'Calificar al viajero' }).click()
  await expect(ana.getByRole('button', { name: 'Enviar calificación' })).toBeDisabled()
  await ana.getByRole('radio', { name: '5 de 5 estrellas' }).click()
  await expect(ana.getByText('Excelente')).toBeVisible()
  await ana.getByRole('button', { name: 'Puntual' }).click()
  await ana.getByRole('button', { name: 'Enviar calificación' }).click()
  await expect(ana.getByText('¡Gracias por calificar!').first()).toBeVisible()
  expect(estado.ratings).toEqual([expect.objectContaining({ usuarioDestino: luis, rolDestino: 'viajero', calificacion: 5, comentario: 'Puntual' })])
  // Vuelve al detalle con la línea de tiempo completa y, en Inicio, el contador desaparece (sin ceros).
  await expect(ana.getByRole('listitem', { name: 'Calificada: paso actual' })).toBeVisible()
  await ana.goto('/inicio')
  await expect(ana.getByRole('link', { name: /^Envíos, pestaña/ })).toBeVisible()
  await expect(ana.getByText(/ya fue entregada/)).toHaveCount(0)

  await ctxAna.close()
  await ctxLuis.close()
})

test('detalle por enlace directo: recargar no pierde la encomienda ni la acción', async ({ page }) => {
  const estado = crearEstado()
  const ana = sembrarUsuario(estado, 'ana@prueba.co', 'Ana')
  const e = sembrarEncomienda(estado, { uid: ana, estado: 'entregada', viajeroId: 'uid-otro' })
  await instalarApiFalsa(page, estado)
  await conRol(page, 'ana@prueba.co', 'remitente')
  await entrar(page, 'ana@prueba.co')
  await expect(page).toHaveURL(/\/inicio$/)
  await page.goto(`/remitente/encomienda/${e._id}?accion=calificar`)
  await expect(page.getByText('Califica a quien la llevó: tu opinión ayuda a otros remitentes.').last()).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL(new RegExp(`/remitente/encomienda/${e._id}\\?accion=calificar$`))
  await expect(page.getByRole('button', { name: 'Calificar al viajero' })).toBeVisible()
  await page.goto('/remitente/encomienda/no-existe')
  await expect(page.getByText('No encontramos esta encomienda')).toBeVisible()
})

test('retirar exige escribir RETIRAR y la deja vencida', async ({ page }) => {
  const estado = crearEstado()
  const ana = sembrarUsuario(estado, 'ana@prueba.co', 'Ana')
  const e = sembrarEncomienda(estado, { uid: ana })
  await instalarApiFalsa(page, estado)
  await conRol(page, 'ana@prueba.co', 'remitente')
  await entrar(page, 'ana@prueba.co')
  await page.goto(`/remitente/encomienda/${e._id}`)
  await page.getByRole('button', { name: 'Retirar encomienda' }).click()
  await page.getByLabel('Escribe RETIRAR para confirmar').fill('RETIRAR')
  await page.getByRole('button', { name: 'Sí, retirarla' }).click()
  await expect(page.getByText('Encomienda retirada')).toBeVisible()
  await expect(page.getByText('Ya no está publicada: venció o la retiraste.')).toBeVisible()
  expect(estado.encomiendas[0]!.estado).toBe('vencida')
})

test('viajero: registrar viaje sin verificación y la regla de un solo viaje', async ({ page }) => {
  const estado = crearEstado()
  sembrarUsuario(estado, 'luis@prueba.co', 'Luis')
  await instalarApiFalsa(page, estado)
  await conRol(page, 'luis@prueba.co', 'viajero')
  await entrar(page, 'luis@prueba.co')
  await expect(page.getByText('Aún no tienes un viaje activo')).toBeVisible()
  await page.getByRole('button', { name: 'Registrar viaje' }).first().click()
  await page.getByLabel('Número de vuelo').fill('av 24')
  await expect(page.getByLabel('Número de vuelo')).toHaveValue('AV 24')
  await page.getByRole('button', { name: /Fecha del vuelo/ }).click()
  await page.getByRole('button', { name: 'Elegir esta fecha' }).click()
  await elegirCiudad(page, /Ciudad de origen/, 'Bogota')
  await elegirCiudad(page, /Ciudad de destino/, 'Lima')
  // /api/vuelos responde 500 en el servidor: se dice que quedará "sin verificar".
  await page.getByRole('button', { name: 'Verificar vuelo' }).click()
  await expect(page.getByText('Verificación no disponible')).toBeVisible()
  await page.getByRole('button', { name: 'Registrar viaje' }).click()
  await expect(page.getByText('Viaje registrado. ¡Buen vuelo!')).toBeVisible()
  await expect(page.getByText('Bogota → Lima').first()).toBeVisible()
  // Con viaje activo no hay "+".
  await expect(page.getByRole('button', { name: 'Registrar viaje' })).toHaveCount(0)

  // Un segundo viaje: el 400 del backend se explica en una hoja con camino.
  await page.goto('/viajero/registrar')
  await page.getByLabel('Número de vuelo').fill('LA2401')
  await page.getByRole('button', { name: /Fecha del vuelo/ }).click()
  await page.getByRole('button', { name: 'Elegir esta fecha' }).click()
  await elegirCiudad(page, /Ciudad de origen/, 'Lima')
  await elegirCiudad(page, /Ciudad de destino/, 'Madrid')
  await page.getByRole('button', { name: 'Registrar viaje' }).click()
  const hoja = page.getByRole('dialog', { name: 'No pudimos registrar el viaje' })
  await expect(hoja).toContainText('Ya tienes un viaje disponible')
  await hoja.getByRole('button', { name: 'Ver mi viaje' }).click()
  await expect(page).toHaveURL(/\/mi-viaje$/)
})

test('chat y asistente: mensajes, cierre por día y error con reintento', async ({ page }) => {
  const estado = crearEstado()
  const ana = sembrarUsuario(estado, 'ana@prueba.co', 'Ana')
  sembrarEncomienda(estado, { uid: ana, estado: 'tomada', viajeroId: 'uid-luis' })
  await instalarApiFalsa(page, estado)
  await conRol(page, 'ana@prueba.co', 'remitente')
  await entrar(page, 'ana@prueba.co')
  await page.goto('/envios')
  await page.getByRole('button', { name: /Encomienda de Bogota a Miami/ }).click()
  await page.getByRole('button', { name: 'Abrir chat' }).click()
  await expect(page.getByText('Saluda a Chat')).toBeVisible()
  await page.getByLabel('Escribe un mensaje').fill('Hola, ¿nos vemos en el aeropuerto?')
  await page.getByRole('button', { name: 'Enviar mensaje' }).click()
  await expect(page.getByRole('log')).toContainText('Hoy')
  await expect(page.getByRole('group', { name: /^Tú: Hola, ¿nos vemos en el aeropuerto\?/ })).toBeVisible()
  await expect(page.getByLabel('Escribe un mensaje')).toHaveValue('')
  expect(estado.llamadas).toContain(`GET /api/chats/estado/${[ana, 'uid-luis'].sort().join('_')}`)

  await page.goto('/asistente')
  await page.getByRole('button', { name: '¿Cómo publico una encomienda?' }).click()
  await expect(page.getByText('El asistente no está disponible ahora. Intenta más tarde.')).toBeVisible()
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByText('El asistente no está disponible ahora. Intenta más tarde.')).toHaveCount(1)
  expect(estado.llamadas.filter((l) => l === 'POST /api/chatbot')).toHaveLength(2)
})

test('servidor dormido: aviso "Despertando el servidor…"', async ({ page }) => {
  const estado = crearEstado()
  sembrarUsuario(estado, 'ana@prueba.co', 'Ana')
  await instalarApiFalsa(page, estado)
  await conRol(page, 'ana@prueba.co', 'remitente')
  estado.demora = 6500
  await entrar(page, 'ana@prueba.co')
  await expect(page.getByText(/Despertando el servidor/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'Hola, Ana' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/Despertando el servidor/)).toBeHidden()
})
