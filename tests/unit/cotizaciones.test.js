/**
 * Pruebas unitarias del paso 7: total en centavos, RN-05 (pendiente de
 * respuesta) con fechas simuladas, lectura de líneas del formulario y
 * NotificacionListener (qué notificaciones deja cada evento). Sin base de datos.
 */
const {
  aCentavos, centavosATexto, calcularTotalCentavos, diasTranscurridos, estaVencida,
} = require('../../utils/cotizaciones');
const CotizacionService = require('../../services/CotizacionService');
const NotificacionService = require('../../services/NotificacionService');
const NotificacionListener = require('../../services/eventos/NotificacionListener');
const { BusEventos, EVENTOS } = require('../../services/eventos/busEventos');
const { ValidationError } = require('../../utils/errors');

afterEach(() => jest.restoreAllMocks());

describe('Total de la cotización en centavos', () => {
  test('3 x 0.10 da exactamente 0.30 (con decimales binarios daría 0.30000000000000004)', () => {
    expect(3 * 0.1).not.toBe(0.3);
    expect(calcularTotalCentavos([{ cantidad: 3, precio_unitario: '0.10' }])).toBe(30);
    expect(centavosATexto(calcularTotalCentavos([{ cantidad: 3, precio_unitario: 0.1 }]))).toBe('0.30');
  });

  test('0.10 + 0.20 da 0.30', () => {
    expect(centavosATexto(calcularTotalCentavos([
      { cantidad: 1, precio_unitario: '0.10' },
      { cantidad: 1, precio_unitario: '0.20' },
    ]))).toBe('0.30');
  });

  test('suma varias líneas con cantidades', () => {
    const lineas = [
      { cantidad: 1, precio_unitario: '10.00' },
      { cantidad: 2, precio_unitario: '35.00' },
      { cantidad: 3, precio_unitario: '19.99' },
    ];
    expect(calcularTotalCentavos(lineas)).toBe(1000 + 7000 + 5997);
    expect(centavosATexto(calcularTotalCentavos(lineas))).toBe('139.97');
  });

  test('aCentavos redondea el valor de la columna DECIMAL', () => {
    expect(aCentavos('19.99')).toBe(1999);
    expect(aCentavos(1.005 * 100 / 100)).toBe(100); // 1.005 no existe en binario: 1.00499...
    expect(aCentavos(0)).toBe(0);
  });
});

describe('RN-05: estaPendienteDeRespuesta (fechas simuladas)', () => {
  const AHORA = new Date('2026-10-20T12:00:00-06:00');
  const haceDias = (dias, horasExtra = 0) => new Date(AHORA.getTime() - (dias * 24 + horasExtra) * 60 * 60 * 1000);

  test('Pendiente con más días que el límite: sí', () => {
    expect(CotizacionService.estaPendienteDeRespuesta({ estado: 'Pendiente', fecha: haceDias(8) }, AHORA, 7)).toBe(true);
  });

  test('Pendiente justo en el límite o antes: todavía no', () => {
    expect(CotizacionService.estaPendienteDeRespuesta({ estado: 'Pendiente', fecha: haceDias(7) }, AHORA, 7)).toBe(false);
    expect(CotizacionService.estaPendienteDeRespuesta({ estado: 'Pendiente', fecha: haceDias(2) }, AHORA, 7)).toBe(false);
  });

  test('una hora después del límite ya cuenta', () => {
    expect(CotizacionService.estaPendienteDeRespuesta({ estado: 'Pendiente', fecha: haceDias(7, 1) }, AHORA, 7)).toBe(true);
  });

  test.each([['Aprobada'], ['Rechazada']])('una cotización %s nunca está pendiente de respuesta', (estado) => {
    expect(CotizacionService.estaPendienteDeRespuesta({ estado, fecha: haceDias(90) }, AHORA, 7)).toBe(false);
  });

  test('el límite viene de DIAS_LIMITE_COTIZACION y se puede cambiar', () => {
    const cotizacion = { estado: 'Pendiente', fecha: haceDias(4) };
    expect(CotizacionService.estaPendienteDeRespuesta(cotizacion, AHORA, 3)).toBe(true);
    expect(CotizacionService.estaPendienteDeRespuesta(cotizacion, AHORA, 10)).toBe(false);
  });

  test('solo es un indicador: no cambia la cotización', () => {
    const cotizacion = { estado: 'Pendiente', fecha: haceDias(30) };
    CotizacionService.estaPendienteDeRespuesta(cotizacion, AHORA, 7);
    expect(cotizacion.estado).toBe('Pendiente');
  });

  test('días transcurridos y estaVencida', () => {
    expect(diasTranscurridos(haceDias(12, 5), AHORA)).toBe(12);
    expect(estaVencida(haceDias(1), 0, AHORA)).toBe(true);
  });
});

