/**
 * Paneles de inicio de cada rol. Por ahora solo saludan al usuario; los
 * indicadores y tickets recientes se agregan junto con TicketService.
 */
class DashboardController {
  /** GET /admin */
  static admin(req, res) {
    res.render('admin/dashboard', {
      titulo: 'Dashboard',
      usuario: req.usuario,
      migas: [{ texto: 'Administrador', url: '/admin' }, { texto: 'Dashboard' }],
    });
  }

  /** GET /tecnico */
  static tecnico(req, res) {
    res.render('tecnico/dashboard', {
      titulo: 'Mis tickets',
      usuario: req.usuario,
      migas: [{ texto: 'Técnico', url: '/tecnico' }, { texto: 'Mis tickets' }],
    });
  }
}

module.exports = DashboardController;
