const AppError = require('./AppError');

/**
 * Recurso inexistente (404).
 */
class NotFoundError extends AppError {
  constructor(mensaje = 'El recurso solicitado no existe.', detalles = null) {
    super(mensaje, 404, detalles);
  }
}

module.exports = NotFoundError;
