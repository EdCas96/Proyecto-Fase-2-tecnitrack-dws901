'use strict';

/**
 * Tabla cotizacion_items: líneas de una cotización.
 * - precio_unitario se copia del catálogo al cotizar, para que un cambio de precio
 *   posterior no altere cotizaciones ya emitidas.
 * - CASCADE con la cotización (las líneas no existen sin ella);
 *   RESTRICT con el catálogo (un ítem usado no se borra, se desactiva).
 * @implements RF-06, HU-03
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cotizacion_items', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      cotizacion_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'cotizaciones', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      catalogo_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'catalogo_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      cantidad: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      precio_unitario: {
        type: Sequelize.DECIMAL(10, 2),
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

    await queryInterface.sequelize.query(
      'ALTER TABLE cotizacion_items ADD CONSTRAINT chk_cotizacion_items_cantidad CHECK (cantidad >= 1)',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE cotizacion_items ADD CONSTRAINT chk_cotizacion_items_precio CHECK (precio_unitario >= 0)',
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cotizacion_items');
  },
};
