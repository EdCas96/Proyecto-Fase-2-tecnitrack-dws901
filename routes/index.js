/**
 * Router principal: monta el router de cada módulo en su prefijo.
 *
 * | Prefijo          | Archivo            | Quién accede                    |
 * |------------------|--------------------|---------------------------------|
 * | /                | (este archivo)     | público (inicio)                |
 * | / (login/logout) | auth.js            | público (/login, /logout)       |
 * | /portal          | cliente.js         | público (cliente: folio + tel.) |
 * | /admin           | admin.js           | admin                           |
 * | /tecnico         | tecnico.js         | técnico (y admin)               |
 * | /clientes        | clientes.js        | admin (técnico: lectura)        |
 * | /equipos         | equipos.js         | admin (técnico: lectura)        |
 * | /tickets         | tickets.js         | admin y técnico (RN-02)         |
 * | /cotizaciones    | cotizaciones.js    | admin y técnico                 |
 * | /catalogo        | catalogo.js        | admin (técnico: lectura)        |
 * | /usuarios        | usuarios.js        | admin                           |
 * | /reportes        | reportes.js        | admin                           |
 * | /notificaciones  | notificaciones.js  | admin y técnico                 |
 * | /fotos           | fotos.js           | quien puede ver el ticket       |
 *
 * El control de acceso lo pone cada router con middlewares/auth.js
 * (requireAuth, checkRole, soloLecturaPara, requireCliente).
 */
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { redirectIfAuth } = require('../middlewares/auth');
const InicioController = require('../controllers/inicioController');

const MODULOS = {
  '/': require('./auth'),
  '/portal': require('./cliente'),
  '/admin': require('./admin'),
  '/tecnico': require('./tecnico'),
  '/clientes': require('./clientes'),
  '/equipos': require('./equipos'),
  '/tickets': require('./tickets'),
  '/cotizaciones': require('./cotizaciones'),
  '/catalogo': require('./catalogo'),
  '/usuarios': require('./usuarios'),
  '/reportes': require('./reportes'),
  '/notificaciones': require('./notificaciones'),
};

const router = Router();

// Con sesión abierta, la página de inicio lleva directo al panel del rol
router.get('/', redirectIfAuth, asyncHandler(InicioController.mostrar));

Object.entries(MODULOS).forEach(([prefijo, modulo]) => router.use(prefijo, modulo));

// Fotos de tickets con control de permisos (no es un módulo con páginas propias)
router.use('/fotos', require('./fotos'));

module.exports = router;
module.exports.PREFIJOS = Object.keys(MODULOS);
