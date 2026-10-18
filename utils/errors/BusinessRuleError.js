const AppError = require('./AppError');

/**
 * Operación válida en forma pero prohibida por una regla de negocio (RN-xx) (422).
 */
class BusinessRuleError extends AppError {
  constructor(mensaje = 'La operación viola una regla de negocio.', detalles = null) {
    super(mensaje, 422, detalles);
  }
}

module.exports = BusinessRuleError;
