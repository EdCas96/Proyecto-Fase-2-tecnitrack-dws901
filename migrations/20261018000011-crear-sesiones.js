'use strict';

/**
 * Tabla sesiones: almacén de express-mysql-session (config/sesion.js).
 * Se crea por migración, igual que el resto del esquema, en lugar de dejar que
 * la librería la cree sola (createDatabaseTable: false).
 * Columnas y tipos según el schema.sql de express-mysql-session; "expires" es
 * un timestamp Unix en segundos.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'sesiones',
      {
        session_id: {
          type: Sequelize.STRING(128),
          allowNull: false,
          primaryKey: true,
        },
        expires: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
        },
        data: {
          type: Sequelize.TEXT('medium'),
          allowNull: true,
        },
      },
      // Collation binaria: el id de sesión distingue mayúsculas de minúsculas
      { charset: 'utf8mb4', collate: 'utf8mb4_bin' },
    );

    // La limpieza periódica de sesiones vencidas filtra por esta columna
    await queryInterface.addIndex('sesiones', ['expires'], { name: 'idx_sesiones_expires' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sesiones');
  },
};
