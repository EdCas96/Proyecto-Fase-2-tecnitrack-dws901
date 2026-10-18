const { Model, DataTypes } = require('sequelize');

/**
 * Foto del estado de ingreso del equipo.
 * @implements RF-03, HU-02
 */
class TicketFoto extends Model {
  static inicializar(sequelize) {
    TicketFoto.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        ticket_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          validate: { notNull: { msg: 'La foto debe pertenecer a un ticket.' } },
        },
        url_foto: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notNull: { msg: 'La ruta de la foto es obligatoria.' },
            len: { args: [1, 255], msg: 'La ruta de la foto no puede superar 255 caracteres.' },
          },
        },
      },
      {
        sequelize,
        modelName: 'TicketFoto',
        tableName: 'ticket_fotos',
      },
    );
    return TicketFoto;
  }

  static asociar(modelos) {
    TicketFoto.belongsTo(modelos.Ticket, { as: 'ticket', foreignKey: 'ticket_id', onDelete: 'CASCADE' });
  }
}

module.exports = TicketFoto;
