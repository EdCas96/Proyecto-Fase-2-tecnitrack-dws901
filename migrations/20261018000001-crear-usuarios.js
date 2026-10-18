'use strict';

/**
 * Tabla usuarios: cuentas del personal del taller (admin y técnicos).
 * El cliente no tiene cuenta (accede con folio + teléfono).
 * @implements RF-09, RF-10, RN-07, RN-08
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      nombre: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      correo: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      rol: {
        type: Sequelize.ENUM('admin', 'tecnico'),
        allowNull: false,
        defaultValue: 'tecnico',
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

    await queryInterface.addIndex('usuarios', ['correo'], { name: 'uq_usuarios_correo', unique: true });
    await queryInterface.addIndex('usuarios', ['rol', 'activo'], { name: 'idx_usuarios_rol_activo' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('usuarios');
  },
};
