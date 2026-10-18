'use strict';

/**
 * Tabla ticket_fotos: evidencia fotográfica del estado de ingreso del equipo.
 * ON DELETE CASCADE: las fotos no tienen sentido sin su ticket.
 * @implements RF-03, HU-02
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ticket_fotos', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      ticket_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'tickets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      url_foto: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ticket_fotos');
  },
};
