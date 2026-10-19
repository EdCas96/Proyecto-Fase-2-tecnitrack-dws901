const { Notificacion, Usuario, Ticket } = require('../models');
const { NotFoundError } = require('../utils/errors');
const { opcionesPaginacion, resultadoPaginado } = require('../utils/paginacion');

const LARGO_MAXIMO = 255;
const idValido = (id) => (/^\d+$/.test(String(id)) ? Number(id) : null);

/**
 * Avisos internos para el personal (HU-10). Las crea NotificacionListener al
 * recibir los eventos del dominio; los usuarios las consultan y las marcan como leídas.
 *
 * @implements RF-12, HU-10
 */
class NotificacionService {
  /**
   * @param {{usuarioId: number, ticketId: number, tipo?: string, mensaje: string}} datos
   * @returns {Promise<Notificacion>}
   */
  static async crear({
    usuarioId, ticketId, tipo = null, mensaje,
  }) {
    return Notificacion.create({
      usuario_id: usuarioId,
      ticket_id: ticketId,
      tipo,
      mensaje: String(mensaje).slice(0, LARGO_MAXIMO),
      leida: false,
      fecha: new Date(),
    });
  }

  /**
   * La misma notificación para todos los admins activos (ej. el cliente respondió).
   * @returns {Promise<Notificacion[]>}
   */
  static async notificarAdmins({ ticketId, tipo, mensaje }) {
    const admins = await Usuario.findAll({ where: { rol: 'admin', activo: true }, attributes: ['id'] });
    return Promise.all(admins.map((admin) => NotificacionService.crear({
      usuarioId: admin.id, ticketId, tipo, mensaje,
    })));
  }

  /**
   * Notificaciones del usuario, no leídas primero y luego las más recientes (paginado en la consulta).
   * @param {number} usuarioId
   * @param {{pagina?: number}} [opciones]
   */
  static async listar(usuarioId, { pagina = 1 } = {}) {
    const resultado = await Notificacion.findAndCountAll({
      where: { usuario_id: usuarioId },
      include: { model: Ticket, as: 'ticket', attributes: ['id', 'folio', 'estado'] },
      order: [['leida', 'ASC'], ['fecha', 'DESC'], ['id', 'DESC']],
      ...opcionesPaginacion(pagina),
    });
    return resultadoPaginado(resultado, pagina);
  }

  /**
   * @param {number} usuarioId
   * @param {{tipo?: string}} [filtro] Solo las de un tipo (ej. cotizacion_respondida).
   * @returns {Promise<number>}
   */
  static async contarNoLeidas(usuarioId, { tipo } = {}) {
    if (!usuarioId) return 0;
    const where = { usuario_id: usuarioId, leida: false };
    if (tipo) where.tipo = tipo;
    return Notificacion.count({ where });
  }

  /**
   * Marca una notificación del usuario como leída. La de otro usuario no se encuentra.
   * @returns {Promise<Notificacion>}
   * @throws {NotFoundError}
   */
  static async marcarLeida(id, usuarioId) {
    const notificacion = idValido(id) && await Notificacion.findOne({
      where: { id: idValido(id), usuario_id: usuarioId },
    });
    if (!notificacion) throw new NotFoundError('La notificación no existe.');
    if (!notificacion.leida) await notificacion.update({ leida: true }, { fields: ['leida'] });
    return notificacion;
  }

  /** @returns {Promise<number>} Cuántas se marcaron. */
  static async marcarTodas(usuarioId) {
    const [cambiadas] = await Notificacion.update({ leida: true }, { where: { usuario_id: usuarioId, leida: false } });
    return cambiadas;
  }
}

module.exports = NotificacionService;
