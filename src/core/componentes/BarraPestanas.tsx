import { Plus, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { presionable } from './Boton'

export interface PestanaItem {
  ruta: string
  texto: string
  icono: LucideIcon
  /** Algo por hacer (no se muestra en 0). */
  contador?: number
  /** Lo explica al lector ("2 por calificar"). */
  etiquetaContador?: string
}

/**
 * Píldora flotante de vidrio con las secciones y, aparte, el botón circular
 * de la acción principal. Sin `alMas` el botón no se muestra (docs/08 §8.4:
 * no mostrar lo que no aplica). Cada pestaña es una ruta real.
 */
export function BarraPestanas({
  items,
  alMas,
  etiquetaMas = 'Crear',
}: {
  items: PestanaItem[]
  alMas?: (() => void) | null
  etiquetaMas?: string
}) {
  const mas = presionable(0.9)
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-app items-center gap-3 px-4"
      style={{ paddingBottom: 'calc(var(--seguro-abajo) + 8px)' }}
    >
      <ul
        className="vidrio flex h-[62px] flex-1 items-stretch rounded-full border border-separador p-1.5"
        style={{ background: 'rgb(var(--superficie) / 0.86)' }}
      >
        {items.map((it, i) => {
          const Icono = it.icono
          const contador = it.contador ?? 0
          const p = presionable(0.9)
          return (
            <li key={it.ruta} className="flex flex-1">
              <NavLink
                to={it.ruta}
                replace
                aria-label={`${it.texto}${contador > 0 ? `, ${it.etiquetaContador ?? `${contador} pendientes`}` : ''}, pestaña ${i + 1} de ${items.length}`}
                className={({ isActive }) =>
                  `${p.className} flex flex-1 flex-col items-center justify-center rounded-full transition-colors duration-200 ${
                    isActive ? 'bg-marca-suave text-marca' : 'text-texto2'
                  }`
                }
                style={p.style}
              >
                <span className="relative">
                  <Icono aria-hidden size={24} />
                  {contador > 0 && (
                    <span
                      key={contador}
                      aria-hidden
                      className="rebote absolute -right-2.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-superficie bg-peligro px-1 text-[10px] font-bold text-superficie"
                    >
                      {contador > 99 ? '99+' : contador}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 max-w-full truncate text-[11px] font-semibold">{it.texto}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
      {alMas && (
        <button
          type="button"
          onClick={alMas}
          aria-label={etiquetaMas}
          title={etiquetaMas}
          className={`${mas.className} grid size-[62px] shrink-0 place-items-center rounded-full bg-marca-solido text-sobre-marca shadow-primario`}
          style={mas.style}
        >
          <Plus aria-hidden size={30} />
        </button>
      )}
    </nav>
  )
}
