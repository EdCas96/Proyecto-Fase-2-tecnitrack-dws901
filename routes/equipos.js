/**
 * Rutas: Equipos — montadas en /equipos (routes/index.js).
 * Los equipos se consultan dentro del detalle de su cliente (/clientes/:id).
 *
 * HU-01, RF-02 (admin CRUD, técnico solo lectura):
 *   GET    /equipos                     redirige a /clientes
 *   GET    /equipos/nuevo?cliente_id=   formulario                        [admin]
 *   POST   /equipos                     crea (número de serie único)      [admin]
 *   GET    /equipos/:id                 detalle con el historial de tickets (RF-05)
 *   GET    /equipos/:id/editar          formulario de edición             [admin]
 *   PUT    /equipos/:id                 actualiza                         [admin]
 *   DELETE /equipos/:id                 elimina (solo si no tiene tickets) [admin]
 *
 * Acceso: admin (el técnico solo consulta: GET).
 */
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validar = require('../middlewares/validar');
const { requireAuth, checkRole, soloLecturaPara } = require('../middlewares/auth');
const { reglasEquipo } = require('../validators/clienteValidators');
const EquiposController = require('../controllers/equiposController');

const router = Router();
const soloAdmin = checkRole('admin');

router.use(requireAuth, soloLecturaPara('tecnico'));

router.get('/', EquiposController.listar);
router.get('/nuevo', soloAdmin, asyncHandler(EquiposController.nuevo));
router.post('/', validar(reglasEquipo), asyncHandler(EquiposController.crear));
router.get('/:id', asyncHandler(EquiposController.detalle));
router.get('/:id/editar', soloAdmin, asyncHandler(EquiposController.editar));
router.put('/:id', validar(reglasEquipo), asyncHandler(EquiposController.actualizar));
router.delete('/:id', asyncHandler(EquiposController.eliminar));

module.exports = router;
