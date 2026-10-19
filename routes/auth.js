/**
 * Rutas: Iniciar sesión — montadas en / (routes/index.js).
 *
 *   GET  /login    formulario de inicio de sesión (si ya hay sesión, va al panel)
 *   POST /login    autentica (rate limit, session.regenerate, error genérico)
 *   POST /logout   cierra la sesión (session.destroy y borra la cookie)
 *
 * @implements HU-09, RF-10, RN-07, RN-08
 */
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validar = require('../middlewares/validar');
const { redirectIfAuth } = require('../middlewares/auth');
const { limitarLogin } = require('../middlewares/limitarIntentos');
const { reglasLogin } = require('../validators/authValidators');
const AuthController = require('../controllers/authController');

const router = Router();

router.get('/login', redirectIfAuth, AuthController.mostrarLogin);
router.post('/login', limitarLogin, validar(reglasLogin), asyncHandler(AuthController.iniciarSesion));
router.post('/logout', asyncHandler(AuthController.cerrarSesion));

module.exports = router;
