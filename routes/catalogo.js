/**
 * Rutas: Catálogo — montadas en /catalogo (routes/index.js).
 *
 * HU-07, RF-08 (admin CRUD, técnico solo lectura):
 *   GET    /catalogo              listado con filtro por tipo (?tipo=), búsqueda y paginación
 *   GET    /catalogo/nuevo        formulario                                     [admin]
 *   POST   /catalogo              crea                                           [admin]
 *   GET    /catalogo/:id/editar   formulario de edición                          [admin]
 *   PUT    /catalogo/:id          actualiza                                      [admin]
 *   PATCH  /catalogo/:id/activo   activa o desactiva (activo=true|false)         [admin]
 *   DELETE /catalogo/:id          elimina (solo si nunca se usó en cotizaciones) [admin]
 *
 * Acceso: admin (el técnico solo consulta: GET).
 */
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validar = require('../middlewares/validar');
const { requireAuth, checkRole, soloLecturaPara } = require('../middlewares/auth');
const { reglasCatalogo } = require('../validators/catalogoValidators');
const CatalogoController = require('../controllers/catalogoController');

const router = Router();
const soloAdmin = checkRole('admin');

router.use(requireAuth, soloLecturaPara('tecnico'));

router.get('/', asyncHandler(CatalogoController.listar));
router.get('/nuevo', soloAdmin, CatalogoController.nuevo);
router.post('/', validar(reglasCatalogo), asyncHandler(CatalogoController.crear));
router.get('/:id/editar', soloAdmin, asyncHandler(CatalogoController.editar));
router.put('/:id', validar(reglasCatalogo), asyncHandler(CatalogoController.actualizar));
router.patch('/:id/activo', asyncHandler(CatalogoController.cambiarEstado));
router.delete('/:id', asyncHandler(CatalogoController.eliminar));

module.exports = router;
