const { Model, DataTypes } = require('sequelize');
const { TIPOS_CATALOGO } = require('../utils/constantes');

/**
 * Servicio o repuesto con precio de referencia, usado al armar cotizaciones.
 * @implements RF-08, HU-07
 */
class CatalogoItem extends Model {
  static inicializar(sequelize) {
    CatalogoItem.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        nombre: {
          type: DataTypes.STRING(120),
          allowNull: false,
          unique: { name: 'uq_catalogo_items_nombre', msg: 'Ya existe un ítem del catálogo con ese nombre.' },
          validate: {
            notNull: { msg: 'El nombre del ítem es obligatorio.' },
            len: { args: [2, 120], msg: 'El nombre debe tener entre 2 y 120 caracteres.' },
          },
        },
        tipo: {
          type: DataTypes.ENUM(...TIPOS_CATALOGO),
          allowNull: false,
          validate: {
            notNull: { msg: 'El tipo es obligatorio.' },
            isIn: { args: [TIPOS_CATALOGO], msg: 'El tipo debe ser Servicio o Repuesto.' },
          },
        },
        precio_referencia: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          validate: {
            notNull: { msg: 'El precio de referencia es obligatorio.' },
            isDecimal: { msg: 'El precio debe ser un número.' },
            min: { args: [0], msg: 'El precio no puede ser negativo.' },
          },
        },
        activo: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: 'CatalogoItem',
        tableName: 'catalogo_items',
      },
    );
    return CatalogoItem;
  }

  static asociar(modelos) {
    CatalogoItem.hasMany(modelos.CotizacionItem, { as: 'lineasCotizacion', foreignKey: 'catalogo_id', onDelete: 'RESTRICT' });
  }
}

module.exports = CatalogoItem;
