'use strict';

/**
 * Tabla catalogo_items: servicios y repuestos con precio de referencia.
 * Los ítems no se borran: se desactivan (activo = false) para no romper cotizaciones antiguas.
 * @implements RF-08, HU-07
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('catalogo_items', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      nombre: {
        type: Sequelize.STRING(120),
        allowNull: false,
        unique: 'uq_catalogo_items_nombre',
      },
      tipo: {
        type: Sequelize.ENUM('Servicio', 'Repuesto'),
        allowNull: false,
      },
      precio_referencia: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      activo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.sequelize.query(
      'ALTER TABLE catalogo_items ADD CONSTRAINT chk_catalogo_items_precio CHECK (precio_referencia >= 0)',
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('catalogo_items');
  },
};
