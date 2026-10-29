// Port de envios_logic_test.dart, viajero_logic_test.dart, chat_models_test.dart,
// asistente_notifier_test.dart y la lógica de calificaciones.
import { ApiError, RedError } from '../core/red/errores'
import { componerComentario, distribucion, etiquetaPuntaje, sugerenciasPara } from '../datos/modelos/calificaciones'
import { conEstado, encomiendaAJson, encomiendaDesdeJson, type Encomienda } from '../datos/modelos/encomienda'
import { etiquetaEstado, type EstadoEncomienda } from '../datos/modelos/estado'
import { idChat } from '../datos/repositorios'
import { estadoInicial, esNueva, mensajeErrorAsistente, reducirAsistente, sugerenciasAsistente } from './asistente/logica'
import { agruparPorDia, conversacionDesdeMapa, inicialesDe, mensajeDesdeMapa, nombreDe, ordenarConversaciones, otroUid, type MensajeChat } from './chat/modelos'
import { mensajeErrorChat } from './chat/servicio'
import {
  actualizarVistos,
  agruparEnvios,
  conNombresDeViajeros,
  nuevasTomadas,
  formatearMiles,
  parseValor,
  pasoActual,
  resumenEnvios,
  validarObservaciones,
  validarRuta,
  validarValor,
} from './remitente/logica'
import {
  combinarEntregas,
  conservarNombres,
  gananciasPorMoneda,
  normalizarVuelo,
  ordenarDisponibles,
  paraTomar,
  porCalificarViajero,
  porEntregar,
  resumenVuelo,
  tomadaPorMi,
  validarNumeroVuelo,
} from './viajero/logica'

function e(
  id: string,
  d: { estado?: EstadoEncomienda; remitente?: string | null; viajero?: string | null; creada?: Date | null; moneda?: string; valor?: number; vence?: Date } = {},
): Encomienda {
  return {
    id,
    ciudadOrigen: 'Bogota',
    ciudadDestino: 'Miami',
    observaciones: 'libro',
    moneda: d.moneda ?? 'USD',
    valor: d.valor ?? 10,
    estado: d.estado ?? 'tomada',
    remitenteUid: d.remitente === undefined ? 'rem' : d.remitente,
    viajeroUid: d.viajero ?? null,
    remitenteNombre: null,
    viajeroNombre: null,
    fechaVencimiento: d.vence ?? null,
    creadaEn: d.creada ?? null,
  }
}

