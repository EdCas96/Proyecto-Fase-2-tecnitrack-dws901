/**
 * Envuelve un controlador async para que cualquier error (promesa rechazada o
 * excepción lanzada de forma síncrona) llegue al middleware central de errores
 * mediante next(error).
 *
 * @param {Function} fn Controlador (req, res, next) => Promise
 * @returns {Function} Middleware de Express (devuelve la promesa del controlador)
 */
const asyncHandler = (fn) => (req, res, next) => {
  try {
    return Promise.resolve(fn(req, res, next)).catch(next);
  } catch (error) {
    return next(error);
  }
};

module.exports = asyncHandler;
