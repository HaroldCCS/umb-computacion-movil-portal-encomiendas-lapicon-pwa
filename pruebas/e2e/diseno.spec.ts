import { expect, test } from '@playwright/test'
import { conRol, crearEstado, entrar, instalarApiFalsa, sembrarEncomienda, sembrarUsuario, sembrarViaje, sinDesborde } from './api-falsa'

/**
 * Lo que debe aguantar en un teléfono (docs/10 §10.11): 360 px de ancho, letra
 * al 200 % y modo oscuro, sin que nada se salga de la pantalla; toques ≥ 48 px
 * y campos de ≥ 16 px (Safari no hace zoom).
 */
test.use({ reducedMotion: 'reduce' })

const PANTALLAS_REMITENTE = ['/inicio', '/envios', '/envios?pestana=entregadas', '/remitente/nueva', '/remitente/viajeros', '/chats', '/perfil', '/perfil/editar']
const PANTALLAS_VIAJERO = ['/mi-viaje', '/explorar', '/viajero/registrar']

for (const [nombre, opciones] of [
  ['360 px, letra al 200 %', { viewport: { width: 360, height: 740 }, letra: 2 }],
  ['modo oscuro', { colorScheme: 'dark' as const, letra: 1 }],
] as const) {
  test.describe(nombre, () => {
    if ('viewport' in opciones) test.use({ viewport: opciones.viewport })
    if ('colorScheme' in opciones) test.use({ colorScheme: opciones.colorScheme })

    test('remitente y viajero sin desbordes', async ({ page }) => {
      const estado = crearEstado()
      const ana = sembrarUsuario(estado, 'ana@prueba.co', 'Ana María', 'Gómez Restrepo')
      const luis = sembrarUsuario(estado, 'luis@prueba.co', 'Luis', 'Pérez')
      sembrarEncomienda(estado, { uid: ana, estado: 'tomada', viajeroId: luis, ciudadDestino: 'San Andres Islas' })
      sembrarEncomienda(estado, { uid: ana, estado: 'entregada', viajeroId: luis, moneda: 'COP', valor: 1250000 })
      sembrarViaje(estado, { uid: luis })
      sembrarEncomienda(estado, { uid: ana, valor: 60 })
      await instalarApiFalsa(page.context(), estado)
      if (opciones.letra !== 1) {
        await page.addInitScript((f) => {
          document.addEventListener('DOMContentLoaded', () => {
            document.documentElement.style.fontSize = `${16 * f}px`
            const s = document.createElement('style')
            s.textContent = `body { zoom: ${f}; }`
            document.head.append(s)
          })
        }, opciones.letra)
      }
      await conRol(page, 'ana@prueba.co', 'remitente')
      await entrar(page, 'ana@prueba.co')
      await expect(page).toHaveURL(/\/inicio$/)
      for (const ruta of PANTALLAS_REMITENTE) {
        await page.goto(ruta)
        await page.getByRole('heading').first().waitFor()
        await page.waitForLoadState('networkidle')
        expect(await sinDesborde(page), `desborde en ${ruta}`).toBe(true)
      }
      await page.evaluate(() => localStorage.setItem('rol_uid-luispruebaco', 'viajero'))
      await page.context().clearCookies()
      await page.evaluate(() => sessionStorage.clear())
      await conRol(page, 'luis@prueba.co', 'viajero')
      await entrar(page, 'luis@prueba.co')
      await expect(page).toHaveURL(/\/mi-viaje$/)
      for (const ruta of PANTALLAS_VIAJERO) {
        await page.goto(ruta)
        await page.getByRole('heading').first().waitFor()
        await page.waitForLoadState('networkidle')
        expect(await sinDesborde(page), `desborde en ${ruta}`).toBe(true)
      }
    })
  })
}

test('toques de al menos 48 px y campos de 16 px o más', async ({ page }) => {
  const estado = crearEstado()
  sembrarUsuario(estado, 'ana@prueba.co', 'Ana')
  await instalarApiFalsa(page, estado)
  await conRol(page, 'ana@prueba.co', 'remitente')
  await entrar(page, 'ana@prueba.co')
  await page.goto('/remitente/nueva')
  await page.getByRole('heading', { name: 'Nueva encomienda' }).waitFor()
  const problemas = await page.evaluate(() => {
    const malos: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('button, a[href], input, textarea, [role="radio"]')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || el.closest('[aria-hidden="true"]')) continue
      if (r.height < 47.5 && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') malos.push(`${el.tagName} "${el.textContent?.trim() || el.getAttribute('aria-label')}" mide ${r.height}px`)
      if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && parseFloat(getComputedStyle(el).fontSize) < 16) malos.push(`${el.tagName} con letra < 16px`)
    }
    return malos
  })
  expect(problemas).toEqual([])
})

test('es instalable: manifest, íconos y meta de iPhone', async ({ page, request }) => {
  await page.goto('/login')
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ display: 'standalone', start_url: '/', lang: 'es' })
  const tamanos = manifest.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`)
  expect(tamanos).toEqual(expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']))
  for (const i of manifest.icons) expect((await request.get(i.src)).ok()).toBe(true)
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png')
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/)
})
