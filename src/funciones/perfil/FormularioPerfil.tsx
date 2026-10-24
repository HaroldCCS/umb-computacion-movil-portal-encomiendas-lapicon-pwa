import { ChevronDown, Globe, Phone } from 'lucide-react'
import { useState } from 'react'
import { Aviso } from '../../core/componentes/Aviso'
import { Boton } from '../../core/componentes/Boton'
import { Campo, Formulario, useFormulario } from '../../core/componentes/Campo'
import { useAccion } from '../../core/useAccion'
import { Validadores } from '../../core/validadores'
import type { Usuario } from '../../datos/modelos/usuario'
import { useSelectorPais } from '../catalogo/selectores'

/** Formulario compartido por "Completar perfil" y "Editar perfil". */
export function FormularioPerfil({
  uid,
  email,
  inicial,
  textoEnviar,
  alEnviar,
}: {
  uid: string
  email: string | null
  inicial: Usuario | null
  textoEnviar: string
  /** Si falla, el error se muestra junto al botón. */
  alEnviar: (datos: Usuario) => Promise<void>
}) {
  const form = useFormulario()
  const elegirPais = useSelectorPais()
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [apellido, setApellido] = useState(inicial?.apellido ?? '')
  const [telefono, setTelefono] = useState(inicial?.telefono ?? '')
  const [nacionalidad, setNacionalidad] = useState(inicial?.nacionalidad || 'Colombia')
  const { cargando, error, ejecutar } = useAccion()

  const enviar = () => {
    if (!form.validar()) return
    void ejecutar(() =>
      alEnviar({
        uid,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.replace(/\s/g, ''),
        nacionalidad: nacionalidad.trim(),
        email,
        rol: inicial?.rol ?? null,
        creadoEn: inicial?.creadoEn ?? null,
      }),
    )
  }

  return (
    <Formulario form={form} alEnviar={enviar} className="flex flex-col gap-4">
      <Campo
        etiqueta="Nombre"
        valor={nombre}
        alCambiar={setNombre}
        pista="Laura"
        mayusculas="words"
        autocompletar="given-name"
        teclaEnter="next"
        validador={(v) => Validadores.nombre(v, 'El nombre')}
      />
      <Campo
        etiqueta="Apellido"
        valor={apellido}
        alCambiar={setApellido}
        pista="Gómez"
        mayusculas="words"
        autocompletar="family-name"
        teclaEnter="next"
        validador={(v) => Validadores.nombre(v, 'El apellido')}
      />
      <Campo
        etiqueta="Teléfono"
        valor={telefono}
        alCambiar={(v) => setTelefono(v.replace(/[^\d\s+()-]/g, ''))}
        pista="300 000 0000"
        ayuda="Lo verá la persona con la que coordines una entrega."
        tipo="tel"
        modoTeclado="tel"
        autocompletar="tel"
        teclaEnter="next"
        validador={Validadores.telefono}
        icono={Phone}
      />
      <Campo
        etiqueta="Nacionalidad"
        valor={nacionalidad}
        icono={Globe}
        checkValido={false}
        sufijo={<ChevronDown aria-hidden size={22} className="mr-3 shrink-0 text-texto2" />}
        validador={(v) => Validadores.requerido(v, 'La nacionalidad')}
        alTocar={async () => {
          const p = await elegirPais(nacionalidad)
          if (p) setNacionalidad(p)
        }}
      />
      <div className="mt-2 flex flex-col gap-3">
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton tipo="submit" cargando={cargando} textoCargando="Guardando…">
          {textoEnviar}
        </Boton>
      </div>
    </Formulario>
  )
}
