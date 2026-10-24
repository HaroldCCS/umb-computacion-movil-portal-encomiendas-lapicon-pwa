/** @type {import('tailwindcss').Config} */
// En la fase 1 los colores, radios y medidas pasan a ser SOLO los tokens v2
// (variables CSS de src/core/tema/tokens.css). Por ahora, la configuración base.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
