const AppError = require('./AppError');

/**
 * Usuario autenticado sin permiso sobre el recurso (403).
 */
class ForbiddenError extends AppError {
  constructor(mensaje = 'No tienes permiso para realizar esta acción.', detalles = null) {
    super(mensaje, 403, detalles);
  }
}

module.exports = ForbiddenError;
