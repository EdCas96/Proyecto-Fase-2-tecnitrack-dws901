'use strict';

/**
 * Tickets del prototipo con su historial de estados y fotos.
 * Cada historial recorre el flujo válido (RN-04) hasta el estado actual del ticket.
 * usuario_id = null en el historial indica que el cambio lo hizo el cliente desde el portal.
 *
 * Usuarios: 1 admin, 2 Luis Fernández, 3 Jorge Pineda.
 * Equipos: 1 Dell (María), 2 HP (Carlos), 3 Lenovo (Ana), 4 Epson (Ana), 5 HP (José).
 * TT-2026-0043 usa fechas relativas al momento de sembrar: su cotización Pendiente
 * siempre está "al día" (lista para aprobar en la demo), mientras que la de
 * TT-2026-0040 es de septiembre y siempre aparece como "Pendiente de respuesta" (RN-05).
 * fecha_estimada (SC-03): fecha de entrega prometida al cliente; el ticket cancelado no tiene.
 */
const f = (fechaHora) => new Date(`${fechaHora}:00-06:00`);
/** Fecha relativa a "ahora" (horas hacia atrás). */
const haceHoras = (horas) => new Date(Date.now() - horas * 60 * 60 * 1000);
/** "AAAA-MM-DD" dentro de N días (hora de El Salvador). */
const enDias = (dias) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' })
  .format(new Date(Date.now() + dias * 24 * 60 * 60 * 1000));
const comoFecha = (valor) => (valor instanceof Date ? valor : f(valor));

const TICKETS = [
  {
    id: 1, folio: 'TT-2026-0035', fecha_estimada: '2026-09-05', equipo_id: 1, tecnico_id: 2, estado: 'Entregado',
    diagnostico_inicial: 'El equipo se sobrecalienta y el ventilador hace mucho ruido; se apaga solo tras 20 minutos de uso.',
    fecha_ingreso: f('2026-09-01T08:30'), fecha_entrega: f('2026-09-05T16:00'),
    historial: [
      [null, 'Recibido', 2, '2026-09-01T08:30'],
      ['Recibido', 'Diagnosticado', 2, '2026-09-01T14:00'],
      ['Diagnosticado', 'Esperando_aprobacion', 2, '2026-09-02T09:00'],
      ['Esperando_aprobacion', 'En_reparacion', null, '2026-09-02T15:20'],
      ['En_reparacion', 'Listo', 2, '2026-09-04T11:00'],
      ['Listo', 'Entregado', 2, '2026-09-05T16:00'],
    ],
    fotos: ['/img/equipo-placeholder-1.svg'],
  },
  {
    id: 2, folio: 'TT-2026-0037', fecha_estimada: '2026-09-14', equipo_id: 4, tecnico_id: 3, estado: 'En_reparacion',
    diagnostico_inicial: 'Imprime con franjas horizontales y no reconoce el cartucho negro.',
    fecha_ingreso: f('2026-09-05T10:00'), fecha_entrega: null,
    historial: [
      [null, 'Recibido', 3, '2026-09-05T10:00'],
      ['Recibido', 'Diagnosticado', 3, '2026-09-06T11:30'],
      ['Diagnosticado', 'Esperando_aprobacion', 3, '2026-09-07T09:15'],
      ['Esperando_aprobacion', 'En_reparacion', null, '2026-09-09T10:40'],
    ],
    fotos: ['/img/equipo-placeholder-1.svg', '/img/equipo-placeholder-2.svg'],
  },
  {
    id: 3, folio: 'TT-2026-0038', equipo_id: 2, tecnico_id: 3, estado: 'Cancelado',
    diagnostico_inicial: 'Muy lento al iniciar; el disco duro hace ruido de golpeteo.',
    fecha_ingreso: f('2026-09-05T11:30'), fecha_entrega: null,
    historial: [
      [null, 'Recibido', 3, '2026-09-05T11:30'],
      ['Recibido', 'Diagnosticado', 3, '2026-09-05T16:00'],
      ['Diagnosticado', 'Esperando_aprobacion', 3, '2026-09-06T09:00'],
      ['Esperando_aprobacion', 'Cancelado', null, '2026-09-07T10:05'],
    ],
    fotos: ['/img/equipo-placeholder-2.svg'],
  },
  {
    id: 4, folio: 'TT-2026-0039', fecha_estimada: '2026-09-12', equipo_id: 1, tecnico_id: 3, estado: 'Listo',
    diagnostico_inicial: 'Se reinicia sola al abrir varios programas a la vez; posible falla de memoria RAM.',
    fecha_ingreso: f('2026-09-08T09:00'), fecha_entrega: null,
    historial: [
      [null, 'Recibido', 3, '2026-09-08T09:00'],
      ['Recibido', 'Diagnosticado', 3, '2026-09-08T15:00'],
      ['Diagnosticado', 'Esperando_aprobacion', 3, '2026-09-09T08:30'],
      ['Esperando_aprobacion', 'En_reparacion', null, '2026-09-09T12:00'],
      ['En_reparacion', 'Esperando_repuesto', 3, '2026-09-09T14:00'],
      ['Esperando_repuesto', 'En_reparacion', 3, '2026-09-10T10:00'],
      ['En_reparacion', 'Listo', 3, '2026-09-11T17:00'],
    ],
    fotos: ['/img/equipo-placeholder-1.svg'],
  },
  {
    id: 5, folio: 'TT-2026-0040', fecha_estimada: '2026-09-18', equipo_id: 3, tecnico_id: 2, estado: 'Esperando_aprobacion',
    diagnostico_inicial: 'Se calienta en exceso y funciona lento; el cliente solicita ampliar la memoria.',
    fecha_ingreso: f('2026-09-10T10:30'), fecha_entrega: null,
    historial: [
      [null, 'Recibido', 2, '2026-09-10T10:30'],
      ['Recibido', 'Diagnosticado', 2, '2026-09-11T09:00'],
      ['Diagnosticado', 'Esperando_aprobacion', 2, '2026-09-12T08:45'],
    ],
    fotos: ['/img/equipo-placeholder-2.svg'],
  },
  {
    id: 6, folio: 'TT-2026-0041', fecha_estimada: '2026-09-19', equipo_id: 2, tecnico_id: 2, estado: 'Diagnosticado',
    diagnostico_inicial: 'No arranca el sistema operativo; muestra pantalla azul al iniciar.',
    fecha_ingreso: f('2026-09-11T09:45'), fecha_entrega: null,
    historial: [
      [null, 'Recibido', 2, '2026-09-11T09:45'],
      ['Recibido', 'Diagnosticado', 2, '2026-09-12T10:20'],
    ],
    fotos: ['/img/equipo-placeholder-1.svg', '/img/equipo-placeholder-2.svg'],
  },
  {
    id: 7, folio: 'TT-2026-0042', fecha_estimada: '2026-09-20', equipo_id: 1, tecnico_id: null, estado: 'Recibido',
    diagnostico_inicial: 'La batería no carga y algunas teclas del teclado no responden.',
    fecha_ingreso: f('2026-09-12T16:10'), fecha_entrega: null,
    historial: [[null, 'Recibido', 1, '2026-09-12T16:10']],
    fotos: ['/img/equipo-placeholder-2.svg'],
  },
  {
    id: 8, folio: 'TT-2026-0043', fecha_estimada: enDias(5), equipo_id: 5, tecnico_id: 2, estado: 'Esperando_aprobacion',
    diagnostico_inicial: 'El disco duro hace ruido y el sistema tarda varios minutos en iniciar.',
    fecha_ingreso: haceHoras(50), fecha_entrega: null,
    historial: [
      [null, 'Recibido', 2, haceHoras(50)],
      ['Recibido', 'Diagnosticado', 2, haceHoras(26)],
      ['Diagnosticado', 'Esperando_aprobacion', 2, haceHoras(2)],
    ],
    fotos: ['/img/equipo-placeholder-1.svg'],
  },
];

