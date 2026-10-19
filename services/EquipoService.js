const { Op, literal } = require('sequelize');
const { Equipo, Cliente } = require('../models');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../utils/errors');
const { textoOpcional } = require('../utils/texto');

/** Campos que el formulario puede asignar (el resto se ignora). */
const CAMPOS = ['tipo', 'marca', 'modelo', 'numero_serie'];

/** Cantidad de tickets del equipo, calculada en la misma consulta. */
const TOTAL_TICKETS = [
  literal('(SELECT COUNT(*) FROM tickets AS t WHERE t.equipo_id = `Equipo`.`id`)'),
  'totalTickets',
];

/** Convierte un id de la URL en entero; null si no es válido. */
const idValido = (id) => (/^\d+$/.test(String(id)) ? Number(id) : null);

/**
 * Equipos de los clientes (laptop, escritorio, impresora...).
 */
class EquipoService {
  /**
   * Equipo con su cliente y la cantidad de tickets.
   *
   * @implements RF-02
   * @param {number|string} id
   * @returns {Promise<Equipo>}
   * @throws {NotFoundError}
   */
  static async obtenerPorId(id) {
    const equipo = idValido(id) && await Equipo.findByPk(idValido(id), {
      attributes: { include: [TOTAL_TICKETS] },
      include: { model: Cliente, as: 'cliente', attributes: ['id', 'nombre'] },
    });
    if (!equipo) throw new NotFoundError('El equipo no existe.');
    return equipo;
  }

  /**
   * Equipos de un cliente como opciones del select del nuevo ticket (RNF-01).
   * @implements HU-02, RNF-01
   * @param {number|string} clienteId
   * @returns {Promise<Array<{id: number, descripcion: string}>>}
   */
  static async opcionesDeCliente(clienteId) {
    const id = idValido(clienteId);
    if (!id) return [];
    const equipos = await Equipo.findAll({
      where: { cliente_id: id },
      attributes: ['id', 'tipo', 'marca', 'modelo', 'numero_serie'],
      order: [['id', 'ASC']],
    });
    return equipos.map((e) => ({
      id: e.id,
      descripcion: `${e.tipo} ${e.marca} ${e.modelo}${e.numero_serie ? ` (${e.numero_serie})` : ''}`,
    }));
  }

  /** Solo los campos permitidos, recortados; número de serie vacío = null. */
  static limpiarDatos(datos = {}) {
    return {
      tipo: textoOpcional(datos.tipo),
      marca: textoOpcional(datos.marca),
      modelo: textoOpcional(datos.modelo),
      numero_serie: textoOpcional(datos.numero_serie),
    };
  }

  /**
   * El número de serie no puede repetirse (además del índice único de la base,
   * se revisa antes para dar un mensaje junto al campo).
   *
   * @param {string|null} numeroSerie
   * @param {{excluirId?: number, transaction?: object}} [opciones]
   * @throws {ValidationError}
   */
  static async validarSerieUnica(numeroSerie, { excluirId, transaction } = {}) {
    if (!numeroSerie) return;
    const where = { numero_serie: numeroSerie };
    if (excluirId) where.id = { [Op.ne]: excluirId };
    const existente = await Equipo.findOne({ where, attributes: ['id'], transaction });
    if (existente) {
      const mensaje = 'Ya existe un equipo con ese número de serie.';
      throw new ValidationError(mensaje, { errores: { numero_serie: mensaje } });
    }
  }

  /**
   * Registra un equipo de un cliente existente.
   *
   * @implements HU-01, RF-02
   * @param {number|string} clienteId
   * @param {object} datos tipo, marca, modelo, numero_serie
   * @param {{transaction?: object}} [opciones] Para usarlo dentro de otra transacción.
   * @returns {Promise<Equipo>}
   */
  static async crear(clienteId, datos, { transaction } = {}) {
    const cliente = idValido(clienteId) && await Cliente.findByPk(idValido(clienteId), { attributes: ['id'], transaction });
    if (!cliente) throw new NotFoundError('El cliente no existe.');

    const limpio = EquipoService.limpiarDatos(datos);
    await EquipoService.validarSerieUnica(limpio.numero_serie, { transaction });
    return Equipo.create({ ...limpio, cliente_id: cliente.id }, { transaction });
  }

  /**
   * @implements HU-01, RF-02
   * @param {number|string} id
   * @param {object} datos
   * @returns {Promise<Equipo>}
   */
  static async actualizar(id, datos) {
    const equipo = await EquipoService.obtenerPorId(id);
    const limpio = EquipoService.limpiarDatos(datos);
    await EquipoService.validarSerieUnica(limpio.numero_serie, { excluirId: equipo.id });
    await equipo.update(limpio, { fields: CAMPOS });
    return equipo;
  }

  /**
   * Elimina un equipo que nunca tuvo tickets (el historial de servicio no se borra).
   *
   * @implements HU-01
   * @param {number|string} id
   * @returns {Promise<{clienteId: number}>} Cliente al que pertenecía, para regresar a su detalle.
   * @throws {BusinessRuleError} Si el equipo tiene tickets.
   */
  static async eliminar(id) {
    const equipo = await EquipoService.obtenerPorId(id);
    const tickets = Number(equipo.get('totalTickets'));
    if (tickets > 0) {
      throw new BusinessRuleError(
        `No se puede eliminar el equipo porque tiene ${tickets} ticket${tickets === 1 ? '' : 's'} registrado${tickets === 1 ? '' : 's'}. El historial de servicio debe conservarse.`,
      );
    }
    await equipo.destroy();
    return { clienteId: equipo.cliente_id };
  }
}

EquipoService.idValido = idValido;

module.exports = EquipoService;
