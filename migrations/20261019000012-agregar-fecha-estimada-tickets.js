'use strict';

/**
 * SC-03: fecha estimada de entrega que se muestra al cliente en el portal (HU-04).
 * Opcional: el técnico la indica al recibir el equipo o más adelante.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tickets', 'fecha_estimada', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      after: 'fecha_ingreso',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('tickets', 'fecha_estimada');
  },
};
