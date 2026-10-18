const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const InicioController = require('../controllers/inicioController');

const router = Router();

router.get('/', asyncHandler(InicioController.mostrar));

module.exports = router;
