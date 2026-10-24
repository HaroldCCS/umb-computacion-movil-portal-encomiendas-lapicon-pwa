import { Mail, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useDependencias } from '../../app/contexto'
import { AuthError } from '../../core/auth'
import { Aviso, Entrada, Vacio } from '../../core/componentes/Aviso'
import { Boton, Enlace } from '../../core/componentes/Boton'
import { Campo, CampoContrasena, Formulario, useFormulario } from '../../core/componentes/Campo'
import { Marca } from '../../core/componentes/Marca'
import { Pantalla, useVolver } from '../../core/componentes/Pantalla'
import { RouteTicket } from '../../core/componentes/RouteTicket'
import { Rutas } from '../../core/rutas'
import { Validadores } from '../../core/validadores'
import { useAccion } from '../../core/useAccion'

/** Inicio de sesión (docs/07 §7.6): marca, propuesta de valor, pase decorativo
 *  y el formulario. El error va junto al botón. */
export function Login() {
  const { auth } = useDependencias()
  const form = useFormulario()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { cargando, error, ejecutar } = useAccion()

  const entrar = () => {
    if (!form.validar()) return
    // El guardia de rutas lleva al siguiente paso cuando cambia la sesión.
    void ejecutar(() => auth.iniciarSesion(email, password))
  }

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-app flex-col justify-center px-4 py-6"
      style={{ paddingTop: 'calc(var(--seguro-arriba) + 24px)', paddingBottom: 'calc(var(--seguro-abajo) + 24px)' }}
    >
      <Entrada>
        <Marca />
      </Entrada>
      <Entrada indice={1}>
        <h1 className="mt-7 text-[32px] font-bold leading-[1.1] tracking-[-0.5px] text-texto">
          Tu paquete viaja con alguien que ya va para allá.
        </h1>
      </Entrada>
      <Entrada indice={2}>
        <div aria-hidden className="mt-5">
          <RouteTicket origen="Bogotá" destino="Miami" compacto />
        </div>
      </Entrada>
      <Formulario form={form} alEnviar={entrar} className="mt-7 flex flex-col">
        <Campo
          etiqueta="Correo"
          valor={email}
          alCambiar={setEmail}
          pista="tu@correo.com"
          tipo="email"
          modoTeclado="email"
          autocompletar="email"
          teclaEnter="next"
          validador={Validadores.email}
          icono={Mail}
        />
        <div className="mt-4">
          <CampoContrasena
            etiqueta="Contraseña"
            valor={password}
            alCambiar={setPassword}
            validador={Validadores.password}
            teclaEnter="go"
          />
        </div>
        <div className="flex justify-end">
          <Enlace a={cargando ? undefined : Rutas.recuperar}>¿Olvidaste tu contraseña?</Enlace>
        </div>
        {error ? (
          <div className="mb-3 mt-1">
            <Aviso tipo="error">{error}</Aviso>
          </div>
        ) : (
          <div className="h-2" />
        )}
        <Boton tipo="submit" cargando={cargando} textoCargando="Entrando…">
          Iniciar sesión
        </Boton>
      </Formulario>
      <p className="mt-4 flex flex-wrap items-center justify-center text-[15px] text-texto2">
        ¿No tienes cuenta?
        <Enlace a={cargando ? undefined : Rutas.registro}>Crear cuenta</Enlace>
      </p>
    </main>
  )
}

/** Barra de seguridad de la contraseña: tres tramos y la palabra. */
export function BarraFortaleza({ valor }: { valor: string }) {
  const nivel = Validadores.fortalezaPassword(valor)
  if (nivel === 0) return null
  const etiqueta = ['', 'Débil', 'Media', 'Fuerte'][nivel]
  const color = ['bg-separador', 'bg-peligro', 'bg-atencion', 'bg-exito'][nivel]
  const texto = ['text-texto2', 'text-peligro', 'text-atencion', 'text-exito'][nivel]
  return (
    <div role="img" aria-label={`Seguridad de la contraseña: ${etiqueta}`} className="mt-2 flex items-center gap-1">
      {[1, 2, 3].map((i) => (
        <span key={i} aria-hidden className={`h-1.5 flex-1 rounded-full transition-colors ${i <= nivel ? color : 'bg-superficie2'}`} />
      ))}
      <span aria-hidden className={`ml-2 text-[13px] font-semibold ${texto}`}>
        {etiqueta}
      </span>
    </div>
  )
}

