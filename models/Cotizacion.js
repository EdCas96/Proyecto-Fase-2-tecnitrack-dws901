const { Model, DataTypes } = require('sequelize');
const { ESTADOS_COTIZACION } = require('../utils/constantes');

/**
 * Presupuesto de un ticket que el cliente aprueba o rechaza.
 * La columna generada pendiente_ticket_id (solo en BD, no se mapea aquí) garantiza RN-09.
 * @implements RF-06, RF-07, HU-03, HU-05, RN-09
 */
class Cotizacion extends Model {
  static inicializar(sequelize) {
    Cotizacion.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        ticket_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          validate: { notNull: { msg: 'La cotización debe pertenecer a un ticket.' } },
        },
        estado: {
          type: DataTypes.ENUM(...ESTADOS_COTIZACION),
          allowNull: false,
          defaultValue: 'Pendiente',
          validate: {
            isIn: { args: [ESTADOS_COTIZACION], msg: 'El estado debe ser Pendiente, Aprobada o Rechazada.' },
          },
        },
        total: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          validate: {
            isDecimal: { msg: 'El total debe ser un número.' },
            min: { args: [0], msg: 'El total no puede ser negativo.' },
          },
        },
        fecha: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'Cotizacion',
        tableName: 'cotizaciones',
      },
    );
    return Cotizacion;
  }

  static asociar(modelos) {
    Cotizacion.belongsTo(modelos.Ticket, { as: 'ticket', foreignKey: 'ticket_id', onDelete: 'RESTRICT' });
    Cotizacion.hasMany(modelos.CotizacionItem, { as: 'items', foreignKey: 'cotizacion_id', onDelete: 'CASCADE' });
  }
}

module.exports = Cotizacion;
