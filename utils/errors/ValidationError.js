const AppError = require('./AppError');

/**
 * Datos de entrada inválidos (400).
 */
class ValidationError extends AppError {
  constructor(mensaje = 'Los datos enviados no son válidos.', detalles = null) {
    super(mensaje, 400, detalles);
  }
}

module.exports = ValidationError;
