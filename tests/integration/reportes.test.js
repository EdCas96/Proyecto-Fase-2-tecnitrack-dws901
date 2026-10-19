/**
 * Reportes (HU-08, RF-11): promedio Recibido -> Entregado con fechas conocidas,
 * filtros por rango, servicios más solicitados, resumen por estado, CSV y permisos.
 *
 * Seeders (20261021000106-tickets-entregados.js), entregados en agosto de 2026:
 *   Luis:  TT-2026-0028 (3.25 días), TT-2026-0031 (2.0)  -> 2 tickets, 2.6 días
 *   Jorge: TT-2026-0029 (2.0),       TT-2026-0030 (5.17) -> 2 tickets, 3.6 días
 *   Óscar (inactivo): TT-2026-0033 (4.0)                 -> 1 ticket,  4.0 días
 * En septiembre: Luis TT-2026-0035 (4.31) y TT-2026-0034 (1.0) -> 2.7; Jorge TT-2026-0032 (3.38) -> 3.4.
 */
const { Ticket, TicketHistorial } = require('../../models');
const ReporteService = require('../../services/ReporteService');
const { ValidationError } = require('../../utils/errors');
const { sembrarDatos, cerrarConexiones } = require('../helpers/baseDatos');
const { USUARIOS, crearAgente, crearAgenteAutenticado } = require('../helpers/agente');

let admin;

beforeAll(async () => {
  await sembrarDatos();
  admin = await crearAgenteAutenticado({ correo: USUARIOS.admin.correo });
});
afterAll(cerrarConexiones);

const porNombre = (filas) => Object.fromEntries(filas.map((f) => [f.tecnico, [f.atendidos, f.promedioDias]]));
const f = (fechaHora) => new Date(`${fechaHora}:00-06:00`);

/** Ticket con su historial Recibido -> Entregado en fechas exactas. */
async function ticketConHistorial(folio, tecnicoId, estado, recibido, entregado) {
  const ticket = await Ticket.create({
    folio, equipo_id: 3, tecnico_id: tecnicoId, estado, diagnostico_inicial: 'Ticket del reporte.', fecha_ingreso: recibido,
  });
  await TicketHistorial.create({ ticket_id: ticket.id, estado_anterior: null, estado_nuevo: 'Recibido', usuario_id: tecnicoId, fecha: recibido });
  if (entregado) {
    await TicketHistorial.create({ ticket_id: ticket.id, estado_anterior: 'Listo', estado_nuevo: 'Entregado', usuario_id: tecnicoId, fecha: entregado });
  }
  return ticket;
}

describe('ReporteService.ticketsPorTecnico', () => {
  test('tickets atendidos y promedio en días con un decimal (agosto)', async () => {
    const filas = await ReporteService.ticketsPorTecnico('2026-08-01', '2026-08-31');

    expect(porNombre(filas)).toEqual({
      'Luis Fernández': [2, 2.6], // (3.25 + 2.0) / 2 = 2.625
      'Jorge Pineda': [2, 3.6], // (2.0 + 5.1667) / 2 = 3.583
      'Óscar Meléndez': [1, 4.0],
    });
    expect(filas.find((fila) => fila.tecnico === 'Óscar Meléndez').activo).toBe(false);
  });

  test('el rango filtra por la fecha de entrega (septiembre)', async () => {
    const filas = await ReporteService.ticketsPorTecnico('2026-09-01', '2026-09-30');

    expect(porNombre(filas)).toEqual({ 'Luis Fernández': [2, 2.7], 'Jorge Pineda': [1, 3.4] });
  });

  test('el rango incluye el día final completo y excluye el día siguiente', async () => {
    // TT-2026-0031 se entregó el 27/08 a las 14:00
    const incluye = porNombre(await ReporteService.ticketsPorTecnico('2026-08-27', '2026-08-27'));
    const excluye = porNombre(await ReporteService.ticketsPorTecnico('2026-08-28', '2026-08-30'));

    expect(incluye['Luis Fernández']).toEqual([1, 2.0]);
    expect(excluye['Luis Fernández']).toEqual([0, null]);
  });

  test('cálculo con fechas conocidas: 1.5 y 3.5 días dan 2.5', async () => {
    const tecnico = USUARIOS.jorge.id;
    await ticketConHistorial('TT-2025-0001', tecnico, 'Entregado', f('2025-03-01T08:00'), f('2025-03-02T20:00'));
    await ticketConHistorial('TT-2025-0002', tecnico, 'Entregado', f('2025-03-10T06:00'), f('2025-03-13T18:00'));

    const filas = porNombre(await ReporteService.ticketsPorTecnico('2025-03-01', '2025-03-31'));

    expect(filas['Jorge Pineda']).toEqual([2, 2.5]);
  });

  test('un ticket que no está Entregado no cuenta, aunque tenga fechas en el rango', async () => {
    const tecnico = USUARIOS.luis.id;
    // Tiene una entrada de Entregado en el historial, pero hoy no está en ese estado
    await ticketConHistorial('TT-2025-0003', tecnico, 'Listo', f('2025-03-05T08:00'), f('2025-03-06T08:00'));
    await ticketConHistorial('TT-2025-0004', tecnico, 'En_reparacion', f('2025-03-07T08:00'), null);

    const filas = porNombre(await ReporteService.ticketsPorTecnico('2025-03-01', '2025-03-31'));

    expect(filas['Luis Fernández']).toEqual([0, null]);
  });

  test('los técnicos activos sin entregas aparecen con 0; los inactivos sin entregas no', async () => {
    const filas = porNombre(await ReporteService.ticketsPorTecnico('2024-01-01', '2024-01-31'));

    expect(filas).toEqual({ 'Jorge Pineda': [0, null], 'Luis Fernández': [0, null] });
  });
});

