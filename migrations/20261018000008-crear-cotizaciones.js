'use strict';

/**
 * Tabla cotizaciones: presupuesto que el cliente aprueba o rechaza.
 * - Un ticket puede tener varias cotizaciones, pero solo una Pendiente (RN-09).
 *   Se garantiza en BD con la columna generada pendiente_ticket_id (vale ticket_id solo
 *   cuando estado = 'Pendiente', NULL en otro caso) y un índice único sobre ella:
 *   MySQL/MariaDB permiten varios NULL en un índice único.
 * - RESTRICT: borrar el ticket rompería el historial de cotizaciones.
 * @implements RF-06, RF-07, HU-03, HU-05, RN-01, RN-05, RN-06, RN-09
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cotizaciones', {
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
        onDelete: 'RESTRICT',
      },
      estado: {
        type: Sequelize.ENUM('Pendiente', 'Aprobada', 'Rechazada'),
        allowNull: false,
        defaultValue: 'Pendiente',
      },
      total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      fecha: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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

    await queryInterface.addIndex('cotizaciones', ['ticket_id', 'estado'], { name: 'idx_cotizaciones_ticket_estado' });

    await queryInterface.sequelize.query(
      'ALTER TABLE cotizaciones ADD CONSTRAINT chk_cotizaciones_total CHECK (total >= 0)',
    );
    await queryInterface.sequelize.query(`
      ALTER TABLE cotizaciones
        ADD COLUMN pendiente_ticket_id INT UNSIGNED
          AS (CASE WHEN estado = 'Pendiente' THEN ticket_id ELSE NULL END) STORED,
        ADD UNIQUE INDEX uq_cotizaciones_una_pendiente (pendiente_ticket_id)
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cotizaciones');
  },
};
