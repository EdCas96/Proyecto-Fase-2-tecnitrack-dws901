/**
 * Reglas de express-validator de clientes y equipos (HU-01).
 * Los servicios repiten las reglas importantes (teléfono, serie única);
 * aquí se validan para mostrar el error junto a cada campo.
 */
const { body } = require('express-validator');
const { REGEX_TELEFONO_SV, TIPOS_EQUIPO } = require('../utils/constantes');
const ClienteService = require('../services/ClienteService');

/** Reglas comunes de un equipo; prefijo "equipo_" en el formulario de nuevo cliente. */
function reglasCamposEquipo(prefijo = '', condicion = null) {
  const campo = (nombre) => {
    const cadena = body(`${prefijo}${nombre}`);
    return condicion ? cadena.if(condicion) : cadena;
  };
  return [
    campo('tipo')
      .trim()
      .notEmpty().withMessage('Selecciona el tipo de equipo.').bail()
      .isIn(TIPOS_EQUIPO).withMessage(`El tipo debe ser uno de: ${TIPOS_EQUIPO.join(', ')}.`),
    campo('marca')
      .trim()
      .notEmpty().withMessage('La marca es obligatoria.').bail()
      .isLength({ max: 60 }).withMessage('La marca no puede superar 60 caracteres.'),
    campo('modelo')
      .trim()
      .notEmpty().withMessage('El modelo es obligatorio.').bail()
      .isLength({ max: 80 }).withMessage('El modelo no puede superar 80 caracteres.'),
    campo('numero_serie')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ max: 80 }).withMessage('El número de serie no puede superar 80 caracteres.'),
  ];
}

/** @implements HU-01, RF-01 */
const reglasCliente = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio.').bail()
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.'),
  body('telefono')
    .trim()
    .notEmpty().withMessage('El teléfono es obligatorio.').bail()
    .matches(REGEX_TELEFONO_SV).withMessage('El teléfono debe tener 8 dígitos (ej. 7123-4567).'),
  body('correo')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail().withMessage('El correo no tiene un formato válido.').bail()
    .isLength({ max: 120 }).withMessage('El correo no puede superar 120 caracteres.'),
];

/** Nuevo cliente: los datos del equipo solo se validan si se llenó alguno. @implements HU-01, RF-02 */
const reglasNuevoCliente = [
  ...reglasCliente,
  ...reglasCamposEquipo('equipo_', (valor, { req }) => ClienteService.tieneEquipo(req.body)),
];

/** @implements HU-01, RF-02 */
const reglasEquipo = reglasCamposEquipo();

module.exports = {
  reglasCliente, reglasNuevoCliente, reglasEquipo, reglasCamposEquipo,
};
