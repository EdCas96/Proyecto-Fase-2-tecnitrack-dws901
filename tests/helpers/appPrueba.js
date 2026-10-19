/**
 * Mini aplicación Express para probar un middleware de forma aislada, con las
 * mismas vistas, flash y manejador de errores que la aplicación real, pero con
 * sesión en memoria y sin CSRF.
 *
 * Uso: const app = crearAppPrueba((app) => app.post('/ruta', middleware, controlador));
 */
const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const errorHandler = require('../../middlewares/errorHandler');
const notFound = require('../../middlewares/notFound');
const ayudantesVistas = require('../../utils/vistas');

/**
 * @param {(app: import('express').Express) => void} definirRutas
 * @returns {import('express').Express}
 */
function crearAppPrueba(definirRutas) {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', '..', 'views'));
  app.use(expressLayouts);
  app.set('layout', 'layouts/main');
  Object.assign(app.locals, ayudantesVistas);

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(session({ secret: 'secreto-de-pruebas', resave: false, saveUninitialized: false }));
  app.use(flash());

  // Permite a las pruebas leer lo que errorHandler dejó en flash
  app.get('/__flash', (req, res) => {
    res.json({
      error: req.flash('error'),
      errores: req.flash('errores')[0] || {},
      datos: req.flash('datos')[0] || {},
    });
  });

  definirRutas(app);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { crearAppPrueba };
