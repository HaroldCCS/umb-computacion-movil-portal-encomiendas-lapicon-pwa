/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

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

export default defineConfig({
  plugins: [react()],
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
    rollupOptions: {
      output: {
        // React cambia mucho menos que la app: así el caché sirve entre despliegues.
        manualChunks: (id) =>
          /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)
            ? 'react'
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
