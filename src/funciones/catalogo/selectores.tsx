import { useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { Building2, ChevronDown, MapPin, Search, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Aviso, EsqueletoLista } from '../../core/componentes/Aviso'
import { Boton } from '../../core/componentes/Boton'
import { Campo } from '../../core/componentes/Campo'
import { useHojas, type CerrarHoja } from '../../core/componentes/Hoja'
import { FilaOpcion } from '../../core/componentes/Tarjeta'
import { mensajeDe } from '../../core/useAccion'
import { Validadores } from '../../core/validadores'
import { Claves, useCiudades, usePaises } from '../../datos/consultas'

/** Compara sin tildes ni mayúsculas ("bogotá" encuentra "Bogota"). */
export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Cuántas filas se dibujan a la vez: con ~2.000 ciudades, buscar es más rápido. */
const MAXIMO = 120

function Buscador({
  consulta,
  claveConsulta,
  actual,
  pista,
  etiqueta,
  icono,
  sugeridos = [],
  permitirLibre = false,
  cerrar,
  textoVacio,
}: {
  consulta: UseQueryResult<string[]>
  claveConsulta: readonly string[]
  actual?: string
  pista: string
  etiqueta: string
  icono?: LucideIcon
  sugeridos?: string[]
  permitirLibre?: boolean
  cerrar: CerrarHoja<string>
  textoVacio: (texto: string) => string
}) {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const texto = q.trim()
  const n = normalizar(q)

  let cuerpo
  if (consulta.isError) {
    cuerpo = (
      <Aviso
        tipo="error"
        accion={
          <>
            <Boton chico ancho={false} variante="secundario" onClick={() => void qc.invalidateQueries({ queryKey: claveConsulta })}>
              Reintentar
            </Boton>
            {permitirLibre && texto !== '' && (
              <Boton chico ancho={false} variante="tonal" onClick={() => cerrar(texto)}>
                Usar "{texto}"
              </Boton>
            )}
          </>
        }
      >
        {mensajeDe(consulta.error, `No pudimos cargar la lista.`)}
      </Aviso>
    )
  } else if (!consulta.data) {
    cuerpo = <EsqueletoLista cantidad={6} alto={44} />
  } else {
    const lista = consulta.data
    const filtrados =
      n === ''
        ? [...sugeridos.filter((s) => lista.includes(s)), ...lista.filter((p) => !sugeridos.includes(p))]
        : lista.filter((p) => normalizar(p).includes(n))
    if (filtrados.length === 0) {
      cuerpo = (
        <Aviso
          accion={
            permitirLibre && texto !== '' ? (
              <Boton chico ancho={false} variante="tonal" onClick={() => cerrar(texto)}>
                Usar "{texto}"
              </Boton>
            ) : undefined
          }
        >
          {textoVacio(texto)}
        </Aviso>
      )
    } else {
      return (
        <>
          <CampoBusqueda valor={q} alCambiar={setQ} pista={pista} etiqueta={etiqueta} />
          <div role="listbox" aria-label={etiqueta} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ paddingBottom: 'calc(20px + var(--seguro-abajo))' }}>
            {filtrados.slice(0, MAXIMO).map((p) => (
              <FilaOpcion key={p} texto={p} icono={icono} seleccionada={p === actual} onClick={() => cerrar(p)} />
            ))}
            {filtrados.length > MAXIMO && (
              <p className="px-5 py-4 text-[13px] text-texto2">
                Hay {filtrados.length - MAXIMO} más. Escribe para encontrar la tuya.
              </p>
            )}
          </div>
        </>
      )
    }
  }
  return (
    <>
      <CampoBusqueda valor={q} alCambiar={setQ} pista={pista} etiqueta={etiqueta} />
      <div className="overflow-y-auto px-5 pb-5 pt-1">{cuerpo}</div>
    </>
  )
}

function CampoBusqueda({ valor, alCambiar, pista, etiqueta }: { valor: string; alCambiar: (v: string) => void; pista: string; etiqueta: string }) {
  return (
    <div className="px-5 pb-3 pt-1">
      <div className="flex items-center rounded-campo border-[1.2px] border-transparent bg-superficie2 focus-within:border-2 focus-within:border-marca">
        <Search aria-hidden size={22} className="ml-4 shrink-0 text-texto2" />
        <input
          type="search"
          autoFocus
          enterKeyHint="search"
          value={valor}
          onChange={(e) => alCambiar(e.target.value)}
          placeholder={pista}
          aria-label={etiqueta}
          className="min-h-[52px] w-full bg-transparent px-3 text-[17px] text-texto outline-none placeholder:text-texto3"
        />
      </div>
    </div>
  )
}

function ListaCiudades({ actual, cerrar }: { actual?: string; cerrar: CerrarHoja<string> }) {
  const ciudades = useCiudades()
  return (
    <Buscador
      consulta={ciudades}
      claveConsulta={Claves.ciudades}
      actual={actual}
      pista='Buscar ciudad (p. ej. "Bogota")'
      etiqueta="Buscar ciudad"
      icono={Building2}
      cerrar={cerrar}
      textoVacio={(t) => `No encontramos "${t}". Prueba sin tildes o con el nombre en inglés.`}
    />
  )
}

/** Atajos para Latinoamérica, que es el público principal. */
const PAISES_SUGERIDOS = ['Colombia', 'United States', 'Mexico', 'Spain', 'Peru', 'Ecuador']

function ListaPaises({ actual, cerrar }: { actual?: string; cerrar: CerrarHoja<string> }) {
  const paises = usePaises()
  return (
    <Buscador
      consulta={paises}
      claveConsulta={Claves.paises}
      actual={actual}
      pista="Buscar país (en inglés)"
      etiqueta="Buscar país"
      sugeridos={PAISES_SUGERIDOS}
      permitirLibre
      cerrar={cerrar}
      textoVacio={(t) => `No encontramos "${t}" en la lista.`}
    />
  )
}

/**
 * Campo para elegir una ciudad de `/api/ciudades/ciudades`. Se elige de la
 * lista (no texto libre) para que el nombre coincida con el que usan los
 * filtros del backend (p. ej. "Bogota", sin tilde).
 */
export function CampoCiudad({
  etiqueta,
  valor,
  alCambiar,
  pista = 'Elige una ciudad',
  icono = MapPin,
}: {
  etiqueta: string
  valor: string
  alCambiar: (c: string) => void
  pista?: string
  icono?: LucideIcon
}) {
  const { mostrarHoja } = useHojas()
  return (
    <Campo
      etiqueta={etiqueta}
      valor={valor}
      pista={pista}
      icono={icono}
      checkValido={false}
      sufijo={<ChevronDown aria-hidden size={22} className="mr-3 shrink-0 text-texto2" />}
      validador={(v) => Validadores.requerido(v, etiqueta)}
      alTocar={async () => {
        const c = await mostrarHoja<string>({
          titulo: etiqueta,
          altoCompleto: true,
          contenido: (cerrar) => <ListaCiudades actual={valor} cerrar={cerrar} />,
        })
        if (c) alCambiar(c)
      }}
    />
  )
}

/** Abre el buscador de países (`/api/ciudades/paises`) en una hoja. */
export function useSelectorPais() {
  const { mostrarHoja } = useHojas()
  return (actual?: string) =>
    mostrarHoja<string>({
      titulo: 'Nacionalidad',
      altoCompleto: true,
      contenido: (cerrar) => <ListaPaises actual={actual} cerrar={cerrar} />,
    })
}
