import { ArrowUp, Lock } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { presionable, Spinner } from '../../core/componentes/Boton'

/** Forma de las burbujas (también el asistente): esquina casi recta del lado
 *  de quien habla. */
export const formaBurbuja = (propia: boolean) => (propia ? 'rounded-[20px] rounded-br-md' : 'rounded-[20px] rounded-bl-md')

/** Alto visible real: en el teléfono el teclado lo achica (visualViewport),
 *  así el campo de escribir queda siempre encima del teclado. */
export function useAltoVisible(): number | null {
  const [alto, setAlto] = useState<number | null>(() => window.visualViewport?.height ?? null)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const alCambiar = () => {
      setAlto(vv.height)
      // iOS desplaza la página al abrir el teclado: se devuelve arriba.
      window.scrollTo(0, 0)
    }
    vv.addEventListener('resize', alCambiar)
    return () => vv.removeEventListener('resize', alCambiar)
  }, [])
  return alto
}

/** Pantalla de conversación a alto completo (chat y asistente). */
export function PantallaConversacion({ barra, children }: { barra: ReactNode; children: ReactNode }) {
  const alto = useAltoVisible()
  return (
    <div className="fixed inset-x-0 top-0 flex flex-col bg-fondo" style={{ height: alto ?? '100dvh' }}>
      {barra}
      <div className="mx-auto flex min-h-0 w-full max-w-app flex-1 flex-col">{children}</div>
    </div>
  )
}

/** Lista con lo más reciente abajo; baja sola cuando llega algo nuevo. */
export function ListaMensajes({ children, cambio }: { children: ReactNode; cambio: unknown }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const n = ref.current
    if (n) n.scrollTop = n.scrollHeight
  }, [cambio])
  return (
    <div ref={ref} role="log" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
      {children}
    </div>
  )
}

/** Separador centrado con el día ("Hoy", "Ayer", "3 oct"). */
export function SeparadorDia({ etiqueta }: { etiqueta: string }) {
  return (
    <div className="flex justify-center py-3">
      <span className="rounded-full bg-superficie2 px-3 py-1 text-[13px] font-medium text-texto2">{etiqueta}</span>
    </div>
  )
}

export const MAX_CARACTERES = 500

/**
 * Barra para escribir (chat y asistente). Si `cerrado`, se muestra
 * deshabilitada con la explicación (reto 4).
 */
export function Compositor({
  alEnviar,
  cerrado = false,
  enviando = false,
  pista = 'Escribe un mensaje',
  textoCerrado = 'Este chat se cerró porque la entrega terminó.',
}: {
  /** `true` si se envió (para limpiar el campo). */
  alEnviar: (texto: string) => Promise<boolean>
  cerrado?: boolean
  enviando?: boolean
  pista?: string
  textoCerrado?: string
}) {
  const [texto, setTexto] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)
  const p = presionable(0.9)

  // Crece con el texto hasta 5 líneas.
  useEffect(() => {
    const t = area.current
    if (!t) return
    t.style.height = 'auto'
    t.style.height = `${Math.min(t.scrollHeight, 5 * 24 + 24)}px`
  }, [texto])

  if (cerrado) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 border-t border-separador/70 bg-superficie2 px-4 pt-4"
        style={{ paddingBottom: 'calc(16px + var(--seguro-abajo))' }}
      >
        <Lock aria-hidden className="shrink-0 text-texto2" />
        <p className="text-[15px] text-texto2">{textoCerrado}</p>
      </div>
    )
  }

  const puede = texto.trim() !== '' && !enviando
  const enviar = async () => {
    if (!puede) return
    if (await alEnviar(texto.trim())) setTexto('')
    area.current?.focus()
  }

  return (
    <div
      className="flex items-end gap-2 border-t border-separador/70 bg-fondo pl-3 pr-2 pt-2"
      style={{ paddingBottom: 'calc(8px + var(--seguro-abajo))' }}
    >
      <textarea
        ref={area}
        rows={1}
        value={texto}
        maxLength={MAX_CARACTERES}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          // En computador, Enter envía y Mayús+Enter hace salto de línea.
          if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
            e.preventDefault()
            void enviar()
          }
        }}
        placeholder={pista}
        aria-label={pista}
        autoCapitalize="sentences"
        enterKeyHint="send"
        className="max-h-36 min-h-12 flex-1 resize-none rounded-3xl border-[1.5px] border-transparent bg-superficie2 px-4 py-3 text-[17px] leading-6 text-texto outline-none placeholder:text-texto3 focus:border-marca"
      />
      <button
        type="button"
        onClick={() => void enviar()}
        disabled={!puede}
        aria-label={enviando ? 'Enviando' : 'Enviar mensaje'}
        className={`${p.className} ${enviando ? '' : 'atenuado'} grid size-12 shrink-0 place-items-center rounded-full bg-marca-solido text-sobre-marca`}
        style={p.style}
      >
        {enviando ? <Spinner /> : <ArrowUp aria-hidden />}
      </button>
    </div>
  )
}
