# Lapticon — PWA

Versión web instalable (PWA) de Lapticon, pensada primero para el celular. Convive con la app Flutter
(`../lapticon_app/`), que no se modifica: ambas usan el mismo backend, el mismo proyecto de Firebase y el mismo
diseño (sistema v2, `../docs/07-diseno-ux-ui.md`). Plan completo: [`../docs/10-plan-migracion-pwa.md`](../docs/10-plan-migracion-pwa.md).

**Estado:** fase 0 (andamiaje y conectividad). La pantalla actual solo comprueba que la URL llega a la API.

## Requisitos

- Node 22 o superior y npm.
- Para las pruebas E2E: `npx playwright install chromium webkit` (una vez).

## Comandos

```bash
npm install
npm run dev            # http://localhost:5500 — la API por el proxy de Vite (también sirve desde el celular en la red local)
npm run dev:directo    # http://localhost:5500 — la API directa al backend (5500 es el único puerto que su CORS permite)
npm run typecheck
npm run lint
npm test               # Vitest: unidad y componentes
npm run e2e            # Playwright: iPhone 13 (WebKit) y Pixel 7 (Chromium), con la API simulada
npm run build          # dist/
npm run proxy:local    # build + Cloudflare Pages en local (http://localhost:8788) con la función del proxy
```

## La API y el CORS (docs/10 §10.4)

El backend del curso solo permite por CORS a `http://localhost:5500` y `http://127.0.0.1:5500`. Desde cualquier otro
origen el navegador bloquea las llamadas. La URL de la API sale de `VITE_API_URL`:

| Archivo | `VITE_API_URL` | Uso |
|---|---|---|
| `.env.development` | vacío | `npm run dev`: mismo origen, el proxy de Vite reenvía `/api` |
| `.env.directo` | `https://lapticon-backend.onrender.com` | `npm run dev:directo` en `localhost:5500` |
| `.env.production` | vacío (plan B) | La Pages Function `functions/api/[[ruta]].js` reenvía `/api` al backend |

Cuando el profesor agregue `https://lapticon-pwa.pages.dev` al CORS (pregunta P12 de `docs/06`), se cambia
`.env.production` a la URL del backend y se vuelve a desplegar. Para comprobar si ya lo agregó:

```bash
curl -sI -H "Origin: https://lapticon-pwa.pages.dev" https://lapticon-backend.onrender.com/api/ciudades/paises | grep -i access-control-allow-origin
```

## Desplegar en Cloudflare Pages (una vez, con tu cuenta)

Opción A — conectar el repositorio (recomendada; despliega cada push):

1. Cloudflare → *Workers & Pages* → *Create* → *Pages* → *Connect to Git* → este repositorio.
2. Nombre del proyecto: **`lapticon-pwa`** (si está ocupado, anota el que quede: es el origen que se le pide al profesor).
3. *Framework preset*: ninguno. *Build command*: `npm run build`. *Build output*: `dist`.
   *Root directory*: `aplicacion_pwa`.
4. *Environment variables*: `NODE_VERSION = 22` y `BACKEND_URL = https://lapticon-backend.onrender.com`.
5. Guardar y desplegar. La carpeta `functions/` se publica sola como la función del proxy.

Opción B — desde la terminal: `npx wrangler login` y luego
`npm run build && npx wrangler pages deploy dist --project-name lapticon-pwa`.

**Prueba de la fase 0:** abre `https://lapticon-pwa.pages.dev` en el celular. Debe decir
"✓ La API respondió: … países". La primera vez puede tardar hasta un minuto (el backend despierta).

## Notas

- `npm audit` reporta vulnerabilidades solo en herramientas de desarrollo (jsdom, Tailwind 3 al compilar, wrangler
  local); `npm audit --omit=dev` (lo que llega al usuario) da 0.
- TypeScript se queda en 5.9: `typescript-eslint` aún no soporta TypeScript 7.
