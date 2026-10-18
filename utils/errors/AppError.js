/**
 * Error base de la aplicación. Todos los errores propios heredan de esta clase
 * para que el middleware central sepa qué código HTTP y mensaje responder.
 */
class AppError extends Error {
  /**
   * @param {string} mensaje Mensaje seguro para mostrar al usuario.
   * @param {number} [statusCode=500] Código HTTP asociado.
   * @param {object} [detalles] Información adicional (ej. errores por campo).
   */
  constructor(mensaje, statusCode = 500, detalles = null) {
    super(mensaje);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.detalles = detalles;
    this.esOperacional = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
