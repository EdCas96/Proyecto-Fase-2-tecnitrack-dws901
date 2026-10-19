const { NotFoundError } = require('../utils/errors');

/**
 * Se ejecuta cuando ninguna ruta coincidió: convierte la petición en un 404
 * que responde el manejador central de errores.
 */
function notFound(req, res, next) {
  next(new NotFoundError('La página que buscas no existe.', {
    ruta: `${req.method} ${req.path}`,
  }));
}

module.exports = notFound;
