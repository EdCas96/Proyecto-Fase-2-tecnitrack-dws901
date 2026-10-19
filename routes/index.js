/**
 * Router principal: monta el router de cada módulo en su prefijo.
 *
 * | Prefijo          | Archivo            | Quién accede                    |
 * |------------------|--------------------|---------------------------------|
 * | /                | (este archivo)     | público (inicio)                |
 * | /auth            | auth.js            | público (login / logout)        |
 * | /portal          | cliente.js         | público (cliente: folio + tel.) |
 * | /admin           | admin.js           | admin                           |
 * | /tecnico         | tecnico.js         | técnico                         |
 * | /clientes        | clientes.js        | admin (técnico: lectura)        |
 * | /equipos         | equipos.js         | admin (técnico: lectura)        |
 * | /tickets         | tickets.js         | admin y técnico (RN-02)         |
 * | /cotizaciones    | cotizaciones.js    | técnico (admin: lectura)        |
 * | /catalogo        | catalogo.js        | admin (técnico: lectura)        |
 * | /usuarios        | usuarios.js        | admin                           |
 * | /reportes        | reportes.js        | admin                           |
 * | /notificaciones  | notificaciones.js  | técnico                         |
 *
 * El control de acceso por rol se agrega en cada router con los middlewares
 * de autenticación del Paso 4.
 */
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const InicioController = require('../controllers/inicioController');

const MODULOS = {
  '/auth': require('./auth'),
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

router.get('/', asyncHandler(InicioController.mostrar));

Object.entries(MODULOS).forEach(([prefijo, modulo]) => router.use(prefijo, modulo));

module.exports = router;
module.exports.PREFIJOS = Object.keys(MODULOS);
