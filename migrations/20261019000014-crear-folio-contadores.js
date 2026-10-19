'use strict';

/**
 * SC-05: contador de folios por año (RN-03). FolioService bloquea la fila del
 * año (SELECT ... FOR UPDATE) dentro de la transacción que crea el ticket, así
 * dos tickets creados al mismo tiempo nunca reciben el mismo correlativo.
 * El contador arranca en el folio más alto que ya exista de cada año.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('folio_contadores', {
      anio: {
        type: Sequelize.SMALLINT.UNSIGNED,
        allowNull: false,
        primaryKey: true,
      },
      ultimo: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
    }, { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' });

    await queryInterface.sequelize.query(`
      INSERT INTO folio_contadores (anio, ultimo)
      SELECT CAST(SUBSTRING(folio, 4, 4) AS UNSIGNED), MAX(CAST(SUBSTRING(folio, 9) AS UNSIGNED))
      FROM tickets
      GROUP BY SUBSTRING(folio, 4, 4)
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('folio_contadores');
  },
};
