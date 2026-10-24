import { useQueryClient } from '@tanstack/react-query'
import { Download, LogOut, MessageSquareText, Package, Pencil, PlaneTakeoff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../../app/contexto'
import { Esqueleto } from '../../core/componentes/Aviso'
import { useHojas } from '../../core/componentes/Hoja'
import { Avatar, Estrellas } from '../../core/componentes/Insignia'
import { Pantalla, useVolver } from '../../core/componentes/Pantalla'
import { Fila, FilaAccion, Grupo } from '../../core/componentes/Tarjeta'
import { useToast } from '../../core/componentes/Toast'
import { Fmt } from '../../core/formato'
import { Rutas } from '../../core/rutas'
import { mensajeDe } from '../../core/useAccion'
import { Claves, useResumenCalificaciones } from '../../datos/consultas'
import { InfoRol, opuesto, type Rol } from '../../datos/modelos/rol'
import { nombreCompleto } from '../../datos/modelos/usuario'
import { useInstalar } from '../../pwa/AvisosPwa'
import { FormularioPerfil } from './FormularioPerfil'

/** Avatar grande, nombre, correo y el rol actual con su acento. */
function Cabecera({ nombre, email, rol }: { nombre: string; email: string; rol: Rol }) {
  const Icono = rol === 'remitente' ? Package : PlaneTakeoff
  return (
    <div className="flex flex-col items-center text-center">
      <Avatar nombre={nombre} tam={80} />
      <h2 className="mt-3 text-xl font-bold text-texto">{nombre}</h2>
      {email && <p className="text-[15px] text-texto2">{email}</p>}
      <p
        aria-label={`Rol actual: ${InfoRol[rol].nombre}`}
        className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[15px] font-semibold ${
          rol === 'remitente' ? 'bg-remitente text-sobre-remitente' : 'bg-viajero text-sobre-viajero'
        }`}
      >
        <Icono aria-hidden size={18} />
        <span aria-hidden>{InfoRol[rol].nombre}</span>
      </p>
    </div>
  )
}

function Calificaciones({ uid }: { uid: string }) {
  const navigate = useNavigate()
  const resumen = useResumenCalificaciones(uid)
  const r = resumen.data
  return (
    <Grupo titulo="Calificaciones">
      {resumen.isError ? (
        <p className="p-4 text-[15px] text-texto2">{mensajeDe(resumen.error, 'No pudimos cargar tus calificaciones.')}</p>
      ) : !r ? (
        <div className="p-4">
          <Esqueleto alto={44} />
        </div>
      ) : r.total === 0 ? (
        <p className="p-4 text-[15px] text-texto2">
          Aún no tienes calificaciones. Aparecerán aquí después de tu primera entrega.
        </p>
      ) : (
        <div className="flex items-center gap-3 p-4">
          <span className="display cifras text-[32px] text-texto">{Fmt.decimal(r.promedio ?? 0)}</span>
          <span className="flex flex-col">
            <Estrellas valor={r.promedio ?? 0} tam={20} />
            <span className="text-[15px] text-texto2">
              {r.total} {r.total === 1 ? 'calificación' : 'calificaciones'}
            </span>
          </span>
        </div>
      )}
      {r && r.total > 0 && (
        <FilaAccion titulo="Ver reseñas" icono={MessageSquareText} tono="pastel-ambar" onClick={() => navigate(Rutas.resenas(uid))} />
      )}
    </Grupo>
  )
}

/**
 * Perfil estilo ajustes: cabecera, calificaciones, datos de contacto y
 * cuenta (cambiar de rol, instalar la app, cerrar sesión).
 */
export function PerfilPantalla() {
  const s = useSesion()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()
  const { confirmar } = useHojas()
  const instalar = useInstalar()
  const perfil = s.perfil
  const rol = s.rol
  if (!perfil || !rol) return null
  const otro = opuesto(rol)

  /** Reversible: un toque (docs/08 §8.6-5). */
  const cambiarRol = async () => {
    try {
      await s.control.elegirRol(otro)
      toast(`Ahora estás en modo ${InfoRol[otro].nombre.toLowerCase()}.`)
      navigate(Rutas.inicio, { replace: true })
    } catch (e) {
      toast(mensajeDe(e), 'error')
    }
  }

  /** Con consecuencias: hoja que explica qué pasa. */
  const cerrarSesion = async () => {
    const ok = await confirmar({
      titulo: '¿Cerrar sesión?',
      mensaje: 'Tendrás que volver a ingresar tu correo y contraseña.',
      confirmarTexto: 'Sí, cerrar sesión',
      cancelarTexto: 'No, seguir aquí',
      destructivo: true,
    })
    if (ok) await s.control.cerrarSesion()
  }

  return (
    <Pantalla
      titulo="Mi perfil"
      conBarraPestanas
      alActualizar={async () => {
        void qc.invalidateQueries({ queryKey: Claves.calificaciones(perfil.uid) })
        try {
          await s.control.recargar({ silencioso: true })
        } catch (e) {
          toast(mensajeDe(e), 'error')
        }
      }}
    >
      <Cabecera nombre={nombreCompleto(perfil)} email={s.usuario?.email ?? ''} rol={rol} />
      <Calificaciones uid={perfil.uid} />
      <Grupo titulo="Datos de contacto">
        <Fila etiqueta="Teléfono" valor={perfil.telefono || '—'} />
        <Fila etiqueta="Nacionalidad" valor={perfil.nacionalidad || '—'} />
        <FilaAccion titulo="Editar perfil" icono={Pencil} onClick={() => navigate(Rutas.editarPerfil)} />
      </Grupo>
      <Grupo titulo="Cuenta" pie={s.rolEnServidor ? null : 'Tu rol está guardado en este dispositivo.'}>
        <FilaAccion
          titulo={`Cambiar a ${InfoRol[otro].nombre.toLowerCase()}`}
          subtitulo={InfoRol[otro].descripcion}
          icono={otro === 'remitente' ? Package : PlaneTakeoff}
          // Ámbar oscuro (legible) para remitente, cielo para viajero.
          tono={otro === 'remitente' ? 'atencion' : 'viajero'}
          onClick={() => void cambiarRol()}
        />
        {instalar.disponible && (
          <FilaAccion
            titulo="Instalar la app"
            subtitulo="Ábrela desde la pantalla de inicio, como cualquier app."
            icono={Download}
            tono="pastel-verde"
            onClick={() => void instalar.abrir()}
          />
        )}
        <FilaAccion titulo="Cerrar sesión" icono={LogOut} destructiva onClick={() => void cerrarSesion()} />
      </Grupo>
    </Pantalla>
  )
}

/** Edición del perfil propio → `PUT /api/users/:uid`. */
export function EditarPerfil() {
  const s = useSesion()
  const toast = useToast()
  const volver = useVolver(Rutas.perfil)
  if (!s.perfil) return null
  return (
    <Pantalla titulo="Editar perfil" atras="Perfil">
      <FormularioPerfil
        uid={s.perfil.uid}
        email={s.usuario?.email ?? null}
        inicial={s.perfil}
        textoEnviar="Guardar cambios"
        alEnviar={async (d) => {
          await s.control.actualizarPerfil(d)
          toast('Perfil actualizado')
          volver()
        }}
      />
    </Pantalla>
  )
}