describe('remitente', () => {
  it('agrupa por pestaña, de la más reciente a la más antigua', () => {
    const g = agruparEnvios([
      e('a', { estado: 'disponible', creada: new Date(2026, 9, 1) }),
      e('b', { estado: 'tomada', creada: new Date(2026, 9, 5) }),
      e('c', { estado: 'entregada' }),
      e('d', { estado: 'vencida' }),
      e('e', { estado: 'recibida' }),
      e('f', { estado: 'desconocido' }),
      e('g', { estado: 'disponible' }),
    ])
    expect(g.activas.map((x) => x.id)).toEqual(['b', 'a', 'g'])
    expect(g.entregadas.map((x) => x.id)).toEqual(['c', 'e'])
    expect(g.historial.map((x) => x.id)).toEqual(['d', 'f'])
  })

  it('paso actual de la línea de tiempo', () => {
    expect(pasoActual('disponible')).toBe(0)
    expect(pasoActual('tomada')).toBe(1)
    expect(pasoActual('entregada')).toBe(2)
    expect(pasoActual('entregada', true)).toBe(3)
    expect(pasoActual('recibida')).toBe(2)
    expect(pasoActual('vencida')).toBeNull()
  })

  it('valor, observaciones y ruta', () => {
    expect(parseValor('1.234')).toBe(1234)
    expect(parseValor('')).toBeNull()
    expect(validarValor('1.500.000')).toBeNull()
    expect(validarValor('')).not.toBeNull()
    expect(validarValor('0')).not.toBeNull()
    expect(validarValor('200.000.000')).not.toBeNull()
    expect(formatearMiles('1234567')).toBe('1.234.567')
    expect(validarObservaciones('Un libro')).toBeNull()
    expect(validarObservaciones('  ')).not.toBeNull()
    expect(validarObservaciones('ab')).not.toBeNull()
    expect(validarObservaciones('x'.repeat(201))).not.toBeNull()
    expect(validarRuta('Bogota', 'Miami')).toBeNull()
    expect(validarRuta('Bogota', 'bogota ')).not.toBeNull()
    expect(validarRuta('', 'Miami')).toBeNull()
  })

  it('resumen del Inicio: contadores, por calificar y nota', () => {
    const lista = [
      e('1', { estado: 'tomada', viajero: 'v' }),
      e('2', { estado: 'disponible' }),
      e('3', { estado: 'disponible' }),
      e('4', { estado: 'entregada', viajero: 'v' }),
      e('5', { estado: 'entregada', viajero: 'v' }),
      e('6', { estado: 'entregada' }), // sin viajero conocido: no se puede calificar
    ]
    const r = resumenEnvios(lista, new Set(['5']))
    expect([r.tomadas, r.disponibles, r.activas, r.entregadas]).toEqual([1, 2, 3, 3])
    expect(r.porCalificar.map((x) => x.id)).toEqual(['4'])
    expect(r.nota).toBe('1 tomada por un viajero · 2 esperan viajero.')
    expect(resumenEnvios([], new Set()).nota).toBe('No tienes envíos activos. Publica uno con el botón +.')
  })

  it('etiquetaEstado: "tomada" depende de quién mira; lo demás no cambia', () => {
    expect(etiquetaEstado('tomada', 'remitente')).toBe('Tomada')
    expect(etiquetaEstado('tomada', 'viajero')).toBe('La llevas tú')
    for (const rol of ['remitente', 'viajero'] as const) {
      expect(etiquetaEstado('disponible', rol)).toBe('Disponible')
      expect(etiquetaEstado('entregada', rol)).toBe('Entregada')
    }
  })

  it('nuevas tomadas con remitente_estados_vistos: avisa una vez y solo de lo nuevo', () => {
    const a = e('a', { estado: 'disponible' })
    const tomadaA = e('a', { estado: 'tomada', viajero: 'v' })
    const b = e('b', { estado: 'tomada', viajero: 'v' })
    // Primera vez sin mapa: no avisa nada de golpe y lo guarda todo como visto.
    expect(nuevasTomadas([a, b], null)).toEqual([])
    const base = actualizarVistos([a, b], null)
    expect(base).toEqual({ a: 'disponible', b: 'tomada' })
    // disponible → tomada: avisa; b ya se había visto tomada: no.
    expect(nuevasTomadas([tomadaA, b], base).map((x) => x.id)).toEqual(['a'])
    // Mientras no la vea, sigue pendiente aunque se recargue.
    const recargado = actualizarVistos([tomadaA, b], base)
    expect(recargado).toEqual({ a: 'disponible', b: 'tomada' })
    expect(nuevasTomadas([tomadaA, b], recargado).map((x) => x.id)).toEqual(['a'])
    // Ya vista (detalle o "Entendido"): no avisa más.
    expect(nuevasTomadas([tomadaA, b], { ...recargado, a: 'tomada' })).toEqual([])
    // Publicada desde otro dispositivo y ya tomada: también es nueva.
    expect(nuevasTomadas([e('c', { estado: 'tomada', viajero: 'v' })], base).map((x) => x.id)).toEqual(['c'])
  })

  it('conNombresDeViajeros: un pedido por ruta y, si falla, sin nombre', async () => {
    const pedidos: string[] = []
    const lista = [
      e('1', { estado: 'tomada', viajero: 'v1' }),
      e('2', { estado: 'entregada', viajero: 'v1' }),
      e('3', { estado: 'disponible' }),
    ]
    const r = await conNombresDeViajeros(lista, async (o, d) => {
      pedidos.push(`${o}→${d}`)
      return [{ viajeroUid: 'v1', viajeroNombre: 'Luis Pérez' }]
    })
    expect(r.map((x) => x.viajeroNombre)).toEqual(['Luis Pérez', 'Luis Pérez', null])
    expect(pedidos).toHaveLength(1)
    const sinRed = await conNombresDeViajeros(lista, () => Promise.reject(new Error('sin red')))
    expect(sinRed.map((x) => x.viajeroNombre)).toEqual([null, null, null])
  })

  it('conEstado conserva los demás datos', () => {
    const r = conEstado(e('x', { estado: 'disponible', creada: new Date(2026, 0, 1) }), 'vencida')
    expect(r.estado).toBe('vencida')
    expect(r.creadaEn).toEqual(new Date(2026, 0, 1))
  })
})

