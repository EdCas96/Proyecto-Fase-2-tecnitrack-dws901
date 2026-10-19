const { Op, literal, where: condicion, fn, col } = require('sequelize');
const { sequelize, Cliente, Equipo } = require('../models');
const {
  NotFoundError, ValidationError, BusinessRuleError,
} = require('../utils/errors');
const traducirError = require('../utils/traducirError');
const { escaparLike, textoOpcional, formatearTelefonoSV } = require('../utils/texto');
const { opcionesPaginacion, resultadoPaginado } = require('../utils/paginacion');
const EquipoService = require('./EquipoService');

const CAMPOS = ['nombre', 'telefono', 'correo'];

/** Cantidad de equipos del cliente, calculada en la misma consulta (sin traer los equipos). */
const TOTAL_EQUIPOS = [
  literal('(SELECT COUNT(*) FROM equipos AS e WHERE e.cliente_id = `Cliente`.`id`)'),
  'totalEquipos',
];

/** Cantidad de tickets de cada equipo del detalle. */
const TOTAL_TICKETS_EQUIPO = [
  literal('(SELECT COUNT(*) FROM tickets AS t WHERE t.equipo_id = `equipos`.`id`)'),
  'totalTickets',
];

/** El formulario de cliente trae un equipo si se llenó al menos uno de sus campos. */
const tieneEquipo = (datos = {}) => ['equipo_tipo', 'equipo_marca', 'equipo_modelo', 'equipo_numero_serie']
  .some((campo) => textoOpcional(datos[campo]));

/**
 * Los errores del equipo se muestran junto a los campos "equipo_*" del formulario
 * de cliente (ej. numero_serie -> equipo_numero_serie).
 */
function errorDelEquipo(error) {
  const traducido = traducirError(error) || error;
  if (!(traducido instanceof ValidationError)) return traducido;
  const errores = (traducido.detalles && traducido.detalles.errores) || {};
  const conPrefijo = Object.fromEntries(Object.entries(errores).map(([campo, msg]) => [`equipo_${campo}`, msg]));
  return new ValidationError(`Equipo: ${traducido.message}`, { errores: conPrefijo });
}

/**
 * Clientes del taller (no tienen cuenta; consultan con folio + teléfono).
 */
class ClienteService {
  /**
   * Listado paginado en la consulta (RNF-04), con búsqueda por nombre o
   * teléfono (con o sin guion) y la cantidad de equipos de cada cliente.
   *
   * @implements HU-01, RF-01
   * @param {{busqueda?: string, pagina?: number}} [filtros]
   */
  static async listar({ busqueda = '', pagina = 1 } = {}) {
    const texto = String(busqueda || '').trim();
    const opciones = {
      attributes: ['id', 'nombre', 'telefono', 'correo', TOTAL_EQUIPOS],
      order: [['nombre', 'ASC'], ['id', 'ASC']],
      ...opcionesPaginacion(pagina),
    };
    if (texto) {
      const patron = `%${escaparLike(texto)}%`;
      const filtros = [{ nombre: { [Op.like]: patron } }, { telefono: { [Op.like]: patron } }];
      const digitos = texto.replace(/\D/g, '');
      if (digitos) {
        filtros.push(condicion(fn('REPLACE', col('telefono'), '-', ''), { [Op.like]: `%${digitos}%` }));
      }
      opciones.where = { [Op.or]: filtros };
    }
    return resultadoPaginado(await Cliente.findAndCountAll(opciones), pagina);
  }

  /**
   * @implements HU-01, RF-01
   * @param {number|string} id
   * @param {{conEquipos?: boolean}} [opciones] Incluye los equipos con su cantidad de tickets.
   * @returns {Promise<Cliente>}
   * @throws {NotFoundError}
   */
  static async obtenerPorId(id, { conEquipos = false } = {}) {
    const numero = EquipoService.idValido(id);
    const cliente = numero && await Cliente.findByPk(numero, {
      attributes: { include: [TOTAL_EQUIPOS] },
      include: conEquipos
        ? { model: Equipo, as: 'equipos', attributes: { include: [TOTAL_TICKETS_EQUIPO] } }
        : [],
      order: conEquipos ? [[{ model: Equipo, as: 'equipos' }, 'id', 'ASC']] : [],
    });
    if (!cliente) throw new NotFoundError('El cliente no existe.');
    return cliente;
  }

  /** Solo los campos permitidos; teléfono en formato 0000-0000 y correo vacío = null. */
  static limpiarDatos(datos = {}) {
    const telefono = formatearTelefonoSV(datos.telefono);
    if (!telefono) {
      const mensaje = 'El teléfono debe tener 8 dígitos (ej. 7123-4567).';
      throw new ValidationError(mensaje, { errores: { telefono: mensaje } });
    }
    return {
      nombre: textoOpcional(datos.nombre),
      telefono,
      correo: textoOpcional(datos.correo),
    };
  }

  /**
   * Registra un cliente y, si se llenó, su primer equipo. Las dos inserciones
   * van en una sola transacción: si el equipo falla, el cliente tampoco queda.
   *
   * @implements HU-01, RF-01, RF-02
   * @param {object} datos nombre, telefono, correo y opcionalmente equipo_tipo,
   *   equipo_marca, equipo_modelo, equipo_numero_serie.
   * @returns {Promise<Cliente>}
   */
  static async crear(datos) {
    const limpio = ClienteService.limpiarDatos(datos);
    return sequelize.transaction(async (transaction) => {
      const cliente = await Cliente.create(limpio, { transaction });
      if (tieneEquipo(datos)) {
        try {
          await EquipoService.crear(cliente.id, {
            tipo: datos.equipo_tipo,
            marca: datos.equipo_marca,
            modelo: datos.equipo_modelo,
            numero_serie: datos.equipo_numero_serie,
          }, { transaction });
        } catch (error) {
          throw errorDelEquipo(error);
        }
      }
      return cliente;
    });
  }

  /**
   * @implements HU-01, RF-01
   * @param {number|string} id
   * @param {object} datos nombre, telefono, correo
   * @returns {Promise<Cliente>}
   */
  static async actualizar(id, datos) {
    const cliente = await ClienteService.obtenerPorId(id);
    await cliente.update(ClienteService.limpiarDatos(datos), { fields: CAMPOS });
    return cliente;
  }

  /**
   * Elimina un cliente sin equipos.
   *
   * @implements HU-01
   * @param {number|string} id
   * @throws {BusinessRuleError} Si el cliente tiene equipos registrados.
   */
  static async eliminar(id) {
    const cliente = await ClienteService.obtenerPorId(id);
    const equipos = Number(cliente.get('totalEquipos'));
    if (equipos > 0) {
      throw new BusinessRuleError(
        `No se puede eliminar a ${cliente.nombre} porque tiene ${equipos} equipo${equipos === 1 ? '' : 's'} registrado${equipos === 1 ? '' : 's'}. Elimina primero sus equipos.`,
      );
    }
    await cliente.destroy();
    return cliente;
  }
}

ClienteService.tieneEquipo = tieneEquipo;

module.exports = ClienteService;
