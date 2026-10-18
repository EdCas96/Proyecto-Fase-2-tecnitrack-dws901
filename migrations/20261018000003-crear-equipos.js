'use strict';

/**
 * Tabla equipos: computadoras/impresoras de cada cliente.
 * ON DELETE RESTRICT: no se puede borrar un cliente que tiene equipos (se perdería su historial).
 * @implements RF-02, HU-01
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('equipos', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      cliente_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'clientes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      tipo: {
        type: Sequelize.ENUM('Laptop', 'Computadora de escritorio', 'Impresora', 'Otro'),
        allowNull: false,
      },
      marca: {
        type: Sequelize.STRING(60),
        allowNull: false,
      },
      modelo: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      // Opcional (algunos equipos no la tienen visible), pero única cuando existe
      numero_serie: {
        type: Sequelize.STRING(80),
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

    // UNIQUE admite varios NULL: equipos sin número de serie visible
    await queryInterface.addIndex('equipos', ['numero_serie'], { name: 'uq_equipos_numero_serie', unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('equipos');
  },
};
