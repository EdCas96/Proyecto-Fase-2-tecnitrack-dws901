/**
 * Reglas de express-validator del login y del portal del cliente.
 * Se usan con el middleware validar: router.post('/login', validar(reglasLogin), ...).
 */
const { body } = require('express-validator');
const { REGEX_FOLIO, REGEX_TELEFONO } = require('../utils/constantes');

/** @implements RF-10 */
const reglasLogin = [
  body('correo')
    .isString().withMessage('El correo es obligatorio.').bail()
    .trim()
    .notEmpty().withMessage('El correo es obligatorio.').bail()
    .isEmail().withMessage('Ingresa un correo válido.')
    .toLowerCase(),
  body('password')
    .isString().withMessage('La contraseña es obligatoria.').bail()
    .notEmpty().withMessage('La contraseña es obligatoria.'),
];

/** @implements HU-04 */
const reglasPortal = [
  body('folio')
    .isString().withMessage('El folio es obligatorio.').bail()
    .trim()
    .notEmpty().withMessage('El folio es obligatorio.').bail()
    .toUpperCase()
    .matches(REGEX_FOLIO).withMessage('El folio debe tener el formato TT-AAAA-NNNN (ej. TT-2026-0040).'),
  body('telefono')
    .isString().withMessage('El teléfono es obligatorio.').bail()
    .trim()
    .notEmpty().withMessage('El teléfono es obligatorio.').bail()
    .matches(REGEX_TELEFONO).withMessage('Ingresa el teléfono registrado (ej. 7345-6720).'),
];

module.exports = { reglasLogin, reglasPortal };
