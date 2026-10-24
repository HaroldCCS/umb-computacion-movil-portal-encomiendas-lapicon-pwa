import { expect, test } from '@playwright/test'

test('la PWA llama a /api y muestra el resultado en el celular', async ({ page }) => {
  await page.route('**/api/ciudades/paises', (ruta) =>
    ruta.fulfill({ json: ['Colombia', 'Mexico', 'Peru'] }),
  )
  await page.goto('/')
  await expect(page.getByTestId('resultado')).toContainText('3 países')
  await expect(page.getByRole('heading', { name: 'Lapticon PWA' })).toBeVisible()

  // Sin desplazamiento horizontal en el ancho del teléfono.
  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(desborda).toBe(false)
})

test('el error del servidor se explica sin romper la pantalla', async ({ page }) => {
  await page.route('**/api/ciudades/paises', (ruta) =>
    ruta.fulfill({ status: 500, json: { error: 'Error interno del servidor' } }),
  )
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Error interno del servidor')
  await expect(page.getByRole('button', { name: 'Probar de nuevo' })).toBeEnabled()
})
