/// <reference types="vitest/config" />
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** Backend compartido del curso (Render, plan gratuito). */
const BACKEND = 'https://lapticon-backend.onrender.com'

/**
 * Proxy de desarrollo: `/api` → backend, desde el mismo origen (sin CORS).
 * Sirve para probar desde el celular o el emulador en la red local, cuyos
 * orígenes (`http://192.168.x.x:5500`, `http://10.0.2.2:5500`) no están en la
 * lista blanca del backend. En producción lo hace la Pages Function (plan B,
 * docs/10 §10.4).
 */
const proxy = {
  '/api': { target: BACKEND, changeOrigin: true, secure: true },
}

/**
 * Service worker sin dependencias (plantilla de Cuentas Claras): toma
 * `src/pwa/sw.js` y, al construir, le inyecta la lista exacta de archivos del
 * build y una versión derivada de su contenido. Cada despliegue produce un
 * sw.js distinto (el navegador detecta la actualización) y el caché viejo se
 * borra completo al activarse el nuevo.
 */
function serviceWorker(): Plugin {
  return {
    name: 'lapticon-sw',
    apply: 'build',
    generateBundle(_opciones, bundle) {
      // Sin mapas ni .woff (los navegadores de hoy usan .woff2).
      const archivos = Object.keys(bundle).filter((f) => !f.endsWith('.map') && !f.endsWith('.woff'))
      const precache = [
        '/',
        '/manifest.webmanifest',
        '/icono.svg',
        '/icono-192.png',
        '/apple-touch-icon.png',
        ...archivos.map((f) => `/${f}`),
      ]
      const version = createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 12)
      const plantilla = readFileSync(fileURLToPath(new URL('./src/pwa/sw.js', import.meta.url)), 'utf8')
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: plantilla.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache)),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  server: {
    // 5500 es el único puerto que el CORS del backend permite en localhost:
    // `npm run dev:directo` llama a la API sin proxy desde aquí.
    port: 5500,
    strictPort: true,
    host: true,
    proxy,
  },
  preview: { port: 5500, strictPort: true, host: true, proxy },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Firestore (~540 kB) se descarga solo al abrir el chat.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // React cambia mucho menos que la app: así el caché sirve entre despliegues.
        manualChunks: (id) =>
          /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)
            ? 'react'
            : /node_modules\/(@firebase\/(app|auth|util|component|logger)|firebase\/(app|auth))\//.test(id)
              ? 'firebase-auth'
              : undefined,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/pruebas.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'functions/**/*.test.{ts,js}'],
  },
})
