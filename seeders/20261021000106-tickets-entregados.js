'use strict';

/**
 * Tickets ya entregados para la demo de reportes (HU-08, RF-11): cada uno
 * recorre el flujo completo con su cotización Aprobada, con duraciones
 * distintas entre Recibido y Entregado.
 *
 * - TT-2026-0028 a TT-2026-0034: agosto y septiembre de 2026 (fechas fijas,
 *   las usan las pruebas de ReporteService).
 * - TT-2026-0044 y TT-2026-0045: entregados hace unas horas (fechas relativas
 *   al momento de sembrar), para que el reporte del mes actual tenga datos.
 *
 * Usuarios: 2 Luis Fernández, 3 Jorge Pineda, 4 Óscar Meléndez (hoy inactivo).
 * Equipos: 2 HP (Carlos), 3 Lenovo (Ana), 4 Epson (Ana), 5 HP (José).
 * Catálogo: 1 Diagnóstico $10, 2 Limpieza $15, 3 Instalación SO $20,
 *           4 RAM 8GB $35, 5 SSD 480GB $55, 6 Cartucho $12.
 */
const f = (fechaHora) => new Date(`${fechaHora}:00-06:00`);
const haceHoras = (horas) => new Date(Date.now() - horas * 60 * 60 * 1000);
const enDias = (base, dias) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' })
  .format(new Date(base.getTime() + dias * 24 * 60 * 60 * 1000));

const ENTREGADOS = [
  { id: 9, folio: 'TT-2026-0028', equipo: 2, tecnico: 2, ingreso: f('2026-08-03T09:00'), entrega: f('2026-08-06T15:00'), items: [[1, 1, 10], [3, 1, 20]], diagnostico: 'Reinstalación del sistema operativo por virus.' },
  { id: 10, folio: 'TT-2026-0029', equipo: 4, tecnico: 3, ingreso: f('2026-08-10T10:00'), entrega: f('2026-08-12T10:00'), items: [[1, 1, 10], [6, 2, 12]], diagnostico: 'No imprime en color; cartuchos agotados.' },
  { id: 11, folio: 'TT-2026-0030', equipo: 3, tecnico: 3, ingreso: f('2026-08-18T08:00'), entrega: f('2026-08-23T12:00'), items: [[1, 1, 10], [5, 1, 55], [3, 1, 20]], diagnostico: 'El disco duro falla al arrancar.' },
  { id: 12, folio: 'TT-2026-0031', equipo: 5, tecnico: 2, ingreso: f('2026-08-25T14:00'), entrega: f('2026-08-27T14:00'), items: [[1, 1, 10], [2, 1, 15]], diagnostico: 'Se apaga por sobrecalentamiento.' },
  { id: 13, folio: 'TT-2026-0032', equipo: 2, tecnico: 3, ingreso: f('2026-09-02T09:00'), entrega: f('2026-09-05T18:00'), items: [[1, 1, 10], [4, 1, 35]], diagnostico: 'Muy lento con varios programas abiertos.' },
  { id: 14, folio: 'TT-2026-0033', equipo: 4, tecnico: 4, ingreso: f('2026-08-05T08:00'), entrega: f('2026-08-09T08:00'), items: [[1, 1, 10], [6, 1, 12]], diagnostico: 'Atasco de papel recurrente.' },
  { id: 15, folio: 'TT-2026-0034', equipo: 3, tecnico: 2, ingreso: f('2026-09-03T10:00'), entrega: f('2026-09-04T10:00'), items: [[1, 1, 10], [2, 1, 15]], diagnostico: 'Ventilador ruidoso.' },
  { id: 16, folio: 'TT-2026-0044', equipo: 5, tecnico: 3, ingreso: haceHoras(40), entrega: haceHoras(4), items: [[1, 1, 10], [4, 1, 35]], diagnostico: 'Pide ampliar la memoria RAM.' },
  { id: 17, folio: 'TT-2026-0045', equipo: 2, tecnico: 2, ingreso: haceHoras(30), entrega: haceHoras(1), items: [[1, 1, 10], [2, 1, 15]], diagnostico: 'Limpieza preventiva y cambio de pasta térmica.' },
];
const PRIMERA_COTIZACION = 7;

/** Fecha intermedia entre el ingreso y la entrega (fracción de 0 a 1). */
const entre = (inicio, fin, fraccion) => new Date(inicio.getTime() + (fin.getTime() - inicio.getTime()) * fraccion);

