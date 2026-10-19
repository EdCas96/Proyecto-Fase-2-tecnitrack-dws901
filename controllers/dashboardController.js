const TicketService = require('../services/TicketService');

/**
 * Paneles de inicio de cada rol (prototipos: admin/dashboard.html y tecnico/dashboard.html).
 */
class DashboardController {
  /** GET /admin — indicadores y tickets recientes. */
  static async admin(req, res) {
    const { kpis, recientes } = await TicketService.resumenAdmin();
    res.render('admin/dashboard', {
      titulo: 'Dashboard',
      usuario: req.usuario,
      migas: [{ texto: 'Administrador', url: '/admin' }, { texto: 'Dashboard' }],
      kpis,
      recientes,
    });
  }

  /** GET /tecnico — "Mis tickets": los abiertos asignados al técnico (RN-02). */
  static async tecnico(req, res) {
    const [paginacion, porEstado] = await Promise.all([
      TicketService.listar({ estado: 'abiertos', pagina: req.query.pagina }, req.usuario),
      TicketService.resumenTecnico(req.usuario),
    ]);
    res.render('tecnico/dashboard', {
      titulo: 'Mis tickets',
      usuario: req.usuario,
      migas: [{ texto: 'Técnico', url: '/tecnico' }, { texto: 'Mis tickets' }],
      paginacion,
      porEstado,
      filtros: {},
    });
  }
}

module.exports = DashboardController;
