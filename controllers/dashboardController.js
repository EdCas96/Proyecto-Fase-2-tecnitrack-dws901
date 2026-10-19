const TicketService = require('../services/TicketService');
const CotizacionService = require('../services/CotizacionService');
const NotificacionService = require('../services/NotificacionService');

/**
 * Paneles de inicio de cada rol (prototipos: admin/dashboard.html y tecnico/dashboard.html).
 */
class DashboardController {
  /** GET /admin — indicadores y tickets recientes. */
  static async admin(req, res) {
    const [{ kpis, recientes }, pendientesRespuesta] = await Promise.all([
      TicketService.resumenAdmin(),
      CotizacionService.contarPendientesDeRespuesta(),
    ]);
    res.render('admin/dashboard', {
      titulo: 'Dashboard',
      usuario: req.usuario,
      migas: [{ texto: 'Administrador', url: '/admin' }, { texto: 'Dashboard' }],
      kpis: { ...kpis, pendientesRespuesta },
      recientes,
    });
  }

  /** GET /tecnico — "Mis tickets": los abiertos asignados al técnico (RN-02). */
  static async tecnico(req, res) {
    const [paginacion, porEstado, respuestasSinLeer] = await Promise.all([
      TicketService.listar({ estado: 'abiertos', pagina: req.query.pagina }, req.usuario),
      TicketService.resumenTecnico(req.usuario),
      // HU-10: alerta cuando un cliente respondió una cotización y el técnico no lo ha visto
      NotificacionService.contarNoLeidas(req.usuario.id, { tipo: 'cotizacion_respondida' }),
    ]);
    res.render('tecnico/dashboard', {
      titulo: 'Mis tickets',
      usuario: req.usuario,
      migas: [{ texto: 'Técnico', url: '/tecnico' }, { texto: 'Mis tickets' }],
      paginacion,
      porEstado,
      respuestasSinLeer,
      filtros: {},
    });
  }
}

module.exports = DashboardController;
