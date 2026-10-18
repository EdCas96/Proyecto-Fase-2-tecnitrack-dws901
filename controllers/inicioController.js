const { entorno } = require('../config/env');

/**
 * Controlador de la página de inicio.
 */
class InicioController {
  /** GET / — Página de prueba del entorno. */
  static mostrar(req, res) {
    res.render('inicio', { titulo: 'Inicio', entorno });
  }
}

module.exports = InicioController;
