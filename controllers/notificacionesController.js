const NotificacionService = require('../services/NotificacionService');
const { migasDe } = require('../utils/vistas');

/**
 * Notificaciones del usuario en sesión (HU-10). Cada uno solo ve las suyas.
 */
class NotificacionesController {
  /** GET /notificaciones?pagina= */
  static async listar(req, res) {
    const paginacion = await NotificacionService.listar(req.usuario.id, { pagina: req.query.pagina });
    res.render('notificaciones/index', {
      titulo: 'Notificaciones',
      migas: migasDe(req.usuario, { texto: 'Notificaciones' }),
      paginacion,
      filtros: {},
    });
  }

  /** GET /notificaciones/no-leidas — JSON { total } para actualizar el contador sin recargar. */
  static async noLeidas(req, res) {
    res.json({ total: await NotificacionService.contarNoLeidas(req.usuario.id) });
  }

  /** PATCH /notificaciones/:id/leida */
  static async marcarLeida(req, res) {
    const notificacion = await NotificacionService.marcarLeida(req.params.id, req.usuario.id);
    if (req.accepts(['html', 'json']) === 'json') return res.json({ id: notificacion.id, leida: true });
    // "Ver ticket": marca como leída y lleva al ticket
    return res.redirect(303, req.body.ir_a_ticket ? `/tickets/${notificacion.ticket_id}` : '/notificaciones');
  }

  /** PATCH /notificaciones/leidas — marca todas como leídas. */
  static async marcarTodas(req, res) {
    const total = await NotificacionService.marcarTodas(req.usuario.id);
    if (req.accepts(['html', 'json']) === 'json') return res.json({ marcadas: total });
    req.flash('exito', total ? `Marcaste ${total} notificación${total === 1 ? '' : 'es'} como leída${total === 1 ? '' : 's'}.` : 'No tenías notificaciones sin leer.');
    return res.redirect(303, '/notificaciones');
  }
}

module.exports = NotificacionesController;
