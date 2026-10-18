const AppError = require('./AppError');

/**
 * Falta autenticación o credenciales incorrectas (401).
 */
class AuthError extends AppError {
  constructor(mensaje = 'Debes iniciar sesión.', detalles = null) {
    super(mensaje, 401, detalles);
  }
}

module.exports = AuthError;
