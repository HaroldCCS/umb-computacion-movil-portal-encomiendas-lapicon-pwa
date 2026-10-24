import { useCallback, useRef, useState } from 'react'
import { AppError } from './red/errores'

/** Mensaje humano de cualquier error (los de la app ya lo traen). */
export function mensajeDe(e: unknown, respaldo = 'Algo salió mal. Intenta de nuevo.'): string {
  return e instanceof AppError ? e.message : respaldo
}

/**
 * Una acción con carga y error junto al botón (docs/08 §8.6-2). Ignora el
 * doble toque mientras corre.
 */
export function useAccion() {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const corriendo = useRef(false)
  const ejecutar = useCallback(async (accion: () => Promise<void>) => {
    if (corriendo.current) return
    corriendo.current = true
    setError(null)
    setCargando(true)
    try {
      await accion()
    } catch (e) {
      setError(mensajeDe(e))
    } finally {
      corriendo.current = false
      setCargando(false)
    }
  }, [])
  return { cargando, error, setError, ejecutar }
}
