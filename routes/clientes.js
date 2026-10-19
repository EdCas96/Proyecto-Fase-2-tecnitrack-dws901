/**
 * Rutas: Clientes — montadas en /clientes (routes/index.js).
 *
 * Previstas (HU-01; admin CRUD, técnico solo lectura):
 *   GET    /clientes            listado con búsqueda
 *   GET    /clientes/nuevo      formulario
 *   POST   /clientes            crea
 *   GET    /clientes/:id        detalle con sus equipos
 *   GET    /clientes/:id/editar formulario de edición
 *   PUT    /clientes/:id        actualiza (method-override)
 *   DELETE /clientes/:id        elimina (solo si no tiene equipos)
 *
 * Por ahora solo responde la página provisional "en construcción".
 */
const { Router } = require('express');
const EnConstruccionController = require('../controllers/enConstruccionController');

const router = Router();

router.get('/', EnConstruccionController.pagina('Clientes', [{ texto: 'Administrador', url: '/admin' }]));

module.exports = router;
