const path = require('path');
const { TicketFoto, Ticket } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const { DIRECTORIO_FOTOS } = require('../middlewares/upload');

const idValido = (id) => (/^\d+$/.test(String(id)) ? Number(id) : null);

/**
 * Acceso a las fotos de los tickets. Las fotos subidas se guardan fuera de
 * public/ con un nombre aleatorio; solo se entregan a quien puede ver el
 * ticket: el admin, el técnico asignado o el cliente que validó ese ticket en
 * el portal.
 *
 * @implements HU-02, HU-04, RN-02
 */
class FotoService {
  /**
   * @param {number|string} id Id de la foto (ticket_fotos.id).
   * @param {{usuario?: {id: number, rol: string}, clienteTicketId?: number}} sesion
   * @returns {Promise<{ruta: string}|{url: string}>} ruta en disco de una foto subida,
   *   o url pública de una imagen de ejemplo de los seeders (/img/...).
   * @throws {NotFoundError|ForbiddenError}
   */
  static async obtener(id, { usuario, clienteTicketId } = {}) {
    const foto = idValido(id) && await TicketFoto.findByPk(idValido(id), {
      attributes: ['id', 'url_foto', 'ticket_id'],
      include: { model: Ticket, as: 'ticket', attributes: ['id', 'tecnico_id'] },
    });
    if (!foto) throw new NotFoundError('La foto no existe.');

    const { ticket } = foto;
    const permitido = (usuario && usuario.rol === 'admin')
      || (usuario && ticket.tecnico_id === usuario.id)
      || (clienteTicketId && clienteTicketId === ticket.id);
    if (!permitido) throw new ForbiddenError('No tienes permiso para ver esta foto.');

    // Las imágenes de ejemplo de los seeders son archivos públicos (/img/...)
    if (foto.url_foto.startsWith('/')) return { url: foto.url_foto };

    // Solo el nombre del archivo: evita que un valor manipulado salga de la carpeta de fotos
    return { ruta: path.join(DIRECTORIO_FOTOS, path.basename(foto.url_foto)) };
  }
}

module.exports = FotoService;
