// Componentes del sistema v2: comportamiento, teclado y accesibilidad (axe).
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { Package } from 'lucide-react'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { Validadores } from '../validadores'
import { Aviso, Vacio } from './Aviso'
import { Boton } from './Boton'
import { Campo, Chips, Formulario, useFormulario } from './Campo'
import { ProveedorHojas, useHojas } from './Hoja'
import { InsigniaEncomienda, iniciales, tono } from './Insignia'
import { RouteTicket, TicketDetail } from './RouteTicket'
import { FilaAccion, Grupo, Fila, TarjetaAccion } from './Tarjeta'
import { ProveedorToasts, useToast } from './Toast'

async function sinViolaciones(contenedor: HTMLElement) {
  // color-contrast no se puede medir en jsdom (lo cubre tema.test.ts).
  const r = await axe.run(contenedor, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([])
}

function FormularioDePrueba({ alEnviar }: { alEnviar: () => void }) {
  const form = useFormulario()
  const [email, setEmail] = useState('')
  return (
    <Formulario form={form} alEnviar={() => form.validar() && alEnviar()}>
      <Campo etiqueta="Correo" valor={email} alCambiar={setEmail} validador={Validadores.email} tipo="email" />
      <Boton tipo="submit">Enviar</Boton>
    </Formulario>
  )
}

describe('Campo y Formulario', () => {
  it('no valida mientras se escribe por primera vez; sí al salir y al enviar', async () => {
    const u = userEvent.setup()
    const enviado = vi.fn()
    render(<FormularioDePrueba alEnviar={enviado} />)
    const campo = screen.getByLabelText('Correo')
    await u.type(campo, 'ana@')
    expect(screen.queryByText(/parece incompleto/)).toBeNull()
    await u.tab()
    expect(screen.getByText('Revisa el correo: parece incompleto.')).toBeInTheDocument()
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    // Una vez con error, se quita apenas se corrige (y aparece el check verde).
    await u.type(campo, 'correo.co')
    expect(screen.queryByText(/parece incompleto/)).toBeNull()
    expect(screen.getByLabelText('Campo válido')).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(enviado).toHaveBeenCalledOnce()
  })

  it('enviar vacío muestra el error de cada campo', async () => {
    const u = userEvent.setup()
    const enviado = vi.fn()
    const { container } = render(<FormularioDePrueba alEnviar={enviado} />)
    await u.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(screen.getByText('Escribe tu correo.')).toBeInTheDocument()
    expect(enviado).not.toHaveBeenCalled()
    await sinViolaciones(container)
  })
})

describe('Boton', () => {
  it('cargando muestra el texto de carga y no responde (sin doble toque)', async () => {
    const u = userEvent.setup()
    const toque = vi.fn()
    render(
      <Boton onClick={toque} cargando textoCargando="Publicando…">
        Publicar
      </Boton>,
    )
    const b = screen.getByRole('button', { name: 'Publicando…' })
    expect(b).toHaveAttribute('aria-busy', 'true')
    await u.click(b)
    expect(toque).not.toHaveBeenCalled()
  })
  it('sin acción queda deshabilitado', () => {
    render(<Boton onClick={null}>Continuar</Boton>)
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })
})

describe('Chips', () => {
  it('es un grupo de opciones con el contador en la etiqueta (sin ceros)', async () => {
    const u = userEvent.setup()
    function Prueba() {
      const [v, setV] = useState<'a' | 'b'>('a')
      return (
        <Chips
          etiqueta="Filtro"
          opciones={[
            { valor: 'a', texto: 'Activas', contador: 0 },
            { valor: 'b', texto: 'Entregadas', contador: 2 },
          ]}
          valor={v}
          alCambiar={setV}
        />
      )
    }
    const { container } = render(<Prueba />)
    expect(screen.getByRole('radio', { name: 'Activas' })).toHaveAttribute('aria-checked', 'true')
    await u.click(screen.getByRole('radio', { name: 'Entregadas, 2' }))
    expect(screen.getByRole('radio', { name: 'Entregadas, 2' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByText('0')).toBeNull()
    await sinViolaciones(container)
  })
})

describe('Hojas', () => {
  function Abridor({ palabra }: { palabra?: string }) {
    const { confirmar } = useHojas()
    const [r, setR] = useState<string>('')
    return (
      <>
        <button
          type="button"
          onClick={async () =>
            setR(String(await confirmar({ titulo: '¿Retirar?', mensaje: 'No se puede deshacer.', confirmarTexto: 'Sí, retirarla', palabra })))
          }
        >
          abrir
        </button>
        <output>{r}</output>
      </>
    )
  }

  it('la palabra escrita habilita el botón y la hoja devuelve true', async () => {
    const u = userEvent.setup()
    render(
      <ProveedorHojas>
        <Abridor palabra="RETIRAR" />
      </ProveedorHojas>,
    )
    await u.click(screen.getByText('abrir'))
    const dialogo = screen.getByRole('dialog', { name: '¿Retirar?' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    const si = screen.getByRole('button', { name: 'Sí, retirarla' })
    expect(si).toBeDisabled()
    await u.type(screen.getByLabelText('Escribe RETIRAR para confirmar'), 'retirar')
    expect(si).toBeEnabled()
    await u.click(si)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('true')
  })

  it('Esc cierra y devuelve false; el foco vuelve a quien la abrió', async () => {
    const u = userEvent.setup()
    render(
      <ProveedorHojas>
        <Abridor />
      </ProveedorHojas>,
    )
    const abrir = screen.getByText('abrir')
    await u.click(abrir)
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement)
    await u.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('false')
    expect(abrir).toHaveFocus()
  })
})

describe('Toasts', () => {
  it('se anuncian y se van solos a los 3,2 s', () => {
    vi.useFakeTimers()
    function Prueba() {
      const toast = useToast()
      return (
        <button type="button" onClick={() => toast('Encomienda publicada')}>
          ok
        </button>
      )
    }
    render(
      <ProveedorToasts>
        <Prueba />
      </ProveedorToasts>,
    )
    act(() => screen.getByText('ok').click())
    expect(screen.getByText('Encomienda publicada').closest('[aria-live]')).not.toBeNull()
    act(() => vi.advanceTimersByTime(3300))
    expect(screen.queryByText('Encomienda publicada')).toBeNull()
    vi.useRealTimers()
  })
})

describe('piezas de la interfaz', () => {
  it('insignia: color + ícono + texto, y se lee el estado', () => {
    render(<InsigniaEncomienda estado="tomada" />)
    expect(screen.getByRole('img', { name: 'Estado: Tomada' })).toBeInTheDocument()
    render(<InsigniaEncomienda estado="tomada" rol="viajero" />)
    expect(screen.getByRole('img', { name: 'Estado: La llevas tú' })).toBeInTheDocument()
  })

  it('avatar: iniciales y tono estable', () => {
    expect(iniciales('Laura Gómez')).toBe('LG')
    expect(iniciales('laura')).toBe('L')
    expect(iniciales('  ')).toBe('?')
    expect(tono('Laura')).toBe(tono(' laura '))
  })

  it('pase de abordar, grupos, avisos y vacíos sin problemas de accesibilidad', async () => {
    const { container } = render(
      <MemoryRouter>
        <main>
          <RouteTicket
            origen="Bogota"
            destino="Miami"
            detalles={[<TicketDetail key="v" etiqueta="Vence" valor="22 nov" />]}
            extremo={<InsigniaEncomienda estado="disponible" />}
            onClick={() => {}}
          />
          <Grupo titulo="Detalles" pie="Nota">
            <Fila etiqueta="Pago" valor="USD 10" extra="Lo que ofreciste." />
            <FilaAccion titulo="Editar" icono={Package} onClick={() => {}} />
          </Grupo>
          <TarjetaAccion titulo="Califica" texto="Tu opinión ayuda" onClick={() => {}} />
          <Aviso tipo="error">Algo falló</Aviso>
          <Vacio titulo="Nada aún" icono={Package} texto="Publica tu primera encomienda." />
        </main>
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Ruta de Bogota a Miami' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Algo falló')
    await sinViolaciones(container)
  })
})
