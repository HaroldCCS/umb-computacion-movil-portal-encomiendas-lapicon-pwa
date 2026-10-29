import { Check, CircleCheck, Eye, EyeOff, type LucideIcon } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import type { Validador } from '../validadores'
import { presionable } from './Boton'

/* ---------- Formulario: valida todos los campos al enviar ---------- */

type Validar = () => boolean
interface CtxFormulario {
  registrar: (v: Validar) => () => void
}
const Ctx = createContext<CtxFormulario | null>(null)

/** `form.validar()` muestra el error de cada campo y dice si todos pasan;
 *  enfoca el primero con error (como el Form de Flutter). */
export function useFormulario() {
  const campos = useRef(new Set<Validar>())
  const registrar = useCallback((v: Validar) => {
    campos.current.add(v)
    return () => {
      campos.current.delete(v)
    }
  }, [])
  const contexto = useMemo(() => ({ registrar }), [registrar])
  const validar = useCallback(() => {
    let ok = true
    for (const v of campos.current) ok = v() && ok
    if (!ok) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
    }
    return ok
  }, [])
  return { contexto, validar }
}

export function Formulario({
  form,
  children,
  alEnviar,
  className = '',
}: {
  form: ReturnType<typeof useFormulario>
  children: ReactNode
  /** Enter en el último campo envía (y los gestores de contraseñas lo entienden). */
  alEnviar?: () => void
  className?: string
}) {
  return (
    <Ctx.Provider value={form.contexto}>
      <form
        noValidate
        className={className}
        onSubmit={(e) => {
          e.preventDefault()
          alEnviar?.()
        }}
      >
        {children}
      </form>
    </Ctx.Provider>
  )
}

/** Etiqueta de campo: arriba, 13/500. Nunca placeholder como etiqueta. */
export function EtiquetaCampo({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 ml-1 block text-[13px] font-medium text-texto2">
      {children}
    </label>
  )
}

const claseCaja = (estado: 'normal' | 'valido' | 'error') =>
  `flex items-center rounded-campo bg-superficie2 border-[1.2px] transition-colors focus-within:border-2 ${
    estado === 'error'
      ? 'border-peligro focus-within:border-peligro'
      : estado === 'valido'
        ? 'border-exito focus-within:border-marca'
        : 'border-transparent focus-within:border-marca'
  }`

interface PropsCampo {
  etiqueta: string
  valor: string
  alCambiar?: (v: string) => void
  validador?: Validador
  pista?: string
  ayuda?: string
  icono?: LucideIcon
  tipo?: 'text' | 'email' | 'tel' | 'password' | 'search' | 'date'
  modoTeclado?: HTMLAttributes<HTMLInputElement>['inputMode']
  autocompletar?: string
  teclaEnter?: 'next' | 'done' | 'send' | 'search' | 'go'
  mayusculas?: 'none' | 'sentences' | 'words' | 'characters'
  lineas?: number
  maxLength?: number
  /** Campo que abre una hoja (ciudad, país, fecha): se toca, no se escribe. */
  alTocar?: () => void
  sufijo?: ReactNode
  checkValido?: boolean
  /** Error que viene de fuera (se muestra igual que el del validador). */
  errorExterno?: string | null
  autoFocus?: boolean
}

/**
 * Campo del sistema v2 (port de Campo):
 * - Etiqueta visible **encima**.
 * - Valida al **salir**; después de un error re-valida en cada pulsación.
 * - Validación positiva: check verde cuando el valor es correcto.
 */
