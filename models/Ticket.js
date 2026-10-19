const { Model, DataTypes } = require('sequelize');
const { ESTADOS_TICKET, REGEX_FOLIO } = require('../utils/constantes');

/**
 * Ingreso de un equipo al taller. Las reglas de transición de estado (RN-01, RN-04)
 * no viven aquí sino en services/ (MaquinaEstadosTicket, TicketService).
 * @implements RF-03, RF-04, RF-05, HU-02, HU-06, RN-03
 */
class Ticket extends Model {
  static inicializar(sequelize) {
    Ticket.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        folio: {
          type: DataTypes.STRING(20),
          allowNull: false,
          unique: { name: 'uq_tickets_folio', msg: 'Ya existe un ticket con ese folio.' },
          validate: {
            notNull: { msg: 'El folio es obligatorio.' },
            is: { args: REGEX_FOLIO, msg: 'El folio debe tener el formato TT-AAAA-NNNN (ej. TT-2026-0042).' },
          },
        },
        equipo_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          validate: { notNull: { msg: 'El ticket debe estar asociado a un equipo.' } },
        },
        tecnico_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: true,
        },
        estado: {
          type: DataTypes.ENUM(...ESTADOS_TICKET),
          allowNull: false,
          defaultValue: 'Recibido',
          validate: {
            isIn: { args: [ESTADOS_TICKET], msg: 'El estado del ticket no es válido.' },
          },
        },
        diagnostico_inicial: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notNull: { msg: 'El diagnóstico inicial es obligatorio.' },
            len: { args: [5, 5000], msg: 'El diagnóstico inicial debe tener entre 5 y 5000 caracteres.' },
          },
        },
        fecha_ingreso: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          validate: { isDate: { msg: 'La fecha de ingreso no es válida.' } },
        },
        // SC-03: fecha estimada de entrega que ve el cliente en el portal (HU-04)
        fecha_estimada: {
          type: DataTypes.DATEONLY,
          allowNull: true,
          validate: { isDate: { msg: 'La fecha estimada no es válida.' } },
        },
        fecha_entrega: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: { isDate: { msg: 'La fecha de entrega no es válida.' } },
        },
      },
      {
        sequelize,
        modelName: 'Ticket',
        tableName: 'tickets',
        validate: {
          entregaPosteriorAlIngreso() {
            if (this.fecha_entrega && this.fecha_ingreso && new Date(this.fecha_entrega) < new Date(this.fecha_ingreso)) {
              throw new Error('La fecha de entrega no puede ser anterior a la fecha de ingreso.');
            }
          },
        },
      },
    );
    return Ticket;
  }

  static asociar(modelos) {
    Ticket.belongsTo(modelos.Equipo, { as: 'equipo', foreignKey: 'equipo_id', onDelete: 'RESTRICT' });
    Ticket.belongsTo(modelos.Usuario, { as: 'tecnico', foreignKey: 'tecnico_id', onDelete: 'RESTRICT' });
    Ticket.hasMany(modelos.TicketFoto, { as: 'fotos', foreignKey: 'ticket_id', onDelete: 'CASCADE' });
    Ticket.hasMany(modelos.TicketHistorial, { as: 'historial', foreignKey: 'ticket_id', onDelete: 'RESTRICT' });
    Ticket.hasMany(modelos.Cotizacion, { as: 'cotizaciones', foreignKey: 'ticket_id', onDelete: 'RESTRICT' });
    Ticket.hasMany(modelos.Notificacion, { as: 'notificaciones', foreignKey: 'ticket_id', onDelete: 'RESTRICT' });
  }
}

module.exports = Ticket;
