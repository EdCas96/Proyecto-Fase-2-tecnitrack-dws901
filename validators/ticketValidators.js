/**
 * Reglas de express-validator de tickets (HU-02, HU-06).
 * Pocos campos obligatorios para que el registro tome menos de 2 minutos (RNF-01):
 * cliente, equipo, diagnóstico y al menos una foto. Fecha estimada y técnico son opcionales.
 */
const { body } = require('express-validator');
const { REGEX_TELEFONO_SV, ESTADOS_TICKET } = require('../utils/constantes');
const { reglasCamposEquipo } = require('./clienteValidators');

const clienteNuevo = (valor, { req }) => req.body.modo_cliente === 'nuevo';
const clienteExistente = (valor, { req }) => req.body.modo_cliente !== 'nuevo';
// Con un cliente nuevo, el equipo también es nuevo
const equipoNuevo = (valor, { req }) => req.body.modo_cliente === 'nuevo' || req.body.modo_equipo === 'nuevo';
const equipoExistente = (valor, { req }) => !equipoNuevo(valor, { req });

/** @implements HU-02, RF-03, RNF-01 */
const reglasNuevoTicket = [
  body('modo_cliente').optional().isIn(['existente', 'nuevo']).withMessage('Opción de cliente no válida.'),
  body('modo_equipo').optional().isIn(['existente', 'nuevo']).withMessage('Opción de equipo no válida.'),

  body('cliente_id').if(clienteExistente)
    .isInt({ min: 1 }).withMessage('Selecciona un cliente de la lista o registra uno nuevo.'),
  body('cliente_nombre').if(clienteNuevo)
    .trim()
    .notEmpty().withMessage('El nombre del cliente es obligatorio.').bail()
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.'),
  body('cliente_telefono').if(clienteNuevo)
    .trim()
    .notEmpty().withMessage('El teléfono es obligatorio.').bail()
    .matches(REGEX_TELEFONO_SV).withMessage('El teléfono debe tener 8 dígitos (ej. 7123-4567).'),
  body('cliente_correo').if(clienteNuevo)
    .optional({ values: 'falsy' })
    .trim()
    .isEmail().withMessage('El correo no tiene un formato válido.'),

  body('equipo_id').if(equipoExistente)
    .isInt({ min: 1 }).withMessage('Selecciona un equipo del cliente o registra uno nuevo.'),
  ...reglasCamposEquipo('equipo_', equipoNuevo),

  body('diagnostico_inicial')
    .trim()
    .notEmpty().withMessage('Describe el problema reportado por el cliente.').bail()
    .isLength({ min: 5, max: 5000 }).withMessage('El diagnóstico debe tener entre 5 y 5000 caracteres.'),
  body('fecha_estimada')
    .optional({ values: 'falsy' })
    .isISO8601({ strict: true }).withMessage('La fecha estimada no es válida.'),
  body('tecnico_id')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 }).withMessage('Elige un técnico de la lista.'),
];

/** @implements HU-06, RN-04 */
const reglasCambioEstado = [
  body('estado').isIn(ESTADOS_TICKET).withMessage('El estado elegido no es válido.'),
  body('motivo')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 255 }).withMessage('El motivo no puede superar 255 caracteres.'),
];

/** @implements HU-06, RN-02 */
const reglasReasignar = [
  body('tecnico_id').isInt({ min: 1 }).withMessage('Elige un técnico de la lista.'),
];

module.exports = { reglasNuevoTicket, reglasCambioEstado, reglasReasignar };
