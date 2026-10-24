/** @type {import('tailwindcss').Config} */
// Solo los tokens v2 (src/core/tema/tokens.css): no hay colores sueltos.
// `rgb(var(--x) / <alpha-value>)` permite `bg-marca/10`.
const token = (nombre) => `rgb(var(--${nombre}) / <alpha-value>)`

const colores = [
  'fondo', 'superficie', 'superficie2', 'separador',
  'texto', 'texto2', 'texto3',
  'marca', 'marca-solido', 'sobre-marca', 'marca-suave',
  'remitente', 'sobre-remitente', 'viajero', 'sobre-viajero',
  'exito', 'exito-suave', 'atencion', 'atencion-suave',
  'peligro', 'peligro-suave', 'info', 'info-suave',
  'pastel-azul', 'pastel-violeta', 'pastel-ambar', 'pastel-rojo', 'pastel-verde', 'pastel-celeste',
  'vidrio-menta', 'vidrio-ambar', 'vidrio-celeste', 'blanco', 'negro',
]

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      ...Object.fromEntries(colores.map((c) => [c, token(c)])),
    },
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        campo: 'var(--radio-campo)',
        boton: 'var(--radio-boton)',
        tarjeta: 'var(--radio-tarjeta)',
        hero: 'var(--radio-hero)',
      },
      boxShadow: {
        tarjeta: 'var(--sombra-tarjeta)',
        primario: 'var(--sombra-primario)',
      },
      spacing: {
        margen: 'var(--margen)',
        bloque: 'var(--bloque)',
      },
      maxWidth: {
        app: 'var(--ancho-maximo)',
      },
      transitionTimingFunction: {
        entrada: 'var(--curva-entrada)',
        hoja: 'var(--curva-hoja)',
      },
    },
  },
  plugins: [],
}
