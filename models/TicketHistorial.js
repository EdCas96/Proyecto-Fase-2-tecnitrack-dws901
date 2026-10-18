const { Model, DataTypes } = require('sequelize');
const { ESTADOS_TICKET } = require('../utils/constantes');

/**
 * Registro de un cambio de estado del ticket (tabla nueva en la Fase 2).
 * usuario_id es NULL cuando el cambio lo provoca el cliente desde el portal.
 * @implements RF-04, RF-05, RF-11, HU-06, HU-08
 */
class TicketHistorial extends Model {
  static inicializar(sequelize) {
    TicketHistorial.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        ticket_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          validate: { notNull: { msg: 'El historial debe pertenecer a un ticket.' } },
        },
        estado_anterior: {
          type: DataTypes.ENUM(...ESTADOS_TICKET),
          allowNull: true,
          validate: {
            isIn: { args: [ESTADOS_TICKET], msg: 'El estado anterior no es válido.' },
          },
        },
        estado_nuevo: {
          type: DataTypes.ENUM(...ESTADOS_TICKET),
          allowNull: false,
          validate: {
            notNull: { msg: 'El estado nuevo es obligatorio.' },
            isIn: { args: [ESTADOS_TICKET], msg: 'El estado nuevo no es válido.' },
          },
        },
        usuario_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: true,
        },
        fecha: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'TicketHistorial',
        tableName: 'ticket_historiales',
      },
    );
    return TicketHistorial;
  }

  static asociar(modelos) {
    TicketHistorial.belongsTo(modelos.Ticket, { as: 'ticket', foreignKey: 'ticket_id', onDelete: 'RESTRICT' });
    TicketHistorial.belongsTo(modelos.Usuario, { as: 'usuario', foreignKey: 'usuario_id', onDelete: 'RESTRICT' });
  }
}

module.exports = TicketHistorial;