export function Campo(p: PropsCampo) {
  const id = useId()
  const form = useContext(Ctx)
  const [tocado, setTocado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const ref = useRef({ valor: p.valor, validador: p.validador })
  useLayoutEffect(() => {
    ref.current = { valor: p.valor, validador: p.validador }
  })

  useEffect(
    () =>
      form?.registrar(() => {
        const e = ref.current.validador?.(ref.current.valor) ?? null
        setTocado(true)
        setError(e)
        return e === null
      }),
    [form],
  )

  const validarAhora = (v: string) => setError(p.validador?.(v) ?? null)
  const mostrado = p.errorExterno ?? error
  const valido = (p.checkValido ?? true) && p.tipo !== 'password' && tocado && p.valor !== '' && !mostrado
  const estado = mostrado ? 'error' : valido ? 'valido' : 'normal'
  const descripcion = [mostrado ? `${id}-error` : null, p.ayuda ? `${id}-ayuda` : null].filter(Boolean).join(' ')
  const Icono = p.icono

  const comunes = {
    id,
    value: p.valor,
    placeholder: p.pista,
    'aria-invalid': mostrado ? true : undefined,
    'aria-describedby': descripcion || undefined,
    autoFocus: p.autoFocus,
    maxLength: p.maxLength,
    className:
      'min-h-[52px] w-full min-w-0 flex-1 bg-transparent px-4 py-3 text-[17px] text-texto outline-none placeholder:text-texto3',
    onChange: (e: { target: { value: string } }) => {
      p.alCambiar?.(e.target.value)
      if (tocado || error) validarAhora(e.target.value)
    },
    onBlur: () => {
      if (p.valor !== '') {
        setTocado(true)
        validarAhora(p.valor)
      }
    },
  }

  let sufijo = p.sufijo
  if (p.tipo === 'password') {
    sufijo = (
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="grid size-12 shrink-0 place-items-center text-texto2"
      >
        {visible ? <EyeOff aria-hidden size={22} /> : <Eye aria-hidden size={22} />}
      </button>
    )
  } else if (!sufijo && valido) {
    sufijo = (
      <span className="pr-3 text-exito">
        <CircleCheck aria-label="Campo válido" size={22} />
      </span>
    )
  }

  return (
    <div className="flex flex-col">
      <EtiquetaCampo htmlFor={id}>{p.etiqueta}</EtiquetaCampo>
      <div className={claseCaja(estado)}>
        {Icono && <Icono aria-hidden size={22} className="ml-4 shrink-0 text-texto2" />}
        {p.alTocar ? (
          // Se toca para abrir una hoja: botón con el valor, no un campo de texto.
          <button
            type="button"
            {...{ id, 'aria-invalid': comunes['aria-invalid'], 'aria-describedby': comunes['aria-describedby'] }}
            // El lector oye la etiqueta Y lo elegido ("Nacionalidad: Colombia").
            aria-label={`${p.etiqueta}: ${p.valor || p.pista || 'sin elegir'}`}
            onClick={p.alTocar}
            className={`${comunes.className} text-left ${p.valor ? '' : 'text-texto3'}`}
          >
            {p.valor || p.pista}
          </button>
        ) : p.lineas && p.lineas > 1 ? (
          <textarea
            {...comunes}
            rows={p.lineas}
            autoCapitalize={p.mayusculas}
            enterKeyHint={p.teclaEnter === 'next' ? 'enter' : p.teclaEnter}
            className={`${comunes.className} resize-none`}
          />
        ) : (
          <input
            {...comunes}
            type={p.tipo === 'password' && visible ? 'text' : (p.tipo ?? 'text')}
            inputMode={p.modoTeclado}
            autoComplete={p.autocompletar}
            enterKeyHint={p.teclaEnter}
            autoCapitalize={p.mayusculas ?? (p.tipo === 'email' || p.tipo === 'password' ? 'none' : undefined)}
            autoCorrect={p.tipo === 'password' || p.tipo === 'email' ? 'off' : undefined}
            spellCheck={p.tipo === 'password' || p.tipo === 'email' ? false : undefined}
          />
        )}
        {sufijo}
      </div>
      {mostrado ? (
        <p id={`${id}-error`} className="ml-1 mt-1.5 text-[13px] font-medium text-peligro">
          {mostrado}
        </p>
      ) : p.ayuda ? (
        <p id={`${id}-ayuda`} className="ml-1 mt-1.5 text-[13px] text-texto2">
          {p.ayuda}
        </p>
      ) : null}
      {p.maxLength && p.lineas && p.lineas > 1 ? (
        <p aria-hidden className="mr-1 mt-1 text-right text-xs text-texto2">
          {p.valor.length}/{p.maxLength}
        </p>
      ) : null}
    </div>
  )
}

/** Contraseña con ojo y aviso que se pone verde al cumplir el mínimo. */
export function CampoContrasena({
  minimo,
  nueva = false,
  ...p
}: Omit<PropsCampo, 'tipo' | 'autocompletar'> & { minimo?: number; nueva?: boolean }) {
  const cumple = minimo !== undefined && p.valor.length >= minimo
  return (
    <div className="flex flex-col">
      <Campo {...p} tipo="password" autocompletar={nueva ? 'new-password' : 'current-password'} />
      {minimo !== undefined && (
        <p className={`ml-1 mt-1.5 text-[13px] ${cumple ? 'font-semibold text-exito' : 'text-texto2'}`}>
          {cumple ? '✓ ' : ''}Mínimo {minimo} caracteres.
        </p>
      )}
    </div>
  )
}

/** Valor grande centrado ("¿Cuánto pagas?") con la moneda delante. */
export function CampoMonto({
  valor,
  alCambiar,
  moneda,
  etiqueta = '¿Cuánto?',
  validador,
}: {
  valor: string
  alCambiar: (v: string) => void
  moneda: string
  etiqueta?: string
  validador?: Validador
}) {
  const id = useId()
  const form = useContext(Ctx)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef({ valor, validador })
  useLayoutEffect(() => {
    ref.current = { valor, validador }
  })
  useEffect(
    () =>
      form?.registrar(() => {
        const e = ref.current.validador?.(ref.current.valor) ?? null
        setError(e)
        return e === null
      }),
    [form],
  )
  return (
    <div className="rounded-tarjeta bg-superficie2 px-4 py-5 text-center">
      <label htmlFor={id} className="block text-[13px] font-medium text-texto2">
        {etiqueta}
      </label>
      <div className="flex items-center">
        <span className="w-16 shrink-0 text-xl font-semibold text-texto2">{moneda.toUpperCase()}</span>
        <input
          id={id}
          value={valor}
          inputMode="numeric"
          enterKeyHint="next"
          placeholder="0"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            const formateado = e.target.value.replace(/[^\d]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
            alCambiar(formateado)
            if (error) setError(validador?.(formateado) ?? null)
          }}
          className="cifras min-w-0 flex-1 bg-transparent text-center text-[40px] font-bold text-texto outline-none placeholder:text-texto3"
        />
        <span aria-hidden className="w-16 shrink-0" />
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-[13px] font-medium text-peligro">
          {error}
        </p>
      )}
    </div>
  )
}

