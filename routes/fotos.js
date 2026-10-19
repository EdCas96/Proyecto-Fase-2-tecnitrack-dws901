/**
 * Rutas: Fotos de tickets — montadas en /fotos (routes/index.js).
 *
 *   GET /fotos/:id   la foto, solo para el admin, el técnico asignado o el
 *                    cliente que validó ese ticket en el portal (403 si no)
 *
 * Las fotos se guardan fuera de public/ (DIRECTORIO_FOTOS) y no tienen URL pública.
 *
 * @implements HU-02, HU-04, RN-02
 */
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const FotosController = require('../controllers/fotosController');

const router = Router();

router.get('/:id', asyncHandler(FotosController.mostrar));

module.exports = router;
