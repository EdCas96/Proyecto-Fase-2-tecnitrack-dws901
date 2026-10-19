'use strict';

/**
 * SC-04: comentario opcional en cada registro del historial. Guarda el motivo
 * de una cancelación del admin y la nota de una reasignación de técnico.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ticket_historiales', 'comentario', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'usuario_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ticket_historiales', 'comentario');
  },
};