/** Crear cuenta: solo correo y contraseña; el resto en el paso siguiente. */
export function Registro() {
  const { auth } = useDependencias()
  const form = useFormulario()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const { cargando, error, ejecutar } = useAccion()

  const crear = () => {
    if (!form.validar()) return
    void ejecutar(() => auth.crearCuenta(email, password))
  }

  return (
    <Pantalla
      titulo="Crear cuenta"
      atras="Entrar"
      subtitulo="Solo te pedimos lo necesario. Tus datos de contacto los completas en el siguiente paso."
    >
      <Formulario form={form} alEnviar={crear} className="flex flex-col">
        <Campo
          etiqueta="Correo"
          valor={email}
          alCambiar={setEmail}
          pista="tu@correo.com"
          tipo="email"
          modoTeclado="email"
          autocompletar="email"
          teclaEnter="next"
          validador={Validadores.email}
          icono={Mail}
        />
        <div className="mt-4">
          <CampoContrasena
            etiqueta="Contraseña"
            valor={password}
            alCambiar={setPassword}
            minimo={6}
            nueva
            validador={Validadores.password}
            teclaEnter="next"
          />
          <BarraFortaleza valor={password} />
        </div>
        <div className="mt-4">
          <CampoContrasena
            etiqueta="Confirmar contraseña"
            valor={confirmar}
            alCambiar={setConfirmar}
            nueva
            validador={Validadores.confirmarPassword(() => password)}
            teclaEnter="go"
          />
        </div>
        <div className="mt-6 flex flex-col gap-3">
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Boton tipo="submit" cargando={cargando} textoCargando="Creando cuenta…">
            Crear cuenta
          </Boton>
        </div>
      </Formulario>
    </Pantalla>
  )
}

/** Recuperar contraseña. Por privacidad nunca dice si el correo existe. */
export function Recuperar() {
  const { auth } = useDependencias()
  const form = useFormulario()
  const volver = useVolver(Rutas.login)
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const { cargando, error, ejecutar } = useAccion()

  const enviar = () => {
    if (!form.validar()) return
    void ejecutar(async () => {
      try {
        await auth.recuperarPassword(email)
        setEnviado(true)
      } catch (e) {
        // "No existe" se muestra igual que el éxito.
        if (e instanceof AuthError && e.codigo === 'user-not-found') setEnviado(true)
        else throw e
      }
    })
  }

  if (enviado) {
    return (
      <Pantalla titulo="Revisa tu correo" atras>
        <Vacio
          titulo="Enlace enviado"
          icono={MailCheck}
          claseIcono="bg-exito-suave text-exito"
          texto={`Si ${email.trim()} está registrado, te enviamos un enlace para crear una nueva contraseña.`}
          accion={<Boton onClick={volver}>Volver a iniciar sesión</Boton>}
        />
      </Pantalla>
    )
  }
  return (
    <Pantalla titulo="Recuperar contraseña" atras="Entrar" subtitulo="Te enviaremos un enlace para crear una contraseña nueva.">
      <Formulario form={form} alEnviar={enviar} className="flex flex-col">
        <Campo
          etiqueta="Correo"
          valor={email}
          alCambiar={setEmail}
          pista="tu@correo.com"
          tipo="email"
          modoTeclado="email"
          autocompletar="email"
          teclaEnter="send"
          validador={Validadores.email}
          icono={Mail}
        />
        <div className="mt-6 flex flex-col gap-3">
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Boton tipo="submit" cargando={cargando} textoCargando="Enviando…">
            Enviar enlace
          </Boton>
        </div>
      </Formulario>
    </Pantalla>
  )
}

