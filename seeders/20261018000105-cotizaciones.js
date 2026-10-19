'use strict';

/**
 * Cotizaciones de los tickets del prototipo, con sus líneas y las notificaciones
 * que recibieron el técnico y el admin cuando el cliente respondió (RN-06, HU-10).
 * Demo del paso 7:
 * - TT-2026-0040: Pendiente desde septiembre -> "Pendiente de respuesta" (RN-05).
 * - TT-2026-0043: Pendiente enviada hace 2 horas -> lista para aprobar en el portal.
 * - El rechazo de TT-2026-0038 queda sin leer para Jorge y el admin (alerta del dashboard).
 *
 * Catálogo: 1 Diagnóstico $10, 2 Limpieza $15, 3 Instalación SO $20,
 *           4 RAM 8GB $35, 5 SSD 480GB $55, 6 Cartucho $12.
 */
const f = (fechaHora) => new Date(`${fechaHora}:00-06:00`);
const haceHoras = (horas) => new Date(Date.now() - horas * 60 * 60 * 1000);
const comoFecha = (valor) => (valor instanceof Date ? valor : f(valor));
const ADMIN_ID = 1;

const COTIZACIONES = [
  {
    // TT-2026-0035 (Entregado)
    id: 1, ticket_id: 1, estado: 'Aprobada', fecha: '2026-09-02T09:00', respuesta: '2026-09-02T15:20',
    items: [[1, 1, 10.0], [2, 1, 15.0]],
    notificacion: { usuario_id: 2, mensaje: 'El cliente aprobó la cotización del ticket TT-2026-0035.', leida: true },
  },
  {
    // TT-2026-0037 (En reparación): el cartucho se cotizó con descuento sobre el precio de referencia
    id: 2, ticket_id: 2, estado: 'Aprobada', fecha: '2026-09-07T09:15', respuesta: '2026-09-09T10:40',
    items: [[1, 1, 10.0], [2, 1, 15.0], [6, 2, 10.0]],
    notificacion: { usuario_id: 3, mensaje: 'El cliente aprobó la cotización del ticket TT-2026-0037.', leida: true },
  },
  {
    // TT-2026-0038 (Cancelado por rechazo del cliente)
    id: 3, ticket_id: 3, estado: 'Rechazada', fecha: '2026-09-06T09:00', respuesta: '2026-09-07T10:05',
    items: [[1, 1, 10.0], [5, 1, 55.0], [3, 1, 20.0]],
    notificacion: { usuario_id: 3, mensaje: 'El cliente rechazó la cotización del ticket TT-2026-0038.', leida: false },
  },
  {
    // TT-2026-0039 (Listo)
    id: 4, ticket_id: 4, estado: 'Aprobada', fecha: '2026-09-09T08:30', respuesta: '2026-09-09T12:00',
    items: [[1, 1, 10.0], [4, 1, 35.0]],
    notificacion: { usuario_id: 3, mensaje: 'El cliente aprobó la cotización del ticket TT-2026-0039.', leida: true },
  },
  {
    // TT-2026-0040 (Esperando aprobación): Pendiente desde hace más de DIAS_LIMITE_COTIZACION (RN-05)
    id: 5, ticket_id: 5, estado: 'Pendiente', fecha: '2026-09-12T08:45', respuesta: null,
    items: [[1, 1, 10.0], [2, 1, 15.0], [4, 1, 35.0]],
    notificacion: null,
  },
  {
    // TT-2026-0043 (Esperando aprobación): Pendiente reciente, lista para aprobar
    id: 6, ticket_id: 8, estado: 'Pendiente', fecha: haceHoras(2), respuesta: null,
    items: [[1, 1, 10.0], [5, 1, 55.0]],
    notificacion: null,
  },
];

module.exports = {
  async up(queryInterface) {
    const cotizaciones = [];
    const items = [];
    const notificaciones = [];

    for (const cot of COTIZACIONES) {
      const fecha = comoFecha(cot.fecha);
      const actualizada = cot.respuesta ? comoFecha(cot.respuesta) : fecha;
      const total = cot.items.reduce((suma, [, cantidad, precio]) => suma + cantidad * precio, 0);

      cotizaciones.push({
        id: cot.id, ticket_id: cot.ticket_id, estado: cot.estado, total, fecha,
        created_at: fecha, updated_at: actualizada,
      });

      for (const [catalogoId, cantidad, precio] of cot.items) {
        items.push({
          cotizacion_id: cot.id, catalogo_id: catalogoId, cantidad, precio_unitario: precio,
          created_at: fecha, updated_at: fecha,
        });
      }

      if (cot.notificacion) {
        // El mismo aviso para el técnico asignado y para el admin (NotificacionListener hace lo mismo)
        for (const usuarioId of [cot.notificacion.usuario_id, ADMIN_ID]) {
          notificaciones.push({
            ticket_id: cot.ticket_id, ...cot.notificacion, usuario_id: usuarioId, tipo: 'cotizacion_respondida',
            fecha: actualizada, created_at: actualizada, updated_at: actualizada,
          });
        }
      }
    }

    await queryInterface.bulkInsert('cotizaciones', cotizaciones);
    await queryInterface.bulkInsert('cotizacion_items', items);
    await queryInterface.bulkInsert('notificaciones', notificaciones);
  },

  async down(queryInterface) {
    const ids = COTIZACIONES.map((c) => c.id);
    await queryInterface.bulkDelete('notificaciones', { ticket_id: COTIZACIONES.map((c) => c.ticket_id) });
    await queryInterface.bulkDelete('cotizacion_items', { cotizacion_id: ids });
    await queryInterface.bulkDelete('cotizaciones', { id: ids });
  },
};
