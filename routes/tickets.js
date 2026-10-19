/**
 * Rutas: Tickets — montadas en /tickets (routes/index.js).
 *
 * Previstas (HU-02, HU-06; RN-01..RN-04):
 *   GET   /tickets              listado (admin: todos; técnico: los suyos)
 *   GET   /tickets/nuevo        formulario con fotos
 *   POST  /tickets              crea ticket + historial + fotos (transacción, Multer)
 *   GET   /tickets/:id          detalle con historial, fotos y cotizaciones
 *   PATCH /tickets/:id/estado   cambia de estado (MaquinaEstadosTicket)
 *   PATCH /tickets/:id/tecnico  reasigna (solo admin)
 *
 * Acceso: admin y técnico (cada técnico solo sus tickets, RN-02).
 *
 * Por ahora solo responde la página provisional "en construcción".
 */
const { Router } = require('express');
const EnConstruccionController = require('../controllers/enConstruccionController');
const { requireAuth, checkRole } = require('../middlewares/auth');

const router = Router();

router.use(requireAuth, checkRole('admin', 'tecnico'));

router.get('/', EnConstruccionController.pagina('Tickets', [{ texto: 'Administrador', url: '/admin' }]));

module.exports = router;
