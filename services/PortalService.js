const { Ticket, Equipo, Cliente } = require('../models');
const { NotFoundError } = require('../utils/errors');

/**
 * Datos que ve el cliente en el portal público. Solo devuelve lo necesario
 * para la pantalla (sin datos del técnico ni de otros tickets).
 * El historial y la cotización se agregan con HU-05.
 */
class PortalService {
  /**
   * Resumen del ticket al que el cliente tiene acceso (clienteTicketId de la sesión).
   *
   * @implements HU-04
   * @param {number} ticketId
   * @returns {Promise<{folio: string, estado: string, fechaIngreso: Date, cliente: string, equipo: string}>}
   * @throws {NotFoundError} Si el ticket ya no existe.
   */
  static async obtenerResumenTicket(ticketId) {
    const ticket = await Ticket.findByPk(ticketId, {
      attributes: ['id', 'folio', 'estado', 'fecha_ingreso'],
      include: {
        model: Equipo,
        as: 'equipo',
        attributes: ['tipo', 'marca', 'modelo'],
        include: { model: Cliente, as: 'cliente', attributes: ['nombre'] },
      },
    });
    if (!ticket) throw new NotFoundError('No se encontró un ticket con esos datos');

    const { equipo } = ticket;
    return {
      folio: ticket.folio,
      estado: ticket.estado,
      fechaIngreso: ticket.fecha_ingreso,
      cliente: equipo.cliente.nombre,
      equipo: `${equipo.tipo} ${equipo.marca} ${equipo.modelo}`,
    };
  }
}

module.exports = PortalService;
