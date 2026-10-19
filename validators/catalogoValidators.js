/**
 * Reglas de express-validator del catálogo (HU-07).
 */
const { body } = require('express-validator');
const { TIPOS_CATALOGO } = require('../utils/constantes');

/** @implements HU-07, RF-08 */
const reglasCatalogo = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio.').bail()
    .isLength({ min: 2, max: 120 }).withMessage('El nombre debe tener entre 2 y 120 caracteres.'),
  body('tipo')
    .trim()
    .isIn(TIPOS_CATALOGO).withMessage('El tipo debe ser Servicio o Repuesto.'),
  body('precio_referencia')
    .trim()
    .notEmpty().withMessage('El precio es obligatorio.').bail()
    .matches(/^-?\d+(\.\d+)?$/).withMessage('El precio debe ser un número (ej. 25.00).').bail()
    .isFloat({ gt: 0 }).withMessage('El precio debe ser mayor a 0.').bail()
    .matches(/^\d+(\.\d{1,2})?$/).withMessage('El precio puede tener máximo 2 decimales.'),
];

module.exports = { reglasCatalogo };
