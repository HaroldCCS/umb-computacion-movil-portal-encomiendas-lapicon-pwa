/**
 * Validaciones de formularios (port de lib/core/utils/validators.dart).
 * Devuelven `null` si el valor es válido o el mensaje en español.
 */

export type Validador = (valor: string) => string | null

const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/
const NOMBRE = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/

export const Validadores = {
  requerido(valor: string | null | undefined, campo = 'Este campo'): string | null {
    if (!valor || valor.trim() === '') return `${campo} es obligatorio.`
    return null
  },

  email(valor: string | null | undefined): string | null {
    const v = valor?.trim() ?? ''
    if (v === '') return 'Escribe tu correo.'
    if (!EMAIL.test(v)) return 'Revisa el correo: parece incompleto.'
    return null
  },

  password(valor: string | null | undefined): string | null {
    const v = valor ?? ''
    if (v === '') return 'Escribe tu contraseña.'
    if (v.length < 6) return 'Usa al menos 6 caracteres.'
    return null
  },

  confirmarPassword(original: () => string): Validador {
    return (valor) => {
      if (!valor) return 'Repite la contraseña.'
      if (valor !== original()) return 'Las contraseñas no coinciden.'
      return null
    }
  },

  nombre(valor: string | null | undefined, campo = 'El nombre'): string | null {
    const v = valor?.trim() ?? ''
    if (v === '') return `${campo} es obligatorio.`
    if (v.length < 2) return `${campo} es muy corto.`
    if (v.length > 50) return `${campo} es muy largo.`
    if (!NOMBRE.test(v)) return `${campo} solo puede tener letras.`
    return null
  },

  telefono(valor: string | null | undefined): string | null {
    const digitos = (valor ?? '').replace(/[\s()+-]/g, '')
    if (digitos === '') return 'Escribe tu número de teléfono.'
    if (!/^\d+$/.test(digitos)) return 'Usa solo números.'
    if (digitos.length < 7 || digitos.length > 15) return 'Debe tener entre 7 y 15 dígitos.'
    return null
  },

  /** 0 = vacía, 1 = débil, 2 = media, 3 = fuerte. */
  fortalezaPassword(valor: string): 0 | 1 | 2 | 3 {
    if (valor === '') return 0
    let puntos = 0
    if (valor.length >= 8) puntos++
    if (/[A-Z]/.test(valor) && /[a-z]/.test(valor)) puntos++
    if (/\d/.test(valor)) puntos++
    if (/[^A-Za-z0-9]/.test(valor)) puntos++
    if (valor.length < 6) return 1
    return puntos <= 1 ? 1 : puntos === 2 ? 2 : 3
  },
}