describe('viajero', () => {
  it('número de vuelo', () => {
    for (const v of ['AA123', 'AV 24', 'av24', '4C5021', 'LA2401A', 'AV-24']) expect(validarNumeroVuelo(v)).toBeNull()
    for (const v of ['', '123', 'A', 'AVIANCA', 'AV12345', 'AV']) expect(validarNumeroVuelo(v)).not.toBeNull()
    expect(normalizarVuelo(' av 24 ')).toBe('AV24')
    expect(normalizarVuelo('la-2401')).toBe('LA2401')
  })

  it('combinarEntregas une servidor y registro local, sin duplicados', () => {
    const r = combinarEntregas({
      servidor: [e('1', { viajero: 'yo', estado: 'entregada' }), e('2', { viajero: 'otro' }), e('3', { remitente: 'yo' })],
      locales: [e('1', { viajero: 'yo', estado: 'tomada' }), e('4', { viajero: 'yo' })],
      uid: 'yo',
    })
    expect(new Set(r.map((x) => x.id))).toEqual(new Set(['1', '4']))
    expect(r.find((x) => x.id === '1')!.estado).toBe('entregada') // gana el servidor
    expect(r[0]!.id).toBe('4') // las tomadas primero
    expect(combinarEntregas({ servidor: [e('9')], locales: [e('9', { viajero: 'yo' })], uid: 'yo' })[0]!.id).toBe('9')
  })

  it('paraTomar excluye las propias y las no disponibles', () => {
    const lista = [e('a', { estado: 'disponible' }), e('b', { estado: 'disponible', remitente: 'yo' }), e('c'), e('mia', { estado: 'disponible' })]
    expect(paraTomar(lista, 'yo', new Set(['mia'])).map((x) => x.id)).toEqual(['a'])
  })

  it('conservarNombres, tomadaPorMi y el JSON local', () => {
    const r = conservarNombres(
      encomiendaDesdeJson({ _id: 'x', uid: 'uidR', estado: 'entregada' }),
      encomiendaDesdeJson({ _id: 'x', estado: 'tomada', remitenteNombre: 'Harold' }),
    )
    expect([r.remitenteUid, r.remitenteNombre, r.estado]).toEqual(['uidR', 'Harold', 'entregada'])
    const d = e('x', { estado: 'disponible' })
    expect(tomadaPorMi(d, 'yo', new Set())).toBe(false)
    expect(tomadaPorMi(d, 'yo', new Set(['x']))).toBe(true)
    expect(tomadaPorMi(conEstado(d, 'tomada', 'yo'), 'yo', new Set())).toBe(true)

    const original: Encomienda = { ...e('id1', { viajero: 'yo', valor: 12.5, vence: new Date(2026, 11, 1) }), remitenteNombre: 'Laura Gómez' }
    const copia = encomiendaDesdeJson(encomiendaAJson(original))
    expect(copia).toMatchObject({ id: 'id1', valor: 12.5, estado: 'tomada', remitenteUid: 'rem', remitenteNombre: 'Laura Gómez', viajeroUid: 'yo' })
    expect(copia.fechaVencimiento?.getTime()).toBe(new Date(2026, 11, 1).getTime())
  })

  it('resumenVuelo reconoce AeroDataBox', () => {
    expect(
      resumenVuelo({
        airline: { name: 'Avianca' },
        departure: { airport: { name: 'El Dorado' } },
        arrival: { airport: { municipalityName: 'Miami' } },
      }),
    ).toEqual(['Aerolínea: Avianca', 'Sale de: El Dorado', 'Llega a: Miami'])
    expect(resumenVuelo({})).toEqual([])
  })

  it('por entregar, por calificar y ganancias sin mezclar monedas', () => {
    const lista = [
      e('1', { estado: 'tomada', moneda: 'USD', valor: 25 }),
      e('2', { estado: 'entregada', moneda: 'usd', valor: 15 }),
      e('3', { estado: 'entregada', moneda: 'COP', valor: 50000 }),
      e('4', { estado: 'entregada', remitente: null }),
      e('5', { estado: 'vencida', valor: 999 }),
    ]
    expect(porEntregar(lista).map((x) => x.id)).toEqual(['1'])
    expect(porCalificarViajero(lista, new Set(['3'])).map((x) => x.id)).toEqual(['2'])
    expect(Object.fromEntries(gananciasPorMoneda(lista))).toEqual({ USD: 50, COP: 50000 })
  })

  it('ordenarDisponibles: recientes y vencen pronto, sin fecha al final', () => {
    const lista = [
      e('a', { creada: new Date(2026, 0, 1), vence: new Date(2026, 5, 1) }),
      e('b', { creada: new Date(2026, 2, 1), vence: new Date(2026, 1, 1) }),
      e('c'),
    ]
    expect(ordenarDisponibles(lista, 'recientes').map((x) => x.id)).toEqual(['b', 'a', 'c'])
    expect(ordenarDisponibles(lista, 'vencenPronto').map((x) => x.id)).toEqual(['b', 'a', 'c'])
    expect(lista.map((x) => x.id)).toEqual(['a', 'b', 'c']) // no modifica la original
  })
})

