/**
 * Rutas: Tickets — montadas en /tickets (routes/index.js).
 *
 * HU-02, HU-06; RN-01..RN-04 (admin: todos; técnico: solo los suyos, RN-02):
 *   GET   /tickets                 listado con filtro por estado (?estado=), búsqueda (?q=) y paginación
 *   GET   /tickets/nuevo           formulario (cliente/equipo existentes o nuevos, fotos)
 *   GET   /tickets/equipos         JSON: equipos de un cliente (?cliente_id=), para el formulario
 *   POST  /tickets                 crea ticket + historial + fotos en una transacción (Multer)
 *   GET   /tickets/:id             detalle con historial, fotos, cotizaciones y acciones
 *   PATCH /tickets/:id/estado      cambia de estado (MaquinaEstadosTicket; cancelar: solo admin)
 *   PATCH /tickets/:id/tecnico     reasigna a un técnico activo (solo admin)
 *
 * El formulario de nuevo ticket es multipart: el token CSRF va en la query
 * string (?_csrf=...), ver middlewares/csrf.js.
 *
 * Acceso: admin y técnico (cada técnico solo sus tickets, lo filtra TicketService).
 */
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validar = require('../middlewares/validar');
const { requireAuth, checkRole } = require('../middlewares/auth');
const { subirFotos, limpiarFotosSiFalla } = require('../middlewares/upload');
const { reglasNuevoTicket, reglasCambioEstado, reglasReasignar } = require('../validators/ticketValidators');
const TicketsController = require('../controllers/ticketsController');

const router = Router();

router.use(requireAuth, checkRole('admin', 'tecnico'));

router.get('/', asyncHandler(TicketsController.listar));
router.get('/nuevo', asyncHandler(TicketsController.nuevo));
router.get('/equipos', asyncHandler(TicketsController.equiposDeCliente));
router.post('/', subirFotos, validar(reglasNuevoTicket), asyncHandler(TicketsController.crear));
router.get('/:id', asyncHandler(TicketsController.detalle));
router.patch('/:id/estado', validar(reglasCambioEstado), asyncHandler(TicketsController.cambiarEstado));
router.patch('/:id/tecnico', checkRole('admin'), validar(reglasReasignar), asyncHandler(TicketsController.reasignar));

// Si la creación falla después de subir las fotos (validación, regla de negocio), se borran del disco
router.use(limpiarFotosSiFalla);

module.exports = router;
