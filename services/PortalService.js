const { Ticket, Equipo, Cliente, TicketHistorial } = require('../models');
const { NotFoundError } = require('../utils/errors');

/**
 * Datos que ve el cliente en el portal público. Solo devuelve lo necesario
 * para la pantalla: sin datos del técnico, sin comentarios internos y sin
 * otros tickets. La cotización y aprobar/rechazar se agregan con HU-05.
 */
class PortalService {
  /**
   * Resumen del ticket al que el cliente tiene acceso (clienteTicketId de la sesión):
   * estado actual, fecha estimada, equipo e historial de estados.
   *
   * @implements HU-04, RF-05
   * @param {number} ticketId
   * @returns {Promise<{folio: string, estado: string, fechaIngreso: Date, fechaEstimada: string|null,
   *   fechaEntrega: Date|null, cliente: string, equipo: string, historial: Array<{estado: string, fecha: Date}>}>}
   * @throws {NotFoundError} Si el ticket ya no existe.
   */
  static async obtenerResumenTicket(ticketId) {
    const ticket = await Ticket.findByPk(ticketId, {
      attributes: ['id', 'folio', 'estado', 'fecha_ingreso', 'fecha_estimada', 'fecha_entrega'],
      include: [
        {
          model: Equipo,
          as: 'equipo',
          attributes: ['tipo', 'marca', 'modelo'],
          include: { model: Cliente, as: 'cliente', attributes: ['nombre'] },
        },
        { model: TicketHistorial, as: 'historial', attributes: ['estado_anterior', 'estado_nuevo', 'fecha'] },
      ],
      order: [
        [{ model: TicketHistorial, as: 'historial' }, 'fecha', 'ASC'],
        [{ model: TicketHistorial, as: 'historial' }, 'id', 'ASC'],
      ],
    });
    if (!ticket) throw new NotFoundError('No se encontró un ticket con esos datos');

    const { equipo } = ticket;
    return {
      folio: ticket.folio,
      estado: ticket.estado,
      fechaIngreso: ticket.fecha_ingreso,
      fechaEstimada: ticket.fecha_estimada,
      fechaEntrega: ticket.fecha_entrega,
      cliente: equipo.cliente.nombre,
      equipo: `${equipo.tipo} ${equipo.marca} ${equipo.modelo}`,
      // Solo los cambios de estado: las reasignaciones internas no le interesan al cliente
      historial: ticket.historial
        .filter((cambio) => cambio.estado_anterior !== cambio.estado_nuevo)
        .map((cambio) => ({ estado: cambio.estado_nuevo, fecha: cambio.fecha })),
    };
  }
}

module.exports = PortalService;
