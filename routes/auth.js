/**
 * Rutas: Iniciar sesión — montadas en /auth (routes/index.js).
 *
 * Previstas (Paso 4, HU-09, RN-07, RN-08):
 *   GET  /auth/login    formulario de inicio de sesión
 *   POST /auth/login    autentica (rate limit, session.regenerate, error genérico)
 *   POST /auth/logout   cierra la sesión (session.destroy)
 *
 * Por ahora solo responde la página provisional "en construcción".
 */
const { Router } = require('express');
const EnConstruccionController = require('../controllers/enConstruccionController');

const router = Router();

router.get('/login', EnConstruccionController.pagina('Iniciar sesión', []));

module.exports = router;