/* ---------- Chips ---------- */

export interface OpcionChip<T> {
  valor: T
  texto: string
  /** No se muestra en 0. */
  contador?: number | null
}

/** Pestañas en píldora con la activa en negro (en oscuro, en blanco). */
export function Chips<T extends string>({
  opciones,
  valor,
  alCambiar,
  etiqueta,
  className = 'px-4',
}: {
  opciones: OpcionChip<T>[]
  valor: T
  alCambiar: (v: T) => void
  etiqueta?: string
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className={`flex gap-2 overflow-x-auto ${className}`} style={{ scrollbarWidth: 'none' }}>
      {opciones.map((o) => {
        const activa = o.valor === valor
        const p = presionable(0.95)
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={activa}
            aria-label={(o.contador ?? 0) > 0 ? `${o.texto}, ${o.contador}` : undefined}
            onClick={() => alCambiar(o.valor)}
            className={`${p.className} shrink-0 py-1`}
            style={p.style}
          >
            <span
              className={`flex min-h-10 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold transition-colors ${
                activa ? 'border-texto bg-texto text-fondo' : 'border-separador bg-superficie text-texto2'
              }`}
            >
              {o.texto}
              {(o.contador ?? 0) > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-atencion px-1.5 text-xs font-bold text-superficie">
                  {o.contador}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Selección múltiple (sugerencias al calificar): las elegidas con check. */
export function ChipsMultiples({
  opciones,
  seleccionadas,
  alCambiar,
}: {
  opciones: string[]
  seleccionadas: Set<string>
  alCambiar: (o: string) => void
}) {
  return (
    <div className="flex flex-wrap justify-center gap-x-2">
      {opciones.map((o) => {
        const activa = seleccionadas.has(o)
        const p = presionable(0.95)
        return (
          <button
            key={o}
            type="button"
            aria-pressed={activa}
            onClick={() => alCambiar(o)}
            className={`${p.className} py-1`}
            style={p.style}
          >
            <span
              className={`flex min-h-10 items-center gap-1 rounded-full border px-3.5 text-[15px] font-semibold transition-colors ${
                activa ? 'border-texto bg-texto text-fondo' : 'border-separador bg-superficie text-texto2'
              }`}
            >
              {activa && <Check aria-hidden size={16} />}
              {o}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Para acciones irreversibles: escribir la palabra habilita el botón. */
export function ConfirmacionEscrita({
  palabra,
  valor,
  alCambiar,
}: {
  palabra: string
  valor: string
  alCambiar: (v: string) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-1.5 ml-1 text-[13px] text-texto2">
        Para confirmar, escribe <strong className="font-mono font-bold text-texto">{palabra}</strong>
      </label>
      <input
        id={id}
        value={valor}
        onChange={(e) => alCambiar(e.target.value.toUpperCase())}
        placeholder={palabra}
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        aria-label={`Escribe ${palabra} para confirmar`}
        className="min-h-[52px] rounded-campo border-[1.2px] border-transparent bg-superficie2 px-4 font-mono text-[17px] tracking-[3px] text-texto outline-none placeholder:text-texto3 focus:border-2 focus:border-marca"
      />
    </div>
  )
}

/** ¿Lo escrito coincide con la palabra? (sin importar mayúsculas). */
export const coincide = (escrito: string, palabra: string) => escrito.trim().toUpperCase() === palabra.toUpperCase()
