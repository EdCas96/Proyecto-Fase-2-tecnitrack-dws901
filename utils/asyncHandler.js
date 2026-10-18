/**
 * Envuelve un controlador async para que cualquier error (o promesa rechazada)
 * llegue al middleware central de errores mediante next(error).
 *
 * @param {Function} fn Controlador (req, res, next) => Promise
 * @returns {Function} Middleware de Express
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
