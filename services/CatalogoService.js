const { Op, literal } = require('sequelize');
const { CatalogoItem } = require('../models');
const { NotFoundError, ValidationError, BusinessRuleError } = require('../utils/errors');
const { TIPOS_CATALOGO } = require('../utils/constantes');
const { escaparLike, textoOpcional } = require('../utils/texto');
const { opcionesPaginacion, resultadoPaginado } = require('../utils/paginacion');

const CAMPOS = ['nombre', 'tipo', 'precio_referencia'];

/** Cantidad de líneas de cotización que usan el ítem, calculada en la misma consulta. */
const VECES_USADO = [
  literal('(SELECT COUNT(*) FROM cotizacion_items AS ci WHERE ci.catalogo_id = `CatalogoItem`.`id`)'),
  'vecesUsado',
];

const idValido = (id) => (/^\d+$/.test(String(id)) ? Number(id) : null);

/**
 * Catálogo de servicios y repuestos con precio de referencia.
 */
class CatalogoService {
  /**
   * Listado paginado en la consulta (RNF-04), con filtro por tipo y búsqueda por nombre.
   * Incluye los inactivos (al final) y cuántas veces se usó cada ítem.
   *
   * @implements HU-07, RF-08
   * @param {{tipo?: string, busqueda?: string, pagina?: number}} [filtros]
   */
  static async listar({ tipo = '', busqueda = '', pagina = 1 } = {}) {
    const where = {};
    if (TIPOS_CATALOGO.includes(tipo)) where.tipo = tipo;
    const texto = String(busqueda || '').trim();
    if (texto) where.nombre = { [Op.like]: `%${escaparLike(texto)}%` };

    const resultado = await CatalogoItem.findAndCountAll({
      where,
      attributes: ['id', 'nombre', 'tipo', 'precio_referencia', 'activo', VECES_USADO],
      order: [['activo', 'DESC'], ['tipo', 'ASC'], ['nombre', 'ASC']],
      ...opcionesPaginacion(pagina),
    });
    return resultadoPaginado(resultado, pagina);
  }

  /**
   * Ítems activos, los únicos que se pueden agregar a una cotización (paso 7, HU-03).
   *
   * @implements HU-03, HU-07, RF-06
   * @param {{tipo?: string}} [filtros]
   * @returns {Promise<CatalogoItem[]>}
   */
  static async listarActivos({ tipo } = {}) {
    const where = { activo: true };
    if (TIPOS_CATALOGO.includes(tipo)) where.tipo = tipo;
    return CatalogoItem.findAll({
      where,
      attributes: ['id', 'nombre', 'tipo', 'precio_referencia'],
      order: [['tipo', 'ASC'], ['nombre', 'ASC']],
    });
  }

  /**
   * @param {number|string} id
   * @returns {Promise<CatalogoItem>}
   * @throws {NotFoundError}
   */
  static async obtenerPorId(id) {
    const item = idValido(id) && await CatalogoItem.findByPk(idValido(id), {
      attributes: { include: [VECES_USADO] },
    });
    if (!item) throw new NotFoundError('El ítem del catálogo no existe.');
    return item;
  }

  /**
   * Precio mayor a 0 con máximo 2 decimales; se guarda como texto "25.00" (DECIMAL).
   * @param {string|number} valor
   * @returns {string}
   * @throws {ValidationError}
   */
  static validarPrecio(valor) {
    const texto = String(valor ?? '').trim();
    const numero = Number(texto);
    let problema = null;
    if (!/^\d+(\.\d{1,2})?$/.test(texto) || Number.isNaN(numero)) {
      problema = 'El precio debe ser un número con máximo 2 decimales (ej. 25.00).';
    } else if (numero <= 0) {
      problema = 'El precio debe ser mayor a 0.';
    } else if (numero > 99999999.99) {
      problema = 'El precio es demasiado alto.';
    }
    if (problema) throw new ValidationError(problema, { errores: { precio_referencia: problema } });
    return numero.toFixed(2);
  }

  /** Solo los campos permitidos, con el precio validado. */
  static limpiarDatos(datos = {}) {
    return {
      nombre: textoOpcional(datos.nombre),
      tipo: textoOpcional(datos.tipo),
      precio_referencia: CatalogoService.validarPrecio(datos.precio_referencia),
    };
  }

  /** El nombre no puede repetirse (mensaje junto al campo; la base también lo impide). */
  static async validarNombreUnico(nombre, excluirId) {
    if (!nombre) return;
    const where = { nombre };
    if (excluirId) where.id = { [Op.ne]: excluirId };
    if (await CatalogoItem.findOne({ where, attributes: ['id'] })) {
      const mensaje = 'Ya existe un ítem del catálogo con ese nombre.';
      throw new ValidationError(mensaje, { errores: { nombre: mensaje } });
    }
  }

  /**
   * @implements HU-07, RF-08
   * @param {object} datos nombre, tipo, precio_referencia
   * @returns {Promise<CatalogoItem>}
   */
  static async crear(datos) {
    const limpio = CatalogoService.limpiarDatos(datos);
    await CatalogoService.validarNombreUnico(limpio.nombre);
    return CatalogoItem.create(limpio);
  }

  /**
   * Cambiar el precio no afecta a las cotizaciones ya hechas: cada línea guarda
   * su propio precio_unitario.
   *
   * @implements HU-07, RF-08
   * @param {number|string} id
   * @param {object} datos
   * @returns {Promise<CatalogoItem>}
   */
  static async actualizar(id, datos) {
    const item = await CatalogoService.obtenerPorId(id);
    const limpio = CatalogoService.limpiarDatos(datos);
    await CatalogoService.validarNombreUnico(limpio.nombre, item.id);
    await item.update(limpio, { fields: CAMPOS });
    return item;
  }

  /**
   * Activa o desactiva un ítem. Desactivado sigue en las cotizaciones antiguas
   * pero ya no se puede cotizar.
   *
   * @implements HU-07, RF-08
   * @param {number|string} id
   * @param {boolean} activo
   * @returns {Promise<CatalogoItem>}
   */
  static async cambiarEstado(id, activo) {
    const item = await CatalogoService.obtenerPorId(id);
    await item.update({ activo: Boolean(activo) }, { fields: ['activo'] });
    return item;
  }

  /**
   * Solo se elimina un ítem que nunca se usó; si ya está en alguna cotización
   * hay que desactivarlo (las cotizaciones deben conservar su detalle).
   *
   * @implements HU-07, RF-08
   * @param {number|string} id
   * @returns {Promise<CatalogoItem>}
   * @throws {BusinessRuleError}
   */
  static async eliminar(id) {
    const item = await CatalogoService.obtenerPorId(id);
    if (Number(item.get('vecesUsado')) > 0) {
      throw new BusinessRuleError(
        `"${item.nombre}" ya se usó en cotizaciones y no se puede eliminar. Desactívalo para que no se pueda cotizar.`,
      );
    }
    await item.destroy();
    return item;
  }
}

module.exports = CatalogoService;
