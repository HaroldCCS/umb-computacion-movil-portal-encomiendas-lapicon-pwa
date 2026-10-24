# Lapticon — PWA

Versión web instalable (PWA) de Lapticon, pensada primero para el celular. Convive con la
[app Flutter](https://github.com/HaroldCCS/umb-computacion-movil-portal-encomiendas-lapicon-flutter): ambas usan el mismo
backend, el mismo proyecto de Firebase (`lapticon-eba31`), el mismo esquema del chat en Firestore y el mismo diseño.

Documentación (contrato de la API, sistema de diseño v2, plan de la PWA, bitácora) en el
[repositorio de documentación](https://github.com/HaroldCCS/umb-computacion-movil-portal-encomiendas-lapicon): [`docs/07`](https://github.com/HaroldCCS/umb-computacion-movil-portal-encomiendas-lapicon/blob/main/docs/07-diseno-ux-ui.md) y
[`docs/10`](https://github.com/HaroldCCS/umb-computacion-movil-portal-encomiendas-lapicon/blob/main/docs/10-plan-migracion-pwa.md). Las referencias `docs/0X` del código apuntan allá.

**Organización local:** este repositorio se clona dentro de la carpeta del repo de documentación, como
`aplicacion_pwa/` (el de documentación lo ignora). Así `../referencias/google-services.json` queda a la mano.

**Estado (24-oct-2026):** migración completa (fases 0–8 y pruebas de la 9). Falta el despliegue en Cloudflare Pages y
la prueba en un celular real con las cuentas de verdad (ver "Pendiente").

## Requisitos

- Node 22 o superior y npm.
- `.env.local` con la clave web de Firebase (no se sube; `*.local` está en `.gitignore`):
  ```bash
  VITE_FIREBASE_API_KEY=<la "current_key" de ../referencias/google-services.json>
  ```
- Para las E2E: `npx playwright install chromium webkit` (una vez).

## Comandos

```bash
npm install
npm run dev            # http://localhost:5500 — API por el proxy de Vite (también desde el celular en la red local)
npm run dev:directo    # http://localhost:5500 — API directa (5500 es el único puerto que permite el CORS del backend)
npm run typecheck
npm run lint
npm test               # Vitest: lógica, contrato con pruebas/respuestas, componentes (axe) y tokens
npm run e2e            # Playwright en iPhone 13 (WebKit) y Pixel 7 (Chromium), backend e identidad falsos
npm run humo           # los endpoints de la matriz contra el servidor REAL, solo lectura (token de ~/.lapticon)
npm run build          # dist/ (con sw.js generado)
npm run proxy:local    # build + Cloudflare Pages en local (http://localhost:8788) con la función del proxy
```

## Cómo está hecha

```text
src/
├── app/            proveedores, rutas (React Router), guardia de sesión, pestañas por rol
├── core/           tokens (tema/tokens.css), cliente API, Firebase Auth, rutas y redirigirPara,
│                   formato, validadores y componentes/ (sistema v2: Pantalla, BarraPestanas,
│                   TarjetaHero, RouteTicket, Grupo/Fila, Boton, Campo, Chips, Hoja, Toast…)
├── datos/          modelos tolerantes, repositorios (= contrato de la API), consultas (TanStack Query),
│                   local.ts (mismas claves de localStorage que Flutter)
├── funciones/      auth, onboarding, remitente, viajero, chat, calificaciones, perfil, asistente, sesión
└── pwa/            sw.js (plantilla), registro del SW, avisos (versión nueva, sin conexión, instalar)
pruebas/respuestas/ respuestas reales del backend (22-oct-2026) para las pruebas de contrato
pruebas/e2e/        api-falsa.ts (backend en memoria, como el real) y flujos y diseño en celular
functions/api/      plan B: proxy de Cloudflare Pages → backend
```

Reglas iguales a las de Flutter: las pantallas nunca llaman a `fetch` ni a Firebase directo (solo repositorios y
hooks); ningún color fuera de `tokens.css` (una prueba lo vigila); errores junto a la acción y éxitos en toast; avisos
que llevan a la acción con `?accion=calificar|entregar`.

Diferencias propias de la web:
- Cada pestaña es una ruta (`/inicio`, `/envios?pestana=`, `/mi-viaje`, `/explorar`, `/chats`, `/perfil`): el botón
  atrás y los enlaces funcionan.
- Los detalles se pueden abrir recargando o desde un enlace: como no hay `GET /encomiendas/:id`, la encomienda se busca
  en mis envíos (remitente) o en mis entregas y las disponibles de mi ruta (viajero).
- Mientras la sesión carga se muestra el splash **sin cambiar la URL**, así un enlace profundo no se pierde.
- Firestore (~540 kB) se descarga solo al abrir el chat; la identidad usa solo correo y contraseña (sin iframe).
- Las fechas de viaje llegan como medianoche UTC (`2026-12-01T00:00:00.000Z`) y se leen como día del calendario
  (si no, en Colombia se verían un día antes).

## La API y el CORS (docs/10 §10.4)

El backend solo permite por CORS `http://localhost:5500` y `http://127.0.0.1:5500`. La URL sale de `VITE_API_URL`:

| Archivo | `VITE_API_URL` | Uso |
|---|---|---|
| `.env.development` | vacío | `npm run dev`: mismo origen, el proxy de Vite reenvía `/api` |
| `.env.directo` | `https://lapticon-backend.onrender.com` | `npm run dev:directo` en `localhost:5500` |
| `.env.production` | vacío (plan B) | La Pages Function `functions/api/[[ruta]].js` reenvía `/api` al backend |
| `.env.e2e` | vacío | `vite --mode e2e`: identidad y chat falsos; Playwright simula la API |

Cuando el profesor agregue `https://lapticon-pwa.pages.dev` al CORS (P12 de [`docs/06`](https://github.com/HaroldCCS/umb-computacion-movil-portal-encomiendas-lapicon/blob/main/docs/06-riesgos-y-preguntas.md)), se cambia `.env.production`
a la URL del backend. Para comprobarlo:

```bash
curl -sI -H "Origin: https://lapticon-pwa.pages.dev" https://lapticon-backend.onrender.com/api/ciudades/paises | grep -i access-control-allow-origin
```

## Desplegar en Cloudflare Pages (una vez, con tu cuenta)

1. Cloudflare → *Workers & Pages* → *Create* → *Pages* → *Connect to Git* → este repositorio.
2. Proyecto **`lapticon-pwa`** (si está ocupado, anota el nombre: es el origen que se le pide al profesor).
3. *Framework preset*: ninguno. *Build command*: `npm run build`. *Build output*: `dist`. *Root directory*: vacío (la raíz).
4. *Environment variables*: `NODE_VERSION = 22`, `BACKEND_URL = https://lapticon-backend.onrender.com` y
   **`VITE_FIREBASE_API_KEY`** (la misma de `.env.local`; sin ella la app abre pero no deja iniciar sesión).
5. Guardar y desplegar. La carpeta `functions/` se publica sola como la función del proxy.

Alternativa por terminal: `npx wrangler login` y `npm run build && npx wrangler pages deploy dist --project-name lapticon-pwa`.

Después: `npm run humo -- https://lapticon-pwa.pages.dev` comprueba los endpoints a través del proxy desplegado.

## Pruebas

- **Unidad y contrato (122):** lógica portada de las pruebas Dart con los mismos datos y textos; modelos contra
  `pruebas/respuestas/`; repositorios con un `fetch` falso; máquina de estados de la sesión.
- **Componentes:** validación al salir del campo, hojas (foco, Esc, palabra para confirmar), chips, toasts y `axe-core`.
- **Tokens:** contraste AA de cada par en claro y oscuro (como `tema_test.dart`) y ningún hexadecimal fuera de tokens.
- **E2E (26 en iPhone y Android):** cuenta nueva de punta a punta; remitente y viajero a la vez (publicar → tomar →
  entregar escribiendo ENTREGAR → calificar); deep links al recargar; retirar escribiendo RETIRAR; regla de un solo
  viaje en hoja; vuelo "sin verificar"; chat y asistente con su 500; aviso de servidor dormido; sin desbordes a 320 px,
  con letra al 200 % y en oscuro; toques ≥ 48 px y campos ≥ 16 px; manifest e íconos.
- **Humo:** 13 llamadas reales de solo lectura (verificado el 24-oct-2026: todas como espera la app).

## Pendiente

- Desplegar en Cloudflare Pages y probar instalada en iPhone y Android con las cuentas reales.
- Probar el chat PWA ↔ Flutter en ambos sentidos (mismo esquema; no se ha visto en vivo).
- Lighthouse móvil sobre la URL desplegada.

## Notas

- `npm audit` reporta vulnerabilidades solo en herramientas de desarrollo; `npm audit --omit=dev` da 0.
- TypeScript se queda en 5.9: `typescript-eslint` aún no soporta TypeScript 7.
