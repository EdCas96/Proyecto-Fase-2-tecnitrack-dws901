/**
 * Rutas: Usuarios — montadas en /usuarios (routes/index.js).
 *
 * Previstas (HU-09, RN-07, RN-08; solo admin):
 *   GET   /usuarios              listado de técnicos
 *   GET   /usuarios/nuevo        formulario
 *   POST  /usuarios              crea (contraseña con bcrypt)
 *   GET   /usuarios/:id/editar   formulario de edición
 *   PUT   /usuarios/:id          actualiza
 *   PATCH /usuarios/:id/activo   activa o desactiva
 *
 * Por ahora solo responde la página provisional "en construcción".
 */
const { Router } = require('express');
const EnConstruccionController = require('../controllers/enConstruccionController');

const router = Router();

router.get('/', EnConstruccionController.pagina('Usuarios', [{ texto: 'Administrador', url: '/admin' }]));

module.exports = router;