describe('Líneas del formulario (leerLineas)', () => {
  test('lee listas paralelas de ítems y cantidades, y suma un ítem repetido', () => {
    expect(CotizacionService.leerLineas({ catalogo_id: ['1', '4', '1'], cantidad: ['1', '2', '3'] }))
      .toEqual([{ catalogoId: 1, cantidad: 4 }, { catalogoId: 4, cantidad: 2 }]);
  });

  test('acepta una sola línea (texto en lugar de lista) e ignora filas vacías', () => {
    expect(CotizacionService.leerLineas({ catalogo_id: '5', cantidad: '1' })).toEqual([{ catalogoId: 5, cantidad: 1 }]);
    expect(CotizacionService.leerLineas({ catalogo_id: ['5', ''], cantidad: ['1', '1'] })).toEqual([{ catalogoId: 5, cantidad: 1 }]);
  });

  test('nunca lee precios ni totales del formulario', () => {
    const lineas = CotizacionService.leerLineas({
      catalogo_id: ['1'], cantidad: ['2'], precio_unitario: ['0.01'], total: '0.01',
    });
    expect(lineas).toEqual([{ catalogoId: 1, cantidad: 2 }]);
  });

  test.each([
    [{}, 'Agrega al menos un ítem del catálogo.'],
    [{ catalogo_id: ['1'], cantidad: ['0'] }, 'Cada cantidad debe ser un número entero entre 1 y 999.'],
    [{ catalogo_id: ['1'], cantidad: ['1.5'] }, 'Cada cantidad debe ser un número entero entre 1 y 999.'],
    [{ catalogo_id: ['abc'], cantidad: ['1'] }, 'Uno de los ítems elegidos no es válido.'],
  ])('rechaza %j', (datos, mensaje) => {
    expect(() => CotizacionService.leerLineas(datos)).toThrow(ValidationError);
    expect(() => CotizacionService.leerLineas(datos)).toThrow(mensaje);
  });
});

describe('NotificacionListener', () => {
  const base = { ticketId: 8, folio: 'TT-2026-0043', tecnicoId: 2 };

  test('cotizacion.respondida (aprobada): al técnico asignado y a los admins', () => {
    expect(NotificacionListener.notificacionesPara(EVENTOS.COTIZACION_RESPONDIDA, { ...base, aprobada: true })).toEqual([
      { usuarioId: 2, ticketId: 8, tipo: 'cotizacion_respondida', mensaje: 'El cliente aprobó la cotización del ticket TT-2026-0043.' },
      { para: 'admins', ticketId: 8, tipo: 'cotizacion_respondida', mensaje: 'El cliente aprobó la cotización del ticket TT-2026-0043.' },
    ]);
  });

  test('cotizacion.respondida (rechazada) incluye el motivo', () => {
    const [alTecnico] = NotificacionListener.notificacionesPara(EVENTOS.COTIZACION_RESPONDIDA, {
      ...base, aprobada: false, motivo: 'Muy caro',
    });
    expect(alTecnico.mensaje).toBe('El cliente rechazó la cotización del ticket TT-2026-0043. Motivo: Muy caro');
  });

  test('cotizacion.respondida sin técnico asignado: solo los admins', () => {
    const lista = NotificacionListener.notificacionesPara(EVENTOS.COTIZACION_RESPONDIDA, { ...base, tecnicoId: null, aprobada: true });
    expect(lista.map((n) => n.para)).toEqual(['admins']);
  });

  test('ticket.reasignado: al técnico que lo recibe', () => {
    expect(NotificacionListener.notificacionesPara(EVENTOS.TICKET_REASIGNADO, { ...base, tecnicoId: 3, actorId: 1 })).toEqual([
      { usuarioId: 3, ticketId: 8, tipo: 'ticket_asignado', mensaje: 'Se te asignó el ticket TT-2026-0043.' },
    ]);
  });

  test('ticket.cancelado por el admin: al técnico, con el motivo', () => {
    const [aviso] = NotificacionListener.notificacionesPara(EVENTOS.TICKET_CANCELADO, { ...base, actorId: 1, motivo: 'Retiró el equipo' });
    expect(aviso).toEqual({
      usuarioId: 2, ticketId: 8, tipo: 'ticket_cancelado', mensaje: 'El administrador canceló el ticket TT-2026-0043. Motivo: Retiró el equipo',
    });
  });

  test('ticket.estadoCambiado: solo si lo cambió el admin, no el propio técnico', () => {
    const delAdmin = NotificacionListener.notificacionesPara(EVENTOS.TICKET_ESTADO_CAMBIADO, {
      ...base, actorId: 1, actorRol: 'admin', nuevo: 'Listo',
    });
    const delTecnico = NotificacionListener.notificacionesPara(EVENTOS.TICKET_ESTADO_CAMBIADO, {
      ...base, actorId: 2, actorRol: 'tecnico', nuevo: 'Listo',
    });
    expect(delAdmin).toEqual([{ usuarioId: 2, ticketId: 8, tipo: 'ticket_estado', mensaje: 'El administrador pasó el ticket TT-2026-0043 a «Listo».' }]);
    expect(delTecnico).toEqual([]);
  });

  test('cotizacion.creada no notifica a nadie (el cliente la ve en el portal)', () => {
    expect(NotificacionListener.notificacionesPara(EVENTOS.COTIZACION_CREADA, base)).toEqual([]);
  });

  test('procesar crea las notificaciones con NotificacionService', async () => {
    const crear = jest.spyOn(NotificacionService, 'crear').mockResolvedValue({});
    const admins = jest.spyOn(NotificacionService, 'notificarAdmins').mockResolvedValue([]);

    await NotificacionListener.procesar(EVENTOS.COTIZACION_RESPONDIDA, { ...base, aprobada: true });

    expect(crear).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: 2, tipo: 'cotizacion_respondida' }));
    expect(admins).toHaveBeenCalledWith(expect.objectContaining({ ticketId: 8 }));
  });

  test('el bus emite al hacer commit, no antes', () => {
    const emisor = new BusEventos();
    const recibido = jest.fn();
    emisor.on(EVENTOS.TICKET_REASIGNADO, recibido);
    const ganchos = [];
    const transaccionFalsa = { afterCommit: (fn) => ganchos.push(fn) };

    emisor.emitirAlConfirmar(transaccionFalsa, EVENTOS.TICKET_REASIGNADO, base);
    expect(recibido).not.toHaveBeenCalled();

    ganchos.forEach((fn) => fn()); // commit
    expect(recibido).toHaveBeenCalledWith(base);
  });
});