module.exports = {
  async up(queryInterface) {
    const tickets = [];
    const historial = [];
    const fotos = [];

    for (const { historial: cambios, fotos: urls, ...ticket } of TICKETS) {
      const ultimaFecha = comoFecha(cambios[cambios.length - 1][3]);
      tickets.push({ ...ticket, created_at: ticket.fecha_ingreso, updated_at: ultimaFecha });

      for (const [estadoAnterior, estadoNuevo, usuarioId, fecha] of cambios) {
        historial.push({
          ticket_id: ticket.id,
          estado_anterior: estadoAnterior,
          estado_nuevo: estadoNuevo,
          usuario_id: usuarioId,
          fecha: comoFecha(fecha),
          created_at: comoFecha(fecha),
          updated_at: comoFecha(fecha),
        });
      }

      for (const url of urls) {
        fotos.push({ ticket_id: ticket.id, url_foto: url, created_at: ticket.fecha_ingreso, updated_at: ticket.fecha_ingreso });
      }
    }

    await queryInterface.bulkInsert('tickets', tickets);
    await queryInterface.bulkInsert('ticket_historiales', historial);
    await queryInterface.bulkInsert('ticket_fotos', fotos);

    // RN-03: el contador de folios continúa después del último folio de ejemplo
    const ultimo = Math.max(...TICKETS.map((t) => Number(t.folio.slice(8))));
    await queryInterface.sequelize.query(
      'INSERT INTO folio_contadores (anio, ultimo) VALUES (2026, ?) ON DUPLICATE KEY UPDATE ultimo = GREATEST(ultimo, VALUES(ultimo))',
      { replacements: [ultimo] },
    );
  },

  async down(queryInterface) {
    const ids = TICKETS.map((t) => t.id);
    await queryInterface.bulkDelete('ticket_fotos', { ticket_id: ids });
    await queryInterface.bulkDelete('ticket_historiales', { ticket_id: ids });
    await queryInterface.bulkDelete('tickets', { id: ids });
  },
};
