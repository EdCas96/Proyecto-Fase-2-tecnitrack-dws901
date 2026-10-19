const AuthService = require('../services/AuthService');
const FotoService = require('../services/FotoService');
const { NotFoundError } = require('../utils/errors');

/**
 * Entrega las fotos de los tickets solo a quien puede ver el ticket.
 */
class FotosController {
  /** GET /fotos/:id */
  static async mostrar(req, res, next) {
    // El usuario se revalida en la base, como en requireAuth (RN-07)
    const enSesion = req.session.usuario;
    const usuario = enSesion ? await AuthService.obtenerUsuarioActivo(enSesion.id) : null;
    const foto = await FotoService.obtener(req.params.id, {
      usuario, clienteTicketId: req.session.clienteTicketId,
    });

    // Datos privados: el navegador no las guarda en caché compartida
    res.set('Cache-Control', 'private, no-store');
    if (foto.url) return res.redirect(foto.url);
    return res.sendFile(foto.ruta, { dotfiles: 'deny' }, (error) => {
      if (error && !res.headersSent) next(error.code === 'ENOENT' ? new NotFoundError('La foto no existe.') : error);
    });
  }
}

module.exports = FotosController;
