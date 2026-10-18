'use strict';

/**
 * Tabla clientes: dueños de los equipos en reparación.
 * @implements RF-01, HU-01
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('clientes', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      nombre: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      telefono: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      correo: {
        type: Sequelize.STRING(120),
        allowNull: true,
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

    // El portal del cliente verifica folio + teléfono (HU-04)
    await queryInterface.addIndex('clientes', ['telefono'], { name: 'idx_clientes_telefono' });
    await queryInterface.addIndex('clientes', ['nombre'], { name: 'idx_clientes_nombre' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('clientes');
  },
};
