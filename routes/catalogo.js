/**
 * Rutas: Catálogo — montadas en /catalogo (routes/index.js).
 *
 * Previstas (HU-07; admin CRUD, técnico solo lectura):
 *   GET    /catalogo              listado
 *   GET    /catalogo/nuevo        formulario
 *   POST   /catalogo              crea
 *   GET    /catalogo/:id/editar   formulario de edición
 *   PUT    /catalogo/:id          actualiza
 *   PATCH  /catalogo/:id/activo   activa o desactiva
 *
 * Por ahora solo responde la página provisional "en construcción".
 */
const { Router } = require('express');
const EnConstruccionController = require('../controllers/enConstruccionController');

const router = Router();

router.get('/', EnConstruccionController.pagina('Catálogo', [{ texto: 'Administrador', url: '/admin' }]));

module.exports = router;