describe('Validación del rango', () => {
  const HOY = new Date('2026-10-20T12:00:00-06:00');

  test('sin fechas usa el mes actual, del día 1 a hoy', () => {
    expect(ReporteService.validarRango({}, HOY)).toMatchObject({ desde: '2026-10-01', hasta: '2026-10-20' });
  });

  test.each([
    [{ desde: '2026-10-01' }, 'hasta', 'Indica la fecha final del reporte.'],
    [{ hasta: '2026-10-01' }, 'desde', 'Indica la fecha inicial del reporte.'],
    [{ desde: '2026-02-30', hasta: '2026-03-01' }, 'desde', 'La fecha inicial no es válida.'],
    [{ desde: 'ayer', hasta: '2026-03-01' }, 'desde', 'La fecha inicial no es válida.'],
    [{ desde: '2026-09-10', hasta: '2026-09-01' }, 'hasta', 'La fecha final debe ser igual o posterior a la inicial.'],
    [{ desde: '2025-01-01', hasta: '2026-01-02' }, 'hasta', 'El rango no puede ser mayor a un año.'],
  ])('%j se rechaza', (filtros, campo, mensaje) => {
    expect(() => ReporteService.validarRango(filtros, HOY)).toThrow(ValidationError);
    try {
      ReporteService.validarRango(filtros, HOY);
    } catch (error) {
      expect(error.detalles.errores).toEqual({ [campo]: mensaje });
    }
  });

  test('un año exacto (incluido un 29 de febrero) se acepta', () => {
    expect(() => ReporteService.validarRango({ desde: '2028-01-01', hasta: '2028-12-31' })).not.toThrow();
  });
});

describe('Servicios más solicitados y resumen por estado', () => {
  test('suma cantidades solo de cotizaciones Aprobadas', async () => {
    const servicios = await ReporteService.serviciosMasSolicitados('2026-08-01', '2026-08-31');

    // Agosto: 0028, 0029, 0030, 0031 y 0033 aprobadas; Diagnóstico en las cinco, cartuchos 2 + 1
    expect(servicios[0]).toMatchObject({ nombre: 'Diagnóstico general', cantidad: 5 });
    expect(servicios.find((s) => s.nombre === 'Cartucho de tinta genérico').cantidad).toBe(3);
    // La cotización Rechazada de TT-2026-0038 (septiembre) no cuenta
    const septiembre = await ReporteService.serviciosMasSolicitados('2026-09-06', '2026-09-06');
    expect(septiembre).toEqual([]);
  });

  test('cuenta los tickets ingresados en el rango por estado e incluye los estados en 0', async () => {
    const resumen = await ReporteService.resumenPorEstado('2026-09-01', '2026-09-30');
    const mapa = Object.fromEntries(resumen.map(({ estado, total }) => [estado, total]));

    expect(resumen).toHaveLength(8);
    expect(mapa).toMatchObject({ Entregado: 3, Cancelado: 1, Listo: 1, Esperando_repuesto: 0 });
  });
});

