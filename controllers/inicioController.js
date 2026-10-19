const { entorno } = require('../config/env');
const { ESTADOS_TICKET } = require('../utils/constantes');

/**
 * Controlador de la página de inicio.
 */
class InicioController {
  /** GET / — Página de bienvenida con accesos al login y al portal del cliente. */
  static mostrar(req, res) {
    res.render('inicio', { titulo: 'Inicio', entorno, estados: ESTADOS_TICKET });
  }
}

module.exports = InicioController;
