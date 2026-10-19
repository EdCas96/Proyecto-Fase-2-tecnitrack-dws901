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
 * Acceso: admin (el técnico solo consulta: GET).
 *
 * Por ahora solo responde la página provisional "en construcción".
 */
const { Router } = require('express');
const EnConstruccionController = require('../controllers/enConstruccionController');
const { requireAuth, soloLecturaPara } = require('../middlewares/auth');

const router = Router();

router.use(requireAuth, soloLecturaPara('tecnico'));

router.get('/', EnConstruccionController.pagina('Clientes', [{ texto: 'Administrador', url: '/admin' }]));

module.exports = router;
