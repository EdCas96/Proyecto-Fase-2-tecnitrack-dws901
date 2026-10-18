const { Model, DataTypes } = require('sequelize');

/**
 * Aviso interno para un usuario sobre un ticket (ej. el cliente respondió la cotización).
 * @implements RF-12, HU-10, RN-06
 */
class Notificacion extends Model {
  static inicializar(sequelize) {
    Notificacion.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        ticket_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          validate: { notNull: { msg: 'La notificación debe referirse a un ticket.' } },
        },
        usuario_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          validate: { notNull: { msg: 'La notificación debe tener un destinatario.' } },
        },
        mensaje: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notNull: { msg: 'El mensaje es obligatorio.' },
            len: { args: [1, 255], msg: 'El mensaje debe tener entre 1 y 255 caracteres.' },
          },
        },
        leida: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        fecha: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: 'Notificacion',
        tableName: 'notificaciones',
      },
    );
    return Notificacion;
  }

  static asociar(modelos) {
    Notificacion.belongsTo(modelos.Ticket, { as: 'ticket', foreignKey: 'ticket_id', onDelete: 'RESTRICT' });
    Notificacion.belongsTo(modelos.Usuario, { as: 'usuario', foreignKey: 'usuario_id', onDelete: 'RESTRICT' });
  }
}

module.exports = Notificacion;