describe('chat', () => {
  it('mensaje confirmado, pendiente y con escritura local', () => {
    const m = mensajeDesdeMapa('m1', { texto: 'Hola', emisorUid: 'a', creadoEn: new Date(2026, 9, 22, 14, 5) })
    expect([m.texto, m.emisorUid, m.pendiente]).toEqual(['Hola', 'a', false])
    const local = new Date(2026, 9, 22, 9, 30)
    const p = mensajeDesdeMapa('m2', { texto: 'x', emisorUid: 'a', creadoEn: null, creadoLocal: local.getTime() })
    expect(p.pendiente).toBe(true)
    expect(p.fecha).toEqual(local)
    expect(mensajeDesdeMapa('m3', { creadoEn: new Date(2026, 0) }, { pendienteDeEscritura: true }).pendiente).toBe(true)
  })

  it('agrupa por día con separadores Hoy / Ayer / fecha', () => {
    const ahora = new Date(2026, 9, 22, 18)
    const msg = (id: string, f: Date): MensajeChat => ({ id, texto: id, emisorUid: 'a', fecha: f, pendiente: false })
    const items = agruparPorDia(
      [msg('hoy2', new Date(2026, 9, 22, 10)), msg('antes', new Date(2026, 9, 3, 8)), msg('ayer', new Date(2026, 9, 21, 20)), msg('hoy1', new Date(2026, 9, 22, 9))],
      ahora,
    )
    expect(items.map((i) => (i.tipo === 'dia' ? `[${i.etiqueta}]` : i.mensaje.id))).toEqual([
      '[3 oct]', 'antes', '[Ayer]', 'ayer', '[Hoy]', 'hoy1', 'hoy2',
    ])
    expect(agruparPorDia([])).toEqual([])
  })

  it('conversación: participantes, nombres y orden', () => {
    const c = conversacionDesdeMapa('a_b', {
      participantes: ['a', 'b'],
      nombres: { a: 'Laura Gómez', b: 'Andrés Ruiz' },
      ruta: 'Bogota → Miami',
      actualizadoEn: new Date(2026, 9, 22),
    })
    expect(otroUid(c, 'a')).toBe('b')
    expect(nombreDe(c, 'b')).toBe('Andrés Ruiz')
    expect(c.encomiendaId).toBeNull()
    const s = conversacionDesdeMapa('a_b', {})
    expect(s.participantes).toEqual(['a', 'b'])
    expect(nombreDe(s, 'a')).toBe('Usuario')
    expect(nombreDe(s, null)).toBe('Usuario')
    const lista = ordenarConversaciones([
      conversacionDesdeMapa('v', { actualizadoEn: new Date(2026, 0, 1) }),
      conversacionDesdeMapa('n', { actualizadoEn: new Date(2026, 5, 1) }),
      conversacionDesdeMapa('p', {}),
    ])
    expect(lista.map((x) => x.id)).toEqual(['p', 'n', 'v'])
  })

  it('el id del chat no depende de quién escribe primero', () => {
    expect(idChat('zeta', 'alfa')).toBe('alfa_zeta')
    expect(idChat('alfa', 'zeta')).toBe(idChat('zeta', 'alfa'))
    expect(inicialesDe('Laura Gómez')).toBe('LG')
    expect(inicialesDe('  ana  ')).toBe('A')
    expect(inicialesDe('')).toBe('?')
  })

  it('errores de Firestore en español', () => {
    expect(mensajeErrorChat({ code: 'permission-denied' })).toMatch(/permiso/)
    expect(mensajeErrorChat({ code: 'unavailable' })).toMatch(/conexión/)
    expect(mensajeErrorChat(new Error('x'))).toBe('No pudimos cargar el chat. Intenta de nuevo.')
  })
})

