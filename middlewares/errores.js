const { AppError, NotFoundError } = require('../utils/errors');
const { entorno } = require('../config/env');

/**
 * Se ejecuta cuando ninguna ruta coincidió: convierte la petición en un 404.
 */
function rutaNoEncontrada(req, res, next) {
  next(new NotFoundError(`No existe la ruta ${req.method} ${req.originalUrl}`));
}

/**
 * Middleware central de errores. Los AppError muestran su mensaje y código;
 * cualquier otro error se registra en consola y se responde con un 500 genérico
 * para no filtrar detalles internos.
 */
// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, next) {
  const esPropio = err instanceof AppError;
  const statusCode = esPropio ? err.statusCode : 500;
  const mensaje = esPropio ? err.message : 'Ocurrió un error inesperado. Intenta de nuevo más tarde.';

  if (!esPropio && entorno !== 'test') {
    console.error(err);
  }

  res.status(statusCode);
  if (statusCode === 404) {
    return res.render('errores/404', { titulo: 'Página no encontrada' });
  }
  return res.render('errores/error', { titulo: 'Error', statusCode, mensaje });
}

module.exports = { rutaNoEncontrada, manejadorErrores };
