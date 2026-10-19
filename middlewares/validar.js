/**
 * Ejecuta reglas de express-validator y, si alguna falla, pasa un
 * ValidationError al manejador central con los errores por campo.
 * errorHandler.js decide la respuesta: regresar al formulario con los mensajes
 * y los datos ingresados (flash) o, si la petición es de API, responder JSON.
 *
 * Uso: router.post('/', validar(reglasCliente), asyncHandler(ClientesController.crear));
 */
const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * @param {Array} reglas Cadenas de express-validator (body('correo').isEmail()...).
 * @returns {Array<Function>} Middlewares: las reglas y la verificación final.
 */
function validar(reglas = []) {
  return [
    ...reglas,
    (req, res, next) => {
      const resultado = validationResult(req);
      if (resultado.isEmpty()) return next();

      // Un mensaje por campo: el primero que falló
      const errores = resultado.mapped();
      const porCampo = Object.fromEntries(Object.entries(errores).map(([campo, { msg }]) => [campo, msg]));
      return next(new ValidationError('Revisa los datos del formulario.', { errores: porCampo }));
    },
  ];
}

module.exports = validar;
