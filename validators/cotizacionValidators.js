/**
 * Reglas de express-validator de cotizaciones (HU-03, HU-05).
 * Los ítems, cantidades y el total los valida y calcula CotizacionService
 * (los precios nunca se toman del formulario).
 */
const { body } = require('express-validator');

/** @implements HU-03 */
const reglasNuevaCotizacion = [
  body('ticket_id').isInt({ min: 1 }).withMessage('El ticket de la cotización no es válido.'),
];

/** @implements HU-05 */
const reglasRespuestaCliente = [
  body('motivo')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 }).withMessage('El motivo no puede superar 200 caracteres.'),
];

module.exports = { reglasNuevaCotizacion, reglasRespuestaCliente };
