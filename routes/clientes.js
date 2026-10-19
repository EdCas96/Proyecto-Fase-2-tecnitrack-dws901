/**
 * Rutas: Clientes — montadas en /clientes (routes/index.js).
 *
 * HU-01, RF-01 (admin CRUD, técnico solo lectura):
 *   GET    /clientes            listado con búsqueda (?q=) y paginación (?pagina=)
 *   GET    /clientes/nuevo      formulario (cliente + primer equipo opcional)    [admin]
 *   POST   /clientes            crea en una transacción                          [admin]
 *   GET    /clientes/:id        detalle con sus equipos
 *   GET    /clientes/:id/editar formulario de edición                            [admin]
 *   PUT    /clientes/:id        actualiza (method-override)                      [admin]
 *   DELETE /clientes/:id        elimina (solo si no tiene equipos)               [admin]
 *
 * Acceso: admin; el técnico solo consulta (soloLecturaPara rechaza sus
 * POST/PUT/DELETE con 403 y checkRole('admin') protege los formularios).
 */
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validar = require('../middlewares/validar');
const { requireAuth, checkRole, soloLecturaPara } = require('../middlewares/auth');
const { reglasCliente, reglasNuevoCliente } = require('../validators/clienteValidators');
const ClientesController = require('../controllers/clientesController');

const router = Router();
const soloAdmin = checkRole('admin');

router.use(requireAuth, soloLecturaPara('tecnico'));

router.get('/', asyncHandler(ClientesController.listar));
router.get('/nuevo', soloAdmin, ClientesController.nuevo);
router.post('/', validar(reglasNuevoCliente), asyncHandler(ClientesController.crear));
router.get('/:id', asyncHandler(ClientesController.detalle));
router.get('/:id/editar', soloAdmin, asyncHandler(ClientesController.editar));
router.put('/:id', validar(reglasCliente), asyncHandler(ClientesController.actualizar));
router.delete('/:id', asyncHandler(ClientesController.eliminar));

module.exports = router;