describe('Página /reportes y CSV', () => {
  test('el admin ve la tabla del prototipo, las barras y el resumen', async () => {
    const respuesta = await admin.agente.get('/reportes?desde=2026-08-01&hasta=2026-08-31');

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toMatch(/Jorge Pineda<\/td>\s*<td>2<\/td>\s*<td>3\.6 días<\/td>/);
    expect(respuesta.text).toMatch(/Óscar Meléndez <span class="text-small">\(inactivo\)<\/span><\/td>\s*<td>1<\/td>\s*<td>4\.0 días<\/td>/);
    expect(respuesta.text).toContain('<div class="progress-bar-fill" style="width: 100%;"></div>');
    expect(respuesta.text).toContain('Resumen por estado');
    expect(respuesta.text).toContain('href="/reportes/tecnicos.csv?desde=2026-08-01&amp;hasta=2026-08-31"');
  });

  test('sin datos en el rango muestra mensajes claros', async () => {
    const respuesta = await admin.agente.get('/reportes?desde=2024-01-01&hasta=2024-01-31');

    expect(respuesta.text).toContain('No hay tickets entregados en este periodo.');
    expect(respuesta.text).toContain('No hay cotizaciones aprobadas en este periodo.');
    expect(respuesta.text).toContain('No ingresaron tickets en este periodo.');
  });

  test('sin filtros usa el mes actual y muestra datos (entregas recientes de los seeders)', async () => {
    const respuesta = await admin.agente.get('/reportes');
    const { desde, hasta } = ReporteService.validarRango({});

    expect(respuesta.text).toContain(`value="${desde}"`);
    expect(respuesta.text).toContain(`value="${hasta}"`);
    expect(respuesta.text).not.toContain('No hay tickets entregados en este periodo.');
  });

  test('un rango inválido se rechaza con 400 y el error junto al campo', async () => {
    const respuesta = await admin.agente.get('/reportes?desde=2026-09-10&hasta=2026-09-01');

    expect(respuesta.status).toBe(400);
    expect(respuesta.text).toContain('<p class="campo-error" id="error-hasta">La fecha final debe ser igual o posterior a la inicial.</p>');
    expect(respuesta.text).not.toContain('Exportar CSV');
  });

  test('el CSV tiene BOM, los encabezados y las filas correctas', async () => {
    const respuesta = await admin.agente.get('/reportes/tecnicos.csv?desde=2026-08-01&hasta=2026-08-31').buffer(true);

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(respuesta.headers['content-disposition']).toBe('attachment; filename="tickets-por-tecnico_2026-08-01_2026-08-31.csv"');
    const texto = respuesta.text;
    expect(texto.charCodeAt(0)).toBe(0xfeff);
    expect(texto.slice(1).split('\r\n')).toEqual([
      'Técnico,Tickets atendidos,Tiempo promedio de reparación (días)',
      'Jorge Pineda,2,3.6',
      'Luis Fernández,2,2.6',
      'Óscar Meléndez,1,4.0',
      '',
    ]);
  });

  test('el CSV escapa comas y comillas en los nombres', () => {
    const csv = ReporteService.csvTicketsPorTecnico([{ tecnico: 'Pérez, "Toño"', atendidos: 1, promedioDias: null }]);

    expect(csv.slice(1).split('\r\n')[1]).toBe('"Pérez, ""Toño""",1,');
  });

  test('el CSV con un rango inválido responde 400', async () => {
    const respuesta = await admin.agente.get('/reportes/tecnicos.csv?desde=2026-09-10&hasta=2026-09-01').set('Accept', 'application/json');

    expect(respuesta.status).toBe(400);
  });

  test.each([['/reportes'], ['/reportes/tecnicos.csv']])('el técnico recibe 403 en %s', async (ruta) => {
    const tecnico = await crearAgenteAutenticado({ correo: USUARIOS.luis.correo });

    expect((await tecnico.agente.get(ruta)).status).toBe(403);
  });

  test('sin sesión, /reportes pide iniciar sesión', async () => {
    const respuesta = await crearAgente().get('/reportes');

    expect(respuesta.headers.location).toBe('/login');
  });
});
