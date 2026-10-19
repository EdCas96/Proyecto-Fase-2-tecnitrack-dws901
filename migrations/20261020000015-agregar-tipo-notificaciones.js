'use strict';

/**
 * SC-06: tipo de notificación. Permite mostrar en el dashboard del técnico una
 * alerta solo cuando hay respuestas de cotización sin leer (HU-10), sin
 * depender del texto del mensaje.
 */
const TIPOS = ['cotizacion_respondida', 'ticket_asignado', 'ticket_cancelado', 'ticket_estado'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('notificaciones', 'tipo', {
      type: Sequelize.ENUM(...TIPOS),
      allowNull: true,
      after: 'usuario_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('notificaciones', 'tipo');
  },
};
