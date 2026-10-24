// Port de tema_test.dart: contraste AA de cada par de tokens en claro y oscuro,
// y que ningún componente use colores sueltos (todo sale de tokens.css).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(__dirname, 'tokens.css'), 'utf8')

/** Variables `--x: r g b;` de un bloque del CSS. */
function bloque(inicio: string): Record<string, [number, number, number]> {
  const desde = css.indexOf(inicio)
  const texto = css.slice(desde, css.indexOf('}', desde))
  const vars: Record<string, [number, number, number]> = {}
  for (const m of texto.matchAll(/--([a-z0-9-]+): (\d+) (\d+) (\d+);/g)) vars[m[1]!] = [Number(m[2]), Number(m[3]), Number(m[4])]
  return vars
}

const claro = bloque(':root {')
const oscuro = bloque(":root[data-tema='oscuro'] {")

function luminancia([r, g, b]: [number, number, number]) {
  const c = [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!
}
const contraste = (a: [number, number, number], b: [number, number, number]) => {
  const [la, lb] = [luminancia(a), luminancia(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const PARES = [
  ['texto', 'fondo'], ['texto', 'superficie'], ['texto2', 'fondo'], ['texto2', 'superficie'], ['texto2', 'superficie2'],
  ['marca', 'superficie'], ['sobre-marca', 'marca-solido'], ['marca', 'marca-suave'],
  ['sobre-remitente', 'remitente'], ['sobre-viajero', 'viajero'],
  ['exito', 'exito-suave'], ['atencion', 'atencion-suave'], ['peligro', 'peligro-suave'], ['info', 'info-suave'],
  ['exito', 'superficie'], ['atencion', 'superficie'], ['peligro', 'superficie'],
] as const

describe.each([
  ['claro', claro],
  ['oscuro', oscuro],
])('tokens en %s', (_nombre, t) => {
  it('tiene los mismos tokens de color que Flutter', () => {
    expect(Object.keys(t).length).toBeGreaterThanOrEqual(23)
  })
  it.each(PARES)('%s sobre %s cumple AA (≥ 4.5:1)', (frente, fondo) => {
    expect(contraste(t[frente]!, t[fondo]!)).toBeGreaterThanOrEqual(4.5)
  })
})

it('el oscuro por sistema y el forzado son iguales', () => {
  expect(bloque(":root:not([data-tema='claro']) {")).toEqual(oscuro)
})

it('ningún archivo de src usa colores hexadecimales fuera de tokens.css', () => {
  const malos: string[] = []
  const recorrer = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const ruta = join(dir, f)
      if (statSync(ruta).isDirectory()) recorrer(ruta)
      else if (/\.(tsx?|css)$/.test(f) && !f.endsWith('.test.ts') && f !== 'tokens.css') {
        const texto = readFileSync(ruta, 'utf8')
        if (/#[0-9a-fA-F]{3,8}\b(?![\w-])/.test(texto.replace(/&#\d+;/g, ''))) malos.push(ruta)
      }
    }
  }
  recorrer(join(__dirname, '../..'))
  expect(malos).toEqual([])
})

it('las clases del hero son literales (Tailwind no ve las armadas con plantillas)', () => {
  const estilos = readFileSync(join(__dirname, '../../estilos.css'), 'utf8')
  for (const c of ['hero-remitente', 'hero-viajero']) expect(estilos).toContain(`.${c}`)
})