describe('asistente', () => {
  it('pregunta, falla con reintento y reinicia', () => {
    let s = estadoInicial()
    expect(esNueva(s)).toBe(true)
    s = reducirAsistente(s, { tipo: 'preguntar', texto: ' Hola ' })
    expect(s.escribiendo).toBe(true)
    expect(s.mensajes.at(-1)).toMatchObject({ texto: 'Hola', autor: 'usuario' })
    s = reducirAsistente(s, { tipo: 'fallo', texto: 'No disponible', pregunta: 'Hola' })
    const error = s.mensajes.at(-1)!
    expect(error).toMatchObject({ error: true, reintentarCon: 'Hola' })
    s = reducirAsistente(s, { tipo: 'reintentar', error })
    expect(s.mensajes.some((m) => m.error)).toBe(false)
    s = reducirAsistente(s, { tipo: 'respuesta', texto: 'Claro' })
    expect([s.escribiendo, s.mensajes.length]).toEqual([false, 3])
    expect(esNueva(reducirAsistente(s, { tipo: 'reiniciar' }))).toBe(true)
  })

  it('mensajes de error amables y sugerencias por rol', () => {
    expect(mensajeErrorAsistente(new ApiError(500, 'Error al generar respuesta con OpenRouter'))).toBe(
      'El asistente no está disponible ahora. Intenta más tarde.',
    )
    expect(mensajeErrorAsistente(new RedError('Sin red'))).toBe('Sin red')
    expect(mensajeErrorAsistente(new ApiError(400, 'Mensaje vacío'))).toBe('Mensaje vacío')
    expect(sugerenciasAsistente('viajero')[0]).toBe('¿Cómo registro mi vuelo?')
    expect(sugerenciasAsistente(null)[0]).toBe('¿Cómo publico una encomienda?')
  })
})

describe('calificaciones', () => {
  it('etiquetas, sugerencias, comentario y distribución', () => {
    expect([1, 2, 3, 4, 5].map(etiquetaPuntaje)).toEqual(['Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'])
    expect(sugerenciasPara(0)).toEqual([])
    expect(sugerenciasPara(5)).toContain('Puntual')
    expect(sugerenciasPara(2)).toContain('Llegó tarde')
    expect(componerComentario(['Puntual', ' Amable '], ' Todo bien ')).toBe('Puntual. Amable. Todo bien')
    expect(componerComentario([], 'x'.repeat(400)).length).toBe(300)
    const c = (n: number) => ({ calificacion: n, comentario: '', rolDestino: null, fecha: null })
    expect(distribucion([c(5), c(5), c(1), c(0)])).toEqual([0, 1, 0, 0, 0, 2])
  })
})
