import { Circle, CircleCheck, Package, PlaneTakeoff } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../../app/contexto'
import { Aviso } from '../../core/componentes/Aviso'
import { Boton, Enlace, presionable } from '../../core/componentes/Boton'
import { IndicadorPaso } from '../../core/componentes/Marca'
import { Pantalla } from '../../core/componentes/Pantalla'
import { Rutas } from '../../core/rutas'
import { useAccion } from '../../core/useAccion'
import { InfoRol, ROLES, type Rol } from '../../datos/modelos/rol'
import { FormularioPerfil } from '../perfil/FormularioPerfil'

/** Paso 1 de 2: datos de contacto → `POST /api/users/register`. */
export function CompletarPerfil() {
  const s = useSesion()
  if (!s.usuario) return null
  return (
    <Pantalla
      titulo="Tu perfil"
      subtitulo="Así te reconocerán remitentes y viajeros."
      accion={<Enlace onClick={() => void s.control.cerrarSesion()}>Salir</Enlace>}
    >
      <IndicadorPaso paso={1} total={2} />
      <FormularioPerfil
        uid={s.usuario.uid}
        email={s.usuario.email}
        inicial={s.perfil}
        textoEnviar="Continuar"
        alEnviar={(d) => s.control.registrarPerfil(d)}
      />
    </Pantalla>
  )
}

/** Tarjeta grande seleccionable: ícono con el acento del rol, título,
 *  beneficio y marca de selección (no solo color). */
export function TarjetaRol({ rol, seleccionada, onClick }: { rol: Rol; seleccionada: boolean; onClick: () => void }) {
  const info = InfoRol[rol]
  const Icono = rol === 'remitente' ? Package : PlaneTakeoff
  const p = presionable(0.98)
  return (
    <button
      type="button"
      role="radio"
      aria-checked={seleccionada}
      onClick={onClick}
      className={`${p.className} flex w-full items-center gap-4 rounded-tarjeta border p-5 text-left transition-colors duration-200 ${
        seleccionada ? 'border-2' : 'tarjeta border-separador'
      }`}
      style={{
        ...p.style,
        ...(seleccionada && {
          borderColor: `rgb(var(--${rol}))`,
          background: `linear-gradient(rgb(var(--${rol}) / 0.12), rgb(var(--${rol}) / 0.12)), rgb(var(--superficie))`,
        }),
      }}
    >
      <span
        aria-hidden
        className={`grid size-14 shrink-0 place-items-center rounded-[18px] ${rol === 'remitente' ? 'bg-remitente text-sobre-remitente' : 'bg-viajero text-sobre-viajero'}`}
      >
        <Icono size={28} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[19px] font-bold text-texto">{info.titulo}</span>
        <span className="mt-1 block text-[15px] leading-[1.35] text-texto2">{info.descripcion}</span>
      </span>
      {seleccionada ? (
        <CircleCheck aria-hidden className="shrink-0 text-marca" />
      ) : (
        <Circle aria-hidden className="shrink-0 text-texto3" />
      )}
    </button>
  )
}

/** Paso 2 de 2 (o cambio de rol desde el perfil). */
export function ElegirRol() {
  const s = useSesion()
  const navigate = useNavigate()
  const [elegido, setElegido] = useState<Rol | null>(s.rol)
  const { cargando, error, ejecutar } = useAccion()
  const cambiando = s.estado === 'listo'
  const nombre = s.perfil?.nombre

  const continuar = () => {
    if (!elegido) return
    void ejecutar(async () => {
      await s.control.elegirRol(elegido)
      navigate(Rutas.inicio, { replace: true })
    })
  }

  return (
    <Pantalla
      titulo={cambiando ? 'Cambiar de rol' : 'Elige cómo empezar'}
      atras={cambiando ? 'Perfil' : undefined}
      subtitulo={`¿Qué quieres hacer hoy${nombre ? `, ${nombre}` : ''}?`}
    >
      {!cambiando && <IndicadorPaso paso={2} total={2} />}
      <div className="flex flex-col">
        <div role="radiogroup" aria-label="Rol" className="flex flex-col gap-3">
          {ROLES.map((r) => (
            <TarjetaRol key={r} rol={r} seleccionada={elegido === r} onClick={() => setElegido(r)} />
          ))}
        </div>
        <p className="mt-4 text-center text-[15px] text-texto2">Puedes cambiar de rol cuando quieras desde tu perfil.</p>
        <div className="mt-6 flex flex-col gap-3">
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Boton cargando={cargando} textoCargando="Guardando…" onClick={elegido ? continuar : null}>
            Continuar
          </Boton>
        </div>
      </div>
    </Pantalla>
  )
}
