/**
 * Reglas de express-validator de usuarios (HU-09). La fortaleza de la
 * contraseña la valida AuthService.validarFortaleza, la misma regla que usa el servicio.
 */
const { body } = require('express-validator');
const AuthService = require('../services/AuthService');

const reglaPassword = body('password')
  .isString().withMessage('La contraseña es obligatoria.').bail()
  .custom((valor) => {
    try {
      return AuthService.validarFortaleza(valor);
    } catch (error) {
      throw new Error(error.message);
    }
  });

/** @implements HU-09, RF-09 */
const reglasDatosUsuario = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio.').bail()
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.'),
  body('correo')
    .trim()
    .notEmpty().withMessage('El correo es obligatorio.').bail()
    .isEmail().withMessage('El correo no tiene un formato válido.').bail()
    .isLength({ max: 120 }).withMessage('El correo no puede superar 120 caracteres.')
    .toLowerCase(),
];

/** @implements HU-09, RF-09, RN-08 */
const reglasNuevoTecnico = [...reglasDatosUsuario, reglaPassword];

/** @implements HU-09, RN-08 */
const reglasPassword = [reglaPassword];

module.exports = { reglasDatosUsuario, reglasNuevoTecnico, reglasPassword };