module.exports = {
  async up(queryInterface) {
    const tickets = [];
    const historial = [];
    const fotos = [];
    const cotizaciones = [];
    const items = [];

    ENTREGADOS.forEach((t, i) => {
      const fechas = {
        Recibido: t.ingreso,
        Diagnosticado: entre(t.ingreso, t.entrega, 0.15),
        Esperando_aprobacion: entre(t.ingreso, t.entrega, 0.25),
        En_reparacion: entre(t.ingreso, t.entrega, 0.4),
        Listo: entre(t.ingreso, t.entrega, 0.9),
        Entregado: t.entrega,
      };
      tickets.push({
        id: t.id, folio: t.folio, equipo_id: t.equipo, tecnico_id: t.tecnico, estado: 'Entregado',
        diagnostico_inicial: t.diagnostico, fecha_ingreso: t.ingreso, fecha_estimada: enDias(t.ingreso, 5),
        fecha_entrega: t.entrega, created_at: t.ingreso, updated_at: t.entrega,
      });

      // El flujo completo; la aprobación la hizo el cliente desde el portal (usuario_id NULL)
      const pasos = [
        [null, 'Recibido', t.tecnico],
        ['Recibido', 'Diagnosticado', t.tecnico],
        ['Diagnosticado', 'Esperando_aprobacion', t.tecnico],
        ['Esperando_aprobacion', 'En_reparacion', null],
        ['En_reparacion', 'Listo', t.tecnico],
        ['Listo', 'Entregado', t.tecnico],
      ];
      pasos.forEach(([anterior, nuevo, usuario]) => historial.push({
        ticket_id: t.id, estado_anterior: anterior, estado_nuevo: nuevo, usuario_id: usuario,
        comentario: nuevo === 'En_reparacion' ? 'El cliente aprobó la cotización.' : null,
        fecha: fechas[nuevo], created_at: fechas[nuevo], updated_at: fechas[nuevo],
      }));

      fotos.push({ ticket_id: t.id, url_foto: '/img/equipo-placeholder-1.svg', created_at: t.ingreso, updated_at: t.ingreso });

      const cotizacionId = PRIMERA_COTIZACION + i;
      const total = t.items.reduce((suma, [, cantidad, precio]) => suma + cantidad * precio * 100, 0) / 100;
      cotizaciones.push({
        id: cotizacionId, ticket_id: t.id, estado: 'Aprobada', total, fecha: fechas.Esperando_aprobacion,
        created_at: fechas.Esperando_aprobacion, updated_at: fechas.En_reparacion,
      });
      t.items.forEach(([catalogoId, cantidad, precio]) => items.push({
        cotizacion_id: cotizacionId, catalogo_id: catalogoId, cantidad, precio_unitario: precio,
        created_at: fechas.Esperando_aprobacion, updated_at: fechas.Esperando_aprobacion,
      }));
    });

    await queryInterface.bulkInsert('tickets', tickets);
    await queryInterface.bulkInsert('ticket_historiales', historial);
    await queryInterface.bulkInsert('ticket_fotos', fotos);
    await queryInterface.bulkInsert('cotizaciones', cotizaciones);
    await queryInterface.bulkInsert('cotizacion_items', items);

    // RN-03: el contador de folios sigue después del folio más alto
    const ultimo = Math.max(...ENTREGADOS.map((t) => Number(t.folio.slice(8))));
    await queryInterface.sequelize.query(
      'INSERT INTO folio_contadores (anio, ultimo) VALUES (2026, ?) ON DUPLICATE KEY UPDATE ultimo = GREATEST(ultimo, VALUES(ultimo))',
      { replacements: [ultimo] },
    );
  },

  async down(queryInterface) {
    const ids = ENTREGADOS.map((t) => t.id);
    const cotizaciones = ENTREGADOS.map((t, i) => PRIMERA_COTIZACION + i);
    await queryInterface.bulkDelete('cotizacion_items', { cotizacion_id: cotizaciones });
    await queryInterface.bulkDelete('cotizaciones', { id: cotizaciones });
    await queryInterface.bulkDelete('ticket_fotos', { ticket_id: ids });
    await queryInterface.bulkDelete('ticket_historiales', { ticket_id: ids });
    await queryInterface.bulkDelete('tickets', { id: ids });
  },
};
