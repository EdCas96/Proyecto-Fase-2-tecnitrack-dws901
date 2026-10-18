const { Model, DataTypes } = require('sequelize');

/**
 * Línea de una cotización. precio_unitario se copia del catálogo al cotizar
 * (puede ajustarse), para que un cambio posterior de precio no altere la cotización.
 * @implements RF-06, HU-03
 */
class CotizacionItem extends Model {
  static inicializar(sequelize) {
    CotizacionItem.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        cotizacion_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          validate: { notNull: { msg: 'La línea debe pertenecer a una cotización.' } },
        },
        catalogo_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          validate: { notNull: { msg: 'Debe seleccionar un ítem del catálogo.' } },
        },
        cantidad: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 1,
          validate: {
            isInt: { msg: 'La cantidad debe ser un número entero.' },
            min: { args: [1], msg: 'La cantidad debe ser al menos 1.' },
          },
        },
        precio_unitario: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            notNull: { msg: 'El precio unitario es obligatorio.' },
            isDecimal: { msg: 'El precio unitario debe ser un número.' },
            min: { args: [0], msg: 'El precio unitario no puede ser negativo.' },
          },
        },
        subtotal: {
          type: DataTypes.VIRTUAL,
          get() {
            return Number(this.cantidad) * Number(this.precio_unitario);
          },
        },
      },
      {
        sequelize,
        modelName: 'CotizacionItem',
        tableName: 'cotizacion_items',
      },
    );
    return CotizacionItem;
  }

  static asociar(modelos) {
    CotizacionItem.belongsTo(modelos.Cotizacion, { as: 'cotizacion', foreignKey: 'cotizacion_id', onDelete: 'CASCADE' });
    CotizacionItem.belongsTo(modelos.CatalogoItem, { as: 'catalogoItem', foreignKey: 'catalogo_id', onDelete: 'RESTRICT' });
  }
}

module.exports = CotizacionItem;
